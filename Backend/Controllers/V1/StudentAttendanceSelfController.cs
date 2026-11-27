using System.Security.Claims;
using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

/// <summary>Read-only attendance data for the authenticated student's own record.</summary>
[ApiController]
[Route("api/v1/student-attendance/me")]
[Authorize]
public sealed class StudentAttendanceSelfController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<StudentAttendanceSelfController> _logger;

    public StudentAttendanceSelfController(IConfiguration configuration, ILogger<StudentAttendanceSelfController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        if (!CollegeDataScope.HasRole(HttpContext, "STUDENT"))
            return Forbid();

        long userId;
        long collegeId;
        try
        {
            userId = CollegeDataScope.Actor(HttpContext);
            collegeId = CollegeDataScope.Resolve(HttpContext, required: true)!.Value;
        }
        catch (ContractException ex)
        {
            return StatusCode(ex.StatusCode, new { success = false, message = ex.Message, code = ex.Code });
        }

        try
        {
            await using var connection = new MySqlConnection(_configuration.GetConnectionString("DefaultConnection"));
            await connection.OpenAsync(cancellationToken);
            var studentIds = (await connection.QueryAsync<long>(new CommandDefinition("""
                SELECT student_id
                FROM students
                WHERE user_id = @UserId
                  AND college_id = @CollegeId
                  AND status = 1
                  AND deleted_at IS NULL;
                """, new { UserId = userId, CollegeId = collegeId }, cancellationToken: cancellationToken))).AsList();

            if (studentIds.Count != 1)
                return NotFound(new { success = false, message = "The authenticated account is not linked to one active student record." });

            const string sql = """
                SELECT a.attendance_session_id AS attendanceSessionId,
                       a.academic_year_id AS academicYearId,
                       ay.academic_year_name AS academicYearName,
                       a.semester_id AS semesterId,
                       sem.semester_number AS semesterNumber,
                       sem.semester_name AS semesterName,
                       a.section_id AS sectionId,
                       sec.section_code AS sectionCode,
                       sec.section_name AS sectionName,
                       a.subject_id AS subjectId,
                       sub.subject_code AS subjectCode,
                       sub.subject_name AS subjectName,
                       a.faculty_id AS facultyId,
                       f.faculty_name AS facultyName,
                       a.attendance_date AS attendanceDate,
                       ts.start_time AS startTime,
                       ts.end_time AS endTime,
                       d.attendance_status AS attendanceStatus,
                       a.remarks AS remarks,
                       (SELECT MAX(sh.required_percentage)
                        FROM student_attendance_shortages sh
                        WHERE sh.student_id = d.student_id
                          AND sh.academic_year_id = a.academic_year_id
                          AND sh.semester_id = a.semester_id
                          AND sh.section_id = a.section_id) AS requiredPercentage,
                       co.course_name AS courseName,
                       br.branch_name AS branchName
                FROM student_attendance_details d
                INNER JOIN student_attendance a ON a.attendance_session_id = d.attendance_session_id
                INNER JOIN academicyears ay ON ay.academic_year_id = a.academic_year_id
                INNER JOIN semesters sem ON sem.semester_id = a.semester_id
                INNER JOIN sections sec ON sec.section_id = a.section_id
                INNER JOIN subjects sub ON sub.subject_id = a.subject_id
                INNER JOIN faculty f ON f.faculty_id = a.faculty_id
                LEFT JOIN courses co ON co.course_id = sec.course_id
                LEFT JOIN branches br ON br.branch_id = sec.branch_id
                LEFT JOIN timetable_slots ts ON ts.timetable_slot_id = a.timetable_slot_id
                WHERE d.student_id = @StudentId
                  AND a.college_id = @CollegeId
                  AND a.session_status <> 'CANCELLED'
                ORDER BY a.academic_year_id DESC, a.semester_id DESC,
                         a.attendance_date DESC, ts.slot_number, a.attendance_session_id DESC;
                """;
            var rows = (await connection.QueryAsync(new CommandDefinition(sql,
                new { StudentId = studentIds[0], CollegeId = collegeId }, cancellationToken: cancellationToken))).ToList();

            return Ok(new { success = true, message = "Your attendance history was retrieved successfully.", data = rows, count = rows.Count });
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Could not load personal attendance for UserId={UserId}.", userId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { success = false, message = "Unable to retrieve your attendance records." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error loading personal attendance for UserId={UserId}.", userId);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { success = false, message = "Unable to retrieve your attendance records." });
        }
    }
}
