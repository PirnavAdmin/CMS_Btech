using System.Security.Claims;
using BTech.DTOs.AdminGovernance;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Dapper;
using MySqlConnector;
using BTech.Services;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize]
[Route("api/v1/access-governance")]
public sealed class AccessGovernanceController : ControllerBase
{
    private readonly IAccessGovernanceService _service;
    private readonly ILogger<AccessGovernanceController> _logger;
    private readonly string _connectionString;

    public AccessGovernanceController(IAccessGovernanceService service, ILogger<AccessGovernanceController> logger, IConfiguration configuration)
    {
        _service = service;
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("DefaultConnection is missing.");
    }

    [HttpGet("bootstrap")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Bootstrap([FromQuery] long? collegeId = null, [FromQuery] string? search = null)
    {
        var actor = await GetActorContextAsync();
        var effectiveCollegeId = ResolveCollegeId(collegeId);
        var data = await _service.GetBootstrapAsync(effectiveCollegeId, search, actor.IsSuperAdmin ? null : actor.CollegeId);
        return Ok(new { success = true, message = "Roles, designations and staff access loaded successfully.", data });
    }

    [HttpGet("roles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRoles([FromQuery] string? search = null, [FromQuery] string? category = null, [FromQuery] string? status = null)
    {
        var actor = await GetActorContextAsync();
        var data = await _service.GetRolesAsync(search, category, status, actor.IsSuperAdmin ? null : actor.CollegeId);
        return Ok(new { success = true, message = "Roles retrieved successfully.", data });
    }

    [HttpGet("roles/{roleId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRole(long roleId)
    {
        var actor = await GetActorContextAsync();
        var data = await _service.GetRoleAsync(roleId, actor.IsSuperAdmin ? null : actor.CollegeId);
        return Ok(new { success = true, message = "Role retrieved successfully.", data });
    }

    [HttpPost("roles")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateRole([FromBody] SaveAccessRoleRequest request)
    {
        var actorContext = await GetActorContextAsync();
        if (!actorContext.IsSuperAdmin) return Forbid();
        var actor = GetUserId();
        _logger.LogInformation("Create role requested. Code={Code}, ActorUserId={ActorUserId}", request.Code, actor);
        var data = await _service.CreateRoleAsync(request, actor);
        return CreatedAtAction(nameof(GetRole), new { roleId = data.Id }, new { success = true, message = "Role created successfully.", data });
    }

    [HttpPut("roles/{roleId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRole(long roleId, [FromBody] SaveAccessRoleRequest request)
    {
        var actorContext = await GetActorContextAsync();
        if (!actorContext.IsSuperAdmin) return Forbid();
        var actor = GetUserId();
        var data = await _service.UpdateRoleAsync(roleId, request, actor);
        return Ok(new { success = true, message = "Role updated successfully.", data });
    }

    [HttpDelete("roles/{roleId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteRole(long roleId)
    {
        var actorContext = await GetActorContextAsync();
        if (!actorContext.IsSuperAdmin) return Forbid();
        var actor = GetUserId();
        await _service.DeleteRoleAsync(roleId, actor);
        return Ok(new { success = true, message = "Role deleted successfully.", roleId });
    }

    [HttpGet("roles/{roleId:long}/permissions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRolePermissions(long roleId)
    {
        var actorContext = await GetActorContextAsync();
        var data = await _service.GetRolePermissionsAsync(roleId, actorContext.IsSuperAdmin ? null : actorContext.CollegeId);
        return Ok(new { success = true, message = "Role permissions retrieved successfully.", data });
    }

    [HttpPut("roles/{roleId:long}/permissions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveRolePermissions(long roleId, [FromBody] SaveRolePermissionsRequest request)
    {
        var actorContext = await GetActorContextAsync();
        if (!actorContext.IsSuperAdmin) return Forbid();
        var actor = GetUserId();
        var data = await _service.SaveRolePermissionsAsync(roleId, request, actor, collegeId: null);
        return Ok(new { success = true, message = "Role permissions updated successfully.", data });
    }

    [HttpGet("designations")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDesignations([FromQuery] long? collegeId = null, [FromQuery] string? search = null, [FromQuery] string? category = null, [FromQuery] string? status = null)
    {
        var data = await _service.GetDesignationsAsync(ResolveCollegeId(collegeId), search, category, status);
        return Ok(new { success = true, message = "Designations retrieved successfully.", data });
    }

    [HttpGet("designations/{designationId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDesignation(long designationId, [FromQuery] long? collegeId = null)
    {
        var data = await _service.GetDesignationAsync(designationId, ResolveCollegeId(collegeId));
        return Ok(new { success = true, message = "Designation retrieved successfully.", data });
    }

    [HttpPost("designations")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateDesignation([FromBody] SaveDesignationRequest request)
    {
        var actorContext = await GetActorContextAsync();
        if (!actorContext.IsSuperAdmin && request.DefaultRoleId.HasValue)
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Only SUPER_ADMIN may configure a designation's default role." });
        long collegeId;
        try { collegeId = ResolveCollegeId(request.CollegeId); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        var actor = GetUserId();
        var data = await _service.CreateDesignationAsync(collegeId, request, actor);
        return CreatedAtAction(nameof(GetDesignation), new { designationId = data.Id, collegeId }, new { success = true, message = "Designation created successfully.", data });
    }

    [HttpPut("designations/{designationId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateDesignation(long designationId, [FromBody] SaveDesignationRequest request)
    {
        var actorContext = await GetActorContextAsync();
        if (!actorContext.IsSuperAdmin && request.DefaultRoleId.HasValue)
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Only SUPER_ADMIN may configure a designation's default role." });
        long collegeId;
        try { collegeId = ResolveCollegeId(request.CollegeId); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        var actor = GetUserId();
        var data = await _service.UpdateDesignationAsync(designationId, collegeId, request, actor);
        return Ok(new { success = true, message = "Designation updated successfully.", data });
    }

    [HttpDelete("designations/{designationId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteDesignation(long designationId, [FromQuery] long? collegeId = null)
    {
        var effectiveCollegeId = ResolveCollegeId(collegeId);
        var actor = GetUserId();
        await _service.DeleteDesignationAsync(designationId, effectiveCollegeId, actor);
        return Ok(new { success = true, message = "Designation deleted successfully.", designationId });
    }

    [HttpGet("staff-assignments")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffAssignments([FromQuery] long? collegeId = null, [FromQuery] string? search = null)
    {
        var data = await _service.GetStaffAssignmentsAsync(ResolveCollegeId(collegeId), search);
        return Ok(new { success = true, message = "Staff access assignments retrieved successfully.", data });
    }

    [HttpPut("staff-assignments/{employeeProfileId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveStaffAssignment(long employeeProfileId, [FromQuery] long? collegeId, [FromBody] SaveStaffAccessAssignmentRequest request)
    {
        var actorContext = await GetActorContextAsync();
        if (!actorContext.IsSuperAdmin)
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Use POST /api/roles/assign for tenant-scoped role assignment; this legacy governance assignment endpoint is Super Admin-only." });
        var effectiveCollegeId = ResolveCollegeId(collegeId);
        var actor = GetUserId();
        var data = await _service.SaveStaffAssignmentAsync(employeeProfileId, effectiveCollegeId, request, actor);
        return Ok(new { success = true, message = "Staff role and designation assigned successfully.", data });
    }

    private long ResolveCollegeId(long? requested)
    {
        var claim = User.FindFirstValue("collegeId");
        if (long.TryParse(claim, out var collegeId) && collegeId > 0)
        {
            if (requested.HasValue && requested.Value != collegeId)
                throw new UnauthorizedAccessException("Cross-college access is not permitted.");
            return collegeId;
        }
        var actor = GetActorContextAsync().GetAwaiter().GetResult();
        if (!actor.IsSuperAdmin) throw new UnauthorizedAccessException("A valid server-derived college scope is required.");
        if (requested.HasValue && requested.Value > 0) return requested.Value;
        throw new ArgumentException("collegeId is required for SUPER_ADMIN operations.");
    }

    private async Task<ActorContext> GetActorContextAsync()
    {
        var userId = GetUserId();
        if (!userId.HasValue) throw new UnauthorizedAccessException("A valid user identity is required.");
        await using var connection = new MySqlConnection(_connectionString);
        var account = await connection.QuerySingleOrDefaultAsync<AccountRow>("SELECT college_id AS CollegeId FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL LIMIT 1;", new { userId = userId.Value });
        if (account is null) throw new UnauthorizedAccessException("The account is inactive or unavailable.");
        var codes = (await connection.QueryAsync<string>("""
            SELECT DISTINCT r.role_code FROM user_roles ur INNER JOIN roles r ON r.role_id=ur.role_id
            WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL;
            """, new { userId = userId.Value })).Select(CanonicalRoleCode.Normalize).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return new ActorContext(codes.Contains("SUPER_ADMIN") ? account.CollegeId
            : BTech.Services.CollegeRequestScope.GetCollegeId(HttpContext) ?? account.CollegeId, codes);
    }

    private sealed class AccountRow { public long? CollegeId { get; set; } }
    private sealed record ActorContext(long? CollegeId, HashSet<string> RoleCodes)
    {
        public bool IsSuperAdmin => RoleCodes.Contains("SUPER_ADMIN");
    }

    private long? GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var userId) && userId > 0 ? userId : null;
    }
}
