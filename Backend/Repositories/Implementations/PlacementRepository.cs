using BTech.DTOs.Placements;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;
using System.Data;
using BTech.Rules;

namespace BTech.Repositories.Implementations;

public sealed class PlacementRepository : IPlacementRepository
{
    private readonly string _connectionString;
    private readonly ILogger<PlacementRepository> _logger;
    public PlacementRepository(IConfiguration config,ILogger<PlacementRepository> logger)
    {
        _logger=logger;
        _connectionString=config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
    }
    public async Task<T> RunAsync<T>(long userId,long? requestedCollegeId,bool write,Func<PlacementSession,PlacementActor,Task<T>> action,CancellationToken ct)
    {
        await using var c=new MySqlConnection(_connectionString);
        await c.OpenAsync(ct);
        await using var tx=await c.BeginTransactionAsync(IsolationLevel.ReadCommitted,ct);
        var s=new PlacementSession(c,tx,ct);
        PlacementActor actor;
        try { actor=await s.AuthorizeAsync(userId,requestedCollegeId); }
        catch(PlacementApiException ex)
        {
            _logger.LogWarning("Placement access rejected. ActorId={ActorId}, RequestedCollegeId={CollegeId}, Code={Code}, Reason={Reason}",userId,requestedCollegeId,ex.StatusCode,ex.Message);
            throw;
        }
        _logger.LogDebug("Placement access granted from active database roles. ActorId={ActorId}, CollegeId={CollegeId}, Write={Write}",actor.UserId,actor.CollegeId,write);
        // A per-college parent lock also serializes offers across different drives for the same student.
        if(write) await s.LockCollegeAsync(actor.CollegeId);
        var data=await action(s,actor);
        await tx.CommitAsync(ct);
        return data;
    }
}

public sealed class PlacementSession
{
    private readonly MySqlConnection _c;
    private readonly MySqlTransaction _tx;
    private readonly CancellationToken _ct;
    public PlacementSession(MySqlConnection c,MySqlTransaction tx,CancellationToken ct){_c=c;_tx=tx;_ct=ct;}
    private CommandDefinition Cmd(string sql,object? args=null)=>new(sql,args,_tx,cancellationToken:_ct);
    private Task<T?> One<T>(string sql,object? args=null)=>_c.QuerySingleOrDefaultAsync<T>(Cmd(sql,args));
    private async Task<List<T>> Rows<T>(string sql,object? args=null)=>(await _c.QueryAsync<T>(Cmd(sql,args))).AsList();
    private Task<int> Exec(string sql,object? args=null)=>_c.ExecuteAsync(Cmd(sql,args));
    private Task<long> Scalar(string sql,object? args=null)=>_c.ExecuteScalarAsync<long>(Cmd(sql,args));
    public async Task<PlacementActor> AuthorizeAsync(long userId,long? requestedCollegeId)
    {
        if(userId<=0)throw new PlacementApiException(401,"A valid authenticated user identifier is required.");
        var user=await One<PlacementUser>("SELECT user_id UserId,college_id CollegeId FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL",new{userId});
        if(user is null)throw new PlacementApiException(401,"The authenticated user is inactive or does not exist.");
        var roles=await Rows<string>("SELECT r.role_code FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL",new{userId});
        bool super=PlacementAccessRules.IsSuperAdmin(roles);
        if(!PlacementAccessRules.CanManage(roles))
            throw new PlacementApiException(403,"Placement staff or administrator access is required.");
        var collegeId=requestedCollegeId ?? user.CollegeId;
        if(collegeId is null or <=0)throw new PlacementApiException(400,"Provide a positive collegeId query parameter.");
        if(!super && user.CollegeId!=collegeId)
        {
            var membership=await Scalar("SELECT COUNT(*) FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id WHERE m.user_id=@userId AND cs.college_id=@collegeId AND m.status=1 AND m.removed_at IS NULL AND cs.status=1",new{userId,collegeId});
            if(membership==0)throw new PlacementApiException(403,"You do not have access to this college.");
        }
        if(await Scalar("SELECT COUNT(*) FROM colleges WHERE college_id=@collegeId AND status=1 AND deleted_at IS NULL",new{collegeId})==0)
            throw new PlacementApiException(404,"Active college not found.");
        return new(userId,collegeId.Value);
    }
    private sealed class PlacementUser { public long UserId{get;set;} public long? CollegeId{get;set;} }
    public async Task LockCollegeAsync(long collegeId)=>_ = await Scalar("SELECT college_id FROM colleges WHERE college_id=@collegeId FOR UPDATE",new{collegeId});
    private const string DriveColumns="x.drive_id AS DriveId,x.college_id AS CollegeId,x.company_id AS CompanyId,x.academic_year_id AS AcademicYearId,x.drive_code AS DriveCode,x.drive_name AS DriveName,x.job_title AS JobTitle,x.job_description AS JobDescription,x.employment_type AS EmploymentType,x.drive_type AS DriveType,x.job_location AS JobLocation,x.ctc_min AS CtcMin,x.ctc_max AS CtcMax,x.monthly_stipend AS MonthlyStipend,x.currency_code AS CurrencyCode,x.vacancies AS Vacancies,x.drive_start_at AS DriveStartAt,x.drive_end_at AS DriveEndAt,x.application_open_at AS ApplicationOpenAt,x.application_close_at AS ApplicationCloseAt,x.venue AS Venue,x.meeting_url AS MeetingUrl,x.coordinator_user_id AS CoordinatorUserId,x.drive_status AS DriveStatus,x.remarks AS Remarks,x.created_at AS CreatedAt,x.created_by AS CreatedBy,x.updated_at AS UpdatedAt,x.updated_by AS UpdatedBy,x.deleted_at AS DeletedAt,x.deleted_by AS DeletedBy";
    private const string RuleColumns="x.eligibility_rule_id AS EligibilityRuleId,x.drive_id AS DriveId,x.rule_name AS RuleName,x.course_id AS CourseId,x.branch_id AS BranchId,x.graduation_year AS GraduationYear,x.min_cgpa AS MinCgpa,x.min_percentage AS MinPercentage,x.min_tenth_percentage AS MinTenthPercentage,x.min_twelfth_percentage AS MinTwelfthPercentage,x.max_active_backlogs AS MaxActiveBacklogs,x.max_education_gap_years AS MaxEducationGapYears,x.allow_already_placed AS AllowAlreadyPlaced,x.description AS Description,x.status AS Status,x.created_at AS CreatedAt,x.created_by AS CreatedBy,x.updated_at AS UpdatedAt,x.updated_by AS UpdatedBy,x.deleted_at AS DeletedAt,x.deleted_by AS DeletedBy";
    private const string EligibilityColumns="x.eligibility_id AS EligibilityId,x.drive_id AS DriveId,x.student_id AS StudentId,x.matched_rule_id AS MatchedRuleId,x.eligibility_status AS EligibilityStatus,x.student_cgpa AS StudentCgpa,x.student_percentage AS StudentPercentage,x.active_backlogs AS ActiveBacklogs,x.criteria_snapshot AS CriteriaSnapshot,x.academic_snapshot AS AcademicSnapshot,x.reason AS Reason,x.evaluated_at AS EvaluatedAt,x.evaluated_by AS EvaluatedBy,x.created_at AS CreatedAt,x.created_by AS CreatedBy,x.updated_at AS UpdatedAt,x.updated_by AS UpdatedBy,x.deleted_at AS DeletedAt,x.deleted_by AS DeletedBy";
    private const string ApplicationColumns="x.application_id AS ApplicationId,x.drive_id AS DriveId,x.student_id AS StudentId,x.application_number AS ApplicationNumber,x.resume_path AS ResumePath,x.cover_letter AS CoverLetter,x.applied_at AS AppliedAt,x.application_status AS ApplicationStatus,x.withdrawn_at AS WithdrawnAt,x.withdrawal_reason AS WithdrawalReason,x.remarks AS Remarks,x.created_at AS CreatedAt,x.created_by AS CreatedBy,x.updated_at AS UpdatedAt,x.updated_by AS UpdatedBy,x.deleted_at AS DeletedAt,x.deleted_by AS DeletedBy";
    private const string InterviewColumns="x.interview_id AS InterviewId,x.application_id AS ApplicationId,x.round_number AS RoundNumber,x.round_name AS RoundName,x.round_type AS RoundType,x.interview_mode AS InterviewMode,x.scheduled_at AS ScheduledAt,x.completed_at AS CompletedAt,x.interviewer_user_id AS InterviewerUserId,x.interviewer_name AS InterviewerName,x.venue AS Venue,x.meeting_url AS MeetingUrl,x.score AS Score,x.max_score AS MaxScore,x.interview_status AS InterviewStatus,x.interview_result AS InterviewResult,x.feedback AS Feedback,x.created_at AS CreatedAt,x.created_by AS CreatedBy,x.updated_at AS UpdatedAt,x.updated_by AS UpdatedBy,x.deleted_at AS DeletedAt,x.deleted_by AS DeletedBy";
    private const string SelectionColumns="x.selection_id AS SelectionId,x.application_id AS ApplicationId,x.selection_status AS SelectionStatus,x.decision_at AS DecisionAt,x.decided_by AS DecidedBy,x.offered_job_title AS OfferedJobTitle,x.offered_ctc AS OfferedCtc,x.monthly_stipend AS MonthlyStipend,x.currency_code AS CurrencyCode,x.job_location AS JobLocation,x.offer_status AS OfferStatus,x.offer_letter_path AS OfferLetterPath,x.offer_issued_at AS OfferIssuedAt,x.offer_expires_at AS OfferExpiresAt,x.offer_responded_at AS OfferRespondedAt,x.expected_joining_date AS ExpectedJoiningDate,x.joined_at AS JoinedAt,x.remarks AS Remarks,x.created_at AS CreatedAt,x.created_by AS CreatedBy,x.updated_at AS UpdatedAt,x.updated_by AS UpdatedBy,x.deleted_at AS DeletedAt,x.deleted_by AS DeletedBy";

    public async Task<PlacementDriveDto> Drive(long id,long collegeId,bool locked=false)
        =>await One<PlacementDriveDto>($"SELECT {DriveColumns} FROM placement_drives x WHERE x.drive_id=@id AND x.college_id=@collegeId AND x.deleted_at IS NULL"+(locked?" FOR UPDATE":""),new{id,collegeId})
        ?? throw new PlacementApiException(404,"Placement drive not found in this college.");
    public async Task<PlacementApplicationDto> Application(long id,long collegeId,bool locked=false)
        =>await One<PlacementApplicationDto>($"SELECT {ApplicationColumns} FROM placement_applications x JOIN placement_drives d ON d.drive_id=x.drive_id WHERE x.application_id=@id AND d.college_id=@collegeId AND x.deleted_at IS NULL AND d.deleted_at IS NULL"+(locked?" FOR UPDATE":""),new{id,collegeId})
        ?? throw new PlacementApiException(404,"Placement application not found in this college.");
    public async Task<PlacementInterviewDto> Interview(long id,long collegeId,bool locked=false)
        =>await One<PlacementInterviewDto>($"SELECT {InterviewColumns} FROM placement_interviews x JOIN placement_applications a ON a.application_id=x.application_id JOIN placement_drives d ON d.drive_id=a.drive_id WHERE x.interview_id=@id AND d.college_id=@collegeId AND x.deleted_at IS NULL AND a.deleted_at IS NULL AND d.deleted_at IS NULL"+(locked?" FOR UPDATE":""),new{id,collegeId})
        ?? throw new PlacementApiException(404,"Placement interview not found in this college.");
    public async Task<PlacementSelectionDto> Selection(long id,long collegeId,bool locked=false)
        =>await One<PlacementSelectionDto>($"SELECT {SelectionColumns} FROM placement_selections x JOIN placement_applications a ON a.application_id=x.application_id JOIN placement_drives d ON d.drive_id=a.drive_id WHERE x.selection_id=@id AND d.college_id=@collegeId AND x.deleted_at IS NULL AND a.deleted_at IS NULL AND d.deleted_at IS NULL"+(locked?" FOR UPDATE":""),new{id,collegeId})
        ?? throw new PlacementApiException(404,"Placement selection not found in this college.");
    public async Task<PlacementStudent> Student(long studentId,long collegeId)
        =>await One<PlacementStudent>("SELECT student_id StudentId,college_id CollegeId,course_id CourseId,branch_id BranchId FROM students WHERE student_id=@studentId AND college_id=@collegeId AND status=1 AND deleted_at IS NULL",new{studentId,collegeId})
        ?? throw new PlacementApiException(400,"Active student not found in this college.");
    public async Task ValidateCompanyYear(SavePlacementDriveRequest r,long collegeId)
    {
        if(await Scalar("SELECT COUNT(*) FROM companies WHERE company_id=@CompanyId AND college_id=@collegeId AND status=1 AND deleted_at IS NULL",new{r.CompanyId,collegeId})==0)
            throw new PlacementApiException(400,"Active company not found in this college.");
        if(await Scalar("SELECT COUNT(*) FROM academicyears WHERE academic_year_id=@AcademicYearId AND deleted_at IS NULL",new{r.AcademicYearId})==0)
            throw new PlacementApiException(400,"Academic year not found.");
        if(r.CoordinatorUserId.HasValue)await ValidateStaff(r.CoordinatorUserId.Value,collegeId);
    }
    public async Task ValidateStaff(long userId,long collegeId)
    {
        if(await Scalar("SELECT COUNT(*) FROM users u WHERE u.user_id=@userId AND u.status=1 AND u.deleted_at IS NULL AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=u.user_id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL AND r.role_code IN ('SUPER_ADMIN','COLLEGE_ADMIN','PRINCIPAL','HOD','FACULTY','PLACEMENT_OFFICER','PLACEMENT_COORDINATOR')) AND (u.college_id=@collegeId OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=u.user_id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL AND r.role_code='SUPER_ADMIN') OR EXISTS (SELECT 1 FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id WHERE m.user_id=u.user_id AND cs.college_id=@collegeId AND m.status=1 AND m.removed_at IS NULL AND cs.status=1))",new{userId,collegeId})==0)
            throw new PlacementApiException(400,"The assigned user must be active staff with access to this college.");
    }
    public async Task ValidateCourseBranch(SavePlacementRuleRequest r,long collegeId)
    {
        if(r.CourseId.HasValue && await Scalar("SELECT COUNT(*) FROM courses WHERE course_id=@CourseId AND college_id=@collegeId AND status=1 AND deleted_at IS NULL",new{r.CourseId,collegeId})==0)
            throw new PlacementApiException(400,"Active course not found in this college.");
        if(r.BranchId.HasValue && await Scalar("SELECT COUNT(*) FROM branches b JOIN courses c ON c.course_id=b.course_id WHERE b.branch_id=@BranchId AND (@CourseId IS NULL OR b.course_id=@CourseId) AND c.college_id=@collegeId AND b.status=1 AND b.deleted_at IS NULL AND c.status=1 AND c.deleted_at IS NULL",new{r.BranchId,r.CourseId,collegeId})==0)
            throw new PlacementApiException(400,"Branch does not belong to the selected course/college.");
    }
    public Task<List<PlacementDriveDto>> Drives(long collegeId,long? companyId,long? academicYearId,string? status,string? search,int skip,int size)
        =>Rows<PlacementDriveDto>($"SELECT {DriveColumns} FROM placement_drives x WHERE x.college_id=@collegeId AND x.deleted_at IS NULL AND (@companyId IS NULL OR x.company_id=@companyId) AND (@academicYearId IS NULL OR x.academic_year_id=@academicYearId) AND (@status IS NULL OR x.drive_status=@status) AND (@search IS NULL OR CONCAT_WS(' ',x.drive_code,x.drive_name,x.job_title) LIKE CONCAT('%',@search,'%')) ORDER BY x.drive_start_at DESC,x.drive_id DESC LIMIT @size OFFSET @skip",new{collegeId,companyId,academicYearId,status,search,skip,size});
    public Task<List<PlacementRuleDto>> Rules(long driveId)=>Rows<PlacementRuleDto>($"SELECT {RuleColumns} FROM placement_eligibility_rules x WHERE x.drive_id=@driveId AND x.deleted_at IS NULL ORDER BY x.eligibility_rule_id",new{driveId});
    public async Task<PlacementRuleDto> Rule(long driveId,long id)=>await One<PlacementRuleDto>($"SELECT {RuleColumns} FROM placement_eligibility_rules x WHERE x.drive_id=@driveId AND x.eligibility_rule_id=@id AND x.deleted_at IS NULL",new{driveId,id})??throw new PlacementApiException(404,"Eligibility rule not found.");
    public Task<PlacementEligibilityDto?> Eligibility(long driveId,long studentId)=>One<PlacementEligibilityDto>($"SELECT {EligibilityColumns} FROM placement_eligibility x WHERE x.drive_id=@driveId AND x.student_id=@studentId AND x.deleted_at IS NULL",new{driveId,studentId});
    public Task<List<PlacementEligibilityDto>> Eligibilities(long driveId,string? status,int skip,int size)=>Rows<PlacementEligibilityDto>($"SELECT {EligibilityColumns} FROM placement_eligibility x WHERE x.drive_id=@driveId AND x.deleted_at IS NULL AND (@status IS NULL OR x.eligibility_status=@status) ORDER BY x.student_id LIMIT @size OFFSET @skip",new{driveId,status,skip,size});
    public Task<List<PlacementApplicationDto>> Applications(long collegeId,long? driveId,long? studentId,string? status,int skip,int size)=>Rows<PlacementApplicationDto>($"SELECT {ApplicationColumns} FROM placement_applications x JOIN placement_drives d ON d.drive_id=x.drive_id WHERE d.college_id=@collegeId AND d.deleted_at IS NULL AND x.deleted_at IS NULL AND (@driveId IS NULL OR x.drive_id=@driveId) AND (@studentId IS NULL OR x.student_id=@studentId) AND (@status IS NULL OR x.application_status=@status) ORDER BY x.applied_at DESC,x.application_id DESC LIMIT @size OFFSET @skip",new{collegeId,driveId,studentId,status,skip,size});
    public Task<List<PlacementInterviewDto>> Interviews(long applicationId)=>Rows<PlacementInterviewDto>($"SELECT {InterviewColumns} FROM placement_interviews x WHERE x.application_id=@applicationId AND x.deleted_at IS NULL ORDER BY x.round_number",new{applicationId});
    public Task<List<PlacementInterviewDto>> InterviewList(long collegeId,long? driveId,string? status,DateTime? from,DateTime? to,int skip,int size)=>Rows<PlacementInterviewDto>($"SELECT {InterviewColumns} FROM placement_interviews x JOIN placement_applications a ON a.application_id=x.application_id JOIN placement_drives d ON d.drive_id=a.drive_id WHERE d.college_id=@collegeId AND d.deleted_at IS NULL AND a.deleted_at IS NULL AND x.deleted_at IS NULL AND (@driveId IS NULL OR d.drive_id=@driveId) AND (@status IS NULL OR x.interview_status=@status) AND (@from IS NULL OR x.scheduled_at>=@from) AND (@to IS NULL OR x.scheduled_at<=@to) ORDER BY x.scheduled_at,x.interview_id LIMIT @size OFFSET @skip",new{collegeId,driveId,status,from,to,skip,size});
    public Task<List<PlacementSelectionDto>> Selections(long collegeId,long? driveId,long? studentId,string? status,int skip,int size)=>Rows<PlacementSelectionDto>($"SELECT {SelectionColumns} FROM placement_selections x JOIN placement_applications a ON a.application_id=x.application_id JOIN placement_drives d ON d.drive_id=a.drive_id WHERE d.college_id=@collegeId AND d.deleted_at IS NULL AND a.deleted_at IS NULL AND x.deleted_at IS NULL AND (@driveId IS NULL OR a.drive_id=@driveId) AND (@studentId IS NULL OR a.student_id=@studentId) AND (@status IS NULL OR x.selection_status=@status) ORDER BY x.decision_at DESC,x.selection_id DESC LIMIT @size OFFSET @skip",new{collegeId,driveId,studentId,status,skip,size});
    public Task<PlacementSelectionDto?> ApplicationSelection(long applicationId)=>One<PlacementSelectionDto>($"SELECT {SelectionColumns} FROM placement_selections x WHERE x.application_id=@applicationId AND x.deleted_at IS NULL",new{applicationId});
    public async Task<bool> AlreadyPlaced(long studentId,long? excludedApplicationId=null)=>await Scalar("SELECT COUNT(*) FROM placement_selections s JOIN placement_applications a ON a.application_id=s.application_id WHERE a.student_id=@studentId AND s.selection_status='SELECTED' AND s.offer_status NOT IN ('DECLINED','EXPIRED','REVOKED') AND s.deleted_at IS NULL AND a.deleted_at IS NULL AND (@excludedApplicationId IS NULL OR a.application_id<>@excludedApplicationId)",new{studentId,excludedApplicationId})>0;
    // The unique key includes soft-deleted rows: do not silently reuse or resurrect an application.
    public async Task<bool> ApplicationExists(long driveId,long studentId)=>await Scalar("SELECT COUNT(*) FROM placement_applications WHERE drive_id=@driveId AND student_id=@studentId",new{driveId,studentId})>0;
    public async Task<bool> HasApplications(long driveId)=>await Scalar("SELECT COUNT(*) FROM placement_applications WHERE drive_id=@driveId AND deleted_at IS NULL",new{driveId})>0;
    public async Task<bool> HasEligibility(long driveId)=>await Scalar("SELECT COUNT(*) FROM placement_eligibility WHERE drive_id=@driveId AND deleted_at IS NULL",new{driveId})>0;
    public Task<long> SelectedCount(long driveId,long applicationId)=>Scalar("SELECT COUNT(*) FROM placement_selections s JOIN placement_applications a ON a.application_id=s.application_id WHERE a.drive_id=@driveId AND a.application_id<>@applicationId AND a.deleted_at IS NULL AND s.deleted_at IS NULL AND s.selection_status='SELECTED' AND s.offer_status NOT IN ('DECLINED','EXPIRED','REVOKED')",new{driveId,applicationId});
    public async Task<bool> HasUnresolvedApplications(long driveId)=>await Scalar("SELECT COUNT(*) FROM placement_applications WHERE drive_id=@driveId AND deleted_at IS NULL AND application_status NOT IN ('SELECTED','REJECTED','WITHDRAWN')",new{driveId})>0;
    public Task<int> DriveStatus(long id,string status,long actor)=>Exec("UPDATE placement_drives SET drive_status=@status,updated_by=@actor WHERE drive_id=@id",new{id,status,actor});
    public Task<int> ApplicationStatus(long id,string status,long actor,string? reason=null)=>Exec("UPDATE placement_applications SET application_status=@status,updated_by=@actor,withdrawn_at=CASE WHEN @status='WITHDRAWN' THEN UTC_TIMESTAMP() ELSE withdrawn_at END,withdrawal_reason=CASE WHEN @status='WITHDRAWN' THEN @reason ELSE withdrawal_reason END WHERE application_id=@id",new{id,status,actor,reason});
    public Task<int> InterviewCancel(long id,string status,long actor,string? reason)=>Exec("UPDATE placement_interviews SET interview_status=@status,feedback=@reason,updated_by=@actor WHERE interview_id=@id",new{id,status,actor,reason});
    public Task<int> DeleteDrive(long id,long actor)=>Exec("UPDATE placement_drives SET deleted_at=UTC_TIMESTAMP(),deleted_by=@actor WHERE drive_id=@id",new{id,actor});
    public Task<int> DeleteRule(long id,long actor)=>Exec("UPDATE placement_eligibility_rules SET deleted_at=UTC_TIMESTAMP(),deleted_by=@actor,status=0 WHERE eligibility_rule_id=@id",new{id,actor});
    public async Task<long> CreateDrive(long collegeId,SavePlacementDriveRequest r,long actor)
    {
        await Exec("INSERT INTO placement_drives (college_id,company_id,academic_year_id,drive_code,drive_name,job_title,job_description,employment_type,drive_type,job_location,ctc_min,ctc_max,monthly_stipend,currency_code,vacancies,drive_start_at,drive_end_at,application_open_at,application_close_at,venue,meeting_url,coordinator_user_id,remarks,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13,@p14,@p15,@p16,@p17,@p18,@p19,@p20,@p21,@p22,@actor)",new{p0=collegeId, p1=r.CompanyId, p2=r.AcademicYearId, p3=r.DriveCode, p4=r.DriveName, p5=r.JobTitle, p6=r.JobDescription, p7=r.EmploymentType, p8=r.DriveType, p9=r.JobLocation, p10=r.CtcMin, p11=r.CtcMax, p12=r.MonthlyStipend, p13=r.CurrencyCode, p14=r.Vacancies, p15=r.DriveStartAt, p16=r.DriveEndAt, p17=r.ApplicationOpenAt, p18=r.ApplicationCloseAt, p19=r.Venue, p20=r.MeetingUrl, p21=r.CoordinatorUserId, p22=r.Remarks,actor});
        return await Scalar("SELECT LAST_INSERT_ID()");
    }
    public Task<int> UpdateDrive(long id,long collegeId,SavePlacementDriveRequest r,long actor)=>Exec("UPDATE placement_drives SET company_id=@p1,academic_year_id=@p2,drive_code=@p3,drive_name=@p4,job_title=@p5,job_description=@p6,employment_type=@p7,drive_type=@p8,job_location=@p9,ctc_min=@p10,ctc_max=@p11,monthly_stipend=@p12,currency_code=@p13,vacancies=@p14,drive_start_at=@p15,drive_end_at=@p16,application_open_at=@p17,application_close_at=@p18,venue=@p19,meeting_url=@p20,coordinator_user_id=@p21,remarks=@p22,updated_by=@actor WHERE drive_id=@id",new{id,p0=collegeId, p1=r.CompanyId, p2=r.AcademicYearId, p3=r.DriveCode, p4=r.DriveName, p5=r.JobTitle, p6=r.JobDescription, p7=r.EmploymentType, p8=r.DriveType, p9=r.JobLocation, p10=r.CtcMin, p11=r.CtcMax, p12=r.MonthlyStipend, p13=r.CurrencyCode, p14=r.Vacancies, p15=r.DriveStartAt, p16=r.DriveEndAt, p17=r.ApplicationOpenAt, p18=r.ApplicationCloseAt, p19=r.Venue, p20=r.MeetingUrl, p21=r.CoordinatorUserId, p22=r.Remarks,actor});
    public async Task<long> CreateRule(long driveId,SavePlacementRuleRequest r,long actor)
    {
        await Exec("INSERT INTO placement_eligibility_rules (drive_id,rule_name,course_id,branch_id,graduation_year,min_cgpa,min_percentage,min_tenth_percentage,min_twelfth_percentage,max_active_backlogs,max_education_gap_years,allow_already_placed,description,status,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13,@actor)",new{p0=driveId, p1=r.RuleName, p2=r.CourseId, p3=r.BranchId, p4=r.GraduationYear, p5=r.MinCgpa, p6=r.MinPercentage, p7=r.MinTenthPercentage, p8=r.MinTwelfthPercentage, p9=r.MaxActiveBacklogs, p10=r.MaxEducationGapYears, p11=r.AllowAlreadyPlaced, p12=r.Description, p13=r.Status,actor});
        return await Scalar("SELECT LAST_INSERT_ID()");
    }
    public Task<int> UpdateRule(long id,long driveId,SavePlacementRuleRequest r,long actor)=>Exec("UPDATE placement_eligibility_rules SET rule_name=@p1,course_id=@p2,branch_id=@p3,graduation_year=@p4,min_cgpa=@p5,min_percentage=@p6,min_tenth_percentage=@p7,min_twelfth_percentage=@p8,max_active_backlogs=@p9,max_education_gap_years=@p10,allow_already_placed=@p11,description=@p12,status=@p13,updated_by=@actor WHERE eligibility_rule_id=@id",new{id,p0=driveId, p1=r.RuleName, p2=r.CourseId, p3=r.BranchId, p4=r.GraduationYear, p5=r.MinCgpa, p6=r.MinPercentage, p7=r.MinTenthPercentage, p8=r.MinTwelfthPercentage, p9=r.MaxActiveBacklogs, p10=r.MaxEducationGapYears, p11=r.AllowAlreadyPlaced, p12=r.Description, p13=r.Status,actor});
    public async Task<long> CreateApplication(long driveId,CreatePlacementApplicationRequest r,string number,long actor)
    {
        await Exec("INSERT INTO placement_applications (drive_id,student_id,application_number,resume_path,cover_letter,remarks,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@actor)",new{p0=driveId, p1=r.StudentId, p2=number, p3=r.ResumePath, p4=r.CoverLetter, p5=r.Remarks,actor});
        return await Scalar("SELECT LAST_INSERT_ID()");
    }
    public async Task<long> CreateInterview(long applicationId,SavePlacementInterviewRequest r,long actor)
    {
        await Exec("INSERT INTO placement_interviews (application_id,round_number,round_name,round_type,interview_mode,scheduled_at,interviewer_user_id,interviewer_name,venue,meeting_url,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@actor)",new{p0=applicationId, p1=r.RoundNumber, p2=r.RoundName, p3=r.RoundType, p4=r.InterviewMode, p5=r.ScheduledAt, p6=r.InterviewerUserId, p7=r.InterviewerName, p8=r.Venue, p9=r.MeetingUrl,actor});
        return await Scalar("SELECT LAST_INSERT_ID()");
    }
    public Task<int> UpdateInterview(long id,long applicationId,SavePlacementInterviewRequest r,long actor)=>Exec("UPDATE placement_interviews SET round_number=@p1,round_name=@p2,round_type=@p3,interview_mode=@p4,scheduled_at=@p5,interviewer_user_id=@p6,interviewer_name=@p7,venue=@p8,meeting_url=@p9,updated_by=@actor WHERE interview_id=@id",new{id,p0=applicationId, p1=r.RoundNumber, p2=r.RoundName, p3=r.RoundType, p4=r.InterviewMode, p5=r.ScheduledAt, p6=r.InterviewerUserId, p7=r.InterviewerName, p8=r.Venue, p9=r.MeetingUrl,actor});
    public async Task<long> CreateSelection(long applicationId,SavePlacementSelectionRequest r,long actor)
    {
        await Exec("INSERT INTO placement_selections (application_id,decided_by,selection_status,offered_job_title,offered_ctc,monthly_stipend,currency_code,job_location,expected_joining_date,remarks,created_by) VALUES (@p0,@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@actor)",new{p0=applicationId, p1=actor, p2=r.SelectionStatus, p3=r.OfferedJobTitle, p4=r.OfferedCtc, p5=r.MonthlyStipend, p6=r.CurrencyCode, p7=r.JobLocation, p8=r.ExpectedJoiningDate, p9=r.Remarks,actor});
        return await Scalar("SELECT LAST_INSERT_ID()");
    }
    public Task<int> UpdateSelection(long id,long applicationId,SavePlacementSelectionRequest r,long actor)=>Exec("UPDATE placement_selections SET decided_by=@p1,selection_status=@p2,offered_job_title=@p3,offered_ctc=@p4,monthly_stipend=@p5,currency_code=@p6,job_location=@p7,expected_joining_date=@p8,remarks=@p9,updated_by=@actor,decision_at=UTC_TIMESTAMP() WHERE selection_id=@id",new{id,p0=applicationId, p1=actor, p2=r.SelectionStatus, p3=r.OfferedJobTitle, p4=r.OfferedCtc, p5=r.MonthlyStipend, p6=r.CurrencyCode, p7=r.JobLocation, p8=r.ExpectedJoiningDate, p9=r.Remarks,actor});

    public Task<int> UpdateApplication(long id,UpdatePlacementApplicationRequest r,long actor)=>Exec("UPDATE placement_applications SET resume_path=@ResumePath,cover_letter=@CoverLetter,remarks=@Remarks,updated_by=@actor WHERE application_id=@id",new{id,r.ResumePath,r.CoverLetter,r.Remarks,actor});
    public Task<int> SaveEligibility(long driveId,EvaluatePlacementEligibilityRequest r,long? ruleId,string status,string reason,string criteria,string academic,long actor)=>Exec("INSERT INTO placement_eligibility (drive_id,student_id,matched_rule_id,eligibility_status,student_cgpa,student_percentage,active_backlogs,criteria_snapshot,academic_snapshot,reason,evaluated_at,evaluated_by,created_by) VALUES (@driveId,@StudentId,@ruleId,@status,@StudentCgpa,@StudentPercentage,@ActiveBacklogs,@criteria,@academic,@reason,UTC_TIMESTAMP(),@actor,@actor) ON DUPLICATE KEY UPDATE matched_rule_id=@ruleId,eligibility_status=@status,student_cgpa=@StudentCgpa,student_percentage=@StudentPercentage,active_backlogs=@ActiveBacklogs,criteria_snapshot=@criteria,academic_snapshot=@academic,reason=@reason,evaluated_at=UTC_TIMESTAMP(),evaluated_by=@actor,updated_by=@actor,deleted_at=NULL,deleted_by=NULL",new{driveId,r.StudentId,r.StudentCgpa,r.StudentPercentage,r.ActiveBacklogs,ruleId,status,reason,criteria,academic,actor});
    public Task<int> InterviewResult(long id,PlacementInterviewResultRequest r,long actor)=>Exec("UPDATE placement_interviews SET interview_status='COMPLETED',interview_result=@InterviewResult,completed_at=@CompletedAt,score=@Score,max_score=@MaxScore,feedback=@Feedback,updated_by=@actor WHERE interview_id=@id",new{id,r.InterviewResult,r.CompletedAt,r.Score,r.MaxScore,r.Feedback,actor});
    public Task<int> Offer(long id,PlacementOfferRequest r,long actor)=>Exec("UPDATE placement_selections SET offer_status=@OfferStatus,offer_letter_path=COALESCE(@OfferLetterPath,offer_letter_path),offer_issued_at=CASE WHEN @OfferStatus='ISSUED' THEN UTC_TIMESTAMP() ELSE offer_issued_at END,offer_expires_at=CASE WHEN @OfferStatus='ISSUED' THEN @OfferExpiresAt ELSE offer_expires_at END,offer_responded_at=CASE WHEN @OfferStatus IN ('ACCEPTED','DECLINED') THEN UTC_TIMESTAMP() ELSE offer_responded_at END,expected_joining_date=COALESCE(@ExpectedJoiningDate,expected_joining_date),updated_by=@actor WHERE selection_id=@id",new{id,r.OfferStatus,r.OfferLetterPath,r.OfferExpiresAt,r.ExpectedJoiningDate,actor});
    public Task<int> Join(long id,long actor)=>Exec("UPDATE placement_selections SET joined_at=UTC_TIMESTAMP(),updated_by=@actor WHERE selection_id=@id",new{id,actor});
    public async Task<object> Lookups(long collegeId)
    {
        var companies=await Rows<object>("SELECT company_id CompanyId,company_code CompanyCode,company_name CompanyName FROM companies WHERE college_id=@collegeId AND status=1 AND deleted_at IS NULL ORDER BY company_name",new{collegeId});
        var years=await Rows<object>("SELECT academic_year_id AcademicYearId,academic_year_name AcademicYearName FROM academicyears WHERE deleted_at IS NULL ORDER BY start_date DESC");
        var students=await Rows<object>("SELECT student_id StudentId,student_code StudentCode,full_name FullName,course_id CourseId,branch_id BranchId FROM students WHERE college_id=@collegeId AND status=1 AND deleted_at IS NULL ORDER BY full_name",new{collegeId});
        return new{companies,academicYears=years,students};
    }
    public async Task<object> Dashboard(long collegeId)
    {
        var drives=await Scalar("SELECT COUNT(*) FROM placement_drives WHERE college_id=@collegeId AND deleted_at IS NULL",new{collegeId});
        var applications=await Scalar("SELECT COUNT(*) FROM placement_applications a JOIN placement_drives d ON d.drive_id=a.drive_id WHERE d.college_id=@collegeId AND d.deleted_at IS NULL AND a.deleted_at IS NULL",new{collegeId});
        var selected=await Scalar("SELECT COUNT(*) FROM placement_selections s JOIN placement_applications a ON a.application_id=s.application_id JOIN placement_drives d ON d.drive_id=a.drive_id WHERE d.college_id=@collegeId AND d.deleted_at IS NULL AND a.deleted_at IS NULL AND s.deleted_at IS NULL AND s.selection_status='SELECTED'",new{collegeId});
        return new{drives,applications,selected};
    }
}
