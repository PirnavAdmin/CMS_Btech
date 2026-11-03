using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Runtime.CompilerServices;
using BTech.DTOs.Placements;
using BTech.Repositories.Implementations;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class PlacementService : IPlacementService
{
    private readonly IPlacementRepository _repo;
    private readonly ILogger<PlacementService> _logger;
    public PlacementService(IPlacementRepository repo,ILogger<PlacementService> logger){_repo=repo;_logger=logger;}
    private async Task<T> Run<T>(long userId,long? collegeId,bool write,Func<PlacementSession,PlacementActor,Task<T>> action,CancellationToken ct,[CallerMemberName] string operation="")
    {
        long resolvedCollegeId=0;
        var data=await _repo.RunAsync(userId,collegeId,write,(s,a)=>
        {
            resolvedCollegeId=a.CollegeId;
            return action(s,a);
        },ct);
        // Log persisted outcomes only AFTER commit. Existing controller scope supplies correlation ID.
        if(write)
        {
            var (entity,id,state)=data switch
            {
                PlacementApplicationDto x => ("Application",x.ApplicationId,x.ApplicationStatus),
                PlacementSelectionDto x => ("Selection",x.SelectionId,x.SelectionStatus+"/"+x.OfferStatus+(x.JoinedAt.HasValue?"/JOINED":"")),
                PlacementInterviewDto x => ("Interview",x.InterviewId,x.InterviewStatus+"/"+x.InterviewResult),
                PlacementDriveDto x => ("Drive",x.DriveId,x.DriveStatus),
                _ => ("Placement",0L,"COMMITTED")
            };
            _logger.LogInformation("Placement mutation committed. Operation={Operation}, Entity={Entity}, EntityId={EntityId}, State={State}, ActorId={ActorId}, CollegeId={CollegeId}",operation,entity,id,state,userId,resolvedCollegeId);
        }
        return data;
    }
    private static void Id(long id){if(id<=0)throw new PlacementApiException(400,"Identifiers must be positive.");}
    private static (int skip,int size) Page(int page,int size)
    {
        if(page<1 || size<1 || size>200 || page>1000000)throw new PlacementApiException(400,"page must be 1..1000000; pageSize must be 1..200.");
        return ((page-1)*size,size);
    }
    private static string? Clean(string? value)=>string.IsNullOrWhiteSpace(value)?null:value.Trim();
    private static void Validate(object r)
    {
        var errors=new List<ValidationResult>();
        if(!Validator.TryValidateObject(r,new ValidationContext(r),errors,true))throw new PlacementApiException(400,string.Join(" ",errors.Select(x=>x.ErrorMessage)));
    }
    private static string Status(string? value,params string[] allowed)
    {
        var x=Clean(value)?.ToUpperInvariant();
        if(x is null || !allowed.Contains(x))throw new PlacementApiException(400,"Allowed values: "+string.Join(", ",allowed));
        return x;
    }
    private static string? Filter(string? x,params string[] allowed)=>Clean(x) is null?null:Status(x,allowed);
    private static void Currency(string currency){if(currency.Length!=3 || currency.Any(x=>x<'A'||x>'Z'))throw new PlacementApiException(400,"currencyCode must contain three alphabetic characters.");}
    private static void Precision(params decimal?[] values){if(values.Any(v=>v.HasValue && decimal.Round(v.Value,2)!=v.Value))throw new PlacementApiException(400,"Decimal values must have at most two fractional digits.");}
    private static void Date(DateTime value,string field){if(value==default)throw new PlacementApiException(400,field+" is required.");}
    private static void Url(string? value){if(value is not null && (!Uri.TryCreate(value,UriKind.Absolute,out var u)||u.Scheme is not ("https" or "http")))throw new PlacementApiException(400,"meetingUrl must be an absolute HTTP/HTTPS URL.");}
    private static void OpenDrive(PlacementDriveDto d)
    {
        if(d.DriveStatus is "COMPLETED" or "CANCELLED")throw new PlacementApiException(409,"The drive is completed or cancelled.");
    }
    private static void OpenApplication(PlacementApplicationDto a)
    {
        if(a.ApplicationStatus is "SELECTED" or "REJECTED" or "WITHDRAWN")throw new PlacementApiException(409,"The application is in a final state.");
    }
    public Task<object> Lookups(long userId,long? collegeId,CancellationToken ct)=>Run(userId,collegeId,false,(s,a)=>s.Lookups(a.CollegeId),ct);
    public Task<object> Dashboard(long userId,long? collegeId,CancellationToken ct)=>Run(userId,collegeId,false,(s,a)=>s.Dashboard(a.CollegeId),ct);
    public Task<List<PlacementDriveDto>> Drives(long userId,long? collegeId,long? companyId,long? academicYearId,string? status,string? search,int page,int pageSize,CancellationToken ct)
    {
        var p=Page(page,pageSize);if(companyId.HasValue)Id(companyId.Value);if(academicYearId.HasValue)Id(academicYearId.Value);
        var filter=Filter(status,"DRAFT","PUBLISHED","REGISTRATION_OPEN","REGISTRATION_CLOSED","ONGOING","COMPLETED","CANCELLED");
        if(search?.Length>200)throw new PlacementApiException(400,"search must not exceed 200 characters.");
        return Run(userId,collegeId,false,(s,a)=>s.Drives(a.CollegeId,companyId,academicYearId,filter,Clean(search),p.skip,p.size),ct);
    }
    public Task<PlacementDriveDto> Drive(long userId,long? collegeId,long id,CancellationToken ct){Id(id);return Run(userId,collegeId,false,(s,a)=>s.Drive(id,a.CollegeId),ct);}
    private static void ValidateDrive(SavePlacementDriveRequest r)
    {
        Validate(r);r.DriveCode=r.DriveCode.Trim();r.DriveName=r.DriveName.Trim();r.JobTitle=r.JobTitle.Trim();
        if(r.DriveCode.Length==0 || r.DriveName.Length==0 || r.JobTitle.Length==0)throw new PlacementApiException(400,"Drive code, drive name and job title are required.");
        r.CurrencyCode=r.CurrencyCode.Trim().ToUpperInvariant();Currency(r.CurrencyCode);
        r.EmploymentType=Status(r.EmploymentType,"FULL_TIME","INTERNSHIP","CONTRACT","APPRENTICESHIP");
        r.DriveType=Status(r.DriveType,"ON_CAMPUS","OFF_CAMPUS","POOLED","VIRTUAL");
        Precision(r.CtcMin,r.CtcMax,r.MonthlyStipend);Date(r.DriveStartAt,"driveStartAt");
        if(r.CtcMin>r.CtcMax || r.DriveEndAt<r.DriveStartAt || r.ApplicationCloseAt<r.ApplicationOpenAt || r.ApplicationOpenAt>r.DriveStartAt || r.ApplicationCloseAt>(r.DriveEndAt??r.DriveStartAt))
            throw new PlacementApiException(400,"Salary range or drive/application dates are inconsistent.");
        r.MeetingUrl=Clean(r.MeetingUrl);r.Venue=Clean(r.Venue);Url(r.MeetingUrl);
        if(r.DriveType=="VIRTUAL" && r.MeetingUrl is null)throw new PlacementApiException(400,"Virtual drives require meetingUrl.");
    }
    public Task<PlacementDriveDto> CreateDrive(long userId,long? collegeId,SavePlacementDriveRequest r,CancellationToken ct)
    {
        ValidateDrive(r);return Run(userId,collegeId,true,async(s,a)=>
        {
            await s.ValidateCompanyYear(r,a.CollegeId);var id=await s.CreateDrive(a.CollegeId,r,a.UserId);
            _logger.LogInformation("Placement drive created. DriveId={DriveId}, CollegeId={CollegeId}, ActorId={ActorId}",id,a.CollegeId,a.UserId);
            return await s.Drive(id,a.CollegeId);
        },ct);
    }
    public Task<PlacementDriveDto> UpdateDrive(long userId,long? collegeId,long id,SavePlacementDriveRequest r,CancellationToken ct)
    {
        Id(id);ValidateDrive(r);return Run(userId,collegeId,true,async(s,a)=>
        {
            var d=await s.Drive(id,a.CollegeId,true);OpenDrive(d);
            if(await s.HasApplications(id) || await s.HasEligibility(id))throw new PlacementApiException(409,"Drive details are locked after eligibility evaluations or applications. Create a new drive for changed details.");
            await s.ValidateCompanyYear(r,a.CollegeId);await s.UpdateDrive(id,a.CollegeId,r,a.UserId);return await s.Drive(id,a.CollegeId);
        },ct);
    }
    public Task<PlacementDriveDto> SetDriveStatus(long userId,long? collegeId,long id,PlacementStatusRequest r,CancellationToken ct)
    {
        Id(id);Validate(r);r.Status=Status(r.Status,"DRAFT","PUBLISHED","REGISTRATION_OPEN","REGISTRATION_CLOSED","ONGOING","COMPLETED","CANCELLED");
        return Run(userId,collegeId,true,async(s,a)=>
        {
            var d=await s.Drive(id,a.CollegeId,true);
            if(!PlacementWorkflowRules.CanDriveTransition(d.DriveStatus,r.Status))throw new PlacementApiException(409,"Invalid drive status transition.");
            if(r.Status=="REGISTRATION_OPEN")
            {
                if(!(await s.Rules(id)).Any(x=>x.Status==1))throw new PlacementApiException(409,"Add an active eligibility rule before opening registration.");
                if(d.ApplicationCloseAt<DateTime.UtcNow)throw new PlacementApiException(409,"The application deadline has passed.");
            }
            if(r.Status=="COMPLETED" && d.DriveStatus!="COMPLETED" && await s.HasUnresolvedApplications(id))throw new PlacementApiException(409,"Resolve all applications before completing the drive.");
            if(r.Status=="CANCELLED" && await s.HasApplications(id))throw new PlacementApiException(409,"A drive with applications cannot be cancelled through this endpoint.");
            await s.DriveStatus(id,r.Status,a.UserId);return await s.Drive(id,a.CollegeId);
        },ct);
    }
    public Task<object> DeleteDrive(long userId,long? collegeId,long id,CancellationToken ct)
    {
        Id(id);return Run<object>(userId,collegeId,true,async(s,a)=>
        {
            var d=await s.Drive(id,a.CollegeId,true);
            if(d.DriveStatus!="DRAFT" || await s.HasApplications(id) || await s.HasEligibility(id))throw new PlacementApiException(409,"Only an unused draft drive can be deleted.");
            await s.DeleteDrive(id,a.UserId);return new{driveId=id,deleted=true};
        },ct);
    }
    public Task<List<PlacementRuleDto>> Rules(long userId,long? collegeId,long driveId,CancellationToken ct)
    {Id(driveId);return Run(userId,collegeId,false,async(s,a)=>{await s.Drive(driveId,a.CollegeId);return await s.Rules(driveId);},ct);}
    public Task<PlacementRuleDto> Rule(long userId,long? collegeId,long driveId,long id,CancellationToken ct)
    {Id(driveId);Id(id);return Run(userId,collegeId,false,async(s,a)=>{await s.Drive(driveId,a.CollegeId);return await s.Rule(driveId,id);},ct);}
    private static void ValidateRule(SavePlacementRuleRequest r)
    {
        Validate(r);r.RuleName=r.RuleName.Trim();if(r.RuleName.Length==0)throw new PlacementApiException(400,"ruleName is required.");
        if(r.BranchId.HasValue && !r.CourseId.HasValue)throw new PlacementApiException(400,"courseId is required when branchId is supplied.");
        Precision(r.MinCgpa,r.MinPercentage,r.MinTenthPercentage,r.MinTwelfthPercentage);
    }
    private static async Task EditableRules(PlacementSession s,PlacementDriveDto d)
    {
        OpenDrive(d);if(await s.HasEligibility(d.DriveId) || await s.HasApplications(d.DriveId))throw new PlacementApiException(409,"Eligibility rules are locked after evaluations/applications to prevent stale eligibility. Create a new drive for changed criteria.");
    }
    public Task<PlacementRuleDto> CreateRule(long userId,long? collegeId,long driveId,SavePlacementRuleRequest r,CancellationToken ct)
    {Id(driveId);ValidateRule(r);return Run(userId,collegeId,true,async(s,a)=>{var d=await s.Drive(driveId,a.CollegeId,true);await EditableRules(s,d);await s.ValidateCourseBranch(r,a.CollegeId);var id=await s.CreateRule(driveId,r,a.UserId);return await s.Rule(driveId,id);},ct);}
    public Task<PlacementRuleDto> UpdateRule(long userId,long? collegeId,long driveId,long id,SavePlacementRuleRequest r,CancellationToken ct)
    {Id(driveId);Id(id);ValidateRule(r);return Run(userId,collegeId,true,async(s,a)=>{var d=await s.Drive(driveId,a.CollegeId,true);await EditableRules(s,d);await s.Rule(driveId,id);await s.ValidateCourseBranch(r,a.CollegeId);await s.UpdateRule(id,driveId,r,a.UserId);return await s.Rule(driveId,id);},ct);}
    public Task<object> DeleteRule(long userId,long? collegeId,long driveId,long id,CancellationToken ct)
    {Id(driveId);Id(id);return Run<object>(userId,collegeId,true,async(s,a)=>{var d=await s.Drive(driveId,a.CollegeId,true);await EditableRules(s,d);await s.Rule(driveId,id);await s.DeleteRule(id,a.UserId);return new{eligibilityRuleId=id,deleted=true};},ct);}
    public Task<List<PlacementEligibilityDto>> Eligibilities(long userId,long? collegeId,long driveId,string? status,int page,int pageSize,CancellationToken ct)
    {Id(driveId);var p=Page(page,pageSize);var filter=Filter(status,"PENDING","ELIGIBLE","NOT_ELIGIBLE");return Run(userId,collegeId,false,async(s,a)=>{await s.Drive(driveId,a.CollegeId);return await s.Eligibilities(driveId,filter,p.skip,p.size);},ct);}
    public Task<PlacementEligibilityDto> Eligibility(long userId,long? collegeId,long driveId,long studentId,CancellationToken ct)
    {Id(driveId);Id(studentId);return Run(userId,collegeId,false,async(s,a)=>{await s.Drive(driveId,a.CollegeId);await s.Student(studentId,a.CollegeId);return await s.Eligibility(driveId,studentId)??throw new PlacementApiException(404,"Eligibility has not been evaluated for this student.");},ct);}
    public Task<PlacementEligibilityDto> Evaluate(long userId,long? collegeId,long driveId,EvaluatePlacementEligibilityRequest r,CancellationToken ct)
    {
        Id(driveId);Validate(r);Precision(r.StudentCgpa,r.StudentPercentage,r.TenthPercentage,r.TwelfthPercentage);
        return Run(userId,collegeId,true,async(s,a)=>
        {
            var d=await s.Drive(driveId,a.CollegeId,true);OpenDrive(d);var student=await s.Student(r.StudentId,a.CollegeId);
            if((await s.Applications(a.CollegeId,driveId,r.StudentId,null,0,1)).Count>0)throw new PlacementApiException(409,"Eligibility cannot be rewritten after an application is submitted.");
            var rules=(await s.Rules(driveId)).Where(x=>x.Status==1).ToList();
            var placed=await s.AlreadyPlaced(r.StudentId);
            var outcome=PlacementWorkflowRules.Evaluate(rules,student,r,placed);
            await s.SaveEligibility(driveId,r,outcome.RuleId,outcome.Status,outcome.Reason,JsonSerializer.Serialize(new{rules}),JsonSerializer.Serialize(new{r.StudentCgpa,r.StudentPercentage,r.TenthPercentage,r.TwelfthPercentage,r.ActiveBacklogs,r.EducationGapYears,r.GraduationYear,student.CourseId,student.BranchId,alreadyPlaced=placed}),a.UserId);
            return (await s.Eligibility(driveId,r.StudentId))!;
        },ct);
    }
    public Task<BulkPlacementEligibilityResultDto> EvaluateBulk(long userId,long? collegeId,long driveId,BulkEvaluatePlacementEligibilityRequest r,CancellationToken ct)
    {
        Id(driveId);
        Validate(r);
        if(r.Students is null || r.Students.Count==0)throw new PlacementApiException(400,"Provide at least one student for bulk eligibility evaluation.");
        if(r.Students.Count>500)throw new PlacementApiException(400,"A maximum of 500 students can be evaluated in one request.");
        foreach(var studentRequest in r.Students)
        {
            if(studentRequest is null)throw new PlacementApiException(400,"The students list cannot contain null entries.");
            Validate(studentRequest);
            Id(studentRequest.StudentId);
            Precision(studentRequest.StudentCgpa,studentRequest.StudentPercentage,studentRequest.TenthPercentage,studentRequest.TwelfthPercentage);
        }
        if(r.Students.Select(x=>x.StudentId).Distinct().Count()!=r.Students.Count)
            throw new PlacementApiException(400,"Each studentId must appear only once in a bulk request.");

        return Run(userId,collegeId,true,async(s,a)=>
        {
            var drive=await s.Drive(driveId,a.CollegeId,true);
            OpenDrive(drive);
            var rules=(await s.Rules(driveId)).Where(x=>x.Status==1).ToList();
            var results=new List<BulkPlacementEligibilityItemDto>(r.Students.Count);
            foreach(var studentRequest in r.Students)
            {
                var student=await s.Student(studentRequest.StudentId,a.CollegeId);
                if((await s.Applications(a.CollegeId,driveId,studentRequest.StudentId,null,0,1)).Count>0)
                {
                    results.Add(new BulkPlacementEligibilityItemDto
                    {
                        StudentId=studentRequest.StudentId,
                        Saved=false,
                        EvaluationStatus="SKIPPED",
                        EligibilityStatus=(await s.Eligibility(driveId,studentRequest.StudentId))?.EligibilityStatus,
                        Message="Student has already applied to this drive; existing eligibility was not changed."
                    });
                    continue;
                }

                var placed=await s.AlreadyPlaced(studentRequest.StudentId);
                var outcome=PlacementWorkflowRules.Evaluate(rules,student,studentRequest,placed);
                await s.SaveEligibility(driveId,studentRequest,outcome.RuleId,outcome.Status,outcome.Reason,
                    JsonSerializer.Serialize(new{rules}),
                    JsonSerializer.Serialize(new{studentRequest.StudentCgpa,studentRequest.StudentPercentage,studentRequest.TenthPercentage,studentRequest.TwelfthPercentage,studentRequest.ActiveBacklogs,studentRequest.EducationGapYears,studentRequest.GraduationYear,student.CourseId,student.BranchId,alreadyPlaced=placed}),
                    a.UserId);
                var savedEligibility=await s.Eligibility(driveId,studentRequest.StudentId);
                results.Add(new BulkPlacementEligibilityItemDto
                {
                    StudentId=studentRequest.StudentId,
                    Saved=true,
                    EvaluationStatus="EVALUATED",
                    EligibilityStatus=outcome.Status,
                    MatchedRuleId=outcome.RuleId,
                    Message=outcome.Reason,
                    Eligibility=savedEligibility
                });
            }

            return new BulkPlacementEligibilityResultDto
            {
                DriveId=driveId,
                TotalStudents=results.Count,
                EvaluatedCount=results.Count(x=>x.Saved),
                EligibleCount=results.Count(x=>x.Saved && x.EligibilityStatus=="ELIGIBLE"),
                NotEligibleCount=results.Count(x=>x.Saved && x.EligibilityStatus=="NOT_ELIGIBLE"),
                PendingCount=results.Count(x=>x.Saved && x.EligibilityStatus=="PENDING"),
                SkippedCount=results.Count(x=>!x.Saved),
                Results=results
            };
        },ct);
    }

    public Task<List<PlacementApplicationDto>> Applications(long userId,long? collegeId,long? driveId,long? studentId,string? status,int page,int pageSize,CancellationToken ct)
    {
        var p=Page(page,pageSize);if(driveId.HasValue)Id(driveId.Value);if(studentId.HasValue)Id(studentId.Value);
        var filter=Filter(status,"APPLIED","UNDER_REVIEW","SHORTLISTED","INTERVIEW_SCHEDULED","IN_PROGRESS","ON_HOLD","SELECTED","REJECTED","WITHDRAWN");
        return Run(userId,collegeId,false,(s,a)=>s.Applications(a.CollegeId,driveId,studentId,filter,p.skip,p.size),ct);
    }
    public Task<PlacementApplicationDto> Application(long userId,long? collegeId,long id,CancellationToken ct){Id(id);return Run(userId,collegeId,false,(s,a)=>s.Application(id,a.CollegeId),ct);}
    public Task<PlacementApplicationDto> Apply(long userId,long? collegeId,long driveId,CreatePlacementApplicationRequest r,CancellationToken ct)
    {
        Id(driveId);Validate(r);return Run(userId,collegeId,true,async(s,a)=>
        {
            var d=await s.Drive(driveId,a.CollegeId,true);var student=await s.Student(r.StudentId,a.CollegeId);var now=DateTime.UtcNow;
            if(d.DriveStatus!="REGISTRATION_OPEN" || d.ApplicationOpenAt>now || d.ApplicationCloseAt<now)throw new PlacementApiException(409,"Drive registration is not currently open.");
            if(await s.ApplicationExists(driveId,r.StudentId))throw new PlacementApiException(409,"This student already has an application for this drive, including any withdrawn or archived application.");
            var e=await s.Eligibility(driveId,r.StudentId);
            if(e?.EligibilityStatus!="ELIGIBLE")throw new PlacementApiException(409,"Evaluate eligibility first. Only ELIGIBLE students can apply.");
            if(e.MatchedRuleId is null)throw new PlacementApiException(409,"Eligible rule information is missing. Verify eligibility.");
            var rule=await s.Rule(driveId,e.MatchedRuleId.Value);
            if((rule.CourseId.HasValue && rule.CourseId!=student.CourseId) || (rule.BranchId.HasValue && rule.BranchId!=student.BranchId))throw new PlacementApiException(409,"Student course/branch changed since eligibility. Re-evaluate eligibility before applying.");
            if(rule.Status!=1 || (rule.AllowAlreadyPlaced==0 && await s.AlreadyPlaced(r.StudentId)))throw new PlacementApiException(409,"The eligibility rule is inactive or the student is already placed.");
            var id=await s.CreateApplication(driveId,r,"APP-"+Guid.NewGuid().ToString("N"),a.UserId);return await s.Application(id,a.CollegeId);
        },ct);
    }
    public Task<PlacementApplicationDto> UpdateApplication(long userId,long? collegeId,long id,UpdatePlacementApplicationRequest r,CancellationToken ct)
    {Id(id);Validate(r);return Run(userId,collegeId,true,async(s,a)=>{var app=await s.Application(id,a.CollegeId,true);OpenApplication(app);OpenDrive(await s.Drive(app.DriveId,a.CollegeId,true));await s.UpdateApplication(id,r,a.UserId);return await s.Application(id,a.CollegeId);},ct);}
    public Task<PlacementApplicationDto> SetApplicationStatus(long userId,long? collegeId,long id,PlacementStatusRequest r,CancellationToken ct)
    {
        Id(id);Validate(r);r.Status=Status(r.Status,"UNDER_REVIEW","SHORTLISTED","ON_HOLD","WITHDRAWN");
        if(r.Status=="WITHDRAWN" && Clean(r.Reason) is null)throw new PlacementApiException(400,"A withdrawal reason is required.");
        return Run(userId,collegeId,true,async(s,a)=>
        {
            var app=await s.Application(id,a.CollegeId,true);OpenDrive(await s.Drive(app.DriveId,a.CollegeId,true));
            if(app.ApplicationStatus==r.Status)return app;
            if(await s.ApplicationSelection(id) is not null)throw new PlacementApiException(409,"An application with a selection decision must be updated through the selection API.");
            if(!PlacementWorkflowRules.CanApplicationTransition(app.ApplicationStatus,r.Status))throw new PlacementApiException(409,"Invalid application status transition. Use interview/selection APIs for interview and final decision states.");
            await s.ApplicationStatus(id,r.Status,a.UserId,r.Reason);
            if(r.Status=="WITHDRAWN")foreach(var i in await s.Interviews(id))if(i.InterviewStatus=="SCHEDULED")await s.InterviewCancel(i.InterviewId,"CANCELLED",a.UserId,"Application withdrawn");
            return await s.Application(id,a.CollegeId);
        },ct);
    }
    public Task<List<PlacementInterviewDto>> Interviews(long userId,long? collegeId,long applicationId,CancellationToken ct)
    {Id(applicationId);return Run(userId,collegeId,false,async(s,a)=>{await s.Application(applicationId,a.CollegeId);return await s.Interviews(applicationId);},ct);}
    public Task<List<PlacementInterviewDto>> InterviewList(long userId,long? collegeId,long? driveId,string? status,DateTime? from,DateTime? to,int page,int pageSize,CancellationToken ct)
    {var p=Page(page,pageSize);if(driveId.HasValue)Id(driveId.Value);if(from>to)throw new PlacementApiException(400,"from cannot be after to.");var filter=Filter(status,"SCHEDULED","COMPLETED","CANCELLED","NO_SHOW");return Run(userId,collegeId,false,(s,a)=>s.InterviewList(a.CollegeId,driveId,filter,from,to,p.skip,p.size),ct);}
    public Task<PlacementInterviewDto> Interview(long userId,long? collegeId,long id,CancellationToken ct){Id(id);return Run(userId,collegeId,false,(s,a)=>s.Interview(id,a.CollegeId),ct);}
    private static void ValidateInterview(SavePlacementInterviewRequest r)
    {
        Validate(r);r.RoundName=r.RoundName.Trim();if(r.RoundName.Length==0)throw new PlacementApiException(400,"roundName is required.");Date(r.ScheduledAt,"scheduledAt");
        if(r.ScheduledAt<DateTime.UtcNow)throw new PlacementApiException(400,"New or rescheduled interviews must be in the future.");
        r.RoundType=Status(r.RoundType,"APTITUDE","CODING","GROUP_DISCUSSION","TECHNICAL","HR","MANAGERIAL","OTHER");
        r.InterviewMode=Status(r.InterviewMode,"ONLINE","OFFLINE","TELEPHONE");r.Venue=Clean(r.Venue);r.MeetingUrl=Clean(r.MeetingUrl);Url(r.MeetingUrl);
        if(r.InterviewMode=="ONLINE" && r.MeetingUrl is null)throw new PlacementApiException(400,"Online interviews require meetingUrl.");
        if(r.InterviewMode=="OFFLINE" && r.Venue is null)throw new PlacementApiException(400,"Offline interviews require venue.");
    }
    private static void InterviewDates(PlacementDriveDto d,SavePlacementInterviewRequest r)
    {
        if(r.ScheduledAt<d.DriveStartAt || (d.DriveEndAt.HasValue && r.ScheduledAt>d.DriveEndAt))throw new PlacementApiException(400,"Interview must be scheduled within the drive dates.");
    }
    public Task<PlacementInterviewDto> CreateInterview(long userId,long? collegeId,long applicationId,SavePlacementInterviewRequest r,CancellationToken ct)
    {
        Id(applicationId);ValidateInterview(r);return Run(userId,collegeId,true,async(s,a)=>
        {
            var app=await s.Application(applicationId,a.CollegeId,true);OpenApplication(app);var d=await s.Drive(app.DriveId,a.CollegeId,true);OpenDrive(d);InterviewDates(d,r);
            if(app.ApplicationStatus is not ("SHORTLISTED" or "INTERVIEW_SCHEDULED" or "IN_PROGRESS" or "ON_HOLD"))throw new PlacementApiException(409,"Shortlist the application before scheduling an interview.");
            var existing=await s.Interviews(applicationId);
            if(existing.Any(x=>x.RoundNumber<r.RoundNumber && (x.InterviewStatus!="COMPLETED" || x.InterviewResult!="PASSED")) || (r.RoundNumber>1 && !existing.Any(x=>x.RoundNumber==r.RoundNumber-1 && x.InterviewResult=="PASSED")))throw new PlacementApiException(409,"Previous rounds must be completed and passed.");
            if(r.InterviewerUserId.HasValue)await s.ValidateStaff(r.InterviewerUserId.Value,a.CollegeId);
            var id=await s.CreateInterview(applicationId,r,a.UserId);await s.ApplicationStatus(applicationId,"INTERVIEW_SCHEDULED",a.UserId);return await s.Interview(id,a.CollegeId);
        },ct);
    }
    public Task<PlacementInterviewDto> UpdateInterview(long userId,long? collegeId,long id,SavePlacementInterviewRequest r,CancellationToken ct)
    {
        Id(id);ValidateInterview(r);return Run(userId,collegeId,true,async(s,a)=>
        {
            var i=await s.Interview(id,a.CollegeId,true);var app=await s.Application(i.ApplicationId,a.CollegeId,true);OpenApplication(app);var d=await s.Drive(app.DriveId,a.CollegeId,true);OpenDrive(d);InterviewDates(d,r);
            if(i.InterviewStatus!="SCHEDULED" || r.RoundNumber!=i.RoundNumber)throw new PlacementApiException(409,"Only scheduled interviews can be edited; roundNumber is immutable.");
            if(r.InterviewerUserId.HasValue)await s.ValidateStaff(r.InterviewerUserId.Value,a.CollegeId);
            await s.UpdateInterview(id,i.ApplicationId,r,a.UserId);return await s.Interview(id,a.CollegeId);
        },ct);
    }
    public Task<PlacementInterviewDto> InterviewResult(long userId,long? collegeId,long id,PlacementInterviewResultRequest r,CancellationToken ct)
    {
        Id(id);Validate(r);r.InterviewResult=Status(r.InterviewResult,"PASSED","FAILED","ON_HOLD");Date(r.CompletedAt,"completedAt");Precision(r.Score,r.MaxScore);
        if((r.Score.HasValue && (!r.MaxScore.HasValue || r.Score>r.MaxScore)) || r.CompletedAt>DateTime.UtcNow)throw new PlacementApiException(400,"Score must be within maxScore and completedAt cannot be in the future.");
        return Run(userId,collegeId,true,async(s,a)=>
        {
            var i=await s.Interview(id,a.CollegeId,true);var app=await s.Application(i.ApplicationId,a.CollegeId,true);OpenApplication(app);OpenDrive(await s.Drive(app.DriveId,a.CollegeId,true));
            if(i.InterviewStatus is not ("SCHEDULED" or "COMPLETED") || r.CompletedAt<i.ScheduledAt)throw new PlacementApiException(409,"Interview state or completion date is invalid.");
            if(i.InterviewStatus=="COMPLETED" && (await s.Interviews(i.ApplicationId)).Any(x=>x.RoundNumber>i.RoundNumber))throw new PlacementApiException(409,"A result cannot be changed after a later round exists.");
            await s.InterviewResult(id,r,a.UserId);await s.ApplicationStatus(i.ApplicationId,r.InterviewResult=="ON_HOLD"?"ON_HOLD":"IN_PROGRESS",a.UserId);return await s.Interview(id,a.CollegeId);
        },ct);
    }
    public Task<PlacementInterviewDto> SetInterviewStatus(long userId,long? collegeId,long id,PlacementStatusRequest r,CancellationToken ct)
    {
        Id(id);Validate(r);r.Status=Status(r.Status,"CANCELLED","NO_SHOW");
        return Run(userId,collegeId,true,async(s,a)=>
        {
            var i=await s.Interview(id,a.CollegeId,true);var app=await s.Application(i.ApplicationId,a.CollegeId,true);OpenApplication(app);OpenDrive(await s.Drive(app.DriveId,a.CollegeId,true));
            if(i.InterviewStatus!="SCHEDULED" || (r.Status=="NO_SHOW" && i.ScheduledAt>DateTime.UtcNow))throw new PlacementApiException(409,"Only scheduled interviews can be cancelled/marked no-show after their scheduled time.");
            await s.InterviewCancel(id,r.Status,a.UserId,r.Reason);await s.ApplicationStatus(i.ApplicationId,"ON_HOLD",a.UserId);return await s.Interview(id,a.CollegeId);
        },ct);
    }
    public Task<List<PlacementSelectionDto>> Selections(long userId,long? collegeId,long? driveId,long? studentId,string? status,int page,int pageSize,CancellationToken ct)
    {var p=Page(page,pageSize);if(driveId.HasValue)Id(driveId.Value);if(studentId.HasValue)Id(studentId.Value);var filter=Filter(status,"SELECTED","REJECTED","ON_HOLD");return Run(userId,collegeId,false,(s,a)=>s.Selections(a.CollegeId,driveId,studentId,filter,p.skip,p.size),ct);}
    public Task<PlacementSelectionDto> Selection(long userId,long? collegeId,long id,CancellationToken ct){Id(id);return Run(userId,collegeId,false,(s,a)=>s.Selection(id,a.CollegeId),ct);}
    public Task<PlacementSelectionDto> ApplicationSelection(long userId,long? collegeId,long applicationId,CancellationToken ct)
    {Id(applicationId);return Run(userId,collegeId,false,async(s,a)=>{await s.Application(applicationId,a.CollegeId);return await s.ApplicationSelection(applicationId)??throw new PlacementApiException(404,"No selection decision exists for this application.");},ct);}
    public Task<PlacementSelectionDto> SaveSelection(long userId,long? collegeId,long applicationId,SavePlacementSelectionRequest r,CancellationToken ct)
    {
        Id(applicationId);Validate(r);r.SelectionStatus=Status(r.SelectionStatus,"SELECTED","REJECTED","ON_HOLD");r.CurrencyCode=r.CurrencyCode.Trim().ToUpperInvariant();Currency(r.CurrencyCode);Precision(r.OfferedCtc,r.MonthlyStipend);
        return Run(userId,collegeId,true,async(s,a)=>
        {
            var app=await s.Application(applicationId,a.CollegeId,true);var d=await s.Drive(app.DriveId,a.CollegeId,true);OpenDrive(d);
            if(app.ApplicationStatus=="WITHDRAWN")throw new PlacementApiException(409,"A withdrawn application cannot receive a decision.");
            var old=await s.ApplicationSelection(applicationId);
            if(!PlacementWorkflowRules.CanSelectionTransition(old?.SelectionStatus,r.SelectionStatus,app.ApplicationStatus) || (old is not null && (old.OfferStatus!="NOT_ISSUED" || old.JoinedAt.HasValue)))
                throw new PlacementApiException(409,"Invalid selection transition. Final decisions cannot be overwritten; selection requires interview progress or a held application.");
            if(app.ApplicationStatus is "SELECTED" or "REJECTED")throw new PlacementApiException(409,"The application is already finalized.");
            if(r.SelectionStatus=="SELECTED")
            {
                var rounds=await s.Interviews(applicationId);
                if(rounds.Count==0 || rounds.Any(x=>x.InterviewStatus!="COMPLETED" || x.InterviewResult!="PASSED"))throw new PlacementApiException(409,"Selection requires all interview rounds to be completed and passed.");
                var e=await s.Eligibility(app.DriveId,app.StudentId);
                if(e?.EligibilityStatus!="ELIGIBLE" || e.MatchedRuleId is null)throw new PlacementApiException(409,"Student eligibility must be confirmed.");
                var rule=await s.Rule(app.DriveId,e.MatchedRuleId.Value);
                var student=await s.Student(app.StudentId,a.CollegeId);
                if((rule.CourseId.HasValue && rule.CourseId!=student.CourseId) || (rule.BranchId.HasValue && rule.BranchId!=student.BranchId))throw new PlacementApiException(409,"Student course/branch no longer satisfies the eligibility rule.");
                if(rule.Status!=1 || (rule.AllowAlreadyPlaced==0 && await s.AlreadyPlaced(app.StudentId,applicationId)))throw new PlacementApiException(409,"Rule is inactive or this student is already placed.");
                if(d.Vacancies.HasValue && await s.SelectedCount(app.DriveId,applicationId)>=d.Vacancies.Value)throw new PlacementApiException(409,"All drive vacancies have been filled.");
                if(Clean(r.OfferedJobTitle) is null)throw new PlacementApiException(400,"offeredJobTitle is required when selected.");
                if(r.ExpectedJoiningDate?.Date<DateTime.UtcNow.Date)throw new PlacementApiException(400,"Expected joining date cannot be in the past.");
            }
            var id=old?.SelectionId ?? await s.CreateSelection(applicationId,r,a.UserId);
            if(old is not null)await s.UpdateSelection(id,applicationId,r,a.UserId);
            await s.ApplicationStatus(applicationId,r.SelectionStatus,a.UserId);
            if(r.SelectionStatus=="REJECTED")foreach(var i in await s.Interviews(applicationId))if(i.InterviewStatus=="SCHEDULED")await s.InterviewCancel(i.InterviewId,"CANCELLED",a.UserId,"Application rejected");
            return await s.Selection(id,a.CollegeId);
        },ct);
    }
    public Task<PlacementSelectionDto> Offer(long userId,long? collegeId,long id,PlacementOfferRequest r,CancellationToken ct)
    {
        Id(id);Validate(r);r.OfferStatus=Status(r.OfferStatus,"ISSUED","ACCEPTED","DECLINED","EXPIRED","REVOKED");
        return Run(userId,collegeId,true,async(s,a)=>
        {
            var sel=await s.Selection(id,a.CollegeId,true);
            if(sel.SelectionStatus!="SELECTED" || sel.JoinedAt.HasValue || !PlacementWorkflowRules.CanOfferTransition(sel.OfferStatus,r.OfferStatus))throw new PlacementApiException(409,"Invalid offer transition or selection state.");
            var now=DateTime.UtcNow;
            var app=await s.Application(sel.ApplicationId,a.CollegeId,true);
            var drive=await s.Drive(app.DriveId,a.CollegeId,true);
            if(!PlacementWorkflowRules.CanContinueOffer(drive.DriveStatus,app.ApplicationStatus))throw new PlacementApiException(409,"Offer updates require a selected application in a drive that is not cancelled.");
            if(r.OfferStatus!="ISSUED" && (r.OfferLetterPath is not null || r.OfferExpiresAt.HasValue))throw new PlacementApiException(400,"Offer document and expiry can only be set when issuing the offer.");
            if(r.OfferStatus=="ISSUED" && r.OfferExpiresAt<=now)throw new PlacementApiException(400,"Offer expiry must be in the future.");
            if(r.OfferStatus is "ACCEPTED" or "DECLINED" && sel.OfferExpiresAt<=now)throw new PlacementApiException(409,"The offer has expired.");
            if(r.OfferStatus=="EXPIRED" && (!sel.OfferExpiresAt.HasValue || sel.OfferExpiresAt>now))throw new PlacementApiException(409,"The offer has not reached its expiry date.");
            if(r.ExpectedJoiningDate?.Date<now.Date)throw new PlacementApiException(400,"Expected joining date cannot be in the past.");
            await s.Offer(id,r,a.UserId);return await s.Selection(id,a.CollegeId);
        },ct);
    }
    public Task<PlacementSelectionDto> Join(long userId,long? collegeId,long id,CancellationToken ct)
    {
        Id(id);return Run(userId,collegeId,true,async(s,a)=>
        {
            var sel=await s.Selection(id,a.CollegeId,true);
            if(sel.SelectionStatus!="SELECTED" || sel.OfferStatus!="ACCEPTED" || sel.JoinedAt.HasValue)throw new PlacementApiException(409,"Only a selected student with an accepted offer can be marked joined once.");
            var app=await s.Application(sel.ApplicationId,a.CollegeId,true);
            var drive=await s.Drive(app.DriveId,a.CollegeId,true);
            if(!PlacementWorkflowRules.CanContinueOffer(drive.DriveStatus,app.ApplicationStatus))throw new PlacementApiException(409,"Joining requires a selected application in a drive that is not cancelled.");
            await s.Student(app.StudentId,a.CollegeId);
            await s.Join(id,a.UserId);return await s.Selection(id,a.CollegeId);
        },ct);
    }
}
