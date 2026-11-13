using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using BTech.Services;
namespace BTech.LibraryManagement;
[ApiController][Authorize][Route("api/v1/library")]
public sealed class LostBookFinesController : ControllerBase
{
 private readonly LostBookFineStore _store;private readonly ILogger<LostBookFinesController> _log;
 public LostBookFinesController(IConfiguration configuration,ILogger<LostBookFinesController> log){_store=new(configuration);_log=log;}
 private long College(long id){try{return CollegeDataScope.Resolve(HttpContext,id,required:true)!.Value;}catch(ContractException ex){throw new LibraryApiException(ex.StatusCode,ex.Message);}}
 private long Actor(){var value=User.FindFirst(ClaimTypes.NameIdentifier)?.Value??User.FindFirst("sub")?.Value??User.FindFirst("user_id")?.Value;if(!long.TryParse(value,out var id)||id<=0)throw new LibraryApiException(401,"Valid user identifier required.");return id;}
 private async Task<IActionResult> Run(Func<Task<object>> fn,int status=200){try{return StatusCode(status,new{success=true,data=await fn()});}catch(LibraryApiException ex){return StatusCode(ex.StatusCode,new{success=false,message=ex.Message});}catch(MySqlException ex) when(ex.Number is 1062 or 1451 or 1452 or 3819){return Conflict(new{success=false,message="Duplicate or invalid related record."});}catch(Exception ex){_log.LogError(ex,"Lost book fine operation failed");return StatusCode(500,new{success=false,message="Operation failed.",correlationId=HttpContext.TraceIdentifier});}}
 [HttpPost("issues/{issueId:long}/mark-lost")][ProducesResponseType(200)] public Task<IActionResult> MarkLost(long issueId,[FromBody] MarkLostBookRequest r)=>Run(async()=>{College(r.CollegeId);return await _store.MarkLost(issueId,r.CollegeId,Actor(),r.Remarks);});
 [HttpPost("lost-book-fines")][ProducesResponseType(201)] public Task<IActionResult> Create([FromBody] CreateLostBookFineRequest r)=>Run(async()=>{College(r.CollegeId);var id=await _store.Create(r,Actor());return (object)await _store.Detail(id,r.CollegeId);},201);
 [HttpGet("lost-book-fines")] public Task<IActionResult> List([FromQuery] long collegeId,[FromQuery] string? search=null,[FromQuery] string? paymentStatus=null,[FromQuery] int pageNumber=1,[FromQuery] int pageSize=10)=>Run(()=>{College(collegeId);return _store.List(collegeId,search,paymentStatus,pageNumber,pageSize);});
 [HttpGet("lost-book-fines/reports")] public Task<IActionResult> Reports([FromQuery] long collegeId,[FromQuery] string? paymentStatus=null)=>Run(()=>{College(collegeId);return _store.Report(collegeId,paymentStatus);});
 [HttpGet("lost-book-fines/reports/export")] public async Task<IActionResult> Export([FromQuery] long collegeId,[FromQuery] string? search=null,[FromQuery] string? paymentStatus=null){try{College(collegeId);var sb=new StringBuilder("Fine ID,Issue ID,Student ID,Student,Book,Accession,Fine Amount,Paid Amount,Balance,Payment Status\r\n");int page=1;while(true){dynamic result=await _store.List(collegeId,search,paymentStatus,page,200);foreach(dynamic item in result.items){string Csv(object? value){var s=Convert.ToString(value)??"";if(s.Length>0 && "=+-@".Contains(s[0]))s="'"+s;return "\""+s.Replace("\"","\"\"")+"\"";}sb.AppendLine(string.Join(",",new[]{Csv(item.fineId),Csv(item.issueId),Csv(item.studentCode),Csv(item.studentName),Csv(item.bookTitle),Csv(item.accessionNumber),Csv(item.fineAmount),Csv(item.paidAmount),Csv(item.balanceAmount),Csv(item.paymentStatus)}));}if(page*200>=result.totalRecords)break;page++;}return File(new UTF8Encoding(true).GetBytes(sb.ToString()),"text/csv","lost-book-fines.csv");}catch(LibraryApiException ex){return StatusCode(ex.StatusCode,new{success=false,message=ex.Message});}}
 [HttpGet("lost-book-fines/{id:long}")] public Task<IActionResult> Get(long id,[FromQuery] long collegeId)=>Run(async()=>{College(collegeId);return (object)await _store.Detail(id,collegeId);});
 [HttpPut("lost-book-fines/{id:long}")] public Task<IActionResult> Update(long id,[FromBody] UpdateLostBookFineRequest r)=>Run(async()=>{College(r.CollegeId);await _store.Update(id,r,Actor());return (object)await _store.Detail(id,r.CollegeId);});
 [HttpPost("lost-book-fines/{id:long}/payments")] public Task<IActionResult> Pay(long id,[FromBody] LostBookFinePaymentRequest r)=>Run(async()=>{College(r.CollegeId);var paymentId=await _store.Pay(id,r,Actor());return new{paymentId,fine=await _store.Detail(id,r.CollegeId)};},201);
 [HttpGet("lost-book-fines/{id:long}/payments")] public Task<IActionResult> Payments(long id,[FromQuery] long collegeId)=>Run(()=>{College(collegeId);return _store.Payments(id,collegeId);});
}
