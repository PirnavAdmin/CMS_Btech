using System.Data;
using System.Globalization;
using BTech.Middleware;
using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.OpenApi.Models;
using MySqlConnector;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace BTech.CampusManagement;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class CampusScopedAttribute : Attribute { }

public sealed record CampusWorkspaceScope(long CollegeId, long CampusId)
{
    public const string Header = "X-Campus-Id";

    public static CampusWorkspaceScope? From(HttpContext? context) =>
        context?.Items[typeof(CampusWorkspaceScope)] as CampusWorkspaceScope;
}

public sealed class CampusWorkspaceMiddleware(RequestDelegate next, IConfiguration config)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        var action = endpoint?.Metadata.GetMetadata<ControllerActionDescriptor>();
        if (action is null || context.User.Identity?.IsAuthenticated != true ||
            !context.Items.ContainsKey(ModulePermissionMiddleware.ActiveRolesItem))
        {
            await next(context);
            return;
        }

        var request = context.Request;
        var hasHeader = request.Headers.TryGetValue(CampusWorkspaceScope.Header, out var header);
        if (!config.GetValue<bool>("CampusWorkspace:Enabled"))
        {
            if (hasHeader)
                throw new ContractException(409, "CAMPUS_WORKSPACE_DISABLED", "Campus workspace is disabled on this backend.");
            await next(context);
            return;
        }

        var scoped = CampusWorkspaceContract.IsScoped(action);
        var screenExport = action.ControllerTypeInfo.AsType() == typeof(BTech.Controllers.V1.ScreenExportsController);
        var exportScreen = context.Request.RouteValues["screen"]?.ToString();
        if (screenExport && string.Equals(exportScreen, "sections", StringComparison.OrdinalIgnoreCase))
            scoped = true;
        var path = request.Path.Value ?? "";
        var shared = IsShared(path, screenExport, exportScreen);
        var admin = CollegeDataScope.IsSuper(context) || CollegeDataScope.HasRole(context, "COLLEGE_ADMIN");

        // Prevent campus-mode admins from reaching college-wide operational queries by omitting the header.
        if (!scoped && !shared && (hasHeader || admin || IsLegacyRoomOrSectionRoute(context, action)))
            throw Unsupported();
        if (!scoped && !hasHeader)
        {
            await next(context);
            return;
        }
        if (!hasHeader)
            throw new ContractException(400, "CAMPUS_REQUIRED", "Send X-Campus-Id for this campus workspace request.");
        if (header.Count != 1 || !long.TryParse(header[0], NumberStyles.None, CultureInfo.InvariantCulture, out var campusId) || campusId <= 0)
            throw new ContractException(400, "INVALID_CAMPUS", "X-Campus-Id must be one positive integer.");

        var collegeId = CollegeDataScope.Resolve(context, required: true)!.Value;
        await using var db = new MySqlConnection(config.GetConnectionString("DefaultConnection"));
        var permitted = await db.ExecuteScalarAsync<int>(new CommandDefinition(
            "sp_campus_workspace_can_access", new
            {
                p_user_id = CollegeDataScope.Actor(context), p_college_id = collegeId, p_campus_id = campusId,
                p_super_admin = CollegeDataScope.IsSuper(context)
            }, commandType: CommandType.StoredProcedure, cancellationToken: context.RequestAborted));
        if (permitted != 1)
            throw new ContractException(403, "CAMPUS_ACCESS_DENIED", "The selected campus is unavailable for this college and account.");

        context.Response.Headers["Cache-Control"] = "no-store";
        context.Items[typeof(CampusWorkspaceScope)] = new CampusWorkspaceScope(collegeId, campusId);
        await next(context);
    }

    private static ContractException Unsupported() =>
        new(409, "CAMPUS_SCOPE_UNAVAILABLE", "This operation has no campus-scoped implementation.");

    private static bool IsLegacyRoomOrSectionRoute(HttpContext context, ControllerActionDescriptor action) =>
        action.ControllerName == "SectionAssignments" ||
        (action.ControllerName == "AcademicDependencies" &&
            (context.Request.RouteValues["entity"]?.ToString()?.ToLowerInvariant() is "sections" or "section")) ||
        context.Request.Path.StartsWithSegments("/api/v1/timetable-management") ||
        context.Request.Path.StartsWithSegments("/api/v1/timetables") ||
        context.Request.Path.StartsWithSegments("/api/v1/timetable-entries");

    private static readonly HashSet<string> SharedCatalogs = new(StringComparer.OrdinalIgnoreCase)
    {
        "colleges", "college-settings", "academic-years", "academic-levels", "departments", "courses",
        "branches", "semesters", "semester", "course-structures", "course-semester-mappings", "exam-types"
    };

    private static bool IsShared(string path, bool screenExport, string? exportScreen)
    {
        var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var index = parts.Length > 1 && parts[1].Equals("v1", StringComparison.OrdinalIgnoreCase) ? 2 : 1;
        if (screenExport && parts.Length > index && parts[index].Equals("exports", StringComparison.OrdinalIgnoreCase))
            return exportScreen is null || SharedCatalogs.Contains(exportScreen);
        if (parts.Length <= index) return false;
        var resource = parts[index].ToLowerInvariant();
        if (resource is "campuses" or "campus-workspace" or "profile" or "account" or "roles" or "access-governance" or "access-requests"
            or "super-admin" or "credentials" or "college") return true;
        if (resource == "activity-logs") return parts.Length == index + 1;
        if (resource == "admin" && parts.Length > index + 1 && parts[index + 1].Equals("users", StringComparison.OrdinalIgnoreCase))
            return true;
        return SharedCatalogs.Contains(resource) &&
            !parts.Skip(index + 1).Any(segment => segment.ToLowerInvariant() is "dashboard" or "dependencies" or "deactivation-impact");
    }
}

internal static class CampusWorkspaceContract
{
    public static bool IsScoped(ControllerActionDescriptor action) =>
        action.MethodInfo.IsDefined(typeof(CampusScopedAttribute), inherit: true) ||
        action.ControllerTypeInfo.IsDefined(typeof(CampusScopedAttribute), inherit: true);
}

public sealed class CampusWorkspaceOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var relativePath = context.ApiDescription.RelativePath ?? "";
        var genericExport = relativePath.Equals("api/v1/exports/{screen}", StringComparison.OrdinalIgnoreCase);
        var scoped = context.ApiDescription.ActionDescriptor is ControllerActionDescriptor action && CampusWorkspaceContract.IsScoped(action);
        if (!genericExport && !scoped) return;

        operation.Parameters ??= new List<OpenApiParameter>();
        operation.Parameters.Add(new OpenApiParameter
        {
            Name = CampusWorkspaceScope.Header,
            In = ParameterLocation.Header,
            Required = !genericExport,
            Description = genericExport ? "Required for the sections screen when CampusWorkspace is enabled." :
                "Selected campus. Required when CampusWorkspace is enabled. Super Admin also supplies collegeId in the query.",
            Schema = new OpenApiSchema { Type = "integer", Format = "int64", Minimum = 1 }
        });
        if (!operation.Parameters.Any(p => p.In == ParameterLocation.Query && p.Name.Equals("collegeId", StringComparison.OrdinalIgnoreCase)))
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = "collegeId", In = ParameterLocation.Query, Description = "Selected college. Required for Super Admin in campus mode.",
                Schema = new OpenApiSchema { Type = "integer", Format = "int64", Minimum = 1 }
            });
    }
}
