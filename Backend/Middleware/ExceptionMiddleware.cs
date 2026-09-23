using System.Net;
using System.Text.Json;
using BTech.Exceptions;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        public ExceptionMiddleware(
            RequestDelegate next,
            ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(
            HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Resource not found. " +
                    "Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    ex,
                    HttpStatusCode.NotFound);
            }
            catch (BusinessException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Business validation failed. " +
                    "Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    ex,
                    HttpStatusCode.BadRequest);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Unauthorized request. " +
                    "Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    new Exception(
                        "Unauthorized access."),
                    HttpStatusCode.Unauthorized);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Invalid request argument. " +
                    "Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    new BusinessException(
                        ex.Message),
                    HttpStatusCode.BadRequest);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Requested resource was not found. " +
                    "Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    new NotFoundException(
                        ex.Message),
                    HttpStatusCode.NotFound);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Requested operation conflicts with the current resource state. " +
                    "Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    new Exception(ex.Message),
                    HttpStatusCode.Conflict);
            }
            catch (DbUpdateException ex) when (ex.InnerException is MySqlException businessDb && businessDb.SqlState == "45000")
            {
                _logger.LogWarning("Relationship rule rejected request. CorrelationId={CorrelationId}, Path={Path}", context.TraceIdentifier, context.Request.Path);
                await HandleExceptionAsync(context, new BusinessException(businessDb.Message), HttpStatusCode.Conflict);
            }
            catch (DbUpdateException ex) when (
                ex.InnerException is MySqlException dbException &&
                dbException.Number == 1062)
            {
                _logger.LogWarning(
                    ex,
                    "A database uniqueness constraint was violated. Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    new Exception(DuplicateMessage(dbException)),
                    HttpStatusCode.Conflict);
            }
            catch (DbUpdateException ex) when (
                ex.InnerException is MySqlException dbException &&
                dbException.Number is 1048 or 1451 or 1452 or 3819)
            {
                _logger.LogWarning(
                    ex,
                    "A database constraint rejected the request. Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    new BusinessException("The request contains missing, invalid, or referenced data."),
                    HttpStatusCode.BadRequest);
            }
            catch (MySqlException ex) when (ex.Number is 1062 or 1451 or 1452 or 3819)
            {
                _logger.LogWarning("Database constraint rejected request. Code={Code}, CorrelationId={CorrelationId}",ex.Number,context.TraceIdentifier);
                await HandleExceptionAsync(context,new Exception(ex.Number==1062?DuplicateMessage(ex):"The operation conflicts with related records or invalid data."),ex.Number is 1062 or 1451 ? HttpStatusCode.Conflict : HttpStatusCode.BadRequest);
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                _logger.LogWarning(
                    ex,
                    "Database business validation failed. Path={Path}",
                    context.Request.Path);

                await HandleExceptionAsync(
                    context,
                    new BusinessException(ex.Message),
                    HttpStatusCode.BadRequest);
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database exception occurred. Path={Path}, Method={Method}",
                    context.Request.Path,
                    context.Request.Method);

                await HandleExceptionAsync(
                    context,
                    new Exception("A database operation could not be completed."),
                    HttpStatusCode.InternalServerError);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unhandled exception occurred. " +
                    "Path={Path}, Method={Method}",
                    context.Request.Path,
                    context.Request.Method);

                await HandleExceptionAsync(
                    context,
                    new Exception(
                        "An unexpected error occurred."),
                    HttpStatusCode.InternalServerError);
            }
        }


        private static string DuplicateMessage(MySqlException exception) =>
            exception.Message.Contains("Aadhaar", StringComparison.OrdinalIgnoreCase)
                ? "This Aadhaar number is already assigned to another admission."
                : "A record with the same unique value already exists.";

        private static async Task HandleExceptionAsync(
            HttpContext context,
            Exception exception,
            HttpStatusCode statusCode)
        {
            if (context.Response.HasStarted)
            {
                return;
            }

            context.Response.Clear();

            context.Response.Headers[RequestLoggingMiddleware.CorrelationHeader] = context.TraceIdentifier;

            context.Response.ContentType =
                "application/json";

            context.Response.StatusCode =
                (int)statusCode;

            var response = new
            {
                success = false,
                message = exception.Message,
                correlationId = context.TraceIdentifier
            };

            await context.Response.WriteAsync(
                JsonSerializer.Serialize(response));
        }
    }
}
