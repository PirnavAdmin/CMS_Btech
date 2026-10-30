using System.Security.Claims;
using BTech.DTOs.AdminGovernance;
using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers;

[ApiController]
[Authorize]
[Route("api/auth/me")]
public sealed class AuthAccessController : ControllerBase
{
    private readonly string _connectionString;
    private readonly ILogger<AuthAccessController> _logger;

    private static readonly string[] ModuleKeys =
    [
        "dashboard", "my_profile", "notifications", "colleges", "departments", "academic_years", "courses", "branches",
        "semesters", "sections", "rooms", "subjects", "timetable", "credits", "electives", "materials", "faculty_directory",
        "faculty_attendance", "faculty_leaves", "faculty_payroll", "student_admissions", "student_profiles", "student_attendance",
        "student_promotions", "examinations", "marks", "results", "fees", "library", "meetings_events", "placement",
        "roles_permissions", "academic_settings"
    ];

    public AuthAccessController(IConfiguration configuration, ILogger<AuthAccessController> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
        _logger = logger;
    }

    [HttpGet("access")]
    public async Task<IActionResult> GetAccess(CancellationToken cancellationToken, [FromQuery] long? collegeId = null)
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!long.TryParse(userIdValue, out var userId) || userId <= 0)
            return Unauthorized(new { success = false, message = "A valid user identity is required." });

        try
        {
            await using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            var account = await connection.QuerySingleOrDefaultAsync<AccountRow>(new CommandDefinition(
                "SELECT college_id AS CollegeId FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL LIMIT 1;",
                new { userId }, cancellationToken: cancellationToken));
            if (account is null)
                return Unauthorized(new { success = false, message = "The account is inactive or no longer exists." });

            var roleCodes = (await connection.QueryAsync<string>(new CommandDefinition("""
                SELECT DISTINCT UPPER(TRIM(r.role_code))
                FROM user_roles ur INNER JOIN roles r ON r.role_id=ur.role_id
                WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
                  AND r.status=1 AND r.deleted_at IS NULL;
                """, new { userId }, cancellationToken: cancellationToken)))
                .Select(CanonicalRoleCode.Normalize).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            if (roleCodes.Count == 0)
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "No active role is assigned." });

            var mappedCollegeIds = (await connection.QueryAsync<long>(new CommandDefinition("""
                SELECT DISTINCT cs.college_id FROM college_user_mappings m
                JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
                JOIN colleges c ON c.college_id=cs.college_id
                WHERE m.user_id=@userId AND m.status=1 AND m.removed_at IS NULL
                  AND cs.status=1 AND c.status=1 AND c.deleted_at IS NULL;
                """, new { userId }, cancellationToken: cancellationToken))).ToArray();
            var isCollegeAdmin = roleCodes.Contains("COLLEGE_ADMIN", StringComparer.OrdinalIgnoreCase);
            var isSuperAdmin = roleCodes.Contains("SUPER_ADMIN", StringComparer.OrdinalIgnoreCase);
            if (collegeId is <= 0)
                return BadRequest(new { success = false, message = "collegeId must be a positive integer." });
            var effectiveCollegeId = collegeId ?? account.CollegeId;
            if (!isSuperAdmin && effectiveCollegeId != account.CollegeId &&
                (!isCollegeAdmin || !effectiveCollegeId.HasValue || !mappedCollegeIds.Contains(effectiveCollegeId.Value)))
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "An active college assignment is required." });

            var matrix = ModuleKeys.ToDictionary(k => k, _ => new PermissionActionsDto(), StringComparer.OrdinalIgnoreCase);
            if (isSuperAdmin)
            {
                foreach (var p in matrix.Values) { p.View = p.Create = p.Edit = p.Delete = p.Export = true; }
            }
            else
            {
                var permissions = await connection.QueryAsync<PermissionRow>(new CommandDefinition("""
                    SELECT rp.module_key AS ModuleKey,
                           MAX(CASE WHEN rp.can_view=1 THEN 1 ELSE 0 END) AS CanView,
                           MAX(CASE WHEN rp.can_create=1 THEN 1 ELSE 0 END) AS CanCreate,
                           MAX(CASE WHEN rp.can_edit=1 THEN 1 ELSE 0 END) AS CanEdit,
                           MAX(CASE WHEN rp.can_delete=1 THEN 1 ELSE 0 END) AS CanDelete,
                           MAX(CASE WHEN rp.can_export=1 THEN 1 ELSE 0 END) AS CanExport
                    FROM user_roles ur
                    INNER JOIN roles r ON r.role_id=ur.role_id
                    INNER JOIN role_permissions rp ON rp.role_id=r.role_id
                    WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
                      AND r.status=1 AND r.deleted_at IS NULL
                      AND (r.college_id IS NULL OR r.college_id=@collegeId)
                      AND EXISTS (SELECT 1 FROM permission_modules pm WHERE pm.module_key=rp.module_key AND pm.status=1)
                      AND (rp.college_id IS NULL OR rp.college_id=@collegeId)
                      AND NOT (rp.college_id IS NULL AND EXISTS (
                          SELECT 1 FROM role_permissions scoped
                          WHERE scoped.role_id=rp.role_id AND scoped.module_key=rp.module_key
                            AND scoped.college_id=@collegeId))
                    GROUP BY rp.module_key;
                    """, new { userId, collegeId = effectiveCollegeId }, cancellationToken: cancellationToken));
                foreach (var p in permissions)
                {
                    if (!matrix.TryGetValue(p.ModuleKey, out var target)) continue;
                    target.View |= p.CanView == 1;
                    target.Create |= p.CanCreate == 1;
                    target.Edit |= p.CanEdit == 1;
                    target.Delete |= p.CanDelete == 1;
                    target.Export |= p.CanExport == 1;
                }
            }

            // A student role imposes a portal ceiling even when another ordinary role grants admin modules.
            if (!isSuperAdmin && roleCodes.Contains("STUDENT", StringComparer.OrdinalIgnoreCase))
            {
                var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "dashboard", "my_profile", "notifications", "subjects", "student_attendance", "results", "timetable", "materials", "fees" };
                foreach (var key in matrix.Keys.Where(k => !allowed.Contains(k)).ToList()) matrix[key] = new PermissionActionsDto();
            }

            var rolePermission = matrix.GetValueOrDefault("roles_permissions") ?? new PermissionActionsDto();
            var canManageAccess = isSuperAdmin || (isCollegeAdmin && rolePermission.View && (rolePermission.Create || rolePermission.Edit));
            var canDelegateAccess = isSuperAdmin || (isCollegeAdmin && rolePermission.View && rolePermission.Create && rolePermission.Edit);



            return Ok(new
            {
                success = true,
                data = new
                {
                    userId,
                    roleCodes,
                    collegeId = effectiveCollegeId,
                    primaryCollegeId = account.CollegeId,
                    mappedCollegeIds,
                    academicYearCollegeIds = isCollegeAdmin
                        ? mappedCollegeIds.Concat(account.CollegeId.HasValue ? new[] { account.CollegeId.Value } : Array.Empty<long>()).Distinct().ToArray()
                        : account.CollegeId.HasValue ? new[] { account.CollegeId.Value } : Array.Empty<long>(),
                    academicSetupCollegeIds = isCollegeAdmin
                        ? mappedCollegeIds.Concat(account.CollegeId.HasValue ? new[] { account.CollegeId.Value } : Array.Empty<long>()).Distinct().ToArray()
                        : account.CollegeId.HasValue ? new[] { account.CollegeId.Value } : Array.Empty<long>(),
                    academicYearScope = isSuperAdmin ? "all-selected-colleges" : "assigned-colleges-with-permission",
                    roleClaimTypes = User.Identities.Select(i => i.RoleClaimType).Distinct().ToArray(),
                    tokenRoleCodes = User.Identities.SelectMany(i => i.FindAll(i.RoleClaimType)).Select(c => CanonicalRoleCode.Normalize(c.Value)).Distinct().ToArray(),
                    tokenCollegeId = User.FindFirstValue("collegeId"),
                    buildId = "cms-backend-20261030-admin-college-setup",
                    buildModuleId = typeof(AuthAccessController).Assembly.ManifestModule.ModuleVersionId.ToString(),
                    permissions = matrix,
                    canManageAccess,
                    canDelegateAccess,
                    isSuperAdmin,
                    isCollegeAdmin
                }
            });
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Failed to load effective permissions for UserId={UserId}", userId);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { success = false, message = "Authorization data is temporarily unavailable." });
        }
    }

    private sealed class AccountRow { public long? CollegeId { get; set; } }
    private sealed class PermissionRow
    {
        public string ModuleKey { get; set; } = string.Empty;
        public int CanView { get; set; }
        public int CanCreate { get; set; }
        public int CanEdit { get; set; }
        public int CanDelete { get; set; }
        public int CanExport { get; set; }
    }
}
