using System.Security.Claims;
using System.Text.Json;
using BTech.Data;
using BTech.DTOs.AdminGovernance;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Dapper;
using MySqlConnector;
using BTech.Services;

namespace BTech.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/roles")]
    public class RolesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAccessGovernanceService _accessGovernanceService;
        private readonly ILogger<RolesController> _logger;
        private readonly string _connectionString;

        private static readonly JsonSerializerOptions PermissionJsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public RolesController(
            ApplicationDbContext context,
            IAccessGovernanceService accessGovernanceService,
            ILogger<RolesController> logger,
            IConfiguration configuration)
        {
            _context = context;
            _accessGovernanceService = accessGovernanceService;
            _logger = logger;
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("DefaultConnection is missing.");
        }

        // =========================================================
        // GET: api/roles
        // Existing route preserved; response now includes the complete
        // frontend role profile + permissions + user count.
        // =========================================================
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllRoles()
        {
            var actor = await GetActorContextAsync();
            var roles = await _accessGovernanceService.GetRolesAsync(
                search: null,
                category: null,
                status: null,
                collegeId: actor.IsSuperAdmin ? null : actor.CollegeId);

            return Ok(new
            {
                success = true,
                data = roles
                    .GroupBy(r => CanonicalRoleCode.Normalize(r.Code), StringComparer.OrdinalIgnoreCase)
                    .Select(g => g.OrderByDescending(r => string.Equals(r.Code, CanonicalRoleCode.Normalize(r.Code), StringComparison.OrdinalIgnoreCase)).First())
                    .Select(ToFrontendRole)
                    .ToList()
            });
        }

        // =========================================================
        // GET: api/roles/{id}
        // =========================================================
        [HttpGet("{id:long}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetRoleById(long id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "A valid role ID is required."
                });
            }

            try
            {
                var actor = await GetActorContextAsync();
                var role = await _accessGovernanceService.GetRoleAsync(id, actor.IsSuperAdmin ? null : actor.CollegeId);

                return Ok(new
                {
                    success = true,
                    data = ToFrontendRole(role)
                });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    success = false,
                    message = $"Role with ID {id} not found."
                });
            }
        }

        // =========================================================
        // POST: api/roles
        // - trims role name
        // - case-insensitive duplicate check
        // - accepts RoleName/Name + RoleCode/Code aliases
        // =========================================================
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateRole([FromBody] RoleRequest request)
        {
            var rawName = FirstNonBlank(request.RoleName, request.Name);

            if (string.IsNullOrWhiteSpace(rawName))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Role name is required."
                });
            }

            var trimmedName = rawName.Trim();
            var normalizedName = trimmedName.ToLowerInvariant();

            // IMPORTANT: trim + case-insensitive create validation.
            var nameExists = await _context.Roles
                .AsNoTracking()
                .AnyAsync(r =>
                    r.DeletedAt == null &&
                    r.RoleName.Trim().ToLower() == normalizedName);

            if (nameExists)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Role name already exists."
                });
            }

            var rawCode = FirstNonBlank(request.RoleCode, request.Code);
            var roleCode = CanonicalRoleCode.Normalize(string.IsNullOrWhiteSpace(rawCode)
                ? BuildRoleCode(trimmedName)
                : rawCode.Trim());

            var saveRequest = new SaveAccessRoleRequest
            {
                Name = trimmedName,
                Code = roleCode,
                Category = string.IsNullOrWhiteSpace(request.Category)
                    ? "Academic"
                    : request.Category.Trim(),
                Level = string.IsNullOrWhiteSpace(request.Level)
                    ? "Level 4 (Academic Staff)"
                    : request.Level.Trim(),
                Description = request.Description?.Trim(),
                Status = request.Status ? "Active" : "Inactive"
            };

            Dictionary<string, PermissionActionsDto>? permissions;
            try
            {
                permissions = ParsePermissions(request.Permissions);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }

            var actorUserId = GetUserId();
            var actor = await GetActorContextAsync();
            if (!actor.IsSuperAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "Only SUPER_ADMIN may create global role definitions. College Admin can delegate scoped permissions on existing roles."
                });
            }

            _logger.LogInformation(
                "Create role requested through /api/roles. RoleName={RoleName}, RoleCode={RoleCode}, ActorUserId={ActorUserId}",
                trimmedName,
                roleCode,
                actorUserId);

            try
            {
                var created = permissions != null
                    ? await _accessGovernanceService.CreateRoleAndPermissionsAsync(saveRequest, permissions, actorUserId, collegeId: null)
                    : await _accessGovernanceService.CreateRoleAsync(saveRequest, actorUserId);

                return Ok(new
                {
                    success = true,
                    data = ToFrontendRole(created),
                    message = "Role created successfully."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (MySqlException ex)
            {
                _logger.LogError(ex, "Database failure creating role. ActorUserId={ActorUserId}", actorUserId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Role could not be saved. Check application/database logs using the request correlation ID." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected failure creating role. ActorUserId={ActorUserId}", actorUserId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Role could not be saved due to a server error." });
            }
        }

        // =========================================================
        // PUT: api/roles/{id}
        // CRITICAL FIX:
        // duplicate-name query EXCLUDES the current role ID.
        // Saving a role without changing its name no longer reports
        // "Role name already exists".
        // =========================================================
        [HttpPut("{id:long}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateRole(
            long id,
            [FromBody] RoleRequest request)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "A valid role ID is required."
                });
            }

            AccessRoleDto existing;

            try
            {
                existing = await _accessGovernanceService.GetRoleAsync(id);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    success = false,
                    message = $"Role with ID {id} not found."
                });
            }

            var suppliedName = FirstNonBlank(request.RoleName, request.Name);
            var trimmedName = string.IsNullOrWhiteSpace(suppliedName)
                ? existing.Name.Trim()
                : suppliedName.Trim();

            if (string.IsNullOrWhiteSpace(trimmedName))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Role name is required."
                });
            }

            var normalizedName = trimmedName.ToLowerInvariant();

            // CRITICAL BUG FIX: exclude the current record.
            var nameTaken = await _context.Roles
                .AsNoTracking()
                .AnyAsync(r =>
                    r.Role_id != id &&
                    r.DeletedAt == null &&
                    r.RoleName.Trim().ToLower() == normalizedName);

            if (nameTaken)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Another role with name '{trimmedName}' already exists."
                });
            }

            var suppliedCode = FirstNonBlank(request.RoleCode, request.Code);
            var roleCode = CanonicalRoleCode.Normalize(string.IsNullOrWhiteSpace(suppliedCode)
                ? existing.Code
                : suppliedCode.Trim());

            var saveRequest = new SaveAccessRoleRequest
            {
                Name = trimmedName,
                Code = roleCode,
                Category = string.IsNullOrWhiteSpace(request.Category)
                    ? existing.Category
                    : request.Category.Trim(),
                Level = string.IsNullOrWhiteSpace(request.Level)
                    ? existing.Level
                    : request.Level.Trim(),
                Description = request.Description ?? existing.Description,
                Status = request.Status ? "Active" : "Inactive"
            };

            Dictionary<string, PermissionActionsDto>? permissions;
            try
            {
                permissions = ParsePermissions(request.Permissions);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }

            var actorUserId = GetUserId();
            var actor = await GetActorContextAsync();

            // College Admin changes only a college-scoped permission overlay. Role metadata,
            // canonical admin roles, and global privileges are Super Admin-only.
            if (!actor.IsSuperAdmin)
            {
                if (!actor.IsCollegeAdmin || !CanDelegateAccess(actor) || actor.CollegeId is null || permissions is null)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        message = "Only SUPER_ADMIN may change global role definitions. College Admin must submit a permission matrix to delegate scoped access."
                    });
                }
                if (CanonicalRoleCode.Normalize(existing.Code) is "SUPER_ADMIN" or "COLLEGE_ADMIN" ||
                    !string.Equals(roleCode, CanonicalRoleCode.Normalize(existing.Code), StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        message = "College Admin cannot modify canonical administrator roles or change role codes."
                    });
                }
                var requestedActive = request.Status;
                var existingActive = string.Equals(existing.Status, "Active", StringComparison.OrdinalIgnoreCase);
                if (!string.Equals(trimmedName, existing.Name, StringComparison.OrdinalIgnoreCase) || requestedActive != existingActive ||
                    (request.Description != null && !string.Equals(request.Description.Trim(), existing.Description ?? string.Empty, StringComparison.Ordinal)) ||
                    (request.Category != null && !string.Equals(request.Category.Trim(), existing.Category, StringComparison.OrdinalIgnoreCase)) ||
                    (request.Level != null && !string.Equals(request.Level.Trim(), existing.Level, StringComparison.OrdinalIgnoreCase)))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        message = "College Admin may change only the college-scoped permission matrix; role metadata and status are Super Admin-only."
                    });
                }
                var actorUserIdForScope = GetUserId();
                await using (var scopeConnection = new MySqlConnection(_connectionString))
                {
                    var affectsAdministrator = await scopeConnection.ExecuteScalarAsync<int>("""
                        SELECT COUNT(*)
                        FROM user_roles target_assignment
                        INNER JOIN user_roles admin_assignment ON admin_assignment.user_id=target_assignment.user_id
                        INNER JOIN roles admin_role ON admin_role.role_id=admin_assignment.role_id
                        WHERE target_assignment.role_id=@roleId AND target_assignment.status=1 AND target_assignment.removed_at IS NULL
                          AND admin_assignment.status=1 AND admin_assignment.removed_at IS NULL
                          AND admin_role.status=1 AND admin_role.deleted_at IS NULL
                          AND UPPER(admin_role.role_code) IN ('SUPER_ADMIN','COLLEGE_ADMIN');
                        """, new { roleId = id });
                    var actorOwnsRole = await scopeConnection.ExecuteScalarAsync<int>("""
                        SELECT COUNT(*) FROM user_roles
                        WHERE user_id=@userId AND role_id=@roleId AND status=1 AND removed_at IS NULL;
                        """, new { userId = actorUserIdForScope, roleId = id });
                    if (affectsAdministrator > 0 || actorOwnsRole > 0)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new
                        {
                            success = false,
                            message = "College Admin cannot modify a role assigned to an administrator or a role assigned to their own account."
                        });
                    }
                }
                NormalizePermissionMatrix(permissions);
                var exceeded = FindDelegationCeilingViolation(permissions, actor.Permissions);
                if (exceeded != null)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        success = false,
                        message = $"Delegation exceeds your effective permissions at '{exceeded}'."
                    });
                }
                try
                {
                    await _accessGovernanceService.SaveRolePermissionsAsync(
                        id,
                        new SaveRolePermissionsRequest { Permissions = permissions },
                        actorUserId,
                        actor.CollegeId);
                    var scopedRole = await _accessGovernanceService.GetRoleAsync(id, actor.CollegeId);
                    return Ok(new
                    {
                        success = true,
                        data = ToFrontendRole(scopedRole),
                        message = "College-scoped role permissions updated successfully."
                    });
                }
                catch (ArgumentException ex)
                {
                    return BadRequest(new { success = false, message = ex.Message });
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { success = false, message = ex.Message });
                }
                catch (MySqlException ex)
                {
                    _logger.LogError(ex, "Database failure saving college-scoped role permissions. RoleId={RoleId}, ActorUserId={ActorUserId}, CollegeId={CollegeId}", id, actorUserId, actor.CollegeId);
                    return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Role permissions could not be saved. Check application/database logs using the request correlation ID." });
                }
            }

            _logger.LogInformation(
                "Update role requested through /api/roles. RoleId={RoleId}, RoleName={RoleName}, ActorUserId={ActorUserId}",
                id,
                trimmedName,
                actorUserId);

            try
            {
                AccessRoleDto updated;
                if (permissions != null)
                {
                    updated = await _accessGovernanceService.UpdateRoleAndPermissionsAsync(
                        id, saveRequest, permissions, actorUserId, collegeId: null);
                }
                else
                {
                    updated = await _accessGovernanceService.UpdateRoleAsync(id, saveRequest, actorUserId);
                }

                return Ok(new
                {
                    success = true,
                    data = ToFrontendRole(updated),
                    message = "Role updated successfully."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (MySqlException ex)
            {
                _logger.LogError(ex, "Database failure updating role. RoleId={RoleId}, ActorUserId={ActorUserId}", id, actorUserId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Role could not be saved. Check application/database logs using the request correlation ID." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected failure updating role. RoleId={RoleId}, ActorUserId={ActorUserId}", id, actorUserId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Role could not be saved due to a server error." });
            }
        }

        // =========================================================
        // DELETE: api/roles/{id}
        // System default roles cannot be deleted.
        // =========================================================
        [HttpDelete("{id:long}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> DeleteRole(long id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "A valid role ID is required."
                });
            }

            AccessRoleDto role;
            try
            {
                role = await _accessGovernanceService.GetRoleAsync(id);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Role not found."
                });
            }

            var actor = await GetActorContextAsync();
            if (!actor.IsSuperAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "Only SUPER_ADMIN may delete global role definitions."
                });
            }

            if (role.IsSystem)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "System default roles cannot be deleted."
                });
            }

            try
            {
                await _accessGovernanceService.DeleteRoleAsync(
                    id,
                    GetUserId());
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    success = false,
                    message = ex.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = "Role deleted successfully."
            });
        }

        // =========================================================
        // POST: api/roles/assign
        // Additive endpoint. Existing staff-assignment endpoint under
        // /api/v1/access-governance/staff-assignments remains unchanged.
        // =========================================================
        [HttpPost("assign")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AssignRole(
            [FromBody] AssignRoleRequest request)
        {
            if (request.EmployeeProfileId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "A valid employeeProfileId is required."
                });
            }

            if (request.RoleId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "A valid roleId is required."
                });
            }

            if (request.DesignationId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "A valid designationId is required."
                });
            }

            var collegeId = await ResolveCollegeIdForEmployeeAsync(
                request.EmployeeProfileId);

            var actorUserId = GetUserId();
            var actor = await GetActorContextAsync();
            if (!actor.IsSuperAdmin && (!actor.IsCollegeAdmin || !CanDelegateAccess(actor) || actor.CollegeId != collegeId))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "You may assign roles only within your own college." });
            }
            var targetRole = await _accessGovernanceService.GetRoleAsync(request.RoleId, actor.IsSuperAdmin ? null : actor.CollegeId);
            var targetRoleCode = CanonicalRoleCode.Normalize(targetRole.Code);
            if (!actor.IsSuperAdmin && (targetRoleCode is "SUPER_ADMIN" or "COLLEGE_ADMIN"))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "College Admin cannot assign administrator roles." });
            }
            if (!actor.IsSuperAdmin && !IsPermissionSubset(targetRole.Permissions, actor.Permissions))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "The target role grants permissions beyond your effective permissions." });
            }

            var assignmentRequest = new SaveStaffAccessAssignmentRequest
            {
                RoleId = request.RoleId,
                DesignationId = request.DesignationId,
                Scope = string.IsNullOrWhiteSpace(request.Scope)
                    ? "Department-scoped"
                    : request.Scope.Trim()
            };

            _logger.LogInformation(
                "Staff role assignment requested through /api/roles/assign. EmployeeProfileId={EmployeeProfileId}, RoleId={RoleId}, DesignationId={DesignationId}, Scope={Scope}, ActorUserId={ActorUserId}",
                request.EmployeeProfileId,
                request.RoleId,
                request.DesignationId,
                assignmentRequest.Scope,
                actorUserId);

            try
            {
                var data = await _accessGovernanceService.SaveStaffAssignmentAsync(
                    request.EmployeeProfileId,
                    collegeId,
                    assignmentRequest,
                    actorUserId);

                return Ok(new
                {
                    success = true,
                    message = "Role assigned successfully.",
                    data
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
            }
        }

        private async Task<long> ResolveCollegeIdForEmployeeAsync(
            long employeeProfileId)
        {
            var collegeId = await (
                    from employee in _context.EmployeeProfiles.AsNoTracking()
                    join user in _context.Users.AsNoTracking()
                        on employee.UserId equals user.user_id
                    where employee.EmployeeProfileId == employeeProfileId &&
                          employee.DeletedAt == null &&
                          user.Status == 1 &&
                          user.DeletedAt == null
                    select user.college_id)
                .FirstOrDefaultAsync();

            if (!collegeId.HasValue || collegeId.Value <= 0)
            {
                throw new KeyNotFoundException(
                    "Employee profile or employee college was not found.");
            }

            var actor = await GetActorContextAsync();
            if (!actor.IsSuperAdmin && actor.CollegeId != collegeId.Value)
                throw new UnauthorizedAccessException("Cross-college role assignment is not permitted.");
            return collegeId.Value;
        }

        private long? GetUserId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

            return long.TryParse(value, out var userId) && userId > 0
                ? userId
                : null;
        }

        private async Task<ActorContext> GetActorContextAsync()
        {
            var userId = GetUserId();
            if (!userId.HasValue) throw new UnauthorizedAccessException("A valid user identity is required.");
            await using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync();
            var collegeId = await connection.ExecuteScalarAsync<long?>(
                "SELECT college_id FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL LIMIT 1;",
                new { userId = userId.Value });
            var rawCodes = await connection.QueryAsync<string>("""
                SELECT DISTINCT r.role_code FROM user_roles ur
                INNER JOIN roles r ON r.role_id=ur.role_id
                WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
                  AND r.status=1 AND r.deleted_at IS NULL;
                """, new { userId = userId.Value });
            var codes = rawCodes.Select(CanonicalRoleCode.Normalize).ToHashSet(StringComparer.OrdinalIgnoreCase);
            // The middleware verifies active mappings and permissions before this actor is read.
            if (!codes.Contains("SUPER_ADMIN"))
                collegeId = BTech.Services.CollegeRequestScope.GetCollegeId(HttpContext) ?? collegeId;
            var permissions = new Dictionary<string, PermissionActionsDto>(StringComparer.OrdinalIgnoreCase);
            if (codes.Contains("SUPER_ADMIN"))
            {
                foreach (var key in SupportedModuleKeys()) permissions[key] = new PermissionActionsDto { View=true, Create=true, Edit=true, Delete=true, Export=true };
            }
            else
            {
                var rows = await connection.QueryAsync<ActorPermissionRow>("""
                    SELECT rp.module_key AS ModuleKey,
                           MAX(CASE WHEN rp.can_view=1 THEN 1 ELSE 0 END) AS CanView,
                           MAX(CASE WHEN rp.can_create=1 THEN 1 ELSE 0 END) AS CanCreate,
                           MAX(CASE WHEN rp.can_edit=1 THEN 1 ELSE 0 END) AS CanEdit,
                           MAX(CASE WHEN rp.can_delete=1 THEN 1 ELSE 0 END) AS CanDelete,
                           MAX(CASE WHEN rp.can_export=1 THEN 1 ELSE 0 END) AS CanExport
                    FROM user_roles ur INNER JOIN roles r ON r.role_id=ur.role_id
                    INNER JOIN role_permissions rp ON rp.role_id=r.role_id
                    WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
                      AND r.status=1 AND r.deleted_at IS NULL
                      AND (r.college_id IS NULL OR r.college_id=@collegeId)
                      AND EXISTS (SELECT 1 FROM permission_modules pm WHERE pm.module_key=rp.module_key AND pm.status=1)
                      AND (rp.college_id IS NULL OR rp.college_id=@collegeId)
                      AND NOT (rp.college_id IS NULL AND EXISTS (
                          SELECT 1 FROM role_permissions scoped WHERE scoped.role_id=rp.role_id
                            AND scoped.module_key=rp.module_key AND scoped.college_id=@collegeId))
                    GROUP BY rp.module_key;
                    """, new { userId = userId.Value, collegeId });
                foreach (var row in rows)
                    permissions[row.ModuleKey] = new PermissionActionsDto { View=row.CanView==1, Create=row.CanCreate==1, Edit=row.CanEdit==1, Delete=row.CanDelete==1, Export=row.CanExport==1 };
            }
            return new ActorContext(collegeId, codes, permissions);
        }

        private static IEnumerable<string> SupportedModuleKeys() => new[]
        {
            "dashboard", "my_profile", "notifications", "colleges", "departments", "academic_years", "courses", "branches", "semesters", "sections", "rooms",
            "subjects", "timetable", "credits", "electives", "materials", "faculty_directory", "faculty_attendance", "faculty_leaves", "faculty_payroll",
            "student_admissions", "student_profiles", "student_attendance", "student_promotions", "examinations", "marks", "results", "fees", "library", "meetings_events", "placement", "roles_permissions", "academic_settings"
        };

        private static void NormalizePermissionMatrix(Dictionary<string, PermissionActionsDto> matrix)
        {
            foreach (var item in matrix.Values)
                if (!item.View) item.Create = item.Edit = item.Delete = item.Export = false;
        }

        private static string? FindDelegationCeilingViolation(
            Dictionary<string, PermissionActionsDto> requested,
            Dictionary<string, PermissionActionsDto> caller)
        {
            foreach (var item in requested)
            {
                caller.TryGetValue(item.Key, out var allowed);
                allowed ??= new PermissionActionsDto();
                if (item.Value.View && !allowed.View) return $"{item.Key}.view";
                if (item.Value.Create && !allowed.Create) return $"{item.Key}.create";
                if (item.Value.Edit && !allowed.Edit) return $"{item.Key}.edit";
                if (item.Value.Delete && !allowed.Delete) return $"{item.Key}.delete";
                if (item.Value.Export && !allowed.Export) return $"{item.Key}.export";
            }
            return null;
        }

        private static bool CanDelegateAccess(ActorContext actor)
        {
            if (!actor.Permissions.TryGetValue("roles_permissions", out var permission)) return false;
            return permission.View && permission.Create && permission.Edit;
        }

        private static bool IsPermissionSubset(
            Dictionary<string, PermissionActionsDto> target,
            Dictionary<string, PermissionActionsDto> caller) => FindDelegationCeilingViolation(target, caller) is null;

        private sealed record ActorContext(long? CollegeId, HashSet<string> RoleCodes, Dictionary<string, PermissionActionsDto> Permissions)
        {
            public bool IsSuperAdmin => RoleCodes.Contains("SUPER_ADMIN");
            public bool IsCollegeAdmin => RoleCodes.Contains("COLLEGE_ADMIN");
        }

        private sealed class ActorPermissionRow
        {
            public string ModuleKey { get; set; } = string.Empty;
            public int CanView { get; set; }
            public int CanCreate { get; set; }
            public int CanEdit { get; set; }
            public int CanDelete { get; set; }
            public int CanExport { get; set; }
        }

        private static string? FirstNonBlank(
            string? first,
            string? second)
        {
            if (!string.IsNullOrWhiteSpace(first))
            {
                return first;
            }

            return string.IsNullOrWhiteSpace(second)
                ? null
                : second;
        }

        private static string BuildRoleCode(string roleName)
        {
            return string.Join(
                "_",
                roleName
                    .Split(
                        ' ',
                        StringSplitOptions.RemoveEmptyEntries |
                        StringSplitOptions.TrimEntries))
                .ToUpperInvariant();
        }

        private static readonly HashSet<string> SupportedPermissionModules = new(StringComparer.OrdinalIgnoreCase)
        {
            "dashboard", "my_profile", "notifications", "colleges", "departments", "academic_years",
            "courses", "branches", "semesters", "sections", "rooms", "subjects", "timetable", "credits",
            "electives", "materials", "faculty_directory", "faculty_attendance", "faculty_leaves", "faculty_payroll",
            "student_admissions", "student_profiles", "student_attendance", "student_promotions", "examinations",
            "marks", "results", "fees", "library", "meetings_events", "placement", "roles_permissions", "academic_settings"
        };

        private static readonly HashSet<string> SupportedPermissionActions = new(StringComparer.OrdinalIgnoreCase)
        {
            "view", "create", "edit", "delete", "export"
        };

        private static Dictionary<string, PermissionActionsDto>? ParsePermissions(
            JsonElement? permissions)
        {
            ValidatePermissionJson(permissions);
            if (!permissions.HasValue ||
                permissions.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return null;
            }

            var value = permissions.Value;

            try
            {
                if (value.ValueKind == JsonValueKind.Object)
                {
                    var rawJson = value.GetRawText();
                    ValidatePermissionJson(rawJson);
                    return ValidateParsedPermissions(JsonSerializer.Deserialize<Dictionary<string, PermissionActionsDto>>(
                        rawJson, PermissionJsonOptions));
                }

                if (value.ValueKind == JsonValueKind.String)
                {
                    var json = value.GetString();
                    if (string.IsNullOrWhiteSpace(json))
                    {
                        throw new ArgumentException("Permissions must not be an empty JSON string.");
                    }

                    ValidatePermissionJson(json);
                    return ValidateParsedPermissions(JsonSerializer.Deserialize<Dictionary<string, PermissionActionsDto>>(
                        json, PermissionJsonOptions));
                }
            }
            catch (JsonException)
            {
                throw new ArgumentException(
                    "Permissions must be a valid JSON permission matrix.");
            }

            throw new ArgumentException(
                "Permissions must be a JSON object or JSON string.");
        }


        private static void ValidatePermissionJson(JsonElement? permissions)
        {
            if (!permissions.HasValue || permissions.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
                return;

            JsonDocument? parsedDocument = null;
            try
            {
                var root = permissions.Value;
                if (root.ValueKind == JsonValueKind.String)
                {
                    var json = root.GetString();
                    if (string.IsNullOrWhiteSpace(json))
                        throw new ArgumentException("Permissions must not be an empty JSON string.");
                    parsedDocument = JsonDocument.Parse(json);
                    root = parsedDocument.RootElement;
                }

                if (root.ValueKind != JsonValueKind.Object)
                    throw new ArgumentException("Permissions must be a JSON object or JSON string containing an object.");

                foreach (var module in root.EnumerateObject())
                {
                    if (!SupportedPermissionModules.Contains(module.Name))
                        throw new ArgumentException($"Unsupported permission module '{module.Name}'.");
                    if (module.Value.ValueKind != JsonValueKind.Object)
                        throw new ArgumentException($"Permissions for module '{module.Name}' must be an object.");
                    foreach (var action in module.Value.EnumerateObject())
                    {
                        if (!SupportedPermissionActions.Contains(action.Name))
                            throw new ArgumentException($"Unsupported permission action '{action.Name}' in module '{module.Name}'.");
                        if (action.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                            throw new ArgumentException($"Permission '{module.Name}.{action.Name}' must be a boolean.");
                    }
                }
            }
            catch (JsonException)
            {
                throw new ArgumentException("Permissions must be a valid JSON permission matrix.");
            }
            finally
            {
                parsedDocument?.Dispose();
            }
        }

        private static void ValidatePermissionJson(string json)
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
                throw new ArgumentException("Permissions must be a JSON object keyed by supported module names.");
            var supportedModules = new HashSet<string>(SupportedModuleKeys(), StringComparer.OrdinalIgnoreCase);
            var supportedActions = new HashSet<string>(new[] { "view", "create", "edit", "delete", "export" }, StringComparer.OrdinalIgnoreCase);
            foreach (var module in document.RootElement.EnumerateObject())
            {
                if (!supportedModules.Contains(module.Name))
                    throw new ArgumentException($"Unsupported permission module '{module.Name}'.");
                if (module.Value.ValueKind != JsonValueKind.Object)
                    throw new ArgumentException($"Permissions for module '{module.Name}' must be an object.");
                foreach (var action in module.Value.EnumerateObject())
                {
                    if (!supportedActions.Contains(action.Name))
                        throw new ArgumentException($"Unsupported permission action '{action.Name}' in module '{module.Name}'.");
                    if (action.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                        throw new ArgumentException($"Permission action '{module.Name}.{action.Name}' must be a boolean.");
                }
            }
        }

        private static Dictionary<string, PermissionActionsDto>? ValidateParsedPermissions(
            Dictionary<string, PermissionActionsDto>? parsed)
        {
            if (parsed == null)
                throw new ArgumentException("Permissions must be a JSON object containing module permission objects.");
            if (parsed.Any(item => string.IsNullOrWhiteSpace(item.Key) || item.Value == null))
                throw new ArgumentException("Each permission module must contain an object with boolean action values.");
            return parsed;
        }

        private static object ToFrontendRole(AccessRoleDto role)
        {
            return new
            {
                id = role.Id,
                roleId = role.Id,
                name = role.Name,
                roleName = role.Name,
                code = CanonicalRoleCode.Normalize(role.Code),
                roleCode = CanonicalRoleCode.Normalize(role.Code),
                category = role.Category,
                level = role.Level,
                description = role.Description,
                status = string.Equals(
                    role.Status,
                    "Active",
                    StringComparison.OrdinalIgnoreCase),
                isSystem = role.IsSystem,
                userCount = role.UserCount,
                permissions = role.Permissions
            };
        }
    }
}
