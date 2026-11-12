using BTech.Services;
using BTech.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize]
[Tags("PlacementCompanies")]
[Route("api/v1/placements/companies")]
public sealed class PlacementCompaniesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public PlacementCompaniesController(ApplicationDbContext db) => _db = db;

    private async Task<DbConnection> OpenAsync(CancellationToken ct)
    {
        var c = _db.Database.GetDbConnection();
        if (c.State != System.Data.ConnectionState.Open) await c.OpenAsync(ct);
        return c;
    }
    private static void Add(DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter(); p.ParameterName = name; p.Value = value ?? DBNull.Value; cmd.Parameters.Add(p);
    }
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    [HttpGet]
    public async Task<IActionResult> GetCompanies(CancellationToken ct, [FromQuery] long? collegeId = null)
    {
        var c = await OpenAsync(ct);
        var scope=CollegeDataScope.Resolve(HttpContext,collegeId);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = @"SELECT company_id, college_id, company_code, company_name, website, industry,
            contact_person_name, email, phone, address, status, created_at
            FROM companies WHERE deleted_at IS NULL AND (@scope IS NULL OR college_id=@scope) ORDER BY company_name";
        Add(cmd,"@scope",scope);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        var rows = new List<object>();
        while (await r.ReadAsync(ct)) rows.Add(new {
            companyId = r.GetInt64(0), collegeId = r.GetInt64(1), companyCode = r.GetString(2),
            companyName = r.GetString(3), website = r.IsDBNull(4) ? null : r.GetString(4),
            industry = r.IsDBNull(5) ? null : r.GetString(5), contactPerson = r.IsDBNull(6) ? null : r.GetString(6),
            email = r.IsDBNull(7) ? null : r.GetString(7), phone = r.IsDBNull(8) ? null : r.GetString(8),
            address = r.IsDBNull(9) ? null : r.GetString(9), status = r.GetInt32(10) == 1 ? "Active" : "Inactive",
            createdAt = r.GetDateTime(11)
        });
        return Ok(new { success = true, data = rows });
    }

    [HttpPost]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.CompanyName))
            return BadRequest(new { success = false, message = "companyName is required." });
        if (!string.IsNullOrWhiteSpace(request.Email) && !System.Text.RegularExpressions.Regex.IsMatch(request.Email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return BadRequest(new { success = false, message = "email format is invalid." });
        var status = string.IsNullOrWhiteSpace(request.Status) || request.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) ? 1
            : request.Status.Equals("Inactive", StringComparison.OrdinalIgnoreCase) ? 0 : -1;
        if (status < 0) return BadRequest(new { success = false, message = "status must be Active or Inactive." });
        var c = await OpenAsync(ct);
        try
        {
            var collegeId=CollegeDataScope.Resolve(HttpContext,request.CollegeId,required:true)!.Value;
            await using (var selected=c.CreateCommand())
            {
                selected.CommandText="SELECT COUNT(*) FROM colleges WHERE college_id=@college AND status=1 AND deleted_at IS NULL";
                Add(selected,"@college",collegeId);
                if(Convert.ToInt64(await selected.ExecuteScalarAsync(ct))!=1)return BadRequest(new{success=false,message="Select an active college."});
            }
            var code = "API-" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
            await using var cmd = c.CreateCommand();
            cmd.CommandText = @"INSERT INTO companies (college_id, company_code, company_name, website, industry,
                contact_person_name, email, phone, address, status, created_by) VALUES (@college,@code,@name,@website,@industry,@contact,@email,@phone,@address,@status,@actor); SELECT LAST_INSERT_ID();";
            Add(cmd,"@college",collegeId); Add(cmd,"@code",code); Add(cmd,"@name",request.CompanyName.Trim());
            Add(cmd,"@website",Clean(request.Website)); Add(cmd,"@industry",Clean(request.Industry));
            Add(cmd,"@contact",Clean(request.ContactPerson)); Add(cmd,"@email",Clean(request.Email)?.ToLowerInvariant());
            Add(cmd,"@phone",Clean(request.Phone)); Add(cmd,"@address",Clean(request.Address)); Add(cmd,"@status",status); Add(cmd,"@actor",CollegeDataScope.Actor(HttpContext));
            var id = Convert.ToInt64(await cmd.ExecuteScalarAsync(ct));
            return Created($"/api/v1/placements/companies/{id}", new { success = true, companyId = id, collegeId, companyCode = code,
                companyName = request.CompanyName.Trim(), website = Clean(request.Website), industry = Clean(request.Industry),
                contactPerson = Clean(request.ContactPerson), email = Clean(request.Email), phone = Clean(request.Phone), address = Clean(request.Address), status = request.Status ?? "Active" });
        }
        catch (DbException ex) when (ex.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) || ex.Message.Contains("unique", StringComparison.OrdinalIgnoreCase))
        { return Conflict(new { success = false, message = "A company with a conflicting unique value already exists." }); }
    }
}

public sealed record CreateCompanyRequest(string CompanyName, string? Website = null, string? Industry = null,
    string? ContactPerson = null, string? Email = null, string? Phone = null, string? Address = null, string? Status = "Active", long? CollegeId = null);
