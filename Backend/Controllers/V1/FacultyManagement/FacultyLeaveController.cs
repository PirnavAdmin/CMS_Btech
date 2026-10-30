using BTech.DTOs.FacultyLeave;
using BTech.Helpers;
using System.Security.Claims;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/faculty-leave")]
[Authorize]
public class FacultyLeaveController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<FacultyLeaveController> _logger;
    public FacultyLeaveController(IConfiguration configuration, ILogger<FacultyLeaveController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }
    private MySqlConnection Connection() => new(_configuration.GetConnectionString("DefaultConnection"));
    private long? CurrentUserId()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value;
        return long.TryParse(value, out var id) ? id : null;
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests([FromQuery] string? search, [FromQuery] string? facultyType, [FromQuery] string? department, [FromQuery] string? status)
    {
        const string sql = @"
SELECT r.leave_request_id AS id, r.request_code AS requestId, r.faculty_id AS facultyId,
       r.policy_id AS policyId, r.leave_type_id AS typeId, r.from_date AS `from`, r.to_date AS `to`,
       r.days, r.applied_on AS applied, r.decision_date AS decisionDate, r.reason, r.rejection_reason AS rejectionReason,
       r.status, f.faculty_code AS employeeId, f.faculty_name AS fullName, f.designation,
       d.department_name AS department,
       CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END AS employeeCategory,
       t.name AS leaveTypeName, t.code AS leaveTypeCode, p.name AS policyName
FROM faculty_leave_requests r
JOIN faculty f ON f.faculty_id = r.faculty_id
JOIN departments d ON d.department_id = f.department_id
LEFT JOIN faculty_leave_types t ON t.leave_type_id = r.leave_type_id
LEFT JOIN faculty_leave_policies p ON p.policy_id = r.policy_id
WHERE f.deleted_at IS NULL
  AND (@status IS NULL OR r.status = @status)
  AND (@facultyType IS NULL OR (CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END) = @facultyType)
  AND (@department IS NULL OR d.department_name = @department)
  AND (@search IS NULL OR r.request_code LIKE CONCAT('%',@search,'%') OR f.faculty_name LIKE CONCAT('%',@search,'%') OR f.faculty_code LIKE CONCAT('%',@search,'%') OR t.name LIKE CONCAT('%',@search,'%'))
ORDER BY r.applied_on DESC, r.leave_request_id DESC;";
        return await Query(sql, new { search = Null(search), facultyType = Null(facultyType), department = Null(department), status = Null(status) }, "Leave requests retrieved successfully.");
    }

    [HttpGet("requests/{id:long}")]
    public async Task<IActionResult> GetRequest(long id)
    {
        if (id <= 0) return BadRequest(new { success = false, message = "Invalid leave request ID." });
        const string sql = @"
SELECT r.leave_request_id AS id, r.request_code AS requestId, r.faculty_id AS facultyId,
       r.policy_id AS policyId, r.leave_type_id AS typeId, r.from_date AS `from`, r.to_date AS `to`,
       r.days, r.applied_on AS applied, r.decision_date AS decisionDate, r.reason, r.rejection_reason AS rejectionReason,
       r.status, f.faculty_code AS employeeId, f.faculty_name AS fullName, f.designation,
       d.department_name AS department, t.name AS leaveTypeName, t.code AS leaveTypeCode, p.name AS policyName
FROM faculty_leave_requests r
JOIN faculty f ON f.faculty_id=r.faculty_id
JOIN departments d ON d.department_id=f.department_id
LEFT JOIN faculty_leave_types t ON t.leave_type_id=r.leave_type_id
LEFT JOIN faculty_leave_policies p ON p.policy_id=r.policy_id
WHERE r.leave_request_id=@id LIMIT 1;";
        try
        {
            await using var c=Connection(); await c.OpenAsync();
            var row=await c.QueryFirstOrDefaultAsync(sql,new {id});
            return row is null ? NotFound(new {success=false,message="Leave request not found."}) : Ok(new {success=true,message="Leave request retrieved successfully.",data=row});
        }
        catch(MySqlException ex){return DbError(ex);}
    }

    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest([FromBody] FacultyLeaveRequestCreateRequest request)
    {
        if(request.FacultyId<=0 || string.IsNullOrWhiteSpace(request.PolicyId) || string.IsNullOrWhiteSpace(request.LeaveTypeId)) return BadRequest(new {success=false,message="Faculty, policy and leave type are required."});
        if(request.ToDate.Date < request.FromDate.Date) return BadRequest(new {success=false,message="To date must be on or after from date."});
        if(request.Days<=0) return BadRequest(new {success=false,message="Days must be greater than zero."});
        try
        {
            await using var c=Connection(); await c.OpenAsync();
            var faculty=await c.ExecuteScalarAsync<long?>("SELECT college_id FROM faculty WHERE faculty_id=@FacultyId AND deleted_at IS NULL LIMIT 1",new {request.FacultyId});
            if(faculty is null) return BadRequest(new {success=false,message="Faculty not found."});
            var type=await c.ExecuteScalarAsync<string?>("SELECT leave_type_id FROM faculty_leave_types WHERE leave_type_id=@LeaveTypeId AND status='Active' AND (college_id IS NULL OR college_id=@CollegeId) LIMIT 1",new {request.LeaveTypeId, CollegeId=faculty});
            if(type is null) return BadRequest(new {success=false,message="Active leave type not found."});
            var policy=await c.ExecuteScalarAsync<string?>(@"SELECT p.policy_id FROM faculty_leave_policies p
                JOIN faculty f ON f.faculty_id=@FacultyId AND f.deleted_at IS NULL
                WHERE p.policy_id=@PolicyId AND p.status='Active' AND p.from_date<=@FromDate AND p.to_date>=@ToDate
                  AND " + PolicyFacultyScopeSql + @"
                  AND EXISTS(SELECT 1 FROM faculty_leave_policy_entitlements e
                    WHERE e.policy_id=p.policy_id AND e.leave_type_id=@LeaveTypeId) LIMIT 1",
                new {request.PolicyId,request.FacultyId,request.LeaveTypeId,FromDate=request.FromDate.Date,ToDate=request.ToDate.Date});
            if(policy is null) return BadRequest(new {success=false,message="No active policy covers this faculty's college, employee type, department/branch, leave type and full requested date range."});
            var code=$"FL-{request.FromDate.Year}-{DateTime.UtcNow:MMddHHmmssfff}";
            const string sql=@"INSERT INTO faculty_leave_requests(request_code,faculty_id,policy_id,leave_type_id,from_date,to_date,days,applied_on,reason,status,created_at,created_by) VALUES(@Code,@FacultyId,@PolicyId,@LeaveTypeId,@FromDate,@ToDate,@Days,@AppliedOn,@Reason,'Pending',UTC_TIMESTAMP(),@CreatedBy); SELECT LAST_INSERT_ID();";
            var id=await c.ExecuteScalarAsync<long>(sql,new {Code=code,request.FacultyId,request.PolicyId,request.LeaveTypeId,FromDate=request.FromDate.Date,ToDate=request.ToDate.Date,request.Days,AppliedOn=(request.AppliedOn??DateTime.UtcNow).Date,request.Reason,CreatedBy=CurrentUserId()});
            return CreatedAtAction(nameof(GetRequest),new {id},new {success=true,message="Leave request created successfully.",data=new {id,requestId=code}});
        }
        catch(MySqlException ex){return DbError(ex);}
    }

    [HttpPut("requests/{id:long}/approve")]
    public Task<IActionResult> Approve(long id) => Decide(id,"Approved",null);

    [HttpPut("requests/{id:long}/reject")]
    public Task<IActionResult> Reject(long id,[FromBody] FacultyLeaveDecisionRequest request) => Decide(id,"Rejected",request.RejectionReason);

    private async Task<IActionResult> Decide(long id,string status,string? rejectionReason)
    {
        if(id<=0)return BadRequest(new {success=false,message="Invalid leave request ID."});
        if(status=="Rejected" && string.IsNullOrWhiteSpace(rejectionReason))return BadRequest(new {success=false,message="Rejection reason is required."});
        try
        {
            await using var c=Connection(); await c.OpenAsync();
            var row=await c.QueryFirstOrDefaultAsync<dynamic>("SELECT * FROM faculty_leave_requests WHERE leave_request_id=@id LIMIT 1",new{id});
            if(row is null)return NotFound(new {success=false,message="Leave request not found."});
            if((string)row.status!="Pending")return Conflict(new {success=false,message="Only Pending leave requests can be decided."});
            if(status=="Approved")
            {
                var balance=await c.QueryFirstOrDefaultAsync<dynamic>(@"SELECT e.entitlement, t.pay_category AS payCategory,
                    COALESCE((SELECT SUM(x.days) FROM faculty_leave_requests x WHERE x.faculty_id=@facultyId AND x.policy_id=@policyId AND x.leave_type_id=@typeId AND x.status='Approved'),0) AS used,
                    COALESCE((SELECT SUM(x.days) FROM faculty_leave_requests x WHERE x.faculty_id=@facultyId AND x.policy_id=@policyId AND x.leave_type_id=@typeId AND x.status='Pending' AND x.leave_request_id<>@id),0) AS pending
                    FROM faculty_leave_policy_entitlements e JOIN faculty_leave_types t ON t.leave_type_id=e.leave_type_id
                    WHERE e.policy_id=@policyId AND e.leave_type_id=@typeId LIMIT 1;",new{facultyId=(long)row.faculty_id,policyId=(string)row.policy_id,typeId=(string)row.leave_type_id,id});
                if(balance is null)return Conflict(new {success=false,message="Leave policy or balance is unavailable."});
                if((string)balance.payCategory!="Unpaid Leave" && balance.entitlement is not null && Convert.ToDecimal(balance.used)+Convert.ToDecimal(balance.pending)+Convert.ToDecimal(row.days)>Convert.ToDecimal(balance.entitlement)) return Conflict(new {success=false,message="Insufficient leave balance."});
            }
            const string sql=@"UPDATE faculty_leave_requests SET status=@Status,decision_date=UTC_TIMESTAMP(),rejection_reason=@Reason,updated_at=UTC_TIMESTAMP(),updated_by=@UpdatedBy WHERE leave_request_id=@id AND status='Pending';";
            var affected=await c.ExecuteAsync(sql,new{Status=status,Reason=status=="Rejected"?rejectionReason:null,UpdatedBy=CurrentUserId(),id});
            if(affected==0)return Conflict(new {success=false,message="Leave request was already decided."});
            return Ok(new {success=true,message=$"Leave request {status.ToLowerInvariant()} successfully.",data=new{id,status}});
        }
        catch(MySqlException ex){return DbError(ex);}
    }

    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] string? search,[FromQuery] string? facultyType,[FromQuery] string? department,[FromQuery] string? status)
    {
        const string sql = @"
SELECT r.leave_request_id AS id, r.request_code AS requestId, r.faculty_id AS facultyId,
       r.policy_id AS policyId, r.leave_type_id AS typeId, r.from_date AS `from`, r.to_date AS `to`,
       r.days, r.applied_on AS applied, r.decision_date AS decisionDate, r.reason, r.rejection_reason AS rejectionReason,
       r.status, f.faculty_code AS employeeId, f.faculty_name AS fullName, f.designation,
       d.department_name AS department, t.name AS leaveTypeName, t.code AS leaveTypeCode, p.name AS policyName
FROM faculty_leave_requests r
JOIN faculty f ON f.faculty_id=r.faculty_id
JOIN departments d ON d.department_id=f.department_id
LEFT JOIN faculty_leave_types t ON t.leave_type_id=r.leave_type_id
LEFT JOIN faculty_leave_policies p ON p.policy_id=r.policy_id
WHERE r.status IN ('Approved','Rejected','Cancelled')
  AND (@status IS NULL OR r.status=@status)
  AND (@facultyType IS NULL OR (CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END)=@facultyType)
  AND (@department IS NULL OR d.department_name=@department)
  AND (@search IS NULL OR r.request_code LIKE CONCAT('%',@search,'%') OR f.faculty_name LIKE CONCAT('%',@search,'%') OR f.faculty_code LIKE CONCAT('%',@search,'%') OR t.name LIKE CONCAT('%',@search,'%'))
ORDER BY r.decision_date DESC, r.leave_request_id DESC;";
        return await Query(sql,new { search=Null(search), facultyType=Null(facultyType), department=Null(department), status=Null(status) },"Leave history retrieved successfully.");
    }

    [HttpGet("balances")]
    public async Task<IActionResult> Balances([FromQuery] long? facultyId,[FromQuery] string? department,[FromQuery] string? facultyType,[FromQuery] string? search)
    {
        const string sql=@"
SELECT f.faculty_id AS facultyId,f.faculty_code AS employeeId,f.faculty_name AS fullName,f.designation,d.department_name AS department,
       CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END AS employeeCategory,
       p.policy_id AS policyId,p.name AS policyName,t.leave_type_id AS leaveTypeId,t.name AS leaveTypeName,t.code AS leaveTypeCode,t.pay_category AS payCategory,
       e.entitlement,COALESCE(SUM(CASE WHEN r.status='Approved' THEN r.days ELSE 0 END),0) AS used,
       COALESCE(SUM(CASE WHEN r.status='Pending' THEN r.days ELSE 0 END),0) AS pending
FROM faculty f JOIN departments d ON d.department_id=f.department_id
LEFT JOIN faculty_leave_policies p ON p.status='Active' AND p.from_date<=CURDATE() AND p.to_date>=CURDATE()
  AND " + PolicyFacultyScopeSql + @"
LEFT JOIN faculty_leave_policy_entitlements e ON e.policy_id=p.policy_id
LEFT JOIN faculty_leave_types t ON t.leave_type_id=e.leave_type_id AND (t.college_id IS NULL OR t.college_id=f.college_id)
LEFT JOIN faculty_leave_requests r ON r.faculty_id=f.faculty_id AND r.policy_id=p.policy_id AND r.leave_type_id=t.leave_type_id
WHERE f.deleted_at IS NULL AND (e.leave_type_id IS NULL OR t.leave_type_id IS NOT NULL) AND (@facultyId IS NULL OR f.faculty_id=@facultyId) AND (@department IS NULL OR d.department_name=@department)
AND (@facultyType IS NULL OR (CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END)=@facultyType)
AND (@search IS NULL OR f.faculty_name LIKE CONCAT('%',@search,'%') OR f.faculty_code LIKE CONCAT('%',@search,'%'))
GROUP BY f.faculty_id,f.faculty_code,f.faculty_name,f.designation,d.department_name,employeeCategory,p.policy_id,p.name,t.leave_type_id,t.name,t.code,t.pay_category,e.entitlement
ORDER BY f.faculty_name,t.name;";
        return await Query(sql,new{facultyId,department=Null(department),facultyType=Null(facultyType),search=Null(search)},"Leave balances retrieved successfully.");
    }

    [HttpGet("types")]
    public async Task<IActionResult> Types([FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] long? collegeId)
    {
        if (collegeId is <= 0)
            return BadRequest(new { success = false, message = "CollegeId must be a positive number." });
        // No college filter preserves the existing administrative list, including legacy shared types.
        return await Query(@"SELECT leave_type_id AS id, college_id AS collegeId, name, code,
            category, pay_category AS payCategory, description, status
            FROM faculty_leave_types
            WHERE (@collegeId IS NULL OR college_id=@collegeId)
              AND (@status IS NULL OR status=@status)
              AND (@search IS NULL OR name LIKE CONCAT('%',@search,'%') OR code LIKE CONCAT('%',@search,'%'))
            ORDER BY name", new { collegeId, status=Null(status), search=Null(search) },
            "Leave types retrieved successfully.");
    }

    [HttpPost("types")]
    public Task<IActionResult> CreateType([FromBody] FacultyLeaveTypeRequest request,
        [FromQuery] long? collegeId) => SaveType(null, request, collegeId);

    [HttpPut("types/{id}")]
    public Task<IActionResult> UpdateType(string id, [FromBody] FacultyLeaveTypeRequest request,
        [FromQuery] long? collegeId) => SaveType(id, request, collegeId);

    private async Task<IActionResult> SaveType(string? id, FacultyLeaveTypeRequest request, long? queryCollegeId)
    {
        var name=request.Name?.Trim() ?? "";
        var code=request.Code?.Trim().ToUpperInvariant() ?? "";
        if (name.Length == 0 || code.Length == 0)
            return BadRequest(new { success=false, message="Leave type name and code are required." });
        if (request.Status is not ("Active" or "Inactive"))
            return BadRequest(new { success=false, message="Status must be Active or Inactive." });
        if (request.PayCategory is not ("Paid Leave" or "Unpaid Leave" or "Policy Based"))
            return BadRequest(new { success=false, message="Invalid pay category." });
        long? collegeId = null;
        try
        {
            collegeId=CollegeSelection.Resolve(queryCollegeId, request.CollegeId);
            await using var c=Connection();
            await c.OpenAsync();
            if (id is not null)
            {
                var existing=await c.QuerySingleOrDefaultAsync<TypeScope>(
                    "SELECT college_id AS CollegeId FROM faculty_leave_types WHERE leave_type_id=@id", new { id });
                if (existing is null || (collegeId.HasValue && existing.CollegeId != collegeId))
                    return NotFound(new { success=false, message="Leave type not found in the selected college." });
                collegeId=existing.CollegeId;
            }
            else
            {
                collegeId ??= await c.ExecuteScalarAsync<long?>(
                    "SELECT college_id FROM users WHERE user_id=@UserId AND deleted_at IS NULL", new { UserId=CurrentUserId() });
                if (collegeId is null or <= 0)
                    return BadRequest(new { success=false, message="CollegeId is required to create a leave type." });
            }
            if (collegeId.HasValue && !await c.ExecuteScalarAsync<bool>(
                "SELECT EXISTS(SELECT 1 FROM colleges WHERE college_id=@collegeId AND deleted_at IS NULL AND status=1)", new { collegeId }))
                return BadRequest(new { success=false, message="Active college not found." });

            // Inactive types reserve their identity. This table does not support soft deletion.
            var duplicate=await c.QueryFirstOrDefaultAsync(@"SELECT leave_type_id AS id,
                college_id AS collegeId, name, code, status FROM faculty_leave_types
                WHERE college_id <=> @collegeId AND (name=@Name OR code=@Code)
                  AND (@id IS NULL OR leave_type_id<>@id) ORDER BY leave_type_id LIMIT 1",
                new { collegeId, Name=name, Code=code, id });
            if (duplicate is not null)
            {
                _logger.LogWarning("Leave type conflict. CollegeId={CollegeId}, ExistingTypeId={TypeId}, Status={Status}",
                    collegeId, (string)duplicate.id, (string)duplicate.status);
                return Conflict(new { success=false, code="LEAVE_TYPE_DUPLICATE",
                    message="Leave type name or code already exists in this college. Reactivate or edit an inactive type instead of creating a duplicate.",
                    conflict=duplicate, correlationId=HttpContext.TraceIdentifier });
            }
            var key=id ?? $"{code.ToLowerInvariant()}-{Guid.NewGuid():N}";
            var args=new { key, collegeId, Name=name, Code=code, request.Category, request.PayCategory,
                request.Description, request.Status, By=CurrentUserId() };
            if (id is null)
                await c.ExecuteAsync(@"INSERT INTO faculty_leave_types
                    (leave_type_id,college_id,name,code,category,pay_category,description,status,created_at,created_by)
                    VALUES(@key,@collegeId,@Name,@Code,@Category,@PayCategory,@Description,@Status,UTC_TIMESTAMP(),@By)", args);
            else
                await c.ExecuteAsync(@"UPDATE faculty_leave_types SET name=@Name,code=@Code,category=@Category,
                    pay_category=@PayCategory,description=@Description,status=@Status,updated_at=UTC_TIMESTAMP(),updated_by=@By
                    WHERE leave_type_id=@key AND college_id <=> @collegeId", args);
            _logger.LogInformation("Leave type saved. TypeId={TypeId}, CollegeId={CollegeId}, UserId={UserId}", key,collegeId,CurrentUserId());
            return Ok(new { success=true, message=id is null ? "Leave type created successfully." : "Leave type updated successfully.",
                data=new { id=key, collegeId } });
        }
        catch (ArgumentException ex) { return BadRequest(new { success=false, message=ex.Message }); }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            _logger.LogWarning("Concurrent leave type duplicate. CollegeId={CollegeId}", collegeId);
            return Conflict(new { success=false, code="LEAVE_TYPE_DUPLICATE",
                message="Leave type name or code already exists in this college.", collegeId });
        }
        catch (MySqlException ex) { return DbError(ex); }
    }

    private sealed class TypeScope
    {
        public long? CollegeId { get; set; }
    }

    [HttpGet("policies")]
    public async Task<IActionResult> Policies([FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] long? collegeId, [FromQuery] string? academicYear,
        [FromQuery] string? applicableTo, [FromQuery] long? departmentId, [FromQuery] long? branchId)
    {
        try
        {
            CollegeSelection.Resolve(collegeId, null);
            if (departmentId is <= 0 || branchId is <= 0) throw new ArgumentException("Scope IDs must be positive numbers.");
            var year=string.IsNullOrWhiteSpace(academicYear) ? null : NormalizePolicyYear(academicYear);
            var employeeType=string.IsNullOrWhiteSpace(applicableTo) ? null : NormalizePolicyType(applicableTo);
            return await Query(@"SELECT p.policy_id AS id,p.college_id AS collegeId,p.name,
                p.academic_year AS academicYear,p.applicable_to AS applicableTo,
                p.department_id AS departmentId,d.department_name AS departmentName,
                p.branch_id AS branchId,b.branch_name AS branchName,
                p.from_date AS `from`,p.to_date AS `to`,p.status,
                (SELECT COUNT(*) FROM faculty_leave_policy_entitlements e WHERE e.policy_id=p.policy_id) AS leaveTypes
                FROM faculty_leave_policies p
                LEFT JOIN departments d ON d.department_id=p.department_id
                LEFT JOIN branches b ON b.branch_id=p.branch_id
                WHERE (@collegeId IS NULL OR p.college_id=@collegeId)
                  AND (@year IS NULL OR fn_flp_academic_year_key(p.academic_year)=@year)
                  AND (@employeeType IS NULL OR fn_flp_employee_type(p.applicable_to)='Both' OR @employeeType='Both' OR fn_flp_employee_type(p.applicable_to)=@employeeType)
                  AND (@departmentId IS NULL OR p.department_id IS NULL OR p.department_id=@departmentId)
                  AND (@branchId IS NULL OR p.branch_id IS NULL OR p.branch_id=@branchId)
                  AND (@status IS NULL OR p.status=@status)
                  AND (@search IS NULL OR p.name LIKE CONCAT('%',@search,'%'))
                ORDER BY p.from_date DESC,p.name", new {collegeId,year,employeeType,departmentId,branchId,status=Null(status),search=Null(search)},
                "Leave policies retrieved successfully.");
        }
        catch (ArgumentException ex) { return BadRequest(new {success=false,message=ex.Message}); }
    }

    [HttpPost("policies")]
    public Task<IActionResult> CreatePolicy([FromBody] FacultyLeavePolicyRequest request,
        [FromQuery] long? collegeId) => SavePolicy(null,request,collegeId);

    [HttpPut("policies/{id}")]
    public Task<IActionResult> UpdatePolicy(string id,[FromBody] FacultyLeavePolicyRequest request,
        [FromQuery] long? collegeId) => SavePolicy(id,request,collegeId);

    private async Task<IActionResult> SavePolicy(string? id,FacultyLeavePolicyRequest request,long? queryCollegeId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.Entitlements is null || request.Entitlements.Count==0)
                throw new ArgumentException("Policy name and at least one entitlement are required.");
            var year=NormalizePolicyYear(request.AcademicYear);
            var employeeType=NormalizePolicyType(request.ApplicableTo);
            ValidatePolicyDates(request.FromDate,request.ToDate);
            var requestedCollege=CollegeSelection.Resolve(queryCollegeId,request.CollegeId);
            await using var c=Connection(); await c.OpenAsync();
            var before=id is null ? null : await ReadPolicy(c,id);
            if (id is not null && before is null) return NotFound(new {success=false,message="Leave policy not found."});
            if (before is not null && requestedCollege.HasValue && before.CollegeId!=requestedCollege)
                return NotFound(new {success=false,message="Leave policy not found in the selected college."});
            var collegeId=before?.CollegeId ?? requestedCollege ?? await c.ExecuteScalarAsync<long?>(
                "SELECT college_id FROM users WHERE user_id=@userId AND deleted_at IS NULL",new {userId=CurrentUserId()});
            if (collegeId is null or <=0) throw new ArgumentException("CollegeId is required to create a leave policy.");

            // Every activation and active edit uses the same college lock. ReadCommitted ensures a
            // waiter sees the preceding transaction's activation instead of an older snapshot.
            await using var tx=await c.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
            await LockPolicyCollege(c,tx,collegeId.Value);
            var existing=id is null ? null : await ReadPolicy(c,id,tx,true);
            if (id is not null && (existing is null || existing.CollegeId!=collegeId))
                return NotFound(new {success=false,message="Leave policy not found in the selected college."});
            var scope=new LeavePolicyState { Id=id??$"policy-{Guid.NewGuid():N}",Name=request.Name.Trim(),CollegeId=collegeId.Value,
                AcademicYear=year,ApplicableTo=employeeType,DepartmentId=request.DepartmentId,BranchId=request.BranchId,
                FromDate=request.FromDate.Date,ToDate=request.ToDate.Date,Status=existing?.Status??"Draft" };
            await ValidatePolicyScope(c,tx,scope);
            var uniqueTypes=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var e in request.Entitlements)
            {
                if (e is null || string.IsNullOrWhiteSpace(e.LeaveTypeId) || !uniqueTypes.Add(e.LeaveTypeId.Trim()))
                    throw new ArgumentException("Each entitlement must have a distinct leave type ID.");
                if (e.Entitlement<0 || e.MaxDays<0 || e.MaxCarryForward<0)
                    throw new ArgumentException("Leave entitlements and limits cannot be negative.");
                if (!await c.ExecuteScalarAsync<bool>(@"SELECT EXISTS(SELECT 1 FROM faculty_leave_types
                    WHERE leave_type_id=@id AND (college_id IS NULL OR college_id=@collegeId))",
                    new {id=e.LeaveTypeId.Trim(),collegeId},tx))
                    throw new ArgumentException($"Leave type '{e.LeaveTypeId}' is not available to this college.");
            }
            if (scope.Status.Equals("Active",StringComparison.OrdinalIgnoreCase))
            {
                var conflicts=await PolicyConflicts(c,tx,scope);
                if (conflicts.Count>0) return PolicyConflict(scope,conflicts);
            }
            var args=new {scope.Id,scope.CollegeId,scope.Name,scope.AcademicYear,scope.ApplicableTo,
                scope.DepartmentId,scope.BranchId,scope.FromDate,scope.ToDate,By=CurrentUserId()};
            if (id is null)
                await c.ExecuteAsync(@"INSERT INTO faculty_leave_policies
                    (policy_id,college_id,name,academic_year,applicable_to,department_id,branch_id,from_date,to_date,status,created_at,created_by)
                    VALUES(@Id,@CollegeId,@Name,@AcademicYear,@ApplicableTo,@DepartmentId,@BranchId,@FromDate,@ToDate,'Draft',UTC_TIMESTAMP(),@By)",args,tx);
            else
            {
                await c.ExecuteAsync(@"UPDATE faculty_leave_policies SET name=@Name,academic_year=@AcademicYear,applicable_to=@ApplicableTo,
                    department_id=@DepartmentId,branch_id=@BranchId,from_date=@FromDate,to_date=@ToDate,updated_at=UTC_TIMESTAMP(),updated_by=@By
                    WHERE policy_id=@Id AND college_id=@CollegeId",args,tx);
                await c.ExecuteAsync("DELETE FROM faculty_leave_policy_entitlements WHERE policy_id=@id",new{id},tx);
            }
            foreach (var e in request.Entitlements)
                await c.ExecuteAsync(@"INSERT INTO faculty_leave_policy_entitlements
                    (policy_id,leave_type_id,entitlement,max_days,carry_forward,max_carry_forward,document_required)
                    VALUES(@Id,@LeaveTypeId,@Entitlement,@MaxDays,@CarryForward,@MaxCarryForward,@DocumentRequired)",
                    new {scope.Id,LeaveTypeId=e.LeaveTypeId.Trim(),e.Entitlement,e.MaxDays,e.CarryForward,e.MaxCarryForward,e.DocumentRequired},tx);
            await tx.CommitAsync();
            _logger.LogInformation("Leave policy saved. PolicyId={PolicyId}, CollegeId={CollegeId}, Status={Status}",scope.Id,scope.CollegeId,scope.Status);
            return Ok(new {success=true,message=id is null?"Leave policy created successfully.":"Leave policy updated successfully.",
                data=new {id=scope.Id,collegeId=scope.CollegeId,status=scope.Status,academicYear=scope.AcademicYear,
                    applicableTo=scope.ApplicableTo,departmentId=scope.DepartmentId,branchId=scope.BranchId}});
        }
        catch (ArgumentException ex) { return BadRequest(new {success=false,message=ex.Message}); }
        catch (MySqlException ex) when (ex.Number is 1205 or 1213)
        { return Conflict(new {success=false,code="POLICY_BUSY",message="Another policy change is in progress. Retry this request."}); }
        catch (MySqlException ex) { return DbError(ex); }
    }

    [HttpPost("policies/{id}/activate")]
    public async Task<IActionResult> ActivatePolicy(string id,[FromQuery] long? collegeId)
    {
        try
        {
            CollegeSelection.Resolve(collegeId,null);
            await using var c=Connection(); await c.OpenAsync();
            var initial=await ReadPolicy(c,id);
            if (initial is null || (collegeId.HasValue && initial.CollegeId!=collegeId))
                return NotFound(new {success=false,message="Leave policy not found in the selected college."});
            await using var tx=await c.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
            await LockPolicyCollege(c,tx,initial.CollegeId);
            var policy=await ReadPolicy(c,id,tx,true);
            if (policy is null || policy.CollegeId!=initial.CollegeId)
                return NotFound(new {success=false,message="Leave policy not found in the selected college."});
            policy.AcademicYear=NormalizePolicyYear(policy.AcademicYear);
            policy.ApplicableTo=NormalizePolicyType(policy.ApplicableTo);
            ValidatePolicyDates(policy.FromDate,policy.ToDate);
            await ValidatePolicyScope(c,tx,policy);
            if (!await c.ExecuteScalarAsync<bool>("SELECT EXISTS(SELECT 1 FROM faculty_leave_policy_entitlements WHERE policy_id=@id)",new{id},tx))
                throw new ArgumentException("The leave policy needs at least one entitlement before activation.");
            if (await c.ExecuteScalarAsync<bool>(@"SELECT EXISTS(SELECT 1 FROM faculty_leave_policy_entitlements e
                JOIN faculty_leave_types t ON t.leave_type_id=e.leave_type_id
                WHERE e.policy_id=@id AND t.college_id IS NOT NULL AND t.college_id<>@CollegeId)",new{id,policy.CollegeId},tx))
                throw new ArgumentException("A leave policy entitlement belongs to another college.");
            var conflicts=await PolicyConflicts(c,tx,policy);
            if (conflicts.Count>0) return PolicyConflict(policy,conflicts);
            if (!policy.Status.Equals("Active",StringComparison.OrdinalIgnoreCase))
                await c.ExecuteAsync(@"UPDATE faculty_leave_policies SET status='Active',updated_at=UTC_TIMESTAMP(),updated_by=@By
                    WHERE policy_id=@id AND college_id=@CollegeId",new{id,policy.CollegeId,By=CurrentUserId()},tx);
            await tx.CommitAsync();
            _logger.LogInformation("Leave policy activated. PolicyId={PolicyId}, CollegeId={CollegeId}, AcademicYear={AcademicYear}",id,policy.CollegeId,policy.AcademicYear);
            return Ok(new {success=true,message="Leave policy activated successfully.",data=new{id,status="Active",collegeId=policy.CollegeId}});
        }
        catch (ArgumentException ex) { return BadRequest(new {success=false,message=ex.Message}); }
        catch (MySqlException ex) when (ex.Number is 1205 or 1213)
        { return Conflict(new {success=false,code="POLICY_BUSY",message="Another policy change is in progress. Retry this request."}); }
        catch (MySqlException ex) { return DbError(ex); }
    }

    private static string NormalizePolicyYear(string? value)
    {
        var v=System.Text.RegularExpressions.Regex.Replace((value??"").Trim().Replace('–','-').Replace('—','-').Replace('/','-'),@"\s","");
        var m=System.Text.RegularExpressions.Regex.Match(v,@"^([0-9]{4})-([0-9]{2}|[0-9]{4})$");
        if (!m.Success) throw new ArgumentException("AcademicYear must be a year range such as 2026-27 or 2026-2027.");
        var start=int.Parse(m.Groups[1].Value); var end=int.Parse(m.Groups[2].Value);
        if (m.Groups[2].Length==2) { end=start/100*100+end; if(end<start) end+=100; }
        if(start<1000 || end<=start || end>9999) throw new ArgumentException("AcademicYear must have a valid end year after its start year.");
        return $"{start}-{end}";
    }

    private static string NormalizePolicyType(string? value)
    {
        var v=System.Text.RegularExpressions.Regex.Replace((value??"").Trim().ToLowerInvariant(),@"[\s_-]","");
        return v switch {
            "both" or "all" => "Both",
            "teaching" or "teachingfaculty" or "teachingstaff" => "Teaching",
            "nonteaching" or "nonteachingfaculty" or "nonteachingstaff" => "Non-Teaching",
            _ => throw new ArgumentException("ApplicableTo must be Teaching, Non-Teaching or Both.")
        };
    }

    private static void ValidatePolicyDates(DateTime from,DateTime to)
    {
        if (from.Year<1000 || to.Year<1000 || from.Date>to.Date)
            throw new ArgumentException("Valid effective dates are required; FromDate must be on or before ToDate.");
    }

    private static async Task LockPolicyCollege(MySqlConnection c,MySqlTransaction tx,long collegeId)
    {
        var valid=await c.ExecuteScalarAsync<long?>(@"SELECT college_id FROM colleges
            WHERE college_id=@collegeId AND status=1 AND deleted_at IS NULL FOR UPDATE",new{collegeId},tx);
        if (valid is null) throw new ArgumentException("Active college not found.");
    }

    private static Task<LeavePolicyState?> ReadPolicy(MySqlConnection c,string id,MySqlTransaction? tx=null,bool forUpdate=false)
        => c.QuerySingleOrDefaultAsync<LeavePolicyState>(@"SELECT policy_id AS Id,name AS Name,college_id AS CollegeId,
            academic_year AS AcademicYear,applicable_to AS ApplicableTo,department_id AS DepartmentId,branch_id AS BranchId,
            from_date AS FromDate,to_date AS ToDate,status AS Status FROM faculty_leave_policies WHERE policy_id=@id"
            +(forUpdate?" FOR UPDATE":""),new{id},tx);

    private static async Task ValidatePolicyScope(MySqlConnection c,MySqlTransaction tx,LeavePolicyState policy)
    {
        if (policy.DepartmentId is <=0 || policy.BranchId is <=0) throw new ArgumentException("Scope IDs must be positive numbers or null for all.");
        if (policy.BranchId.HasValue)
        {
            var branch=await c.QuerySingleOrDefaultAsync<PolicyBranch>(@"SELECT b.department_id AS DepartmentId
                FROM branches b JOIN courses co ON co.course_id=b.course_id
                WHERE b.branch_id=@BranchId AND co.college_id=@CollegeId AND b.status=1 AND b.deleted_at IS NULL
                  AND co.deleted_at IS NULL",new{policy.BranchId,policy.CollegeId},tx);
            if(branch is null) throw new ArgumentException("Active branch not found in the selected college.");
            if(policy.DepartmentId.HasValue && branch.DepartmentId.HasValue && policy.DepartmentId!=branch.DepartmentId)
                throw new ArgumentException("The selected branch does not belong to the selected department.");
            policy.DepartmentId ??= branch.DepartmentId;
        }
        if (policy.DepartmentId.HasValue && !await c.ExecuteScalarAsync<bool>(@"SELECT EXISTS(SELECT 1 FROM departments
            WHERE department_id=@DepartmentId AND college_id=@CollegeId AND status=1 AND deleted_at IS NULL)",new{policy.DepartmentId,policy.CollegeId},tx))
            throw new ArgumentException("Active department not found in the selected college.");
    }

    private static async Task<List<LeavePolicyConflict>> PolicyConflicts(MySqlConnection c,MySqlTransaction tx,LeavePolicyState p)
        => (await c.QueryAsync<LeavePolicyConflict>("sp_faculty_leave_policy_find_conflicts",new{
            p_policy_id=p.Id,p_college_id=p.CollegeId,p_academic_year=p.AcademicYear,p_applicable_to=p.ApplicableTo,
            p_department_id=p.DepartmentId,p_branch_id=p.BranchId,p_from_date=p.FromDate.Date,p_to_date=p.ToDate.Date
        },tx,commandType:System.Data.CommandType.StoredProcedure)).ToList();

    private IActionResult PolicyConflict(LeavePolicyState requested,List<LeavePolicyConflict> conflicts)
    {
        _logger.LogWarning("Active leave policy conflict. PolicyId={PolicyId}, CollegeId={CollegeId}, ConflictingIds={ConflictingIds}",
            requested.Id,requested.CollegeId,string.Join(",",conflicts.Select(x=>x.Id)));
        var descriptions=string.Join("; ",conflicts.Select(x=>$"'{x.Name}' ({x.FromDate:yyyy-MM-dd} to {x.ToDate:yyyy-MM-dd})"));
        return Conflict(new {success=false,code="ACTIVE_POLICY_CONFLICT",
            message=$"Active Policy Conflict: {descriptions} overlaps this policy's college, academic year, employee type, organisational scope and effective dates.",
            conflicts,requestedScope=new{requested.CollegeId,requested.AcademicYear,requested.ApplicableTo,
                requested.DepartmentId,requested.BranchId,requested.FromDate,requested.ToDate},correlationId=HttpContext.TraceIdentifier});
    }

    private class LeavePolicyState
    {
        public string Id {get;set;}="";
        public string Name {get;set;}="";
        public long CollegeId {get;set;}
        public string AcademicYear {get;set;}="";
        public string ApplicableTo {get;set;}="Both";
        public long? DepartmentId {get;set;}
        public long? BranchId {get;set;}
        public DateTime FromDate {get;set;}
        public DateTime ToDate {get;set;}
        public string Status {get;set;}="Draft";
    }
    private sealed class LeavePolicyConflict : LeavePolicyState
    {
        public string? AcademicYearKey {get;set;}
        public long? EffectiveDepartmentId {get;set;}
        public string? DepartmentName {get;set;}
        public string? BranchName {get;set;}
    }
    private sealed class PolicyBranch {public long? DepartmentId {get;set;}}

    // Faculty has a home department; branch membership comes from its active teaching allocations.
    // A legacy allocation without an academic year applies across years.
    private const string PolicyFacultyScopeSql = @"
        p.college_id=f.college_id
        AND (fn_flp_employee_type(p.applicable_to)='Both' OR fn_flp_employee_type(p.applicable_to)=
            CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END)
        AND (COALESCE(p.department_id,(SELECT pb.department_id FROM branches pb WHERE pb.branch_id=p.branch_id)) IS NULL
            OR COALESCE(p.department_id,(SELECT pb.department_id FROM branches pb WHERE pb.branch_id=p.branch_id))=f.department_id)
        AND (p.branch_id IS NULL OR EXISTS(SELECT 1 FROM faculty_subject_allocations a
            LEFT JOIN academicyears ay ON ay.academic_year_id=a.academic_year_id
            WHERE a.faculty_id=f.faculty_id AND a.branch_id=p.branch_id AND a.status=1 AND a.deleted_at IS NULL
              AND (a.academic_year_id IS NULL OR fn_flp_academic_year_key(ay.academic_year_name)=fn_flp_academic_year_key(p.academic_year))))";

    private static string? Null(string? value)=>string.IsNullOrWhiteSpace(value)?null:value.Trim();
    private async Task<IActionResult> Query(string sql,object args,string message){try{await using var c=Connection();await c.OpenAsync();var rows=(await c.QueryAsync(sql,args)).ToList();return Ok(new{success=true,message,data=rows});}catch(MySqlException ex){return DbError(ex);}}
    private async Task<IActionResult> Query(string sql,object args,string message, bool unused=false)=>await Query(sql,args,message);
    private IActionResult DbError(MySqlException ex)
    {
        _logger.LogError(ex, "Faculty leave database error. CorrelationId={CorrelationId}", HttpContext.TraceIdentifier);
        return StatusCode(500, new { success=false, message="Unable to process faculty leave request.", correlationId=HttpContext.TraceIdentifier });
    }
}
