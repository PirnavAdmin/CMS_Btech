using System.Security.Claims;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

// Compatibility endpoints for the existing Student Attendance frontend.
// The original /api/v1/student-attendance APIs are intentionally preserved.
[ApiController]
[Route("api/v1/attendance")]
[Authorize]
public sealed class AttendanceCompatibilityController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AttendanceCompatibilityController> _logger;

    public AttendanceCompatibilityController(IConfiguration configuration, ILogger<AttendanceCompatibilityController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private MySqlConnection Connection() => new(_configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection is not configured."));

    private long? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) && id > 0 ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetAttendance([FromQuery] long? academicYearId, [FromQuery] long? courseId,
        [FromQuery] long? branchId, [FromQuery] long? semesterId, [FromQuery] long? sectionId, [FromQuery] DateTime? date)
    {
        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            var rows = (await connection.QueryAsync<AttendanceRow>(@"
                SELECT sa.attendance_session_id AS SessionId, sa.attendance_date AS Date,
                       s.subject_name AS Subject, s.subject_code AS SubjectCode,
                       c.course_id AS CourseId, c.course_name AS Course,
                       b.branch_id AS BranchId, b.branch_name AS Branch,
                       se.semester_id AS SemesterId, CONCAT('Semester ', se.semester_number) AS Semester,
                       sec.section_id AS SectionId, sec.section_name AS Section,
                       f.faculty_id AS FacultyId, f.faculty_name AS Faculty,
                       sa.session_status AS SessionStatus
                FROM student_attendance sa
                INNER JOIN subjects s ON s.subject_id = sa.subject_id
                INNER JOIN sections sec ON sec.section_id = sa.section_id
                LEFT JOIN courses c ON c.course_id = sec.course_id
                LEFT JOIN branches b ON b.branch_id = sec.branch_id
                LEFT JOIN semesters se ON se.semester_id = sa.semester_id
                INNER JOIN faculty f ON f.faculty_id = sa.faculty_id
                WHERE (@academicYearId IS NULL OR sa.academic_year_id = @academicYearId)
                  AND (@courseId IS NULL OR sec.course_id = @courseId)
                  AND (@branchId IS NULL OR sec.branch_id = @branchId)
                  AND (@semesterId IS NULL OR sa.semester_id = @semesterId)
                  AND (@sectionId IS NULL OR sa.section_id = @sectionId)
                  AND (@date IS NULL OR sa.attendance_date = DATE(@date))
                ORDER BY sa.attendance_date DESC, sa.attendance_session_id DESC;",
                new { academicYearId, courseId, branchId, semesterId, sectionId, date })).AsList();

            var sessionIds = rows.Select(x => x.SessionId).ToArray();
            var records = sessionIds.Length == 0 ? new List<AttendanceRecordRow>() :
                (await connection.QueryAsync<AttendanceRecordRow>(@"
                    SELECT d.attendance_session_id AS SessionId, d.student_id AS StudentId,
                           st.student_code AS RollNumber, st.full_name AS Name,
                           d.attendance_status AS Status
                    FROM student_attendance_details d
                    INNER JOIN students st ON st.student_id = d.student_id
                    WHERE d.attendance_session_id IN @sessionIds;", new { sessionIds })).AsList();

            var data = rows.Select(row =>
            {
                var current = records.Where(x => x.SessionId == row.SessionId).ToList();
                var present = current.Count(x => x.Status == "PRESENT");
                return new
                {
                    sessionId = row.SessionId, attendanceSessionId = row.SessionId, date = row.Date,
                    subject = row.Subject, subjectCode = row.SubjectCode, courseId = row.CourseId, course = row.Course,
                    branchId = row.BranchId, branch = row.Branch, semesterId = row.SemesterId, semester = row.Semester,
                    sectionId = row.SectionId, section = row.Section, facultyId = row.FacultyId, faculty = row.Faculty,
                    sessionStatus = row.SessionStatus, totalStudents = current.Count, presentCount = present,
                    absentCount = current.Count(x => x.Status == "ABSENT"), lateCount = current.Count(x => x.Status == "LATE"),
                    leaveCount = current.Count(x => x.Status == "LEAVE"), attendanceRate = current.Count == 0 ? 0 : Math.Round((decimal)present * 100 / current.Count),
                    records = current
                };
            });

            return Ok(new { success = true, message = "Attendance retrieved successfully.", count = data.Count(), data });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve frontend attendance data.");
            return StatusCode(500, new { success = false, message = "Unable to retrieve attendance." });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateAttendance([FromBody] FrontendAttendanceRequest request)
    {
        if (request.Records is null || request.Records.Count == 0)
            return BadRequest(new { success = false, message = "At least one student attendance record is required." });

        if (request.Records.GroupBy(x => x.StudentId).Any(g => g.Key <= 0 || g.Count() > 1))
            return Conflict(new { success = false, message = "Duplicate or invalid student IDs were supplied." });

        await using var connection = Connection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            var context = await connection.QuerySingleOrDefaultAsync<AttendanceContext>(@"
                SELECT sec.college_id AS CollegeId, sec.academic_year_id AS AcademicYearId,
                       sec.semester_id AS SemesterId, sec.course_id AS CourseId, sec.branch_id AS BranchId
                FROM sections sec WHERE sec.section_id = @sectionId AND sec.status = 1;",
                new { sectionId = request.SectionId }, transaction);

            if (context is null || context.AcademicYearId != request.AcademicYearId || context.SemesterId != request.SemesterId ||
                context.CourseId != request.CourseId || context.BranchId != request.BranchId)
                return BadRequest(new { success = false, message = "The selected attendance context does not match the section." });

            var subjectId = await connection.ExecuteScalarAsync<long?>(@"
                SELECT subject_id FROM subjects WHERE status = 1 AND (subject_code = @subject OR subject_name = @subject)
                LIMIT 1;", new { subject = request.Subject.Trim() }, transaction);
            if (!subjectId.HasValue)
                return BadRequest(new { success = false, message = "The selected subject was not found. Use a valid subject name or code." });

            var duplicate = await connection.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM student_attendance
                WHERE college_id = @collegeId AND attendance_date = DATE(@date) AND section_id = @sectionId
                  AND subject_id = @subjectId AND faculty_id = @facultyId;",
                new { context.CollegeId, request.Date, request.SectionId, subjectId, request.FacultyId }, transaction);
            if (duplicate > 0)
                return Conflict(new { success = false, message = "Attendance for this section, date, subject and faculty already exists." });

            var validStudents = await connection.QueryAsync<long>(@"
                SELECT ssa.student_id FROM student_section_assignments ssa
                WHERE ssa.section_id = @sectionId AND ssa.academic_year_id = @academicYearId AND ssa.status = 1
                  AND ssa.student_id IN @studentIds;",
                new { request.SectionId, request.AcademicYearId, studentIds = request.Records.Select(x => x.StudentId).ToArray() }, transaction);
            var validSet = validStudents.ToHashSet();
            var invalid = request.Records.Select(x => x.StudentId).Where(id => !validSet.Contains(id)).Distinct().ToArray();
            if (invalid.Length > 0)
                return BadRequest(new { success = false, message = $"Student IDs are not assigned to the selected section: {string.Join(", ", invalid)}." });

            await connection.ExecuteAsync(@"
                INSERT INTO student_attendance
                (college_id, academic_year_id, semester_id, section_id, subject_id, faculty_id, attendance_date, session_status, created_at, created_by)
                VALUES (@CollegeId, @AcademicYearId, @SemesterId, @SectionId, @SubjectId, @FacultyId, DATE(@Date), 'COMPLETED', UTC_TIMESTAMP(), @Actor);",
                new { context.CollegeId, request.AcademicYearId, request.SemesterId, request.SectionId, SubjectId = subjectId.Value, request.FacultyId, request.Date, Actor = CurrentUserId() }, transaction);
            var sessionId = await connection.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID();", transaction: transaction);

            foreach (var record in request.Records)
            {
                var status = record.Status.Equals("EXCUSED", StringComparison.OrdinalIgnoreCase) ? "LEAVE" : record.Status.ToUpperInvariant();
                if (status == "PRESENT" || status == "ABSENT" || status == "LATE" || status == "LEAVE")
                    await connection.ExecuteAsync(@"
                        INSERT INTO student_attendance_details
                        (attendance_session_id, student_id, attendance_status, marked_at, marked_by)
                        VALUES (@sessionId, @studentId, @status, UTC_TIMESTAMP(), @actor);",
                        new { sessionId, studentId = record.StudentId, status, actor = CurrentUserId() }, transaction);
                else return BadRequest(new { success = false, message = "Invalid attendance status." });
            }

            await transaction.CommitAsync();
            return Ok(new { success = true, message = "Attendance recorded and saved successfully.", data = new { attendanceSessionId = sessionId } });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to save frontend attendance data.");
            return StatusCode(500, new { success = false, message = "Unable to save attendance." });
        }
    }

    [HttpGet("students/{studentId:long}/summary")]
    public async Task<IActionResult> GetStudentSummary(long studentId)
    {
        await using var connection = Connection();
        var summary = await connection.QuerySingleOrDefaultAsync(@"
            SELECT COUNT(*) AS totalClasses,
                   SUM(CASE WHEN attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS present,
                   SUM(CASE WHEN attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absent,
                   SUM(CASE WHEN attendance_status = 'LATE' THEN 1 ELSE 0 END) AS late,
                   SUM(CASE WHEN attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount
            FROM student_attendance_details WHERE student_id = @studentId;", new { studentId });
        return Ok(new { success = true, data = summary });
    }

    private sealed class AttendanceRow { public long SessionId { get; set; } public DateTime Date { get; set; } public string Subject { get; set; } = ""; public string SubjectCode { get; set; } = ""; public long? CourseId { get; set; } public string? Course { get; set; } public long? BranchId { get; set; } public string? Branch { get; set; } public long? SemesterId { get; set; } public string? Semester { get; set; } public long SectionId { get; set; } public string Section { get; set; } = ""; public long FacultyId { get; set; } public string Faculty { get; set; } = ""; public string SessionStatus { get; set; } = ""; }
    private sealed class AttendanceRecordRow { public long SessionId { get; set; } public long StudentId { get; set; } public string RollNumber { get; set; } = ""; public string Name { get; set; } = ""; public string Status { get; set; } = ""; }
    private sealed class AttendanceContext { public long CollegeId { get; set; } public long AcademicYearId { get; set; } public long SemesterId { get; set; } public long? CourseId { get; set; } public long? BranchId { get; set; } }
}

public sealed class FrontendAttendanceRequest
{
    public long AcademicYearId { get; set; }
    public long CourseId { get; set; }
    public long BranchId { get; set; }
    public long SemesterId { get; set; }
    public long SectionId { get; set; }
    public DateTime Date { get; set; }
    public string Subject { get; set; } = "";
    public long FacultyId { get; set; }
    public List<FrontendAttendanceRecord> Records { get; set; } = new();
}

public sealed class FrontendAttendanceRecord
{
    public long StudentId { get; set; }
    public string Status { get; set; } = "Present";
}
