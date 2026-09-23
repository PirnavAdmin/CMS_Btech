using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BTech.Filters
{
    /// <summary>
    /// Prevents legacy controller actions from returning database or stack
    /// details in HTTP 5xx response bodies. The centralized exception
    /// middleware handles thrown exceptions; this filter covers actions that
    /// create a 5xx IActionResult themselves.
    /// </summary>
    public sealed class ApiErrorSanitizationFilter : IAsyncResultFilter
    {
        private readonly ILogger<ApiErrorSanitizationFilter> _logger;

        public ApiErrorSanitizationFilter(
            ILogger<ApiErrorSanitizationFilter> logger)
        {
            _logger = logger;
        }

        public async Task OnResultExecutionAsync(
            ResultExecutingContext context,
            ResultExecutionDelegate next)
        {
            var statusCode = context.Result switch
            {
                ObjectResult objectResult => objectResult.StatusCode,
                StatusCodeResult statusCodeResult => statusCodeResult.StatusCode,
                _ => null
            };

            if (statusCode is >= StatusCodes.Status500InternalServerError)
            {
                var correlationId = context.HttpContext.TraceIdentifier;

                _logger.LogError(
                    "API action returned a server error. CorrelationId={CorrelationId}, Method={Method}, Path={Path}, StatusCode={StatusCode}",
                    correlationId,
                    context.HttpContext.Request.Method,
                    context.HttpContext.Request.Path.Value,
                    statusCode);

                context.Result = new ObjectResult(new
                {
                    success = false,
                    message = "An unexpected error occurred.",
                    correlationId
                })
                {
                    StatusCode = statusCode
                };
            }

            await next();
        }
    }
}
