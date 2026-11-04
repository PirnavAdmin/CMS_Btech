using System.Security.Claims;
using BTech.Middleware;
using Dapper;
using MySqlConnector;
namespace BTech.UserAccess;

// Restrictive accounts must not reach legacy queries that ignore year filters.
// Only routes with a verified year boundary are admitted; adding a query string
// is not treated as proof that a legacy endpoint actually filters its records.
public sealed class UserYearScopeMiddleware(RequestDelegate next,IConfiguration config)
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
        const string prefix="/api/v1/academic-years";
        if(context.Request.Method=="GET" && path.Equals(prefix,StringComparison.OrdinalIgnoreCase))
        {
            var collegeId=context.Items[ModulePermissionMiddleware.CurrentCollegeItem] as long?;
            var rows=await QueryAsync(c => c.QueryAsync("""
                SELECT a.academic_year_id AS academicYearId,a.college_id AS collegeId,a.academic_year_name AS academicYearName,
                  a.start_date AS startDate,a.end_date AS endDate,a.status,a.is_archived AS isArchived
                FROM academicyears a JOIN user_academic_year_access ua ON ua.academic_year_id=a.academic_year_id AND ua.college_id=a.college_id
                WHERE ua.user_id=@userId AND a.college_id=@collegeId AND a.deleted_at IS NULL ORDER BY a.start_date DESC
                """,new{userId,collegeId}), "assigned-year-reads/user_academic_year_access+academicyears", context.RequestAborted);
            await context.Response.WriteAsJsonAsync(new{success=true,data=rows});return;
        }
        if(context.Request.Method=="GET" && path.StartsWith(prefix+"/",StringComparison.OrdinalIgnoreCase) && long.TryParse(path[(prefix.Length+1)..],out var id))
        {
            var granted=await QueryAsync(c => c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM user_academic_year_access ua JOIN academicyears a ON a.academic_year_id=ua.academic_year_id AND a.college_id=ua.college_id WHERE ua.user_id=@userId AND ua.academic_year_id=@id AND a.deleted_at IS NULL",new{userId,id}), "assigned-year-check/user_academic_year_access+academicyears", context.RequestAborted);
            if(granted==1){await next(context);return;}
        }
        context.Response.StatusCode=403;
        await context.Response.WriteAsJsonAsync(new{success=false,code="ACADEMIC_YEAR_SCOPE_REQUIRED",message="This account has restricted academic-year access. Only assigned academic-year reads are supported; this legacy module has no verified per-year data boundary.",correlationId=context.TraceIdentifier});
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
