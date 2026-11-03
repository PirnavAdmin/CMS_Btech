using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using BTech.Data;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController]
[Microsoft.AspNetCore.Authorization.Authorize]
[Route("api/v1/transport-fees")]
public sealed class TransportFeesController : AdditionalApiControllerBase {
 public TransportFeesController(ApplicationDbContext db):base(new AdditionalApiStore(db)){}
 [HttpGet] public Task<IActionResult> GetAll()=>List("transport-fees");
 [HttpPost] public Task<IActionResult> Create([FromBody] JsonElement body)=>Create("transport-fees",body);
 [HttpGet("{id:long}")] public Task<IActionResult> GetById(long id)=>Get("transport-fees",id);
 [HttpPut("{id:long}")] public Task<IActionResult> UpdateById(long id,[FromBody] JsonElement body)=>Update("transport-fees",id,body);
 [HttpPost("assign")] public Task<IActionResult> Assign([FromBody] JsonElement body)=>Create("transport-fee-assignments",body);
 [HttpGet("student/{studentId:long}")] public Task<IActionResult> StudentFees(long studentId)=>List("transport-fee-assignments",studentId.ToString());
 [HttpGet("dues")] public Task<IActionResult> Dues()=>List("transport-fee-dues");
 [HttpGet("payments")] public Task<IActionResult> Payments()=>List("transport-fee-payments");
 [HttpGet("reports")] public async Task<IActionResult> Reports() { var p=await Store.ListAsync("transport-fee-payments",null,HttpContext.RequestAborted); var d=await Store.ListAsync("transport-fee-dues",null,HttpContext.RequestAborted); return Ok(new{success=true,data=new{paymentCount=p.Count,dueCount=d.Count,payments=p,dues=d}}); }
}
