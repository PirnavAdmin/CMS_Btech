using BTech.DTOs.FacultyLeave;
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
    public FacultyLeaveController(IConfiguration configuration) => _configuration = configuration;
    private MySqlConnection Connection() => new(_configuration.GetConnectionString("DefaultConnection"));
    private long? CurrentUserId()
    {
        var value = User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value;
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
            var faculty=await c.ExecuteScalarAsync<long?>("SELECT faculty_id FROM faculty WHERE faculty_id=@FacultyId AND deleted_at IS NULL LIMIT 1",new {request.FacultyId});
            if(faculty is null) return BadRequest(new {success=false,message="Faculty not found."});
            var type=await c.ExecuteScalarAsync<string?>("SELECT leave_type_id FROM faculty_leave_types WHERE leave_type_id=@LeaveTypeId AND status='Active' LIMIT 1",new {request.LeaveTypeId});
            if(type is null) return BadRequest(new {success=false,message="Active leave type not found."});
            var policy=await c.ExecuteScalarAsync<string?>("SELECT policy_id FROM faculty_leave_policies WHERE policy_id=@PolicyId AND status='Active' AND from_date<=@Date AND to_date>=@Date LIMIT 1",new {request.PolicyId,Date=request.FromDate.Date});
            if(policy is null) return BadRequest(new {success=false,message="Active leave policy not found for the selected date."});
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
LEFT JOIN faculty_leave_policies p ON p.status='Active' AND p.from_date<=CURDATE() AND p.to_date>=CURDATE() AND (p.applicable_to='Both' OR p.applicable_to=(CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END))
LEFT JOIN faculty_leave_policy_entitlements e ON e.policy_id=p.policy_id
LEFT JOIN faculty_leave_types t ON t.leave_type_id=e.leave_type_id
LEFT JOIN faculty_leave_requests r ON r.faculty_id=f.faculty_id AND r.policy_id=p.policy_id AND r.leave_type_id=t.leave_type_id
WHERE f.deleted_at IS NULL AND (@facultyId IS NULL OR f.faculty_id=@facultyId) AND (@department IS NULL OR d.department_name=@department)
AND (@facultyType IS NULL OR (CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END)=@facultyType)
AND (@search IS NULL OR f.faculty_name LIKE CONCAT('%',@search,'%') OR f.faculty_code LIKE CONCAT('%',@search,'%'))
GROUP BY f.faculty_id,f.faculty_code,f.faculty_name,f.designation,d.department_name,employeeCategory,p.policy_id,p.name,t.leave_type_id,t.name,t.code,t.pay_category,e.entitlement
ORDER BY f.faculty_name,t.name;";
        return await Query(sql,new{facultyId,department=Null(department),facultyType=Null(facultyType),search=Null(search)},"Leave balances retrieved successfully.");
    }

    [HttpGet("types")]
    public Task<IActionResult> Types([FromQuery] string? search,[FromQuery] string? status)
        => Query("SELECT leave_type_id AS id,name,code,category,pay_category AS payCategory,description,status FROM faculty_leave_types WHERE (@status IS NULL OR status=@status) AND (@search IS NULL OR name LIKE CONCAT('%',@search,'%') OR code LIKE CONCAT('%',@search,'%')) ORDER BY name",new{status=Null(status),search=Null(search)},"Leave types retrieved successfully.");

    [HttpPost("types")]
    public async Task<IActionResult> CreateType([FromBody] FacultyLeaveTypeRequest request)
        => await SaveType(null,request);

    [HttpPut("types/{id}")]
    public async Task<IActionResult> UpdateType(string id,[FromBody] FacultyLeaveTypeRequest request)
        => await SaveType(id,request);

    private async Task<IActionResult> SaveType(string? id,FacultyLeaveTypeRequest request)
    {
        var name=request.Name.Trim();var code=request.Code.Trim().ToUpperInvariant();
        if(string.IsNullOrWhiteSpace(name)||string.IsNullOrWhiteSpace(code))return BadRequest(new{success=false,message="Leave type name and code are required."});
        try{await using var c=Connection();await c.OpenAsync();
            var duplicate=await c.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM faculty_leave_types WHERE (LOWER(name)=LOWER(@Name) OR code=@Code) AND (@Id IS NULL OR leave_type_id<>@Id)",new{Name=name,Code=code,Id=id});
            if(duplicate>0)return Conflict(new{success=false,message="Leave type name and code must be unique."});
            var key=id??$"{code.ToLowerInvariant()}-{Guid.NewGuid():N}";
            if(id is null){await c.ExecuteAsync("INSERT INTO faculty_leave_types(leave_type_id,name,code,category,pay_category,description,status,created_at,created_by) VALUES(@key,@Name,@Code,@Category,@PayCategory,@Description,@Status,UTC_TIMESTAMP(),@By)",new{key,Name=name,Code=code,request.Category,request.PayCategory,request.Description,request.Status,By=CurrentUserId()});}
            else {var n=await c.ExecuteAsync("UPDATE faculty_leave_types SET name=@Name,code=@Code,category=@Category,pay_category=@PayCategory,description=@Description,status=@Status,updated_at=UTC_TIMESTAMP(),updated_by=@By WHERE leave_type_id=@key",new{key,Name=name,Code=code,request.Category,request.PayCategory,request.Description,request.Status,By=CurrentUserId()});if(n==0)return NotFound(new{success=false,message="Leave type not found."});}
            return Ok(new{success=true,message=id is null?"Leave type created successfully.":"Leave type updated successfully.",data=new{id=key}});
        }catch(MySqlException ex){return DbError(ex);}
    }

    [HttpGet("policies")]
    public Task<IActionResult> Policies([FromQuery]string? search,[FromQuery]string? status)
        => Query("SELECT p.policy_id AS id,p.name,p.academic_year AS academicYear,p.applicable_to AS applicableTo,p.from_date AS `from`,p.to_date AS `to`,p.status,COUNT(e.leave_type_id) AS leaveTypes FROM faculty_leave_policies p LEFT JOIN faculty_leave_policy_entitlements e ON e.policy_id=p.policy_id WHERE (@status IS NULL OR p.status=@status) AND (@search IS NULL OR p.name LIKE CONCAT('%',@search,'%')) GROUP BY p.policy_id,p.name,p.academic_year,p.applicable_to,p.from_date,p.to_date,p.status ORDER BY p.from_date DESC,p.name",new{status=Null(status),search=Null(search)},"Leave policies retrieved successfully.");

    [HttpPost("policies")]
    public Task<IActionResult> CreatePolicy([FromBody] FacultyLeavePolicyRequest request) => SavePolicy(null,request);

    [HttpPut("policies/{id}")]
    public Task<IActionResult> UpdatePolicy(string id,[FromBody] FacultyLeavePolicyRequest request) => SavePolicy(id,request);

    private async Task<IActionResult> SavePolicy(string? id,FacultyLeavePolicyRequest request)
    {
        if(string.IsNullOrWhiteSpace(request.Name)||string.IsNullOrWhiteSpace(request.AcademicYear)||request.FromDate.Date>request.ToDate.Date||request.Entitlements.Count==0)return BadRequest(new{success=false,message="Policy name, academic year, valid dates and at least one entitlement are required."});
        try{await using var c=Connection();await c.OpenAsync();await using var tx=await c.BeginTransactionAsync();
            var key=id??$"policy-{Guid.NewGuid():N}";
            if(id is null) await c.ExecuteAsync("INSERT INTO faculty_leave_policies(policy_id,name,academic_year,applicable_to,from_date,to_date,status,created_at,created_by) VALUES(@key,@Name,@AcademicYear,@ApplicableTo,@FromDate,@ToDate,'Draft',UTC_TIMESTAMP(),@By)",new{key,request.Name,request.AcademicYear,request.ApplicableTo,FromDate=request.FromDate.Date,ToDate=request.ToDate.Date,By=CurrentUserId()},tx);
            else {var n=await c.ExecuteAsync("UPDATE faculty_leave_policies SET name=@Name,academic_year=@AcademicYear,applicable_to=@ApplicableTo,from_date=@FromDate,to_date=@ToDate,updated_at=UTC_TIMESTAMP(),updated_by=@By WHERE policy_id=@key",new{key,request.Name,request.AcademicYear,request.ApplicableTo,FromDate=request.FromDate.Date,ToDate=request.ToDate.Date,By=CurrentUserId()},tx);if(n==0){await tx.RollbackAsync();return NotFound(new{success=false,message="Leave policy not found."});}await c.ExecuteAsync("DELETE FROM faculty_leave_policy_entitlements WHERE policy_id=@key",new{key},tx);}
            foreach(var e in request.Entitlements) await c.ExecuteAsync("INSERT INTO faculty_leave_policy_entitlements(policy_id,leave_type_id,entitlement,max_days,carry_forward,max_carry_forward,document_required) VALUES(@key,@LeaveTypeId,@Entitlement,@MaxDays,@CarryForward,@MaxCarryForward,@DocumentRequired)",new{key,e.LeaveTypeId,e.Entitlement,e.MaxDays,e.CarryForward,e.MaxCarryForward,e.DocumentRequired},tx);
            await tx.CommitAsync();return Ok(new{success=true,message=id is null?"Leave policy created successfully.":"Leave policy updated successfully.",data=new{id=key,status="Draft"}});
        }catch(MySqlException ex){return DbError(ex);}
    }

    [HttpPost("policies/{id}/activate")]
    public async Task<IActionResult> ActivatePolicy(string id)
    {
        try{await using var c=Connection();await c.OpenAsync();var p=await c.QueryFirstOrDefaultAsync<dynamic>("SELECT * FROM faculty_leave_policies WHERE policy_id=@id LIMIT 1",new{id});if(p is null)return NotFound(new{success=false,message="Leave policy not found."});
            var conflict=await c.ExecuteScalarAsync<long>(@"SELECT COUNT(*) FROM faculty_leave_policies x WHERE x.policy_id<>@id AND x.status='Active' AND (x.applicable_to='Both' OR @ApplicableTo='Both' OR x.applicable_to=@ApplicableTo) AND x.from_date<=@ToDate AND x.to_date>=@FromDate",new{id,ApplicableTo=(string)p.applicable_to,FromDate=(DateTime)p.from_date,ToDate=(DateTime)p.to_date});if(conflict>0)return Conflict(new{success=false,message="Active Policy Conflict: an overlapping active policy already exists."});
            await c.ExecuteAsync("UPDATE faculty_leave_policies SET status='Active',updated_at=UTC_TIMESTAMP(),updated_by=@By WHERE policy_id=@id",new{id,By=CurrentUserId()});return Ok(new{success=true,message="Leave policy activated successfully.",data=new{id,status="Active"}});
        }catch(MySqlException ex){return DbError(ex);}
    }

    private static string? Null(string? value)=>string.IsNullOrWhiteSpace(value)?null:value.Trim();
    private async Task<IActionResult> Query(string sql,object args,string message){try{await using var c=Connection();await c.OpenAsync();var rows=(await c.QueryAsync(sql,args)).ToList();return Ok(new{success=true,message,data=rows});}catch(MySqlException ex){return DbError(ex);}}
    private async Task<IActionResult> Query(string sql,object args,string message, bool unused=false)=>await Query(sql,args,message);
    private IActionResult DbError(MySqlException ex)=>StatusCode(500,new{success=false,message="Unable to process faculty leave request.",error=ex.Message});
}
