using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using BTech.Data;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController]
[Microsoft.AspNetCore.Authorization.Authorize]
[Route("api/v1/results")]
public sealed class ResultsAdditionalController : AdditionalApiControllerBase {
 public ResultsAdditionalController(ApplicationDbContext db):base(new AdditionalApiStore(db)){}
 [HttpGet] public Task<IActionResult> GetAll()=>List("official-results");
 [HttpGet("students/{studentId:long}/transcript")] public Task<IActionResult> Transcript(long studentId)=>List("official-results",studentId.ToString());
 [HttpPost("publish")] public async Task<IActionResult> Publish([FromBody] JsonElement body) { var result=await Create("official-results",body,status:"Published"); return result; }
 [HttpGet("publication-history")] public Task<IActionResult> PublicationHistory()=>List("result-publication-history");
 [HttpGet("{id:long}")] public Task<IActionResult> GetById(long id)=>Get("official-results",id);
 [HttpPost("{id:long}/approve")] public Task<IActionResult> Approve(long id)=>Status("official-results",id,"Approved");
 [HttpPost("{id:long}/revoke-publication")] public Task<IActionResult> Revoke(long id)=>Status("official-results",id,"Revoked");
}
