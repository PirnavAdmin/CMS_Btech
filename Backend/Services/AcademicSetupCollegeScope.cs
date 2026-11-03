using System.Text.Json;
using Dapper;
using MySqlConnector;

namespace BTech.Services;

/// <summary>Finds the real college of academic setup records before permission evaluation.</summary>
public static class AcademicSetupCollegeScope
{
    // Active mappings select a college; they never grant actions or privileged roles.
    // Governance endpoints retain their Super Admin and delegation ceiling checks.
    public static bool Supports(string module) => !string.IsNullOrWhiteSpace(module);

    private static readonly Dictionary<string, string> OwnershipSql = new(StringComparer.OrdinalIgnoreCase)
    {
        ["collegeId"] = "SELECT college_id FROM colleges WHERE college_id=@id AND deleted_at IS NULL",
        ["courseId"] = "SELECT college_id FROM courses WHERE course_id=@id AND deleted_at IS NULL",
        ["departmentId"] = "SELECT college_id FROM departments WHERE department_id=@id AND deleted_at IS NULL",
        ["branchId"] = "SELECT c.college_id FROM branches b JOIN courses c ON c.course_id=b.course_id WHERE b.branch_id=@id AND b.deleted_at IS NULL AND c.deleted_at IS NULL",
        ["semesterId"] = "SELECT c.college_id FROM semesters s JOIN courses c ON c.course_id=s.course_id WHERE s.semester_id=@id AND c.deleted_at IS NULL",
        ["academicYearId"] = "SELECT college_id FROM academicyears WHERE academic_year_id=@id AND deleted_at IS NULL",
        ["startingAcademicYearId"] = "SELECT college_id FROM academicyears WHERE academic_year_id=@id AND deleted_at IS NULL",
        ["sectionId"] = "SELECT college_id FROM sections WHERE section_id=@id AND deleted_at IS NULL",
        ["collegeSettingId"] = "SELECT college_id FROM college_settings WHERE college_setting_id=@id"
    };

    public static async Task<(long? CollegeId, string? Error)> ResolveAsync(
        MySqlConnection connection, HttpContext context, string module)
    {
        if (!Supports(module)) return (null, null);
        var references = new List<(string Key, long Id)>();
        foreach (var query in context.Request.Query)
            if (OwnershipSql.ContainsKey(query.Key) && long.TryParse(query.Value.ToString(), out var id) && id > 0)
                references.Add((query.Key, id));

        foreach (var route in context.Request.RouteValues)
            if (OwnershipSql.ContainsKey(route.Key) && long.TryParse(route.Value?.ToString(), out var id) && id > 0)
                references.Add((route.Key, id));

        var request = context.Request;
        if (request.Method is not ("GET" or "HEAD") && request.ContentLength != 0 &&
            request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true)
        {
            request.EnableBuffering();
            try
            {
                using var body = await JsonDocument.ParseAsync(request.Body, cancellationToken: context.RequestAborted);
                if (body.RootElement.ValueKind == JsonValueKind.Object)
                    foreach (var property in body.RootElement.EnumerateObject())
                        if (OwnershipSql.ContainsKey(property.Name) &&
                            long.TryParse(property.Value.ToString(), out var id) && id > 0)
                            references.Add((property.Name, id));
            }
            catch (JsonException) { /* Model binding handles malformed JSON. */ }
            finally { if (request.Body.CanSeek) request.Body.Position = 0; }
        }

        // Route IDs must be checked too: omitting collegeId cannot bypass ownership.
        var pathParts = (request.Path.Value ?? "").Split('/', StringSplitOptions.RemoveEmptyEntries);
        var entities = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["colleges"] = "collegeId", ["college"] = "collegeId",
            ["academic-years"] = "academicYearId", ["academic-year"] = "academicYearId", ["department"] = "departmentId", ["departments"] = "departmentId",
            ["courses"] = "courseId", ["course"] = "courseId", ["branch"] = "branchId", ["branches"] = "branchId", ["by-course"] = "courseId",
            ["semesters"] = "semesterId", ["semester"] = "semesterId",
            ["sections"] = "sectionId", ["section"] = "sectionId", ["college-settings"] = "collegeSettingId"
        };
        for (var i = 0; i + 1 < pathParts.Length; i++)
            if (entities.TryGetValue(pathParts[i], out var key) && long.TryParse(pathParts[i + 1], out var id) && id > 0)
                references.Add((key, id));

        long? college = null;
        foreach (var reference in references.Distinct())
        {
            var owner = await connection.ExecuteScalarAsync<long?>(new CommandDefinition(
                OwnershipSql[reference.Key], new { id = reference.Id }, cancellationToken: context.RequestAborted));
            if (!owner.HasValue) continue; // Keep the endpoint's existing invalid/missing-record response.
            if (college.HasValue && college != owner)
                return (null, "The selected academic records belong to different colleges.");
            college = owner;
        }
        return (college, null);
    }
}
