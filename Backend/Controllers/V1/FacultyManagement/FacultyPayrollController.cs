using BTech.DTOs.FacultyPayroll;
using ClosedXML.Excel;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/faculty-payroll")]
[Authorize]
public class FacultyPayrollController : ControllerBase
{
    private readonly IConfiguration _configuration;
    public FacultyPayrollController(IConfiguration configuration)=>_configuration=configuration;
    private MySqlConnection Connection()=>new(_configuration.GetConnectionString("DefaultConnection"));
    private long? CurrentUserId(){var v=User.FindFirst("user_id")?.Value??User.FindFirst("sub")?.Value;return long.TryParse(v,out var id)?id:null;}

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery]string? month,[FromQuery]string? search,[FromQuery]string? facultyType,[FromQuery]string? department,[FromQuery]string? status)
    {
        month=string.IsNullOrWhiteSpace(month)?DateTime.UtcNow.ToString("yyyy-MM"):month;
        if(!DateTime.TryParse($"{month}-01",out var monthDate))return BadRequest(new{success=false,message="Invalid payroll month. Use yyyy-MM."});
        const string sql=@"
SELECT f.faculty_id AS id,f.faculty_code AS employeeId,f.faculty_name AS fullName,f.designation,d.department_name AS department,
CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END AS type,
COUNT(a.attendance_id) AS working,SUM(CASE WHEN UPPER(a.status)='PRESENT' THEN 1 ELSE 0 END) AS present,
SUM(CASE WHEN UPPER(a.status)='LATE' THEN 1 ELSE 0 END) AS late,SUM(CASE WHEN UPPER(a.status) IN ('HALF DAY','HALF_DAY') THEN 1 ELSE 0 END) AS halfDay,
SUM(CASE WHEN UPPER(a.status) IN ('LEAVE','ON LEAVE') THEN 1 ELSE 0 END) AS paidLeave,SUM(CASE WHEN UPPER(a.status)='LOP' THEN 1 ELSE 0 END) AS lop,
p.payroll_id AS payrollId,p.status, p.gross_salary AS grossSalary,p.deductions,p.net_salary AS netSalary,p.hold_reason AS holdReason
FROM faculty f JOIN departments d ON d.department_id=f.department_id
LEFT JOIN faculty_attendance a ON a.faculty_id=f.faculty_id AND DATE_FORMAT(a.attendance_date,'%Y-%m')=@month
LEFT JOIN faculty_payroll p ON p.faculty_id=f.faculty_id AND p.payroll_month=@MonthDate
WHERE f.deleted_at IS NULL AND (@search IS NULL OR f.faculty_name LIKE CONCAT('%',@search,'%') OR f.faculty_code LIKE CONCAT('%',@search,'%'))
AND (@facultyType IS NULL OR (CASE WHEN UPPER(COALESCE(f.employment_type,'')) LIKE '%NON%' THEN 'Non-Teaching' ELSE 'Teaching' END)=@facultyType)
AND (@department IS NULL OR d.department_name=@department) AND (@status IS NULL OR COALESCE(p.status,'Draft')=@status)
GROUP BY f.faculty_id,f.faculty_code,f.faculty_name,f.designation,d.department_name,type,p.payroll_id,p.status,p.gross_salary,p.deductions,p.net_salary,p.hold_reason
ORDER BY f.faculty_name;";
        try{await using var c=Connection();await c.OpenAsync();var rows=(await c.QueryAsync(sql,new{month,MonthDate=monthDate.Date,search=Null(search),facultyType=Null(facultyType),department=Null(department),status=Null(status)})).ToList();return Ok(new{success=true,message="Faculty payroll retrieved successfully.",data=rows});}catch(MySqlException ex){return DbError(ex);}
    }

    [HttpGet("{payrollId:long}")]
    public async Task<IActionResult> GetById(long payrollId){if(payrollId<=0)return BadRequest(new{success=false,message="Invalid payroll ID."});try{await using var c=Connection();await c.OpenAsync();var row=await c.QueryFirstOrDefaultAsync("SELECT * FROM faculty_payroll WHERE payroll_id=@payrollId LIMIT 1",new{payrollId});return row is null?NotFound(new{success=false,message="Payroll record not found."}):Ok(new{success=true,message="Payroll record retrieved successfully.",data=row});}catch(MySqlException ex){return DbError(ex);}}

    [HttpGet("salary-records")]
    public async Task<IActionResult> SalaryRecords([FromQuery]string? month)=>await GetSalaryOrPayslips(month,false);
    [HttpGet("payslips")]
    public async Task<IActionResult> Payslips([FromQuery]string? month)=>await GetSalaryOrPayslips(month,true);

    private async Task<IActionResult> GetSalaryOrPayslips(string? month,bool payslip){month=string.IsNullOrWhiteSpace(month)?DateTime.UtcNow.ToString("yyyy-MM"):month;if(!DateTime.TryParse($"{month}-01",out var md))return BadRequest(new{success=false,message="Invalid payroll month. Use yyyy-MM."});try{await using var c=Connection();await c.OpenAsync();var rows=await c.QueryAsync(@"SELECT p.payroll_id AS id,p.payroll_month AS payrollMonth,f.faculty_code AS employeeId,f.faculty_name AS fullName,f.designation,d.department_name AS department,p.status,p.gross_salary AS grossSalary,p.deductions,p.net_salary AS netSalary,p.hold_reason AS holdReason FROM faculty_payroll p JOIN faculty f ON f.faculty_id=p.faculty_id JOIN departments d ON d.department_id=f.department_id WHERE p.payroll_month=@md ORDER BY f.faculty_name",new{md=md.Date});return Ok(new{success=true,message=payslip?"Payslips retrieved successfully.":"Salary records retrieved successfully.",data=rows});}catch(MySqlException ex){return DbError(ex);}}

    [HttpPut("{payrollId:long}/hold")]
    public async Task<IActionResult> Hold(long payrollId,[FromBody]FacultyPayrollHoldRequest request){if(payrollId<=0||string.IsNullOrWhiteSpace(request.Reason))return BadRequest(new{success=false,message="Payroll ID and hold reason are required."});try{await using var c=Connection();await c.OpenAsync();var n=await c.ExecuteAsync("UPDATE faculty_payroll SET status='Hold',hold_reason=@Reason,updated_at=UTC_TIMESTAMP(),updated_by=@By WHERE payroll_id=@payrollId",new{payrollId,request.Reason,By=CurrentUserId()});return n==0?NotFound(new{success=false,message="Payroll record not found."}):Ok(new{success=true,message="Payroll placed on hold successfully.",data=new{payrollId,status="Hold"}});}catch(MySqlException ex){return DbError(ex);}}

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery]string? month){month=string.IsNullOrWhiteSpace(month)?DateTime.UtcNow.ToString("yyyy-MM"):month;if(!DateTime.TryParse($"{month}-01",out var md))return BadRequest(new{success=false,message="Invalid payroll month. Use yyyy-MM."});try{await using var c=Connection();await c.OpenAsync();var rows=(await c.QueryAsync(@"SELECT f.faculty_code AS employeeId,f.faculty_name AS employee,d.department_name AS department,p.payroll_month AS payrollMonth,p.status,p.gross_salary AS grossSalary,p.deductions,p.net_salary AS netSalary FROM faculty_payroll p JOIN faculty f ON f.faculty_id=p.faculty_id JOIN departments d ON d.department_id=f.department_id WHERE p.payroll_month=@md ORDER BY f.faculty_name",new{md=md.Date})).ToList();using var wb=new XLWorkbook();var ws=wb.Worksheets.Add("Faculty Payroll");var headers=new[]{"employee_id","employee","department","payroll_month","status","gross_salary","deductions","net_salary"};for(var i=0;i<headers.Length;i++)ws.Cell(1,i+1).Value=headers[i];var r=2;foreach(var x in rows){ws.Cell(r,1).Value=(string)x.employeeId;ws.Cell(r,2).Value=(string)x.employee;ws.Cell(r,3).Value=(string)x.department;ws.Cell(r,4).Value=(DateTime)x.payrollMonth;ws.Cell(r,4).Style.DateFormat.Format="yyyy-mm";ws.Cell(r,5).Value=(string?)x.status??"Draft";ws.Cell(r,6).Value=x.grossSalary is null?0:Convert.ToDecimal(x.grossSalary);ws.Cell(r,7).Value=x.deductions is null?0:Convert.ToDecimal(x.deductions);ws.Cell(r,8).Value=x.netSalary is null?0:Convert.ToDecimal(x.netSalary);r++;}ws.Range(1,1,1,headers.Length).Style.Font.Bold=true;ws.Columns().AdjustToContents();ws.SheetView.FreezeRows(1);using var ms=new MemoryStream();wb.SaveAs(ms);return File(ms.ToArray(),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",$"faculty-payroll-{month}.xlsx");}catch(MySqlException ex){return DbError(ex);}}

    private static string? Null(string? v)=>string.IsNullOrWhiteSpace(v)?null:v.Trim();
    private IActionResult DbError(MySqlException ex)=>StatusCode(500,new{success=false,message="Unable to process faculty payroll.",error=ex.Message});
}
