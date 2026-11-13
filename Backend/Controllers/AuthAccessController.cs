using System.Security.Claims;
using System.Data;
using BTech.DTOs.AdminGovernance;
using BTech.Middleware;
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

        var dependency = "access-snapshot/database-connection";
        try
        {
            await using var connection = new MySqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            dependency = "access-snapshot/active-account/users";
            var account = await connection.QuerySingleOrDefaultAsync<AccountRow>(new CommandDefinition(
                "SELECT college_id AS CollegeId,profile_completed AS ProfileCompleted,academic_year_restricted AS AcademicYearRestricted FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL LIMIT 1;",
                new { userId }, cancellationToken: cancellationToken));
            if (account is null)
                return Unauthorized(new { success = false, message = "The account is inactive or no longer exists." });

            dependency = "access-snapshot/active-roles/user_roles+roles";
            var roleCodes = (await connection.QueryAsync<string>(new CommandDefinition("""
                SELECT DISTINCT UPPER(TRIM(r.role_code))
                FROM user_roles ur INNER JOIN roles r ON r.role_id=ur.role_id
                WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
                  AND r.status=1 AND r.deleted_at IS NULL;
                """, new { userId }, cancellationToken: cancellationToken)))
                .Select(CanonicalRoleCode.Normalize).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            if (roleCodes.Count == 0)
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "No active role is assigned." });

            dependency = "access-snapshot/college-mapping/college_user_mappings+college_settings+colleges";
            var mappedCollegeIds = (await connection.QueryAsync<long>(new CommandDefinition("""
                SELECT DISTINCT cs.college_id FROM college_user_mappings m
                JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
                JOIN colleges c ON c.college_id=cs.college_id
                WHERE m.user_id=@userId AND m.status=1 AND m.removed_at IS NULL
                  AND cs.status=1 AND c.status=1 AND c.deleted_at IS NULL;
                """, new { userId }, cancellationToken: cancellationToken))).ToArray();
            var isCollegeAdmin = roleCodes.Contains("COLLEGE_ADMIN", StringComparer.OrdinalIgnoreCase);
            var isSuperAdmin = roleCodes.Contains("SUPER_ADMIN", StringComparer.OrdinalIgnoreCase);
            long? assignedCollegeId = account.CollegeId;
            // This is the same active-assignment check used by module authorization.
            // Do not advertise users.college_id as an accessible college when its
            // college_user_mappings entry has been removed or made inactive.
            if (isCollegeAdmin && !isSuperAdmin)
            {
                dependency = "access-snapshot/active-college-assignment";
                var assignment = await connection.QuerySingleAsync<CollegeAdminAssignment>(new CommandDefinition(
                    "sp_cms_college_admin_assignment", new { p_user_id = userId },
                    commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken));
                if (assignment.ActiveAssignments != 1 || !assignment.CollegeId.HasValue ||
                    mappedCollegeIds.Length != 1 || mappedCollegeIds[0] != assignment.CollegeId)
                {
                    _logger.LogWarning("Effective college assignment denied. UserId={UserId}, PrimaryCollegeId={PrimaryCollegeId}, ActiveAssignments={ActiveAssignments}, TraceId={TraceId}",
                        userId, account.CollegeId, assignment.ActiveAssignments, HttpContext.TraceIdentifier);
                    Response.Headers[RequestLoggingMiddleware.CorrelationHeader] = HttpContext.TraceIdentifier;
                    return StatusCode(StatusCodes.Status403Forbidden, new {
                        success = false,
                        message = "College Admin requires exactly one active college assignment. Ask Super Admin to review college assignments.",
                        correlationId = HttpContext.TraceIdentifier });
                }
                assignedCollegeId = assignment.CollegeId;
                if (account.CollegeId != assignedCollegeId)
                    _logger.LogWarning("Effective college corrected from active assignment. UserId={UserId}, AccountCollegeId={AccountCollegeId}, AssignedCollegeId={AssignedCollegeId}, TraceId={TraceId}",
                        userId, account.CollegeId, assignedCollegeId, HttpContext.TraceIdentifier);
            }
            if (collegeId is <= 0)
                return BadRequest(new { success = false, message = "collegeId must be a positive integer." });
            var effectiveCollegeId = collegeId ?? assignedCollegeId;
            if (!isSuperAdmin && effectiveCollegeId != assignedCollegeId &&
                (!isCollegeAdmin || !effectiveCollegeId.HasValue || !mappedCollegeIds.Contains(effectiveCollegeId.Value)))
            {
                _logger.LogWarning("Effective college selection denied. UserId={UserId}, AssignedCollegeId={AssignedCollegeId}, RequestedCollegeId={RequestedCollegeId}, TraceId={TraceId}",
                    userId, assignedCollegeId, effectiveCollegeId, HttpContext.TraceIdentifier);
                Response.Headers[RequestLoggingMiddleware.CorrelationHeader] = HttpContext.TraceIdentifier;
                return StatusCode(StatusCodes.Status403Forbidden, new {
                    success = false, message = "An active college assignment is required.",
                    correlationId = HttpContext.TraceIdentifier });
            }

            var matrix = ModuleKeys.ToDictionary(k => k, _ => new PermissionActionsDto(), StringComparer.OrdinalIgnoreCase);
            if (isSuperAdmin)
            {
                foreach (var p in matrix.Values) { p.View = p.Create = p.Edit = p.Delete = p.Export = true; }
            }
            else
            {
                dependency = "access-snapshot/role-permissions/permission_modules+role_permissions";
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

            dependency = "access-snapshot/user-year-access/user_academic_year_access";
            var assignedAcademicYearIds = (await connection.QueryAsync<long>(new CommandDefinition(
                "SELECT academic_year_id FROM user_academic_year_access WHERE user_id=@userId ORDER BY academic_year_id",new{userId},cancellationToken:cancellationToken))).ToArray();
            if (!isSuperAdmin)
            {
                dependency = "access-snapshot/user-permissions/user_module_permissions";
                var userOverrides=await connection.QueryAsync<PermissionRow>(new CommandDefinition(
                    "SELECT module_key AS ModuleKey,can_view AS CanView,can_create AS CanCreate,can_edit AS CanEdit,can_delete AS CanDelete,can_export AS CanExport FROM user_module_permissions WHERE user_id=@userId AND college_id=@collegeId",
                    new{userId,collegeId=effectiveCollegeId},cancellationToken:cancellationToken));
                foreach(var p in userOverrides)
                {
                    if(!matrix.TryGetValue(p.ModuleKey,out var target))continue;
                    target.View &= p.CanView==1;target.Create &= p.CanCreate==1;target.Edit &= p.CanEdit==1;target.Delete &= p.CanDelete==1;target.Export &= p.CanExport==1;
                }
            }
            // Reading the assigned college's own record is a baseline College Admin
            // capability. The middleware permits only the known college metadata GET
            // routes after resolving their ownership; all writes keep their grants.
            if (isCollegeAdmin && !isSuperAdmin &&
                !roleCodes.Contains("STUDENT", StringComparer.OrdinalIgnoreCase))
                matrix["colleges"].View = true;
            var rolePermission = matrix.GetValueOrDefault("roles_permissions") ?? new PermissionActionsDto();
            var canManageAccess = isSuperAdmin || (isCollegeAdmin && rolePermission.View && (rolePermission.Create || rolePermission.Edit));
            var canDelegateAccess = isSuperAdmin || (isCollegeAdmin && rolePermission.View && rolePermission.Create && rolePermission.Edit);



            return Ok(new
            {
                success = true,
                data = new
                {
                    userId,
                    profileCompleted = account.ProfileCompleted,
                    academicYearRestricted = account.AcademicYearRestricted,
                    assignedAcademicYearIds,
                    roleCodes,
                    collegeId = effectiveCollegeId,
                    primaryCollegeId = assignedCollegeId,
                    mappedCollegeIds,
                    academicYearCollegeIds = isCollegeAdmin
                        ? mappedCollegeIds
                        : account.CollegeId.HasValue ? new[] { account.CollegeId.Value } : Array.Empty<long>(),
                    academicSetupCollegeIds = isCollegeAdmin
                        ? mappedCollegeIds
                        : account.CollegeId.HasValue ? new[] { account.CollegeId.Value } : Array.Empty<long>(),
                    academicYearScope = isSuperAdmin ? "all-selected-colleges" : "assigned-colleges-with-permission",
                    roleClaimTypes = User.Identities.Select(i => i.RoleClaimType).Distinct().ToArray(),
                    tokenRoleCodes = User.Identities.SelectMany(i => i.FindAll(i.RoleClaimType)).Select(c => CanonicalRoleCode.Normalize(c.Value)).Distinct().ToArray(),
                    tokenCollegeId = User.FindFirstValue("collegeId"),
                    buildId = BackendBuild.Id,
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
            // Let centralized middleware retain actionable diagnostics and correlation.
            // Returning an action 503 here would be replaced by ApiErrorSanitizationFilter.
            throw new AuthorizationDependencyException(ex, dependency, _connectionString);
        }
    }

    private sealed class AccountRow { public long? CollegeId { get; set; } public bool ProfileCompleted {get;set;} public bool AcademicYearRestricted {get;set;} }
    private sealed class CollegeAdminAssignment { public long? CollegeId { get; set; } public int ActiveAssignments { get; set; } }
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
