using System.Data;
using BTech.DTOs.Subjects;
using Dapper;
using MySqlConnector;
namespace BTech.Repositories.Implementations;

public sealed class SubjectManagementRepository
{
    private readonly string _connectionString;
    public SubjectManagementRepository(IConfiguration configuration) => _connectionString =
        configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Database connection is missing.");
    private MySqlConnection Connection() => new(_connectionString);
    private static CommandDefinition Command(string name, object args, CancellationToken ct) =>
        new(name, args, commandType: CommandType.StoredProcedure, cancellationToken: ct);
    private static Dictionary<string, object?> Row(object value) =>
        ((IDictionary<string, object>)value).ToDictionary(x => x.Key, x => (object?)x.Value);
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? NormalizeElectiveType(string? value) => Clean(value)?.ToLowerInvariant() switch
    {
        "elective" => "Elective",
        "non-elective" => "Non-Elective",
        "core subject" => "Core Subject",
        _ => null
    };

    public async Task<List<Dictionary<string, object?>>> ListAsync(SubjectSearchRequest r, long? id, int? level, CancellationToken ct)
    {
        await using var c = Connection();
        using var results = await c.QueryMultipleAsync(Command("sp_sm_subject_list", new
        {
            p_id=id,p_search=Clean(r.Search),p_college_id=r.CollegeId,p_academic_year_id=r.AcademicYearId,
            p_course_id=r.CourseId,p_branch_id=r.BranchId,p_semester_id=r.SemesterId,p_level=level,
            p_subject_type=Clean(r.SubjectType),p_elective_type=Clean(r.ElectiveType),p_status=SubjectStatusConverter.Parse(r.Status)
        }, ct));
        var rows = (await results.ReadAsync()).Select(x => Row((object)x)).ToList();
        var mappings = (await results.ReadAsync()).Select(x => Row((object)x))
            .GroupBy(x => Convert.ToInt64(x["subjectId"]))
            .ToDictionary(g => g.Key, g => g.ToList());
        foreach (var row in rows)
        {
            var subjectId = Convert.ToInt64(row["subjectId"]);
            row["mappings"] = mappings.TryGetValue(subjectId, out var items) ? items : new();
            var semester = Convert.ToInt32(row["semesterNumber"] ?? 0);
            var year = (semester + 1) / 2;
            row["academicLevel"] = year == 0 ? null : $"{year}{(year == 1 ? "st" : year == 2 ? "nd" : year == 3 ? "rd" : "th")} Year";
        }
        return rows;
    }

    public async Task<long> SaveAsync(long id, SubjectWriteRequestBase r, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        return await c.ExecuteScalarAsync<long>(Command("sp_sm_subject_save", new
        {
            p_id=id,p_code=r.NormalizedSubjectCode,p_name=r.NormalizedSubjectName,p_year=r.AcademicYearId,
            p_course=r.CourseId,p_branch=r.BranchId,p_semester=r.SemesterId,p_credits=r.Credits,
            p_type=r.NormalizedSubjectType,p_description=r.NormalizedDescription,
            p_elective = NormalizeElectiveType(r.ElectiveType),
            p_lecture=r.LectureHours,p_tutorial=r.TutorialHours,p_practical=r.PracticalHours,
            p_internal=r.InternalMarks,p_external=r.ExternalMarks,p_status=r.Status,p_actor=actor
        }, ct));
    }
    public async Task StatusAsync(long id, byte status, bool delete, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.ExecuteAsync(Command("sp_sm_subject_status", new { p_id=id,p_status=status,p_delete=delete ? 1 : 0,p_actor=actor }, ct));
    }
    public async Task<List<Dictionary<string, object?>>> DependenciesAsync(long id, CancellationToken ct)
    {
        await using var c = Connection();
        return (await c.QueryAsync(Command("sp_sm_subject_dependencies", new { p_id=id }, ct))).Select(x => Row((object)x)).ToList();
    }
    public async Task<object> LookupsAsync(SubjectSearchRequest r, CancellationToken ct)
    {
        await using var c = Connection();
        using var sets = await c.QueryMultipleAsync(Command("sp_sm_subject_lookups", new
        { p_college=r.CollegeId,p_year=r.AcademicYearId,p_course=r.CourseId,p_branch=r.BranchId }, ct));
        var years = (await sets.ReadAsync()).Select(x=>Row((object)x)).ToList();
        var courses = (await sets.ReadAsync()).Select(x=>Row((object)x)).ToList();
        var branches = (await sets.ReadAsync()).Select(x=>Row((object)x)).ToList();
        var semesters = (await sets.ReadAsync()).Select(x=>Row((object)x)).ToList();
        return new { years, academicYears=years,courses,branches,semesters,
            electiveTypes=new[] { "Elective", "Non-Elective", "Core Subject" }, statuses=new[] { "Active","Inactive" } };
    }
}
