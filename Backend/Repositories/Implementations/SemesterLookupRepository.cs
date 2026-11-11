using System.Data;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

/// <summary>Scoped semester dropdown/list backed by the academic mapping procedure.</summary>
public sealed class SemesterLookupRepository(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection is missing.");

    public async Task<IReadOnlyList<SemesterLookupRow>> ListAsync(long? collegeId, long? courseId,
        long? branchId, long? academicYearId, byte? status, CancellationToken cancellationToken)
    {
        await using var connection = new MySqlConnection(_connectionString);
        var rows = await connection.QueryAsync<SemesterLookupRow>(new CommandDefinition(
            "sp_admin_semester_lookup", new
            {
                p_college_id = collegeId, p_course_id = courseId, p_branch_id = branchId,
                p_academic_year_id = academicYearId, p_status = status
            }, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken));
        return rows.AsList();
    }
}

public sealed class SemesterLookupRow
{
    public long SemesterId { get; set; }
    public long CollegeId { get; set; }
    public long CourseId { get; set; }
    public string CourseName { get; set; } = "";
    public long BranchId { get; set; }
    public string BranchName { get; set; } = "";
    public long AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = "";
    public int SemesterNumber { get; set; }
    public int YearNumber { get; set; }
    public string SemesterName { get; set; } = "";
    public byte Status { get; set; }
    public byte IsArchived { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
}
