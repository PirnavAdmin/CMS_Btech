using BTech.Middleware;

namespace BTech.Services;

public static class CollegeRequestScope
{
    public static long? GetCollegeId(HttpContext? context) =>
        context?.Items[ModulePermissionMiddleware.SuperAdminItem] is false
            ? context.Items[ModulePermissionMiddleware.CurrentCollegeItem] as long? : null;
}
