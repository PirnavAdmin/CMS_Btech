using System.Security.Claims;
using BTech.Middleware;
using BTech.Models;

namespace BTech.Services;

// Uses the live authorization snapshot, never a requested college or a stale JWT role.
public sealed record CollegeManagementScope(long UserId, long? AssignedCollegeId, bool IsSuperAdmin, bool IsCollegeAdmin)
{
    public static CollegeManagementScope From(HttpContext? context)
    {
        if (context?.User.Identity?.IsAuthenticated != true ||
            !long.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ||
            context.Items[ModulePermissionMiddleware.SuperAdminItem] is not bool isSuperAdmin ||
            context.Items[ModulePermissionMiddleware.ActiveRolesItem] is not HashSet<string> roles)
            throw new UnauthorizedAccessException("A verified account is required.");
        return new(userId, context.Items[ModulePermissionMiddleware.AssignedCollegeItem] as long?,
            isSuperAdmin, roles.Contains("COLLEGE_ADMIN") && !roles.Contains("STUDENT"));
    }

    public bool CanAccess(College college) => IsSuperAdmin ||
        college.CollegeId == AssignedCollegeId || (IsCollegeAdmin && college.CreatedBy == UserId);
}
