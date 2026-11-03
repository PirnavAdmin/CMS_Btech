using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using BTech.Data;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController]
[Microsoft.AspNetCore.Authorization.Authorize]
[Route("api/v1/grade-policies")]
public sealed class GradePoliciesController : AdditionalApiControllerBase {
 public GradePoliciesController(ApplicationDbContext db):base(new AdditionalApiStore(db)){}
 [HttpGet] public Task<IActionResult> GetAll()=>List("grade-policies");
 [HttpPost] public Task<IActionResult> Create([FromBody] JsonElement body)=>Create("grade-policies",body);
 [HttpGet("{id:long}")] public Task<IActionResult> GetById(long id)=>Get("grade-policies",id);
 [HttpPut("{id:long}")] public Task<IActionResult> UpdateById(long id,[FromBody] JsonElement body)=>Update("grade-policies",id,body);
}
