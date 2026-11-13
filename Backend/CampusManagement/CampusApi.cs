using System.ComponentModel.DataAnnotations;
using System.Data;
using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.CampusManagement;

public sealed class CampusRequest
{
    public long? CollegeId { get; set; }
    [Required, StringLength(50)] public string Code { get; set; } = "";
    [Required, StringLength(150)] public string Name { get; set; } = "";
    [StringLength(50)] public string? CampusType { get; set; }
    [StringLength(255)] public string? Address { get; set; }
    [StringLength(100)] public string? City { get; set; }
    [StringLength(100)] public string? District { get; set; }
    [StringLength(100)] public string? State { get; set; }
    [StringLength(20)] public string? PostalCode { get; set; }
    [EmailAddress, StringLength(150)] public string? Email { get; set; }
    [StringLength(20)] public string? PhoneNumber { get; set; }
    public long? CampusInChargeUserId { get; set; }
    public bool IsMainCampus { get; set; }
}
public sealed class CampusStatusRequest { [Required] public bool? IsActive { get; set; } }
public sealed class CampusRecord
{
    public long CampusId { get; set; }
    public long CollegeId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? CampusType { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public long? CampusInChargeUserId { get; set; }
    public bool IsMainCampus { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
}
public sealed class CampusProblem(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

public sealed class CampusService(IConfiguration config, IHttpContextAccessor accessor)
{
    private readonly string _connectionString = config.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection is missing.");
    private CollegeManagementScope Scope => CollegeManagementScope.From(accessor.HttpContext);
    public long MyCollegeId()
    {
        var s = Scope;
        if (s.IsSuperAdmin || !s.IsCollegeAdmin || s.AssignedCollegeId is not > 0 || s.SelectedCollegeId != s.AssignedCollegeId)
            throw new CampusProblem(403, "An active College Admin assignment is required.");
        return s.AssignedCollegeId.Value;
    }

    private long? Resolve(long? requested, bool requireCollege = true)
    {
        var s = Scope;
        if (requested is <= 0) throw new CampusProblem(400, "collegeId must be positive when supplied.");
        if (s.IsSuperAdmin)
        {
            if (requireCollege && requested is not > 0) throw new CampusProblem(400, "Select a valid collegeId.");
            return requested;
        }
        if (!s.IsCollegeAdmin || s.AssignedCollegeId is not > 0 || s.SelectedCollegeId != s.AssignedCollegeId)
            throw new CampusProblem(403, "An active College Admin assignment is required.");
        if (requested.HasValue && requested != s.AssignedCollegeId)
            throw new CampusProblem(403, "Campus belongs to a different college.");
        return s.AssignedCollegeId;
    }
    private static void Validate(CampusRequest request)
    {
        request.Code = request.Code?.Trim().ToUpperInvariant() ?? "";
        request.Name = request.Name?.Trim() ?? "";
        if (request.Code.Length is < 1 or > 50 || request.Name.Length is < 1 or > 150)
            throw new CampusProblem(400, "Campus code and name are required (50/150 characters maximum).");
        if (request.CampusInChargeUserId is <= 0) throw new CampusProblem(400, "campusInChargeUserId must be positive.");
    }
    private async Task<MySqlConnection> OpenAsync()
    {
        var c = new MySqlConnection(_connectionString);
        try { await c.OpenAsync(); return c; } catch { await c.DisposeAsync(); throw; }
    }
    public async Task<object> ListAsync(long? collegeId, string? search, bool? active, int page, int pageSize)
    {
        var target = Resolve(collegeId, false);
        if (page < 1 || pageSize is < 1 or > 100 || search?.Length > 150)
            throw new CampusProblem(400, "page must be positive, pageSize 1..100 and search at most 150 characters.");
        await using var c = await OpenAsync();
        using var result = await c.QueryMultipleAsync("sp_campus_list", new {
            p_college = target, p_search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
            p_active = active.HasValue ? (byte?)(active.Value ? 1 : 0) : null,
            p_page = page, p_size = pageSize
        }, commandType: CommandType.StoredProcedure);
        var rows = (await result.ReadAsync<CampusRecord>()).ToArray();
        var count = await result.ReadSingleAsync<long>();
        return new { items = rows, pageNumber = page, pageSize, totalRecords = count,
            totalPages = (long)Math.Ceiling(count / (double)pageSize) };
    }
    public async Task<CampusRecord> GetAsync(long id)
    {
        if (id <= 0) throw new CampusProblem(400, "campusId must be positive.");
        await using var c = await OpenAsync();
        var row = await c.QuerySingleOrDefaultAsync<CampusRecord>("sp_campus_get", new { p_id = id }, commandType: CommandType.StoredProcedure)
            ?? throw new CampusProblem(404, "Campus not found.");
        if (!Scope.IsSuperAdmin) Resolve(row.CollegeId);
        return row;
    }
    private static object Parameters(CampusRequest p, long college, long? id, long actor) => new {
        p_id = id, p_college = college, p_code = p.Code, p_name = p.Name,
        p_type = p.CampusType, p_address = p.Address, p_city = p.City,
        p_district = p.District, p_state = p.State, p_postal = p.PostalCode,
        p_email = p.Email, p_phone = p.PhoneNumber, p_in_charge = p.CampusInChargeUserId,
        p_main = p.IsMainCampus ? 1 : 0, p_actor = actor
    };
    public async Task<CampusRecord> SaveAsync(CampusRequest request, long? id = null)
    {
        Validate(request);
        var college = Resolve(request.CollegeId);
        if (id.HasValue)
        {
            var existing = await GetAsync(id.Value);
            if (existing.CollegeId != college) throw new CampusProblem(403, "Campus ownership cannot be changed.");
        }
        await using var c = await OpenAsync();
        await using var tx = await c.BeginTransactionAsync();
        try
        {
            var savedId = await c.ExecuteScalarAsync<long>("sp_campus_save", Parameters(request, college!.Value, id, Scope.UserId),
                tx, commandType: CommandType.StoredProcedure);
            var saved = await c.QuerySingleAsync<CampusRecord>("sp_campus_get", new { p_id = savedId }, tx, commandType: CommandType.StoredProcedure);
            if (saved.CollegeId != college || saved.CampusId != savedId)
                throw new InvalidOperationException("sp_campus_get returned a different campus after sp_campus_save.");
            await tx.CommitAsync();
            return saved;
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        { throw new CampusProblem(409, "Campus code or active main-campus designation already exists in this college."); }
        catch (MySqlException ex) when (ex.SqlState == "45000")
        { throw new CampusProblem(400, ex.Message); }
    }
    public async Task<CampusRecord> StatusAsync(long id, bool active)
    {
        var existing = await GetAsync(id);
        var college = Resolve(existing.CollegeId)!.Value;
        await using var c = await OpenAsync();
        await using var tx = await c.BeginTransactionAsync();
        try
        {
            await c.ExecuteAsync("sp_campus_status", new { p_id = id, p_college = college,
                p_active = active ? 1 : 0, p_actor = Scope.UserId }, tx, commandType: CommandType.StoredProcedure);
            var saved = await c.QuerySingleAsync<CampusRecord>("sp_campus_get", new { p_id = id }, tx, commandType: CommandType.StoredProcedure);
            await tx.CommitAsync();
            return saved;
        }
        catch (MySqlException ex) when (ex.SqlState == "45000")
        { throw new CampusProblem(ex.Message.Contains("main campus", StringComparison.OrdinalIgnoreCase) ? 409 : 400, ex.Message); }
        catch (MySqlException ex) when (ex.Number == 1062)
        { throw new CampusProblem(409, "Another active main campus already exists in this college."); }
    }
}

[ApiController, Authorize, Route("api/v1/campuses")]
public sealed class CampusesController(CampusService service) : ControllerBase
{
    private async Task<IActionResult> Run(Func<Task<IActionResult>> action)
    {
        try { return await action(); }
        catch (CampusProblem ex)
        {
            return StatusCode(ex.Status, new { success = false, message = ex.Message,
                statusCode = ex.Status, correlationId = HttpContext.TraceIdentifier });
        }
    }
    [HttpGet]
    public Task<IActionResult> List([FromQuery] long? collegeId, [FromQuery] string? search,
        [FromQuery] bool? isActive, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50) =>
        Run(async () => Ok(new { success = true, data = await service.ListAsync(collegeId, search, isActive, pageNumber, pageSize) }));
    [HttpGet("my-college")]
    public Task<IActionResult> MyCollege([FromQuery] string? search, [FromQuery] bool? isActive,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50) =>
        Run(async () => Ok(new { success = true, data = await service.ListAsync(service.MyCollegeId(), search, isActive, pageNumber, pageSize) }));
    [HttpGet("{id:long}")]
    public Task<IActionResult> Get(long id) => Run(async () => Ok(new { success = true, data = await service.GetAsync(id) }));
    [HttpPost]
    public Task<IActionResult> Create([FromBody] CampusRequest request) => Run(async () => {
        var saved = await service.SaveAsync(request);
        return CreatedAtAction(nameof(Get), new { id = saved.CampusId }, new { success = true, data = saved });
    });
    [HttpPut("{id:long}")]
    public Task<IActionResult> Update(long id, [FromBody] CampusRequest request) =>
        Run(async () => Ok(new { success = true, data = await service.SaveAsync(request, id) }));
    [HttpPatch("{id:long}/status")]
    public Task<IActionResult> Status(long id, [FromBody] CampusStatusRequest request) =>
        Run(async () => Ok(new { success = true, data = await service.StatusAsync(id, request.IsActive!.Value) }));
}
