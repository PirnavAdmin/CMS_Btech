using System.Security.Claims;
using BTech.Middleware;

namespace BTech.Services;

public sealed class ContractException(int statusCode, string code, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Code { get; } = code;
}

/// <summary>Uses the live authorization snapshot established by module middleware.</summary>
public static class CollegeDataScope
{
    public static bool IsSuper(HttpContext context) => context.Items[ModulePermissionMiddleware.SuperAdminItem] is true;
    public static bool HasRole(HttpContext context, string role) =>
        context.Items[ModulePermissionMiddleware.ActiveRolesItem] is HashSet<string> roles && roles.Contains(role);
    public static long Actor(HttpContext context) =>
        long.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub"), out var id) && id > 0
            ? id : throw new ContractException(401, "INVALID_IDENTITY", "Authentication is required.");
    public static long? Resolve(HttpContext context, long? requested = null, bool required = false)
    {
        if (context.Request.Query.TryGetValue("collegeId", out var raw))
        {
            if (!long.TryParse(raw.ToString(), out var query) || query <= 0)
                throw new ContractException(400, "INVALID_COLLEGE", "collegeId must be a positive integer.");
            if (requested.HasValue && requested != query)
                throw new ContractException(400, "COLLEGE_SCOPE_MISMATCH", "The body and query must select the same college.");
            requested = query;
        }
        if (requested is <= 0) throw new ContractException(400, "INVALID_COLLEGE", "collegeId must be a positive integer.");
        if (IsSuper(context)) return requested ?? (required
            ? throw new ContractException(400, "COLLEGE_REQUIRED", "Select a college using collegeId.") : null);
        var assigned = context.Items[ModulePermissionMiddleware.CurrentCollegeItem] as long?;
        if (assigned is not > 0) throw new ContractException(403, "COLLEGE_REQUIRED", "An authorized college is required.");
        if (requested.HasValue && requested != assigned)
            throw new ContractException(403, "CROSS_COLLEGE_ACCESS", "Cross-college access is not permitted.");
        return assigned;
    }
    public static ContractException NotImplemented(string workflow) => new(501, "WORKFLOW_NOT_IMPLEMENTED",
        workflow + " has no integrated persistence workflow in this release. No changes were saved.");
}
