using System.Security.Claims;
using Dapper;
using BTech.Services;
using MySqlConnector;
using Microsoft.AspNetCore.Authorization;
namespace BTech.UserAccess;

// Runs before module middleware, including for SUPER_ADMIN. Live checks prevent
// stale JWTs from bypassing account deactivation, password reset or profile setup.
public sealed class AccountReadinessMiddleware(RequestDelegate next, IConfiguration config)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var path=(context.Request.Path.Value??"").TrimEnd('/');
        if(!path.StartsWith("/api/",StringComparison.OrdinalIgnoreCase) || context.User.Identity?.IsAuthenticated!=true || context.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>()!=null)
        {await next(context);return;}
        // Login and refresh perform their own live account checks and must work even
        // if a client sends an obsolete access token along with the credentials.
        if(path is "/api/v1/auth/login" or "/api/v1/auth/refresh" or "/api/v1/auth/forgot-password") {await next(context);return;}
        if(!long.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier)??context.User.FindFirstValue("sub"),out var userId))
        {await Reject(context,401,"INVALID_IDENTITY","A valid user identity is required.");return;}
        var user = await LoadAccountAsync(userId, context.RequestAborted);
        var versionText=context.User.FindFirstValue("accessVersion");
        var version=0;if(versionText!=null && !int.TryParse(versionText,out version))version=-1;
        if(user is null || version!=user.Version){await Reject(context,401,"SESSION_INVALID","Account or session is no longer valid. Sign in again.");return;}
        if(user.MustChange && !path.Equals("/api/v1/auth/change-password",StringComparison.OrdinalIgnoreCase))
        {await Reject(context,403,"PASSWORD_CHANGE_REQUIRED","Complete password setup before accessing modules.");return;}
        if(!user.Completed && !path.Equals("/api/v1/account/profile",StringComparison.OrdinalIgnoreCase) &&
            !(path.Equals("/api/v1/profile",StringComparison.OrdinalIgnoreCase) && (HttpMethods.IsGet(context.Request.Method)||HttpMethods.IsPatch(context.Request.Method))) &&
            !path.Equals("/api/auth/me/access",StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith("/api/v1/auth/",StringComparison.OrdinalIgnoreCase))
        {await Reject(context,403,"PROFILE_COMPLETION_REQUIRED","Complete your profile using PATCH /api/v1/profile or PUT /api/v1/account/profile.");return;}
        await next(context);
    }
    private async Task<Row?> LoadAccountAsync(long userId, CancellationToken cancellationToken)
    {
        var connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
        var dependency = "account-readiness/database-connection";
        try
        {
            await using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            dependency = "account-readiness/users.profile_completed+access_version";
            var row = await connection.QuerySingleOrDefaultAsync<Row>(new CommandDefinition(
                """
                SELECT u.profile_completed AS Completed,u.access_version AS Version,u.must_change_password AS MustChange,
                    u.full_name AS FullName,u.email AS Email,u.mobile AS Mobile,
                    ep.house_number AS HouseNumber,ep.status AS EmployeeStatus
                FROM users u LEFT JOIN employee_profiles ep ON ep.user_id=u.user_id AND ep.deleted_at IS NULL
                WHERE u.user_id=@userId AND u.status=1 AND u.deleted_at IS NULL
                """, new { userId }, cancellationToken: cancellationToken));
            if (row == null) return null;
            var roles = await connection.QueryAsync<string>(new CommandDefinition(
                """
                SELECT r.role_code FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
                WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
                  AND r.status=1 AND r.deleted_at IS NULL
                """, new { userId }, cancellationToken: cancellationToken));
            if (EmployeeProfileCompletion.AppliesTo(roles))
                row.Completed = row.EmployeeStatus == 1 && EmployeeProfileCompletion.IsComplete(
                    row.FullName, row.Email, row.Mobile, row.HouseNumber);
            return row;
        }
        catch (MySqlException ex)
        {
            throw new BTech.Services.AuthorizationDependencyException(ex, dependency, connectionString);
        }
    }
    private static Task Reject(HttpContext c,int status,string code,string message)
    {c.Response.StatusCode=status;return c.Response.WriteAsJsonAsync(new{success=false,code,message,correlationId=c.TraceIdentifier});}
    private sealed class Row
    {
        public bool Completed { get; set; }
        public int Version { get; set; }
        public bool MustChange { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? HouseNumber { get; set; }
        public int? EmployeeStatus { get; set; }
    }
}
