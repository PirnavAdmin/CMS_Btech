using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BTech.Filters;

public sealed class SemesterRequestDiagnosticsFilter(ILogger<SemesterRequestDiagnosticsFilter> logger) : IAsyncResourceFilter
{
    private static readonly HashSet<string> Fields = new(StringComparer.OrdinalIgnoreCase)
    {
        "courseId", "branchId", "academicYearId", "semesterNumber", "semesterName",
        "yearNumber", "startDate", "endDate", "status"
    };
    public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        var request = context.HttpContext.Request;
        if (request.Method is "POST" or "PUT" &&
            request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true)
        {
            request.EnableBuffering();
            string details;
            try
            {
                using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
                var chars = new char[16_385];
                var count = await reader.ReadBlockAsync(chars, 0, chars.Length);
                if (count == chars.Length) details = "Body exceeds semester diagnostic limit.";
                else
                {
                    using var json = JsonDocument.Parse(new string(chars, 0, count));
                    details = json.RootElement.ValueKind == JsonValueKind.Object
                        ? JsonSerializer.Serialize(json.RootElement.EnumerateObject()
                            .Where(p => Fields.Contains(p.Name)).Select(p => new { field = p.Name, value = p.Value }))
                        : "Expected a flat object; received " + json.RootElement.ValueKind;
                }
            }
            catch (JsonException) { details = "Empty or malformed JSON body."; }
            finally { request.Body.Position = 0; }
            logger.LogInformation("Semester request received. Method={Method}, Route={Route}, ContentType={ContentType}, CorrelationId={CorrelationId}, SemesterFields={SemesterFields}",
                request.Method, request.Path, request.ContentType, context.HttpContext.TraceIdentifier, details);
        }
        await next();
    }
}
