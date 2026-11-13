using System.Data;
using System.Globalization;
using BTech.Services;
using BTech.DTOs.FacultyPayroll;
using ClosedXML.Excel;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
namespace BTech.Controllers.V1.FacultyManagement;
[ApiController, Authorize, Route("api/v1/faculty-payroll")]
public sealed class FacultyPayrollController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<FacultyPayrollController> _log;
    public FacultyPayrollController(IConfiguration config,ILogger<FacultyPayrollController> log){_config=config;_log=log;}
    private MySqlConnection Db()=>new(_config.GetConnectionString("DefaultConnection"));
    private bool Admin()=>new[]{"SUPER_ADMIN","COLLEGE_ADMIN","PRINCIPAL","HOD"}.Any(x=>CollegeDataScope.HasRole(HttpContext,x));
    private long? College(long? id=null)=>CollegeDataScope.Resolve(HttpContext,id);
    private long? Own()=>Admin()?null:CollegeDataScope.Actor(HttpContext);
    private static DateTime Month(string? month)=>DateTime.TryParseExact(month??DateTime.UtcNow.ToString("yyyy-MM"),"yyyy-MM",CultureInfo.InvariantCulture,DateTimeStyles.None,out var d)?d.Date:throw new ArgumentException("month must be yyyy-MM.");
    private async Task<List<dynamic>> Read(string? month,string view,long? id=null)
    {
        await using var c=Db();await c.OpenAsync();
        return (await c.QueryAsync("sp_payroll_read",new {p_college=College(),p_own_user=Own(),p_month=id.HasValue?(DateTime?)null:Month(month),p_id=id,p_view=view},commandType:CommandType.StoredProcedure)).ToList();
    }
    private async Task<IActionResult> List(string? month,string view,string message)
    {
        try{return Ok(new{success=true,message,data=await Read(month,view)});}
        catch(ArgumentException ex){return BadRequest(new{success=false,message=ex.Message});}
        catch(MySqlException ex){return Error(ex);}
    }
    [HttpGet] public async Task<IActionResult> Get([FromQuery]string? month,[FromQuery]string? search,[FromQuery]string? facultyType,[FromQuery]string? department,[FromQuery]string? status)
    {
        try
        {
            var rows=await Read(month,"PROCESSING");
            var data=rows.Where(r=> (string.IsNullOrWhiteSpace(search)||
                ((string)r.fullName).Contains(search,StringComparison.OrdinalIgnoreCase)||
                ((string)r.employeeId).Contains(search,StringComparison.OrdinalIgnoreCase)) &&
                (string.IsNullOrWhiteSpace(facultyType)||(string)r.type==facultyType) &&
                (string.IsNullOrWhiteSpace(department)||(string)r.department==department) &&
                (string.IsNullOrWhiteSpace(status)||(string)r.status==status)).ToList();
            return Ok(new{success=true,message="Faculty payroll retrieved successfully.",data});
        }
        catch(ArgumentException ex){return BadRequest(new{success=false,message=ex.Message});}
        catch(MySqlException ex){return Error(ex);}
    }
    [HttpGet("salary-records")] public Task<IActionResult> SalaryRecords([FromQuery]string? month)=>List(month,"SALARY","Salary records retrieved successfully.");
    [HttpGet("payslips")] public Task<IActionResult> Payslips([FromQuery]string? month)=>List(month,"PAYSLIPS","Payslips retrieved successfully.");
    [HttpGet("{payrollId:long}")]
    public async Task<IActionResult> GetById(long payrollId)
    {
        if(payrollId<=0)return BadRequest(new{success=false,message="Invalid payroll ID."});
        try{var row=(await Read(null,"DETAIL",payrollId)).FirstOrDefault();return row is null?NotFound(new{success=false,message="Payroll record not found."}):Ok(new{success=true,message="Payroll record retrieved successfully.",data=row});}
        catch(MySqlException ex){return Error(ex);}
    }
    [HttpPost("salary-records")] public Task<IActionResult> CreateSalary([FromBody]PayrollSalaryRequest request)=>Save(null,request);
    [HttpPut("{payrollId:long}/salary")] public Task<IActionResult> UpdateSalary(long payrollId,[FromBody]PayrollSalaryRequest request)=>Save(payrollId,request);
    private async Task<IActionResult> Save(long? id,PayrollSalaryRequest request)
    {
        if(!Admin())return Forbid();
        try
        {
            var m=Month(request.PayrollMonth);
            if(request.FacultyId<=0||request.PayDate.Date<m||request.Deductions>request.GrossSalary||request.GrossSalary<0||request.Deductions<0)
                return BadRequest(new{success=false,message="Valid faculty, payday and amounts are required."});
            var college=College(request.CollegeId);if(college is null)return BadRequest(new{success=false,message="Select a college."});
            await using var c=Db();await c.OpenAsync();
            var result=await c.QuerySingleAsync("sp_payroll_save",new{p_id=id,p_college=college,p_faculty=request.FacultyId,p_month=m,p_gross=request.GrossSalary,p_deductions=request.Deductions,p_payday=request.PayDate.Date,p_revision=request.RevisionNo,p_actor=CollegeDataScope.Actor(HttpContext)},commandType:CommandType.StoredProcedure);
            var row=(await Read(null,"DETAIL",Convert.ToInt64(result.payrollId))).First();
            return StatusCode(id.HasValue?200:201,new{success=true,message=id.HasValue?"Salary updated successfully.":"Salary created successfully.",data=row});
        }
        catch(ArgumentException ex){return BadRequest(new{success=false,message=ex.Message});}
        catch(MySqlException ex){return Error(ex);}
    }
    [HttpPost("{payrollId:long}/process")] public Task<IActionResult> Process(long payrollId,[FromBody]PayrollRevisionRequest request)=>Change(payrollId,"PROCESS",request.RevisionNo,null,null);
    [HttpPost("{payrollId:long}/confirm-payment")] public Task<IActionResult> Pay(long payrollId,[FromBody]PayrollPaymentRequest request)=>Change(payrollId,"PAY",request.RevisionNo,null,request.PaymentReference);
    [HttpPut("{payrollId:long}/release-hold")] public Task<IActionResult> ReleaseHold(long payrollId,[FromBody]PayrollRevisionRequest request)=>Change(payrollId,"RELEASE_HOLD",request.RevisionNo,null,null);
    [HttpPut("{payrollId:long}/hold")]
    public async Task<IActionResult> Hold(long payrollId,[FromBody]FacultyPayrollHoldRequest request)
    {
        if(!Admin())return Forbid();
        if(string.IsNullOrWhiteSpace(request.Reason))return BadRequest(new{success=false,message="Hold reason required."});
        try{var row=(await Read(null,"DETAIL",payrollId)).FirstOrDefault();return row is null?NotFound(new{success=false,message="Payroll not found."}):await Change(payrollId,"HOLD",Convert.ToInt32(row.revisionNo),request.Reason,null);}
        catch(MySqlException ex){return Error(ex);}
    }
    private async Task<IActionResult> Change(long id,string action,int revision,string? reason,string? reference)
    {
        if(!Admin())return Forbid();
        if(id<=0||revision<=0||action=="PAY"&&string.IsNullOrWhiteSpace(reference))return BadRequest(new{success=false,message="Valid payroll ID, revision and payment reference required."});
        try
        {
            var college=College();if(college is null)return BadRequest(new{success=false,message="Select a college."});
            await using var c=Db();await c.OpenAsync();
            await c.QuerySingleAsync("sp_payroll_transition",new{p_id=id,p_college=college,p_actor=CollegeDataScope.Actor(HttpContext),p_action=action,p_reason=reason,p_reference=reference?.Trim(),p_revision=revision},commandType:CommandType.StoredProcedure);
            var row=(await Read(null,"DETAIL",id)).First();
            _log.LogInformation("Payroll {Action} id={PayrollId} college={CollegeId} correlation={CorrelationId}",action,id,college,HttpContext.TraceIdentifier);
            return Ok(new{success=true,message="Payroll status updated successfully.",data=row});
        }
        catch(MySqlException ex){return Error(ex);}
    }
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery]string? month)
    {
        try
        {
            var rows=await Read(month,"PAYSLIPS");using var wb=new XLWorkbook();var ws=wb.Worksheets.Add("Released Payslips");
            var heads=new[]{"Employee","Month","Payday","Paid at UTC","Gross","Deductions","Net"};
            for(int i=0;i<heads.Length;i++)ws.Cell(1,i+1).Value=heads[i];int n=2;
            foreach(var x in rows){ws.Cell(n,1).Value=(string)x.employeeId;ws.Cell(n,2).Value=(string)x.payrollMonth;ws.Cell(n,3).Value=(string)x.payDate;ws.Cell(n,4).Value=(string)x.paidAt;ws.Cell(n,5).Value=Convert.ToDecimal(x.grossSalary);ws.Cell(n,6).Value=Convert.ToDecimal(x.deductions);ws.Cell(n,7).Value=Convert.ToDecimal(x.netSalary);n++;}
            ws.Range(1,1,1,heads.Length).Style.Font.Bold=true;using var stream=new MemoryStream();wb.SaveAs(stream);
            return File(stream.ToArray(),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",$"faculty-payslips-{Month(month):yyyy-MM}.xlsx");
        }
        catch(ArgumentException ex){return BadRequest(new{success=false,message=ex.Message});}
        catch(MySqlException ex){return Error(ex);}
    }
    private IActionResult Error(MySqlException ex)
    {
        _log.LogError(ex,"Payroll database error {Code} correlation={CorrelationId}",ex.Number,HttpContext.TraceIdentifier);
        var conflict=ex.Number==1062||ex.SqlState=="45000";
        return StatusCode(conflict?409:500,new{success=false,message=ex.Number==1062?"Duplicate salary or payment reference.":conflict?ex.Message:"Payroll operation failed.",correlationId=HttpContext.TraceIdentifier});
    }
}
