using System.Data.Common;
using System.Text.Json;
using BTech.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1.AdditionalModules;

[ApiController]
[Authorize]
[Tags("PlacementCompanies")]
[Route("api/v1/placements/companies")]
public sealed class PlacementCompanyController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public PlacementCompanyController(ApplicationDbContext db) => _db = db;
    private async Task<DbConnection> Open(CancellationToken ct) { var c=_db.Database.GetDbConnection(); if(c.State!=System.Data.ConnectionState.Open) await c.OpenAsync(ct); return c; }
    private static void P(DbCommand c,string n,object? v){var p=c.CreateParameter();p.ParameterName=n;p.Value=v??DBNull.Value;c.Parameters.Add(p);}
    private static string? S(JsonElement b,string key) => b.ValueKind==JsonValueKind.Object && b.TryGetProperty(key,out var v) && v.ValueKind==JsonValueKind.String ? v.GetString()?.Trim() : null;

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id,CancellationToken ct){if(id<=0)return BadRequest(new{message="id must be positive."});var c=await Open(ct);await using var q=c.CreateCommand();q.CommandText="SELECT company_id,college_id,company_code,company_name,website,industry,contact_person_name,email,phone,address,status,created_at FROM companies WHERE company_id=@id AND deleted_at IS NULL";P(q,"@id",id);await using var r=await q.ExecuteReaderAsync(ct);if(!await r.ReadAsync(ct))return NotFound(new{message="Placement company not found."});return Ok(new{companyId=r.GetInt64(0),collegeId=r.GetInt64(1),companyCode=r.GetString(2),companyName=r.GetString(3),website=r.IsDBNull(4)?null:r.GetString(4),industry=r.IsDBNull(5)?null:r.GetString(5),contactPerson=r.IsDBNull(6)?null:r.GetString(6),email=r.IsDBNull(7)?null:r.GetString(7),phone=r.IsDBNull(8)?null:r.GetString(8),address=r.IsDBNull(9)?null:r.GetString(9),status=r.GetInt32(10)==1?"Active":"Inactive",createdAt=r.GetDateTime(11)});}

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id,[FromBody] JsonElement body,CancellationToken ct){if(id<=0||body.ValueKind!=JsonValueKind.Object)return BadRequest(new{message="Positive id and JSON object body are required."});var name=S(body,"companyName");if(string.IsNullOrWhiteSpace(name))return BadRequest(new{message="companyName is required."});var status=S(body,"status");int? statusValue=status==null?null:status.Equals("Active",StringComparison.OrdinalIgnoreCase)?1:status.Equals("Inactive",StringComparison.OrdinalIgnoreCase)?0:null;if(status!=null&&statusValue==null)return BadRequest(new{message="status must be Active or Inactive."});var c=await Open(ct);await using var q=c.CreateCommand();q.CommandText="UPDATE companies SET company_name=@name,website=COALESCE(@website,website),industry=COALESCE(@industry,industry),contact_person_name=COALESCE(@contact,contact_person_name),email=COALESCE(@email,email),phone=COALESCE(@phone,phone),address=COALESCE(@address,address),status=COALESCE(@status,status),updated_at=CURRENT_TIMESTAMP WHERE company_id=@id AND deleted_at IS NULL";P(q,"@name",name);P(q,"@website",S(body,"website"));P(q,"@industry",S(body,"industry"));P(q,"@contact",S(body,"contactPerson"));P(q,"@email",S(body,"email"));P(q,"@phone",S(body,"phone"));P(q,"@address",S(body,"address"));P(q,"@status",statusValue);P(q,"@id",id);return await q.ExecuteNonQueryAsync(ct)>0?Ok(new{success=true,message="Placement company updated.",id}):NotFound(new{message="Placement company not found."});}

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id,CancellationToken ct){var c=await Open(ct);await using var q=c.CreateCommand();q.CommandText="UPDATE companies SET deleted_at=CURRENT_TIMESTAMP WHERE company_id=@id AND deleted_at IS NULL";P(q,"@id",id);return await q.ExecuteNonQueryAsync(ct)>0?NoContent():NotFound(new{message="Placement company not found."});}

    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> Status(long id,[FromBody] JsonElement body,CancellationToken ct){var status=S(body,"status");if(status is null||!(status.Equals("Active",StringComparison.OrdinalIgnoreCase)||status.Equals("Inactive",StringComparison.OrdinalIgnoreCase)))return BadRequest(new{message="status must be Active or Inactive."});var c=await Open(ct);await using var q=c.CreateCommand();q.CommandText="UPDATE companies SET status=@status WHERE company_id=@id AND deleted_at IS NULL";P(q,"@status",status.Equals("Active",StringComparison.OrdinalIgnoreCase)?1:0);P(q,"@id",id);return await q.ExecuteNonQueryAsync(ct)>0?Ok(new{success=true,id,status}):NotFound(new{message="Placement company not found."});}
}
