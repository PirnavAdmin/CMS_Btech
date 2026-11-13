using System.Security.Claims;
using BTech.Middleware;
using Dapper;
using MySqlConnector;
using System.Data;
namespace BTech.UserAccess;

// Restrictive accounts must not reach legacy queries that ignore year filters.
// Only routes with a verified year boundary are admitted; adding a query string
// is not treated as proof that a legacy endpoint actually filters its records.
public sealed class UserYearScopeMiddleware(RequestDelegate next,IConfiguration config,ILogger<UserYearScopeMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var path=(context.Request.Path.Value??"").TrimEnd('/');
        if(context.User.Identity?.IsAuthenticated!=true || !path.StartsWith("/api/",StringComparison.OrdinalIgnoreCase) ||
           context.Items[ModulePermissionMiddleware.SuperAdminItem] is true ||
           path.StartsWith("/api/v1/auth/",StringComparison.OrdinalIgnoreCase) ||
           path.Equals("/api/auth/me/access",StringComparison.OrdinalIgnoreCase) ||
           path.Equals("/api/v1/account/profile",StringComparison.OrdinalIgnoreCase) ||
           (path.Equals("/api/v1/profile",StringComparison.OrdinalIgnoreCase) &&
            (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method)))) {await next(context);return;}
        if(!long.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier)??context.User.FindFirstValue("sub"),out var userId))return;
        var restricted=await QueryAsync(c => c.ExecuteScalarAsync<bool>("SELECT academic_year_restricted FROM users WHERE user_id=@userId",new{userId}), "user-year-restriction/users", context.RequestAborted);
        if(!restricted){await next(context);return;}
        // College identity has no academic-year rows. The module middleware has
        // already checked the live role, assignment, permissions and ownership;
        // the college repository also scopes list/search/detail to this ID.
        // Do not exempt other college resources or any writes from year scope.
        if(IsVerifiedAssignedCollegeIdentityRead(context,path))
        {
            await next(context);
            return;
        }
        const string prefix="/api/v1/academic-years";
        if(context.Request.Method=="GET" && path.Equals(prefix,StringComparison.OrdinalIgnoreCase))
        {
            var collegeId=context.Items[ModulePermissionMiddleware.CurrentCollegeItem] as long?;
            var rows=await QueryAsync(c => c.QueryAsync(new CommandDefinition(
                "sp_cms_user_assigned_years",new{p_user_id=userId,p_college_id=collegeId},
                commandType:CommandType.StoredProcedure,cancellationToken:context.RequestAborted)),
                "assigned-year-reads/sp_cms_user_assigned_years",context.RequestAborted);
            await context.Response.WriteAsJsonAsync(new{success=true,data=rows});return;
        }
        if(context.Request.Method=="GET" && path.StartsWith(prefix+"/",StringComparison.OrdinalIgnoreCase) && long.TryParse(path[(prefix.Length+1)..],out var id))
        {
            var collegeId=context.Items[ModulePermissionMiddleware.CurrentCollegeItem] as long?;
            var granted=await QueryAsync(c => c.ExecuteScalarAsync<int>(new CommandDefinition(
                "sp_cms_user_assigned_year_read",new{p_user_id=userId,p_college_id=collegeId,p_academic_year_id=id},
                commandType:CommandType.StoredProcedure,cancellationToken:context.RequestAborted)),
                "assigned-year-check/sp_cms_user_assigned_year_read",context.RequestAborted);
            if(granted==1){await next(context);return;}
        }
        logger.LogWarning("Academic-year scope denied. UserId={UserId}, Method={Method}, Path={Path}, Code={Code}, TraceId={TraceId}",
            userId,context.Request.Method,path,"ACADEMIC_YEAR_SCOPE_REQUIRED",context.TraceIdentifier);
        context.Response.StatusCode=403;
        context.Response.Headers[RequestLoggingMiddleware.CorrelationHeader]=context.TraceIdentifier;
        await context.Response.WriteAsJsonAsync(new{success=false,code="ACADEMIC_YEAR_SCOPE_REQUIRED",message="This account has restricted academic-year access. Only assigned academic-year reads are supported; this legacy module has no verified per-year data boundary.",correlationId=context.TraceIdentifier});
    }

    private static bool IsVerifiedAssignedCollegeIdentityRead(HttpContext context,string path)
    {
        if(!HttpMethods.IsGet(context.Request.Method) ||
           context.Items[ModulePermissionMiddleware.CurrentCollegeItem] is not long collegeId || collegeId<=0 ||
           context.Items[ModulePermissionMiddleware.AssignedCollegeItem] is not long assignedCollegeId ||
           assignedCollegeId!=collegeId ||
           context.Items[ModulePermissionMiddleware.ActiveRolesItem] is not HashSet<string> roles ||
           !roles.Contains("COLLEGE_ADMIN") || roles.Contains("STUDENT")) return false;

        const string collection="/api/v1/colleges";
        if(path.Equals(collection,StringComparison.OrdinalIgnoreCase) ||
           path.Equals(collection+"/search",StringComparison.OrdinalIgnoreCase) ||
           path.Equals(collection+"/my-college",StringComparison.OrdinalIgnoreCase)) return true;
        return path.StartsWith(collection+"/",StringComparison.OrdinalIgnoreCase) &&
               long.TryParse(path[(collection.Length+1)..],out var requestedId) && requestedId==collegeId;
    }

    private async Task<T> QueryAsync<T>(Func<MySqlConnection, Task<T>> operation, string dependency, CancellationToken cancellationToken)
    {
        var connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
        var phase = dependency + "/connection";
        try
        {
            await using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            phase = dependency;
            return await operation(connection);
        }
        catch (MySqlException ex)
        {
            throw new BTech.Services.AuthorizationDependencyException(ex, phase, connectionString);
        }
    }
}
