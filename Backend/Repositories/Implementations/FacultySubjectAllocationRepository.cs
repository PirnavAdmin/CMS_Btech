using BTech.Task_FacultySubjectAllocation.DTOs;
using Dapper;
using MySqlConnector;

namespace BTech.Task_FacultySubjectAllocation.Repositories;

public sealed class FacultySubjectAllocationRepository
{
    private readonly IConfiguration _configuration;

    public FacultySubjectAllocationRepository(
        IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private MySqlConnection CreateConnection()
    {
        var connectionString =
            _configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "DefaultConnection is missing from appsettings.json.");
        }

        return new MySqlConnection(connectionString);
    }

    // ============================================================
    // CREATE
    // ============================================================

    public async Task<long> CreateAsync(
        CreateFacultySubjectAllocationRequest request)
    {
        if (request.FacultyId <= 0)
            throw new ArgumentException(
                "FacultyId must be greater than zero.");

        if (request.BranchId <= 0)
            throw new ArgumentException(
                "BranchId must be greater than zero.");

        if (request.SemesterId <= 0)
            throw new ArgumentException(
                "SemesterId must be greater than zero.");

        if (string.IsNullOrWhiteSpace(request.AllocationType))
        {
            request.AllocationType = "TEACHING";
        }

        await using var connection = CreateConnection();

        await connection.OpenAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        try
        {
            // --------------------------------------------------
            // 1. Faculty validation
            // --------------------------------------------------

            const string facultySql = """
                SELECT COUNT(1)
                FROM faculty
                WHERE faculty_id = @FacultyId
                  AND status = 1;
                """;

            var facultyExists =
                await connection.ExecuteScalarAsync<int>(
                    new CommandDefinition(
                        facultySql,
                        new
                        {
                            request.FacultyId
                        },
                        transaction));

            if (facultyExists == 0)
            {
                throw new KeyNotFoundException(
                    "Faculty not found or inactive.");
            }

            // --------------------------------------------------
            // 2. Duplicate allocation validation
            // --------------------------------------------------

            const string duplicateSql = """
                SELECT COUNT(1)
                FROM faculty_subject_allocations
                WHERE faculty_id = @FacultyId
                  AND branch_id = @BranchId
                  AND semester_id = @SemesterId
                  AND allocation_type = @AllocationType
                  AND status = 1

                  AND (
                      course_id = @CourseId
                      OR (course_id IS NULL AND @CourseId IS NULL)
                  )

                  AND (
                      section_id = @SectionId
                      OR (section_id IS NULL AND @SectionId IS NULL)
                  )

                  AND (
                      subject_id = @SubjectId
                      OR (subject_id IS NULL AND @SubjectId IS NULL)
                  )

                  AND (
                      academic_year_id = @AcademicYearId
                      OR (
                          academic_year_id IS NULL
                          AND @AcademicYearId IS NULL
                      )
                  );
                """;

            var duplicateCount =
                await connection.ExecuteScalarAsync<int>(
                    new CommandDefinition(
                        duplicateSql,
                        new
                        {
                            request.FacultyId,
                            request.CourseId,
                            request.BranchId,
                            request.SemesterId,
                            request.SectionId,
                            request.SubjectId,
                            request.AcademicYearId,
                            request.AllocationType
                        },
                        transaction));

            if (duplicateCount > 0)
            {
                throw new InvalidOperationException(
                    "Duplicate faculty subject allocation already exists.");
            }

            // --------------------------------------------------
            // 3. Primary faculty conflict validation
            // --------------------------------------------------

            if (request.IsPrimaryFaculty &&
                request.SubjectId.HasValue)
            {
                const string conflictSql = """
                    SELECT COUNT(1)
                    FROM faculty_subject_allocations
                    WHERE branch_id = @BranchId
                      AND semester_id = @SemesterId
                      AND subject_id = @SubjectId
                      AND is_primary_faculty = 1
                      AND status = 1

                      AND (
                          course_id = @CourseId
                          OR (
                              course_id IS NULL
                              AND @CourseId IS NULL
                          )
                      )

                      AND (
                          section_id = @SectionId
                          OR (
                              section_id IS NULL
                              AND @SectionId IS NULL
                          )
                      )

                      AND (
                          academic_year_id = @AcademicYearId
                          OR (
                              academic_year_id IS NULL
                              AND @AcademicYearId IS NULL
                          )
                      );
                    """;

                var conflictCount =
                    await connection.ExecuteScalarAsync<int>(
                        new CommandDefinition(
                            conflictSql,
                            new
                            {
                                request.CourseId,
                                request.BranchId,
                                request.SemesterId,
                                request.SectionId,
                                request.SubjectId,
                                request.AcademicYearId
                            },
                            transaction));

                if (conflictCount > 0)
                {
                    throw new InvalidOperationException(
                        "Subject allocation conflict. " +
                        "A primary faculty is already assigned " +
                        "to this subject for the selected context.");
                }
            }

            // --------------------------------------------------
            // 4. Create allocation
            // --------------------------------------------------

            const string insertSql = """
                INSERT INTO faculty_subject_allocations
                (
                    faculty_id,
                    course_id,
                    branch_id,
                    semester_id,
                    section_id,
                    subject_id,
                    academic_year_id,
                    allocation_type,
                    is_primary_faculty,
                    status,
                    remarks,
                    created_by
                )
                VALUES
                (
                    @FacultyId,
                    @CourseId,
                    @BranchId,
                    @SemesterId,
                    @SectionId,
                    @SubjectId,
                    @AcademicYearId,
                    @AllocationType,
                    @IsPrimaryFaculty,
                    1,
                    @Remarks,
                    @CreatedBy
                );

                SELECT LAST_INSERT_ID();
                """;

            var allocationId =
                await connection.ExecuteScalarAsync<long>(
                    new CommandDefinition(
                        insertSql,
                        new
                        {
                            request.FacultyId,
                            request.CourseId,
                            request.BranchId,
                            request.SemesterId,
                            request.SectionId,
                            request.SubjectId,
                            request.AcademicYearId,
                            request.AllocationType,
                            request.IsPrimaryFaculty,
                            request.Remarks,
                            request.CreatedBy
                        },
                        transaction));

            await transaction.CommitAsync();

            return allocationId;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // ============================================================
    // DELETE
    // ============================================================

    public async Task DeleteAsync(long allocationId)
    {
        if (allocationId <= 0)
            throw new ArgumentException(
                "AllocationId must be greater than zero.");

        await using var connection = CreateConnection();

        await connection.OpenAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        try
        {
            // 1. Existing allocation ni get cheyyadam

            const string getSql = """
                SELECT *
                FROM faculty_subject_allocations
                WHERE allocation_id = @AllocationId;
                """;

            var allocation =
                await connection.QuerySingleOrDefaultAsync(
                    new CommandDefinition(
                        getSql,
                        new
                        {
                            AllocationId = allocationId
                        },
                        transaction));

            if (allocation == null)
            {
                throw new KeyNotFoundException(
                    "Faculty subject allocation not found.");
            }

            // 2. Allocation ni delete cheyyadam

            const string deleteSql = """
                DELETE FROM faculty_subject_allocations
                WHERE allocation_id = @AllocationId;
                """;

            var affectedRows =
                await connection.ExecuteAsync(
                    new CommandDefinition(
                        deleteSql,
                        new
                        {
                            AllocationId = allocationId
                        },
                        transaction));

            if (affectedRows == 0)
            {
                throw new KeyNotFoundException(
                    "Faculty subject allocation not found.");
            }

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // ============================================================
    // UPDATE
    // ============================================================

    public async Task<FacultySubjectAllocationResponse> UpdateAsync(
        long allocationId,
        UpdateFacultySubjectAllocationRequest request)
    {
        if (allocationId <= 0)
            throw new ArgumentException(
                "AllocationId must be greater than zero.");

        if (request.FacultyId <= 0)
            throw new ArgumentException(
                "FacultyId must be greater than zero.");

        if (request.BranchId <= 0)
            throw new ArgumentException(
                "BranchId must be greater than zero.");

        if (request.SemesterId <= 0)
            throw new ArgumentException(
                "SemesterId must be greater than zero.");

        if (request.CourseId.HasValue &&
            request.CourseId.Value <= 0)
        {
            throw new ArgumentException(
                "CourseId must be greater than zero when provided.");
        }

        if (request.SectionId.HasValue &&
            request.SectionId.Value <= 0)
        {
            throw new ArgumentException(
                "SectionId must be greater than zero when provided.");
        }

        if (request.SubjectId.HasValue &&
            request.SubjectId.Value <= 0)
        {
            throw new ArgumentException(
                "SubjectId must be greater than zero when provided.");
        }

        if (request.AcademicYearId.HasValue &&
            request.AcademicYearId.Value <= 0)
        {
            throw new ArgumentException(
                "AcademicYearId must be greater than zero when provided.");
        }

        request.AllocationType =
            string.IsNullOrWhiteSpace(request.AllocationType)
                ? "TEACHING"
                : request.AllocationType.Trim().ToUpperInvariant();

        if (request.AllocationType.Length > 50)
            throw new ArgumentException(
                "AllocationType cannot exceed 50 characters.");

        if (request.PeriodsPerWeek < 0)
            throw new ArgumentException(
                "PeriodsPerWeek cannot be negative.");

        if (request.Remarks?.Length > 500)
            throw new ArgumentException(
                "Remarks cannot exceed 500 characters.");

        await using var connection = CreateConnection();

        await connection.OpenAsync();

        try
        {
            var result =
                await connection.QuerySingleOrDefaultAsync<FacultySubjectAllocationResponse>(
                    "sp_FacultySubjectAllocation_UpdateValidated",
                    new
                    {
                        p_allocation_id = allocationId,
                        p_faculty_id = request.FacultyId,
                        p_course_id = request.CourseId,
                        p_branch_id = request.BranchId,
                        p_semester_id = request.SemesterId,
                        p_section_id = request.SectionId,
                        p_subject_id = request.SubjectId,
                        p_academic_year_id = request.AcademicYearId,
                        p_allocation_type = request.AllocationType,
                        p_is_primary_faculty =
                            request.IsPrimaryFaculty ? 1 : 0,
                        p_periods_per_week =
                            request.PeriodsPerWeek,
                        p_status =
                            request.Status ? 1 : 0,
                        p_remarks = request.Remarks,
                        p_updated_by = request.UpdatedBy
                    },
                    commandType:
                        System.Data.CommandType.StoredProcedure);

            return result ??
                   throw new InvalidOperationException(
                       "Allocation was updated but the updated record " +
                       "could not be returned.");
        }
        catch (MySqlException ex)
            when (ex.SqlState == "45000")
        {
            var message = ex.Message;

            if (message.Contains(
                    "not found",
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new KeyNotFoundException(message, ex);
            }

            if (message.Contains(
                    "duplicate",
                    StringComparison.OrdinalIgnoreCase) ||
                message.Contains(
                    "conflict",
                    StringComparison.OrdinalIgnoreCase) ||
                message.Contains(
                    "already",
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(message, ex);
            }

            throw new ArgumentException(message, ex);
        }
    }

    // ============================================================
    // GET LIST WITH FILTERS
    // ============================================================

    public async Task<IEnumerable<FacultySubjectAllocationResponse>>
        GetListAsync(
            FacultySubjectAllocationListRequest request)
    {
        const string sql = """
            SELECT
                a.allocation_id AS AllocationId,

                a.faculty_id AS FacultyId,
                f.faculty_code AS FacultyCode,
                f.faculty_name AS FacultyName,

                a.course_id AS CourseId,
                c.course_name AS CourseName,

                a.branch_id AS BranchId,
                b.branch_name AS BranchName,

                a.semester_id AS SemesterId,
                s.semester_number AS SemesterNumber,
                s.semester_name AS SemesterName,

                a.section_id AS SectionId,
                sec.section_name AS SectionName,

                a.subject_id AS SubjectId,

                a.academic_year_id AS AcademicYearId,
                ay.academic_year_name AS AcademicYearName,

                a.allocation_type AS AllocationType,
                a.is_primary_faculty AS IsPrimaryFaculty,
                a.periods_per_week AS PeriodsPerWeek,
                a.status AS Status,
                a.remarks AS Remarks,
                a.updated_at AS UpdatedAt,
                a.updated_by AS UpdatedBy

            FROM faculty_subject_allocations a

            INNER JOIN faculty f
                ON f.faculty_id = a.faculty_id

            LEFT JOIN courses c
                ON c.course_id = a.course_id

            LEFT JOIN branches b
                ON b.branch_id = a.branch_id

            LEFT JOIN semesters s
                ON s.semester_id = a.semester_id

            LEFT JOIN sections sec
                ON sec.section_id = a.section_id

            LEFT JOIN academicyears ay
                ON ay.academic_year_id = a.academic_year_id

            WHERE 1 = 1

              AND (
                  @FacultyId IS NULL
                  OR a.faculty_id = @FacultyId
              )

              AND (
                  @AcademicYearId IS NULL
                  OR a.academic_year_id = @AcademicYearId
              )

              AND (
                  @CourseId IS NULL
                  OR a.course_id = @CourseId
              )

              AND (
                  @BranchId IS NULL
                  OR a.branch_id = @BranchId
              )

              AND (
                  @SemesterId IS NULL
                  OR a.semester_id = @SemesterId
              )

              AND (
                  @SectionId IS NULL
                  OR a.section_id = @SectionId
              )

              AND (
                  @SubjectId IS NULL
                  OR a.subject_id = @SubjectId
              )

            ORDER BY a.allocation_id DESC;
            """;

        await using var connection = CreateConnection();

        await connection.OpenAsync();

        var parameters = new
        {
            request.FacultyId,
            request.AcademicYearId,
            request.CourseId,
            request.BranchId,
            request.SemesterId,
            request.SectionId,
            request.SubjectId
        };

        var result =
            await connection.QueryAsync<FacultySubjectAllocationResponse>(
                sql,
                parameters);

        return result;
    }
}