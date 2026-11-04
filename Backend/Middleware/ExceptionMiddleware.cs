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
            catch (BTech.Services.Fees.FeePlanException ex)
            {
                _logger.LogWarning("Fee plan request rejected. Status={Status}, Path={Path}, Message={Message}", ex.StatusCode, context.Request.Path, ex.Message);
                await HandleExceptionAsync(context, ex, (HttpStatusCode)ex.StatusCode);
            }
            catch (BTech.Services.AuthorizationDependencyException ex)
            {
                _logger.LogError(ex,
                    "Authorization dependency failed. CorrelationId={CorrelationId}, Method={Method}, Path={Path}, Dependency={Dependency}, Server={Server}, Port={Port}, Database={Database}, MySqlCode={MySqlCode}, SqlState={SqlState}",
                    context.TraceIdentifier, context.Request.Method, context.Request.Path,
                    ex.Dependency, ex.Server, ex.Port, ex.Database, ex.MySqlCode, ex.SqlState);
                if (!context.Response.HasStarted)
                {
                    context.Response.Clear();
                    context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                    context.Response.Headers[RequestLoggingMiddleware.CorrelationHeader] = context.TraceIdentifier;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        success = false, message = ex.Message, code = ex.Code,
                        statusCode = StatusCodes.Status503ServiceUnavailable,
                        correlationId = context.TraceIdentifier
                    });
                }
            }
            catch (BTech.UserAccess.OnboardingConflictException ex)
            {
                context.Response.StatusCode=StatusCodes.Status409Conflict;
                await context.Response.WriteAsJsonAsync(new { success=false,code=ex.Code,message=ex.Message,
                    data=new { accountSaved=false,existingInvitation=ex.Invitation,canResend=ex.Invitation is not null,
                        creationRetried=false,emailAttempted=false },correlationId=context.TraceIdentifier });
            }
            catch (BTech.UserAccess.UserAccountRequestException ex)
            {
                _logger.LogWarning("User account request rejected. CorrelationId={CorrelationId}, Path={Path}, Lookup=users.user_id, UserId={UserId}, CollegeId={CollegeId}, Code={Code}",
                    context.TraceIdentifier,context.Request.Path,ex.UserId,ex.CollegeId,ex.Code);
                if(!context.Response.HasStarted)
                {
                    context.Response.Clear();
                    context.Response.StatusCode=ex.StatusCode;
                    context.Response.Headers[RequestLoggingMiddleware.CorrelationHeader]=context.TraceIdentifier;
                    if(ex.RetryAfterSeconds.HasValue)
                        context.Response.Headers["Retry-After"]=ex.RetryAfterSeconds.Value.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    await context.Response.WriteAsJsonAsync(new { success=false,code=ex.Code,message=ex.Message,
                        userId=ex.UserId,retryAfterSeconds=ex.RetryAfterSeconds,correlationId=context.TraceIdentifier });
                }
            }
            catch (BTech.Services.Invitations.AccountInvitationDeliveryException ex)
            {
                _logger.LogWarning("Invitation delivery incomplete. CorrelationId={CorrelationId}, UserId={UserId}, DeliveryStatus={DeliveryStatus}, SmtpAccepted={SmtpAccepted}, AccountCreated={AccountCreated}",
                    context.TraceIdentifier, ex.UserId, ex.DeliveryStatus, ex.SmtpAccepted, ex.AccountCreated);
                if (!context.Response.HasStarted)
                {
                    context.Response.Clear();
                    context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                    context.Response.Headers[RequestLoggingMiddleware.CorrelationHeader] = context.TraceIdentifier;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        success = false, code = "ACCOUNT_INVITATION_DELIVERY_FAILED", message = ex.Message,
                        userId = ex.UserId, collegeId = ex.CollegeId, accountCreated = ex.AccountCreated,
                        invitationStatus = ex.DeliveryStatus, smtpAccepted = ex.SmtpAccepted,
                        smtpAcceptanceStatus = ex.SmtpAccepted ? "Confirmed" : "Unconfirmed", inboxDelivery = "Unverified",
                        data = new { accountSaved=true, emailStatus=ex.DeliveryStatus=="unknown"?"UNKNOWN":"FAILED", retryAllowed=true },
                        nextAction = $"POST /api/v1/admin/users/{ex.UserId}/{(ex.IsPasswordReset?"reset-password":"resend-invitation")}",
                        correlationId = context.TraceIdentifier
                    });
                }
            }
            catch (BTech.Services.Invitations.UserAccessSchemaException ex)
            {
                _logger.LogError("Onboarding blocked before database writes. CorrelationId={CorrelationId}, Path={Path}, Category=SCHEMA_INCOMPLETE",context.TraceIdentifier,context.Request.Path);
                context.Response.StatusCode=StatusCodes.Status503ServiceUnavailable;
                await context.Response.WriteAsJsonAsync(new { success=false, code="USER_ACCESS_SCHEMA_INCOMPLETE", message=ex.Message,
                    correlationId=context.TraceIdentifier, data=new { emailStatus="NOT_STARTED",retryAllowed=true } });
            }
            catch (BTech.UserAccess.AccessSetupException ex)
            {
                _logger.LogError(ex, "Onboarding configuration missing. CorrelationId={CorrelationId}", context.TraceIdentifier);
                await HandleExceptionAsync(context, ex, HttpStatusCode.ServiceUnavailable);
            }
            catch (MySqlException ex) when (ex.Number is 1146 or 1054)
            {
                _logger.LogError(ex, "Database schema prerequisite missing. CorrelationId={CorrelationId}, Path={Path}, MySqlCode={MySqlCode}, SqlState={SqlState}", context.TraceIdentifier,context.Request.Path,ex.Number,ex.SqlState);
                await HandleExceptionAsync(context, new Exception("Database schema is incomplete or incompatible. Apply the complete User_Access_Onboarding_Repair_R8.sql patch to this API's database; use the correlation ID for the missing object in server logs."), HttpStatusCode.ServiceUnavailable);
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
            catch (ForbiddenException ex)
            {
                _logger.LogWarning("Request forbidden. Path={Path}, Message={Message}", context.Request.Path, ex.Message);
                await HandleExceptionAsync(context, ex, HttpStatusCode.Forbidden);
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
            catch (MySqlException ex) when (ex.Number == 1062 && context.Request.Path.StartsWithSegments("/api/v1/admin/users"))
            {
                _logger.LogWarning(ex, "User onboarding uniqueness conflict. CorrelationId={CorrelationId}", context.TraceIdentifier);
                await HandleExceptionAsync(context, new Exception("The college code, email or mobile is already in use. Check existing colleges/users; if onboarding already created the account, resend its invitation instead."), HttpStatusCode.Conflict);
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
                    "Database exception occurred. Path={Path}, Method={Method}, CorrelationId={CorrelationId}, MySqlCode={MySqlCode}",
                    context.Request.Path,
                    context.Request.Method, context.TraceIdentifier, ex.Number);

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
