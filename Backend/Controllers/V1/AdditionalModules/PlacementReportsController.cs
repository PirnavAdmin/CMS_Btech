using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
namespace BTech.Controllers.V1.AdditionalModules;
[ApiController,Authorize,Route("api/v1/placements/reports")]
public sealed class PlacementReportsController(IConfiguration configuration) : ControllerBase
{
 [HttpGet]
 public async Task<IActionResult> Get(CancellationToken ct)
 {
  var scope=CollegeDataScope.Resolve(HttpContext);
  await using var c=new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
  var count=await c.ExecuteScalarAsync<long>(new CommandDefinition("SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL AND (@scope IS NULL OR college_id=@scope)",new{scope},cancellationToken:ct));
  return Ok(new{success=true,data=new{registeredCompanies=count,collegeId=scope,generatedAt=DateTimeOffset.UtcNow}});
 }
}
