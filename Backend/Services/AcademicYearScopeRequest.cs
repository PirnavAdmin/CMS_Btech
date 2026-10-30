using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace BTech.Services;

/// <summary>Parses selection once, before authorization; never substitutes another college.</summary>
public static class AcademicYearScopeRequest
{
    public const string ItemKey = "AcademicYearAuthorization.SelectedCollegeId";

    public static async Task<(long? CollegeId, string? Error)> ReadAsync(HttpRequest request, bool requireObject = true)
    {
        long? queryId = null, bodyId = null;
        if (request.Query.TryGetValue("collegeId", out var values))
        {
            if (values.Count != 1 || !TryId(values[0], out var id))
                return (null, "Query collegeId must be one positive integer.");
            queryId = id;
        }
        if (request.Method is not ("GET" or "HEAD") &&
            request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true &&
            request.ContentLength != 0)
        {
            request.EnableBuffering();
            try
            {
                using var document = await JsonDocument.ParseAsync(request.Body, cancellationToken: request.HttpContext.RequestAborted);
                if (document.RootElement.ValueKind != JsonValueKind.Object)
                    return requireObject ? (null, "A JSON object request body is required.") : (queryId, null);
                bool found = false;
                foreach (var property in document.RootElement.EnumerateObject())
                {
                    if (!property.Name.Equals("collegeId", StringComparison.OrdinalIgnoreCase) &&
                        !property.Name.Equals("college_id", StringComparison.OrdinalIgnoreCase)) continue;
                    if (found) return (null, "Body collegeId must not be repeated.");
                    found = true;
                    if (property.Value.ValueKind == JsonValueKind.Null) continue;
                    var value = property.Value.ValueKind == JsonValueKind.String
                        ? property.Value.GetString() : property.Value.GetRawText();
                    if (!TryId(value, out var id)) return (null, "Body collegeId must be a positive integer.");
                    bodyId = id;
                }
            }
            catch (JsonException) { return (null, "The request body must contain valid JSON."); }
            finally { if (request.Body.CanSeek) request.Body.Position = 0; }
        }
        if (queryId.HasValue && bodyId.HasValue && queryId != bodyId)
            return (null, "The query collegeId and body collegeId must match.");
        return (queryId ?? bodyId, null);
    }

    private static bool TryId(string? text, out long id) =>
        long.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out id) && id > 0;
}
