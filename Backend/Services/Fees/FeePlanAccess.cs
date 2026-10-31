using System.Data.Common;
using System.Security.Claims;
using BTech.Middleware;
using BTech.Services;
using Dapper;

namespace BTech.Services.Fees;

/// <summary>Live college and role checks, independent of stale role/college JWT claims.</summary>
public sealed class FeePlanAccess(IHttpContextAccessor accessor)
{
    public async Task<long> AuthorizeAsync(DbConnection connection, long collegeId, string module, string action,
        bool approval = false, DbTransaction? transaction = null)
    {
        FeePlanRules.Require(collegeId > 0, "A positive collegeId is required.");
        var context = accessor.HttpContext;
        var rawId = context?.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context?.User.FindFirstValue("sub");
        FeePlanRules.Require(context?.User.Identity?.IsAuthenticated == true && long.TryParse(rawId, out _), "Authentication is required.", 401);
        var userId = long.Parse(rawId!);
        var account = await connection.QuerySingleOrDefaultAsync<Account>("""
            SELECT college_id AS CollegeId FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL
            """, new { userId }, transaction);
        FeePlanRules.Require(account != null, "The account is inactive or missing.", 401);
        var roles = (await connection.QueryAsync<string>("""
            SELECT r.role_code FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
            WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
              AND r.status=1 AND r.deleted_at IS NULL
              AND (r.college_id IS NULL OR r.college_id=@collegeId)
            """, new { userId, collegeId }, transaction)).Select(CanonicalRoleCode.Normalize).ToHashSet();
        if (roles.Contains("SUPER_ADMIN")) return userId;
        var effectiveCollege = context!.Items[ModulePermissionMiddleware.CurrentCollegeItem] is long scoped
            ? scoped : account!.CollegeId;
        FeePlanRules.Require(effectiveCollege == collegeId, "Cross-college fee plan access is not permitted.", 403);
        FeePlanRules.Require(!roles.Contains("STUDENT"), "Student accounts cannot manage admission fee plans.", 403);
        if (approval)
            FeePlanRules.Require(roles.Overlaps(new[] { "COLLEGE_ADMIN", "PRINCIPAL" }),
                "Approval, publication and archive require an active College Admin, Principal or Super Admin role.", 403);
        var column = action switch
        {
            "view" => "can_view", "create" => "can_create", "edit" => "can_edit",
            _ => throw new ArgumentException("Invalid fee plan permission action.")
        };
        var granted = await connection.ExecuteScalarAsync<int>($"""
            SELECT COALESCE(MAX(CASE WHEN scoped.role_permission_id IS NOT NULL THEN scoped.{column}
                ELSE COALESCE(global_permission.{column},0) END),0)
            FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
            JOIN permission_modules pm ON pm.module_key=@module AND pm.status=1
            LEFT JOIN role_permissions scoped ON scoped.role_id=r.role_id AND scoped.module_key=@module AND scoped.college_id=@collegeId
            LEFT JOIN role_permissions global_permission ON global_permission.role_id=r.role_id AND global_permission.module_key=@module AND global_permission.college_id IS NULL
            WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
              AND r.status=1 AND r.deleted_at IS NULL AND (r.college_id IS NULL OR r.college_id=@collegeId)
            """, new { userId, collegeId, module }, transaction);
        FeePlanRules.Require(granted == 1, "You do not have permission to perform this fee plan action.", 403);
        return userId;
    }
    private sealed class Account { public long? CollegeId { get; set; } }
}
