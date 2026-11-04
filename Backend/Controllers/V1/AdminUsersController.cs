using BTech.Middleware;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

// The middleware sets SuperAdminItem only after checking the active account and
// active role assignment in the database. Never trust a JWT role alone here.
[ApiController]
[Authorize]
[Route("api/v1/admin/users")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly string _connectionString;

    public AdminUsersController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
    }

    private bool IsVerifiedSuperAdmin =>
        HttpContext.Items[ModulePermissionMiddleware.SuperAdminItem] is true;

    [HttpGet]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken,
        [FromQuery] long? collegeId = null, [FromQuery] string? search = null,
        [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
    {
        if (!IsVerifiedSuperAdmin) return Forbid();
        if (collegeId is <= 0 || pageNumber < 1 || pageSize < 1 || pageSize > 200)
            return BadRequest(new { success = false, message = "Use a positive collegeId/pageNumber and pageSize between 1 and 200." });

        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        var parameters = new
        {
            collegeId, search = string.IsNullOrWhiteSpace(search) ? null : "%" + search.Trim() + "%",
            pageSize, offset = ((long)pageNumber - 1) * pageSize
        };
        const string filter = """
            FROM users u
            WHERE u.deleted_at IS NULL AND (@collegeId IS NULL OR u.college_id=@collegeId)
              AND (@search IS NULL OR u.full_name LIKE @search OR u.employee_user_id LIKE @search OR u.email LIKE @search)
            """;
        var totalCount = await connection.ExecuteScalarAsync<long>(new CommandDefinition(
            "SELECT COUNT(*) " + filter, parameters, cancellationToken: cancellationToken));
        // Explicit fields only: never expose password hashes or authentication secrets.
        var users = (await connection.QueryAsync<UserRow>(new CommandDefinition("""
            SELECT u.user_id AS UserId, u.college_id AS CollegeId,
                   CASE WHEN u.internal_identifier=1 THEN NULL ELSE u.employee_user_id END AS EmployeeUserId, u.full_name AS FullName,
                   u.email AS Email,u.mobile AS Mobile,u.status AS Status,u.profile_completed AS ProfileCompleted,
                   u.must_change_password AS MustChangePassword,u.created_at AS CreatedAt,u.last_login_at AS LastLoginAt,
                   (SELECT c.college_name FROM colleges c WHERE c.college_id=u.college_id) AS CollegeName,
                   (SELECT c.college_code FROM colleges c WHERE c.college_id=u.college_id) AS CollegeCode,
                   CASE WHEN u.status<>1 THEN 'Suspended' WHEN u.must_change_password=1 THEN 'Pending Invitation'
                        WHEN u.profile_completed=0 THEN 'Profile Pending' ELSE 'Active' END AS AccountStatus
            """ + "\n" + filter + " ORDER BY u.user_id LIMIT @pageSize OFFSET @offset;",
            parameters, cancellationToken: cancellationToken))).ToList();
        if (users.Count > 0)
        {
            var roles = await connection.QueryAsync<UserRoleRow>(new CommandDefinition("""
                SELECT ur.user_id AS UserId,r.role_id AS RoleId,r.role_code AS RoleCode,r.role_name AS RoleName
                FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
                WHERE ur.user_id IN @ids AND ur.status=1 AND ur.removed_at IS NULL
                  AND r.status=1 AND r.deleted_at IS NULL;
                """, new { ids = users.Select(u => u.UserId).ToArray() }, cancellationToken: cancellationToken));
            var byUser = roles.ToLookup(r => r.UserId);
            foreach (var user in users)
            {
                user.RoleCodes = byUser[user.UserId].Select(r => BTech.Services.CanonicalRoleCode.Normalize(r.RoleCode)).Distinct().ToArray();
                user.RoleIds=byUser[user.UserId].Select(r=>r.RoleId).Distinct().ToArray();
                user.RoleNames=byUser[user.UserId].Select(r=>r.RoleName).Distinct().ToArray();
            }
            // Edit sends the directory's permissions back unchanged. Include the
            // actual overrides so a details-only edit cannot erase existing grants.
            var permissions=await connection.QueryAsync<PermissionRow>(new CommandDefinition("""
                SELECT p.user_id AS UserId,p.module_key AS ModuleKey,p.can_view AS CanView,p.can_create AS CanCreate,
                    p.can_edit AS CanEdit,p.can_delete AS CanDelete,p.can_export AS CanExport
                FROM user_module_permissions p JOIN users u ON u.user_id=p.user_id AND u.college_id=p.college_id
                WHERE p.user_id IN @ids
                """,new{ids=users.Select(u=>u.UserId).ToArray()},cancellationToken:cancellationToken));
            var byPermission=permissions.ToLookup(p=>p.UserId);
            foreach(var user in users) user.Permissions=byPermission[user.UserId].ToDictionary(p=>p.ModuleKey,p=>(object)new{p.CanView,p.CanCreate,p.CanEdit,p.CanDelete,p.CanExport});
        }
        return Ok(new { success = true, data = new { items = users, totalCount, pageNumber, pageSize } });
    }

    [HttpGet("lookups")]
    public async Task<IActionResult> GetLookups(CancellationToken cancellationToken)
    {
        if (!IsVerifiedSuperAdmin) return Forbid();
        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        var colleges = await connection.QueryAsync(new CommandDefinition("""
            SELECT college_id AS collegeId, college_code AS collegeCode, college_name AS collegeName
            FROM colleges WHERE status=1 AND deleted_at IS NULL ORDER BY college_name;
            """, cancellationToken: cancellationToken));
        var roles = await connection.QueryAsync(new CommandDefinition("""
            SELECT role_id AS roleId, role_code AS roleCode, role_name AS roleName, college_id AS collegeId
            FROM roles WHERE status=1 AND deleted_at IS NULL ORDER BY role_name;
            """, cancellationToken: cancellationToken));
        return Ok(new { success = true, data = new { colleges, roles,
            statuses = new[] { new { value = 1, label = "Active" }, new { value = 0, label = "Inactive" } } } });
    }

    private sealed class UserRow
    {
        public long UserId { get; set; }
        public long? CollegeId { get; set; }
        public string EmployeeUserId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? CollegeName { get; set; }
        public string? CollegeCode { get; set; }
        public string AccountStatus { get; set; } = "";
        public bool MustChangePassword { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public int Status { get; set; }
        public bool ProfileCompleted { get; set; }
        public string[] RoleCodes { get; set; } = [];
        public long[] RoleIds { get; set; } = [];
        public string[] RoleNames { get; set; } = [];
        public Dictionary<string,object> Permissions { get; set; } = new();
    }
    private sealed class UserRoleRow
    {
        public long UserId { get; set; }
        public string RoleCode { get; set; } = "";
        public long RoleId { get; set; }
        public string RoleName { get; set; } = "";
    }
    private sealed class PermissionRow
    {
        public long UserId{get;set;} public string ModuleKey{get;set;}="";
        public bool CanView{get;set;} public bool CanCreate{get;set;} public bool CanEdit{get;set;} public bool CanDelete{get;set;} public bool CanExport{get;set;}
    }
}
