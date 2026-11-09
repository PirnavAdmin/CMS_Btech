using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using BTech.Data;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController]
[Microsoft.AspNetCore.Authorization.Authorize]
[Route("api/v1/hostel-fees")]
public sealed class HostelFeesController : AdditionalApiControllerBase {
 public HostelFeesController(ApplicationDbContext db):base(new AdditionalApiStore(db)){}
 [HttpGet] public Task<IActionResult> GetAll()=>List("hostel-fees");
 [HttpPost] public Task<IActionResult> Create([FromBody] JsonElement body)=>Create("hostel-fees",body);
 [HttpGet("{id:long}")] public Task<IActionResult> GetById(long id)=>Get("hostel-fees",id);
 [HttpPut("{id:long}")] public Task<IActionResult> UpdateById(long id,[FromBody] JsonElement body)=>Update("hostel-fees",id,body);
 [HttpDelete("{id:long}")] public Task<IActionResult> DeleteById(long id)=>Delete("hostel-fees",id);
 [HttpPost("assign")] public Task<IActionResult> Assign([FromBody] JsonElement body)=>Create("hostel-fee-assignments",body);
 [HttpGet("student/{studentId:long}")] public Task<IActionResult> StudentFees(long studentId)=>List("hostel-fee-assignments",studentId.ToString());
 [HttpGet("dues")] public Task<IActionResult> Dues()=>List("hostel-fee-dues");
 [HttpPost("collect")] public Task<IActionResult> Collect([FromBody] JsonElement body)=>Create("hostel-fee-payments",body,status:"Paid");
 [HttpGet("payments")] public Task<IActionResult> Payments()=>List("hostel-fee-payments");
 [HttpGet("reports")] public Task<IActionResult> Reports() => throw BTech.Services.CollegeDataScope.NotImplemented("Hostel fee reporting");
 [HttpGet("{id:long}/payments")] public Task<IActionResult> FeePayments(long id)=>List("hostel-fee-payments",id.ToString());
 [HttpGet("{id:long}/receipts")] public Task<IActionResult> Receipts(long id)=>List("hostel-fee-receipts",id.ToString());
 [HttpGet("{id:long}/history")] public Task<IActionResult> History(long id)=>List("hostel-fee-history",id.ToString());
 [HttpPost("{id:long}/refund")] public Task<IActionResult> Refund(long id,[FromBody] JsonElement body)=>Create("hostel-fee-refunds",body,id.ToString(),"Requested");
}
