using BTech.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController]
[Tags("PlacementCompanies")]
[Authorize]
[Route("api/v1/placements/reports")]
public sealed class PlacementReportsController : ControllerBase {
 private readonly ApplicationDbContext _db;
 public PlacementReportsController(ApplicationDbContext db)=>_db=db;
 [HttpGet]
 public async Task<IActionResult> Get(CancellationToken ct){var c=_db.Database.GetDbConnection();var close=c.State!=System.Data.ConnectionState.Open;if(close)await c.OpenAsync(ct);try{await using var q=c.CreateCommand();q.CommandText="SELECT COUNT(*) FROM companies";var count=0L;try{count=Convert.ToInt64(await q.ExecuteScalarAsync(ct));}catch{count=0;}return Ok(new{success=true,data=new{registeredCompanies=count,generatedAt=DateTimeOffset.UtcNow, note="Company summary only; drive/application outcome metrics depend on the existing placement reporting schema."}});}finally{if(close)await c.CloseAsync();}}
}
