using BTech.Services;
using BTech.Services.Fees;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
namespace BTech.Controllers.V1;
[ApiController,Authorize,Route("api/v1/student-admissions")]
public sealed class AdmissionFeeLedgerController(IConfiguration configuration) : ControllerBase
{
    [HttpPost("{admissionId:long}/fee-ledger")]
    public async Task<IActionResult> Materialize(long admissionId)
    {
        if(!new[]{"SUPER_ADMIN","COLLEGE_ADMIN","PRINCIPAL","HOD"}.Any(x=>CollegeDataScope.HasRole(HttpContext,x)))
            throw new ContractException(403,"ADMISSION_ADMIN_REQUIRED","An authorized admission administrator must create fee installments.");
        var scope=CollegeDataScope.Resolve(HttpContext);
        await using var c=new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));await c.OpenAsync();
        await using var tx=await c.BeginTransactionAsync();
        var student=await c.ExecuteScalarAsync<long?>("SELECT student_id FROM students WHERE admission_id=@admissionId AND deleted_at IS NULL AND (@scope IS NULL OR college_id=@scope) FOR UPDATE",new{admissionId,scope},tx);
        if(student is null)return NotFound(new{success=false,message="Approved student not found."});
        var data=await AdmissionFeeLedger.EnsureAsync(c,tx,admissionId,student.Value,CollegeDataScope.Actor(HttpContext),HttpContext.TraceIdentifier);
        if(data is null)return NotFound(new{success=false,message="The admission has no academic fee plan snapshot."});
        await tx.CommitAsync();return Ok(new{success=true,data});
    }
}
