using Dapper;
using MySqlConnector;
using System.Data;
using Microsoft.AspNetCore.Mvc.Controllers;
using System.Diagnostics;
using System.Security.Claims;

namespace BTech.Middleware
{
    /// <summary>
    /// Records one start and one completion entry for every API call without
    /// logging request bodies, passwords, OTP values, or bearer tokens.
    /// </summary>
    public sealed class RequestLoggingMiddleware
    {
        public const string CorrelationHeader = "X-Correlation-ID";

        private readonly RequestDelegate _next;
        private readonly IConfiguration _configuration;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        public RequestLoggingMiddleware(
            RequestDelegate next,
            ILogger<RequestLoggingMiddleware> logger, IConfiguration configuration)
        {
            _next = next;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (!context.Request.Path.StartsWithSegments("/api"))
            {
                await _next(context);
                return;
            }

            var correlationId = GetCorrelationId(context);
            context.TraceIdentifier = correlationId;
            context.Response.Headers[CorrelationHeader] = correlationId;

            var startingUserId = GetUserId(context);

            var stopwatch = Stopwatch.StartNew();

            _logger.LogInformation(
                "API request started. CorrelationId={CorrelationId}, Method={Method}, Path={Path}, UserId={UserId}",
                correlationId,
                context.Request.Method,
                context.Request.Path.Value,
                startingUserId);

            try { await _next(context); }
            finally
            {
                stopwatch.Stop();
                await PersistActivity(context, stopwatch.ElapsedMilliseconds);
            }

            // Authentication runs inside this middleware in the application
            // pipeline, so read the principal again for the completion entry.
            var completedUserId = GetUserId(context);

            var message =
                "API request completed. CorrelationId={CorrelationId}, Method={Method}, Path={Path}, UserId={UserId}, StatusCode={StatusCode}, DurationMs={DurationMs}";

            if (context.Response.StatusCode >= 500)
            {
                _logger.LogError(
                    message,
                    correlationId,
                    context.Request.Method,
                    context.Request.Path.Value,
                    completedUserId,
                    context.Response.StatusCode,
                    stopwatch.ElapsedMilliseconds);
            }
            else if (context.Response.StatusCode >= 400)
            {
                _logger.LogWarning(
                    message,
                    correlationId,
                    context.Request.Method,
                    context.Request.Path.Value,
                    completedUserId,
                    context.Response.StatusCode,
                    stopwatch.ElapsedMilliseconds);
            }
            else
            {
                _logger.LogInformation(
                    message,
                    correlationId,
                    context.Request.Method,
                    context.Request.Path.Value,
                    completedUserId,
                    context.Response.StatusCode,
                    stopwatch.ElapsedMilliseconds);
            }
        }

        private async Task PersistActivity(HttpContext context, long elapsed)
        {
            if (!_configuration.GetValue("Logging:Database:Enabled", true)) return;
            try
            {
                var action=context.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>();
                await using var connection=new MySqlConnection(_configuration.GetConnectionString("DefaultConnection"));
                await connection.ExecuteAsync("sp_cms_log_api_activity",new {
                    p_correlation=context.TraceIdentifier,
                    p_user_id=long.TryParse(GetUserId(context),out var userId)?(long?)userId:null,
                    p_screen=action?.ControllerName??"Routing",p_action=action?.ActionName??"Request",
                    p_method=context.Request.Method,p_route=context.Request.Path.Value,
                    p_status=context.Response.StatusCode,p_duration=elapsed
                },commandType:CommandType.StoredProcedure,commandTimeout:5);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Activity database write failed; file request log retained. ErrorType={ErrorType}, CorrelationId={CorrelationId}",ex.GetType().Name,context.TraceIdentifier);
            }
        }

        private static string GetCorrelationId(HttpContext context)
        {
            var supplied = context.Request.Headers[CorrelationHeader]
                .FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(supplied) &&
                supplied.Length <= 100 &&
                supplied.All(character =>
                    char.IsLetterOrDigit(character) ||
                    character == '-' ||
                    character == '_' ||
                    character == '.'))
            {
                return supplied;
            }

            return Guid.NewGuid().ToString("N");
        }

        private static string GetUserId(HttpContext context) =>
            context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue("sub")
            ?? "anonymous";
    }
}
