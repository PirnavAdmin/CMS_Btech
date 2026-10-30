using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using BTech.Data;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController]
[Microsoft.AspNetCore.Authorization.Authorize]
[Route("api/v1/grades")]
public sealed class GradeManagementController : AdditionalApiControllerBase {
 public GradeManagementController(ApplicationDbContext db):base(new AdditionalApiStore(db)){}
 [HttpGet] public Task<IActionResult> GetAll()=>List("grades");
 [HttpPost] public Task<IActionResult> Create([FromBody] JsonElement body)=>Create("grades",body);
 [HttpGet("{id:long}")] public Task<IActionResult> GetById(long id)=>Get("grades",id);
 [HttpPut("{id:long}")] public Task<IActionResult> UpdateById(long id,[FromBody] JsonElement body)=>Update("grades",id,body);
}
