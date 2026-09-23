using System.Data;
using System.Security.Claims;
using BTech.DTOs.Subjects;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/subjects")]
[Authorize]
public class SubjectsController : ControllerBase
{
    private readonly IConfiguration _configuration;
    public SubjectsController(IConfiguration configuration) => _configuration = configuration;

    private MySqlConnection Connection() => new(_configuration.GetConnectionString("DefaultConnection"));

    // GET: api/v1/subjects
    [HttpGet]
    public Task<IActionResult> GetAll([FromQuery] long? semesterId, [FromQuery] byte? status)
        => QuerySubjects(null, semesterId, status);

    // GET: api/v1/subjects/{subjectId}
    [HttpGet("{subjectId:long}")]
    public async Task<IActionResult> GetById(long subjectId)
    {
        if (subjectId <= 0) return BadRequest(new { success = false, message = "Invalid subject ID." });
        await using var connection = Connection();
        await connection.OpenAsync();
        var row = await connection.QueryFirstOrDefaultAsync(
            "SELECT * FROM subjects WHERE subject_id = @subjectId LIMIT 1",
            new { subjectId });
        return row == null
            ? NotFound(new { success = false, message = "Subject not found." })
            : Ok(new { success = true, message = "Subject retrieved successfully.", data = row });
    }

    // GET: api/v1/subjects/search?search=math
    [HttpGet("search")]
    public Task<IActionResult> Search([FromQuery] SubjectSearchRequest request)
        => QuerySubjects(request.Search, request.SemesterId, request.Status);

    // =========================================================
    // TICKET 133 - CREATE SUBJECT
    // POST: api/v1/subjects
    // =========================================================
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSubjectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SubjectCode))
            return BadRequest(new { success = false, message = "Subject code is required." });

        if (string.IsNullOrWhiteSpace(request.SubjectName))
            return BadRequest(new { success = false, message = "Subject name is required." });

        await using var connection = Connection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            var duplicateCode = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM subjects
                  WHERE subject_code = @subjectCode;",
                new { subjectCode = request.NormalizedSubjectCode },
                transaction);

            if (duplicateCode > 0)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    success = false,
                    message = "Subject code already exists."
                });
            }

            if (!await AcademicContextExistsAsync(
                    connection,
                    transaction,
                    request.CourseId,
                    request.BranchId,
                    request.SemesterId))
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Course/Branch/Semester combination. The semester must belong to the selected course and branch."
                });
            }

            var userId = GetCurrentUserId();

            await connection.ExecuteAsync(
                @"INSERT INTO subjects
                    (subject_code, subject_name, status,
                     created_at, created_by, updated_at, updated_by,
                     credits, subject_type, description)
                  VALUES
                    (@subjectCode, @subjectName, @status,
                     CURRENT_TIMESTAMP, @userId, CURRENT_TIMESTAMP, @userId,
                     @credits, @subjectType, @description);",
                new
                {
                    subjectCode = request.NormalizedSubjectCode,
                    subjectName = request.NormalizedSubjectName,
                    status = request.Status,
                    userId,
                    credits = request.Credits,
                    subjectType = request.NormalizedSubjectType,
                    description = request.NormalizedDescription
                },
                transaction);

            var subjectId = await connection.ExecuteScalarAsync<long>(
                "SELECT LAST_INSERT_ID();",
                transaction: transaction);

            await InsertMappingsAsync(
                connection,
                transaction,
                subjectId,
                request.CourseId,
                request.BranchId,
                request.SemesterId,
                request.Status,
                userId);

            await transaction.CommitAsync();

            var data = await GetSubjectWithAcademicContextAsync(connection, subjectId);

            return CreatedAtAction(
                nameof(GetById),
                new { subjectId },
                new
                {
                    success = true,
                    message = "Subject created successfully.",
                    data
                });
        }
        catch (MySqlException ex)
        {
            await transaction.RollbackAsync();

            if (ex.Number == 1062)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Subject code or subject academic mapping already exists."
                });
            }

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Unable to create subject."
            });
        }
    }

    // =========================================================
    // TICKET 133 - UPDATE SUBJECT
    // PUT: api/v1/subjects/{subjectId}
    // =========================================================
    [HttpPut("{subjectId:long}")]
    public async Task<IActionResult> Update(
        long subjectId,
        [FromBody] UpdateSubjectRequest request)
    {
        if (subjectId <= 0)
            return BadRequest(new { success = false, message = "Invalid subject ID." });

        if (string.IsNullOrWhiteSpace(request.SubjectCode))
            return BadRequest(new { success = false, message = "Subject code is required." });

        if (string.IsNullOrWhiteSpace(request.SubjectName))
            return BadRequest(new { success = false, message = "Subject name is required." });

        await using var connection = Connection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            var subjectExists = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM subjects
                  WHERE subject_id = @subjectId;",
                new { subjectId },
                transaction);

            if (subjectExists == 0)
            {
                await transaction.RollbackAsync();
                return NotFound(new
                {
                    success = false,
                    message = "Subject not found."
                });
            }

            var duplicateCode = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM subjects
                  WHERE subject_code = @subjectCode
                    AND subject_id <> @subjectId;",
                new
                {
                    subjectCode = request.NormalizedSubjectCode,
                    subjectId
                },
                transaction);

            if (duplicateCode > 0)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    success = false,
                    message = "Subject code already exists."
                });
            }

            if (!await AcademicContextExistsAsync(
                    connection,
                    transaction,
                    request.CourseId,
                    request.BranchId,
                    request.SemesterId))
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Course/Branch/Semester combination. The semester must belong to the selected course and branch."
                });
            }

            var userId = GetCurrentUserId();

            await connection.ExecuteAsync(
                @"UPDATE subjects
                  SET subject_code = @subjectCode,
                      subject_name = @subjectName,
                      status = @status,
                      credits = @credits,
                      subject_type = @subjectType,
                      description = @description,
                      updated_at = CURRENT_TIMESTAMP,
                      updated_by = @userId
                  WHERE subject_id = @subjectId;",
                new
                {
                    subjectId,
                    subjectCode = request.NormalizedSubjectCode,
                    subjectName = request.NormalizedSubjectName,
                    status = request.Status,
                    credits = request.Credits,
                    subjectType = request.NormalizedSubjectType,
                    description = request.NormalizedDescription,
                    userId
                },
                transaction);

            // Keep existing APIs compatible by synchronizing both the Ticket-132
            // subject mapping tables and subject_semester_assignments, which the
            // existing list/search API already uses for semester filtering.
            await connection.ExecuteAsync(
                @"DELETE FROM subject_semesters
                  WHERE subject_id = @subjectId;",
                new { subjectId },
                transaction);

            await connection.ExecuteAsync(
                @"DELETE FROM subject_course_branches
                  WHERE subject_id = @subjectId;",
                new { subjectId },
                transaction);

            await connection.ExecuteAsync(
                @"DELETE FROM subject_semester_assignments
                  WHERE subject_id = @subjectId;",
                new { subjectId },
                transaction);

            await InsertMappingsAsync(
                connection,
                transaction,
                subjectId,
                request.CourseId,
                request.BranchId,
                request.SemesterId,
                request.Status,
                userId);

            await transaction.CommitAsync();

            var data = await GetSubjectWithAcademicContextAsync(connection, subjectId);

            return Ok(new
            {
                success = true,
                message = "Subject updated successfully.",
                data
            });
        }
        catch (MySqlException ex)
        {
            await transaction.RollbackAsync();

            if (ex.Number == 1062)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Subject code or subject academic mapping already exists."
                });
            }

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Unable to update subject."
            });
        }
    }

    private static async Task<bool> AcademicContextExistsAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long courseId,
        long branchId,
        long semesterId)
    {
        const string sql = @"
SELECT COUNT(1)
FROM semesters sem
INNER JOIN branches b
    ON b.branch_id = sem.branch_id
   AND b.course_id = sem.course_id
INNER JOIN courses c
    ON c.course_id = sem.course_id
WHERE sem.semester_id = @semesterId
  AND sem.course_id = @courseId
  AND sem.branch_id = @branchId;";

        var count = await connection.ExecuteScalarAsync<int>(
            sql,
            new { courseId, branchId, semesterId },
            transaction);

        return count > 0;
    }

    private static async Task InsertMappingsAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long subjectId,
        long courseId,
        long branchId,
        long semesterId,
        byte status,
        long? userId)
    {
        await connection.ExecuteAsync(
            @"INSERT INTO subject_course_branches
                (subject_id, course_id, branch_id, status,
                 created_at, created_by, updated_at, updated_by)
              VALUES
                (@subjectId, @courseId, @branchId, @status,
                 CURRENT_TIMESTAMP, @userId, CURRENT_TIMESTAMP, @userId);",
            new { subjectId, courseId, branchId, status, userId },
            transaction);

        await connection.ExecuteAsync(
            @"INSERT INTO subject_semesters
                (subject_id, course_id, branch_id, semester_id, status,
                 created_at, created_by, updated_at, updated_by)
              VALUES
                (@subjectId, @courseId, @branchId, @semesterId, @status,
                 CURRENT_TIMESTAMP, @userId, CURRENT_TIMESTAMP, @userId);",
            new { subjectId, courseId, branchId, semesterId, status, userId },
            transaction);

        await connection.ExecuteAsync(
            @"INSERT INTO subject_semester_assignments
                (subject_id, semester_id, status,
                 created_at, created_by, updated_at, updated_by)
              VALUES
                (@subjectId, @semesterId, @status,
                 CURRENT_TIMESTAMP, @userId, CURRENT_TIMESTAMP, @userId);",
            new { subjectId, semesterId, status, userId },
            transaction);
    }

    private static Task<dynamic?> GetSubjectWithAcademicContextAsync(
        MySqlConnection connection,
        long subjectId)
    {
        const string sql = @"
SELECT
    s.subject_id AS subjectId,
    s.subject_code AS subjectCode,
    s.subject_name AS subjectName,
    s.credits,
    s.subject_type AS subjectType,
    s.description,
    s.status,
    scb.course_id AS courseId,
    c.course_code AS courseCode,
    c.course_name AS courseName,
    scb.branch_id AS branchId,
    b.branch_code AS branchCode,
    b.branch_name AS branchName,
    ss.semester_id AS semesterId,
    sem.semester_number AS semesterNumber,
    sem.semester_name AS semesterName,
    s.created_at AS createdAt,
    s.created_by AS createdBy,
    s.updated_at AS updatedAt,
    s.updated_by AS updatedBy
FROM subjects s
LEFT JOIN subject_course_branches scb
    ON scb.subject_id = s.subject_id
LEFT JOIN courses c
    ON c.course_id = scb.course_id
LEFT JOIN branches b
    ON b.branch_id = scb.branch_id
   AND b.course_id = scb.course_id
LEFT JOIN subject_semesters ss
    ON ss.subject_id = scb.subject_id
   AND ss.course_id = scb.course_id
   AND ss.branch_id = scb.branch_id
LEFT JOIN semesters sem
    ON sem.semester_id = ss.semester_id
   AND sem.course_id = ss.course_id
   AND sem.branch_id = ss.branch_id
WHERE s.subject_id = @subjectId
LIMIT 1;";

        return connection.QueryFirstOrDefaultAsync(sql, new { subjectId });
    }

    private long? GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var userId) ? userId : null;
    }

    private async Task<IActionResult> QuerySubjects(string? search, long? semesterId, byte? status)
    {
        if (semesterId.HasValue && semesterId <= 0)
            return BadRequest(new { success = false, message = "Invalid semester ID." });

        const string sql = @"
SELECT s.*
FROM subjects s
WHERE (@search IS NULL OR @search = ''
       OR s.subject_code LIKE CONCAT('%', @search, '%')
       OR s.subject_name LIKE CONCAT('%', @search, '%'))
  AND (@semesterId IS NULL OR EXISTS
      (SELECT 1 FROM subject_semester_assignments a
       WHERE a.subject_id = s.subject_id AND a.semester_id = @semesterId AND a.status = 1))
  AND (@status IS NULL OR s.status = @status)
ORDER BY s.subject_name, s.subject_id;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            var rows = (await connection.QueryAsync(sql, new { search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(), semesterId, status })).ToList();
            return Ok(new { success = true, message = "Subjects retrieved successfully.", data = rows });
        }
        catch (MySqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Unable to retrieve subjects. Verify that the existing subjects table matches the project database contract."
            });
        }
    }
}
