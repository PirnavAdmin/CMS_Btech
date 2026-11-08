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
 [HttpPost] public Task<IActionResult> Create([FromBody] JsonElement body){Validate(body);return Create("grade-policies",body);}
 [HttpGet("{id:long}")] public Task<IActionResult> GetById(long id)=>Get("grade-policies",id);
 [HttpPut("{id:long}")] public Task<IActionResult> UpdateById(long id,[FromBody] JsonElement body){Validate(body);return Update("grade-policies",id,body);}
 private static void Validate(JsonElement body)
 {
  if(body.ValueKind!=JsonValueKind.Object||!body.TryGetProperty("academicYearId",out var year)||!long.TryParse(year.ToString(),out var yearId)||yearId<=0||!body.TryGetProperty("bands",out var bands)||bands.ValueKind!=JsonValueKind.Array||bands.GetArrayLength() is <1 or >100)
   throw new ArgumentException("Provide academicYearId and 1–100 grade bands.");
  var values=new List<(string Grade,decimal Min,decimal Max,decimal Points)>();
  foreach(var band in bands.EnumerateArray())
  {
   if(band.ValueKind!=JsonValueKind.Object||!band.TryGetProperty("grade",out var grade)||grade.ValueKind!=JsonValueKind.String||string.IsNullOrWhiteSpace(grade.GetString())||
    !band.TryGetProperty("min",out var min)||min.ValueKind!=JsonValueKind.Number||!min.TryGetDecimal(out var from)||!band.TryGetProperty("max",out var max)||max.ValueKind!=JsonValueKind.Number||!max.TryGetDecimal(out var to)||
    !band.TryGetProperty("points",out var points)||points.ValueKind!=JsonValueKind.Number||!points.TryGetDecimal(out var point)||from<0||to>100||from>=to||point<0||point>10)
    throw new ArgumentException("Grade bands require a name, a valid 0–100 range and 0–10 grade points.");
   values.Add((grade.GetString()!.Trim().ToUpperInvariant(),from,to,point));
  }
  var sorted=values.OrderBy(x=>x.Min).ToList();
  if(sorted.Select(x=>x.Grade).Distinct().Count()!=sorted.Count||sorted[0].Min!=0||sorted[^1].Max!=100||sorted.Skip(1).Where((row,index)=>sorted[index].Max!=row.Min).Any())
   throw new ArgumentException("Use unique grade names and contiguous grade bands covering 0–100.");
 }
}
