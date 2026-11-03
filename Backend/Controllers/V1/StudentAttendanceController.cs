using System.Security.Claims;
using BTech.DTOs.StudentAttendance;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/student-attendance")]
[Authorize]
public sealed class StudentAttendanceController : ControllerBase
{
    private static readonly HashSet<string> AllowedAttendanceStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "PRESENT", "ABSENT", "LATE", "LEAVE"
        };

    private static readonly HashSet<string> AllowedSessionStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "OPEN", "COMPLETED", "CANCELLED"
        };

    private readonly IConfiguration _configuration;
    private readonly ILogger<StudentAttendanceController> _logger;

    public StudentAttendanceController(
        IConfiguration configuration,
        ILogger<StudentAttendanceController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private MySqlConnection Connection()
    {
        var connectionString = _configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("DefaultConnection is not configured.");

        return new MySqlConnection(connectionString);
    }

    private long? CurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var userId) && userId > 0 ? userId : null;
    }

    private IActionResult? ResolveCollegeId(long? requestedCollegeId, out long collegeId)
    {
        collegeId = 0;

        var collegeClaim = User.FindFirst("collegeId")?.Value;
        if (long.TryParse(collegeClaim, out var tokenCollegeId) && tokenCollegeId > 0)
        {
            if (requestedCollegeId.HasValue && requestedCollegeId.Value != tokenCollegeId)
            {
                _logger.LogWarning(
                    "Cross-college student attendance access blocked. TokenCollegeId={TokenCollegeId}, RequestedCollegeId={RequestedCollegeId}, UserId={UserId}",
                    tokenCollegeId,
                    requestedCollegeId,
                    CurrentUserId());

                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = "You cannot access another college's attendance data."
                });
            }

            collegeId = tokenCollegeId;
            return null;
        }

        if (!requestedCollegeId.HasValue || requestedCollegeId.Value <= 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "collegeId is required when the authenticated user has no fixed college in the token."
            });
        }

        collegeId = requestedCollegeId.Value;
        return null;
    }

    // =========================================================
    // SESSION - LIST
    // GET /api/v1/student-attendance/sessions
    // =========================================================
    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions(
        [FromQuery] long? collegeId,
        [FromQuery] long? academicYearId,
        [FromQuery] long? semesterId,
        [FromQuery] long? sectionId,
        [FromQuery] long? subjectId,
        [FromQuery] long? facultyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? status)
    {
        var collegeError = ResolveCollegeId(collegeId, out var resolvedCollegeId);
        if (collegeError != null) return collegeError;

        if (fromDate.HasValue && toDate.HasValue && fromDate.Value.Date > toDate.Value.Date)
            return BadRequest(new { success = false, message = "fromDate cannot be after toDate." });

        var normalizedStatus = string.IsNullOrWhiteSpace(status)
            ? null
            : status.Trim().ToUpperInvariant();

        if (normalizedStatus != null && !AllowedSessionStatuses.Contains(normalizedStatus))
            return BadRequest(new { success = false, message = "status must be OPEN, COMPLETED or CANCELLED." });

        const string sql = @"
SELECT
    a.attendance_session_id AS attendanceSessionId,
    a.college_id AS collegeId,
    a.academic_year_id AS academicYearId,
    ay.academic_year_name AS academicYearName,
    a.semester_id AS semesterId,
    sem.semester_name AS semesterName,
    sem.semester_number AS semesterNumber,
    a.section_id AS sectionId,
    sec.section_code AS sectionCode,
    sec.section_name AS sectionName,
    a.subject_id AS subjectId,
    sub.subject_code AS subjectCode,
    sub.subject_name AS subjectName,
    a.faculty_id AS facultyId,
    f.faculty_code AS facultyCode,
    f.faculty_name AS facultyName,
    a.timetable_id AS timetableId,
    a.timetable_entry_id AS timetableEntryId,
    a.timetable_slot_id AS timetableSlotId,
    ts.slot_number AS slotNumber,
    ts.slot_name AS slotName,
    ts.start_time AS startTime,
    ts.end_time AS endTime,
    a.attendance_date AS attendanceDate,
    a.session_status AS sessionStatus,
    a.remarks AS remarks,
    COUNT(d.attendance_detail_id) AS markedCount,
    SUM(CASE WHEN d.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
    SUM(CASE WHEN d.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
    SUM(CASE WHEN d.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
    SUM(CASE WHEN d.attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
    a.created_at AS createdAt,
    a.updated_at AS updatedAt
FROM student_attendance a
INNER JOIN academicyears ay ON ay.academic_year_id = a.academic_year_id
INNER JOIN semesters sem ON sem.semester_id = a.semester_id
INNER JOIN sections sec ON sec.section_id = a.section_id
INNER JOIN subjects sub ON sub.subject_id = a.subject_id
INNER JOIN faculty f ON f.faculty_id = a.faculty_id
LEFT JOIN timetable_slots ts ON ts.timetable_slot_id = a.timetable_slot_id
LEFT JOIN student_attendance_details d ON d.attendance_session_id = a.attendance_session_id
WHERE a.college_id = @collegeId
  AND (@academicYearId IS NULL OR a.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR a.semester_id = @semesterId)
  AND (@sectionId IS NULL OR a.section_id = @sectionId)
  AND (@subjectId IS NULL OR a.subject_id = @subjectId)
  AND (@facultyId IS NULL OR a.faculty_id = @facultyId)
  AND (@fromDate IS NULL OR a.attendance_date >= @fromDate)
  AND (@toDate IS NULL OR a.attendance_date <= @toDate)
  AND (@status IS NULL OR a.session_status = @status)
GROUP BY
    a.attendance_session_id, a.college_id, a.academic_year_id,
    ay.academic_year_name, a.semester_id, sem.semester_name,
    sem.semester_number, a.section_id, sec.section_code,
    sec.section_name, a.subject_id, sub.subject_code,
    sub.subject_name, a.faculty_id, f.faculty_code,
    f.faculty_name, a.timetable_id, a.timetable_entry_id,
    a.timetable_slot_id, ts.slot_number, ts.slot_name,
    ts.start_time, ts.end_time, a.attendance_date,
    a.session_status, a.remarks, a.created_at, a.updated_at
ORDER BY a.attendance_date DESC, ts.slot_number, a.attendance_session_id DESC;";

        try
        {
            _logger.LogInformation(
                "Listing student attendance sessions. CollegeId={CollegeId}, AcademicYearId={AcademicYearId}, SemesterId={SemesterId}, SectionId={SectionId}, SubjectId={SubjectId}, FacultyId={FacultyId}, FromDate={FromDate}, ToDate={ToDate}, Status={Status}",
                resolvedCollegeId, academicYearId, semesterId, sectionId, subjectId, facultyId,
                fromDate?.Date, toDate?.Date, normalizedStatus);

            await using var connection = Connection();
            await connection.OpenAsync();

            var rows = (await connection.QueryAsync(sql, new
            {
                collegeId = resolvedCollegeId,
                academicYearId,
                semesterId,
                sectionId,
                subjectId,
                facultyId,
                fromDate = fromDate?.Date,
                toDate = toDate?.Date,
                status = normalizedStatus
            })).ToList();

            return Ok(new
            {
                success = true,
                message = "Attendance sessions retrieved successfully.",
                count = rows.Count,
                data = rows
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list student attendance sessions. CollegeId={CollegeId}", resolvedCollegeId);
            return DatabaseError("Unable to retrieve attendance sessions.");
        }
    }

    // =========================================================
    // SESSION - DETAILS
    // GET /api/v1/student-attendance/sessions/{sessionId}
    // =========================================================
    [HttpGet("sessions/{sessionId:long}")]
    public async Task<IActionResult> GetSessionById(
        long sessionId,
        [FromQuery] long? collegeId)
    {
        if (sessionId <= 0)
            return BadRequest(new { success = false, message = "Invalid attendance session ID." });

        var collegeError = ResolveCollegeId(collegeId, out var resolvedCollegeId);
        if (collegeError != null) return collegeError;

        try
        {
            _logger.LogInformation(
                "Getting attendance session details. SessionId={SessionId}, CollegeId={CollegeId}",
                sessionId, resolvedCollegeId);

            await using var connection = Connection();
            await connection.OpenAsync();

            var session = await GetSessionAsync(connection, sessionId, resolvedCollegeId);
            if (session == null)
            {
                _logger.LogWarning(
                    "Attendance session not found. SessionId={SessionId}, CollegeId={CollegeId}",
                    sessionId, resolvedCollegeId);

                return NotFound(new { success = false, message = "Attendance session not found." });
            }

            var summary = await GetSessionSummaryAsync(connection, sessionId);

            return Ok(new
            {
                success = true,
                message = "Attendance session details retrieved successfully.",
                data = new { session, summary }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get attendance session. SessionId={SessionId}", sessionId);
            return DatabaseError("Unable to retrieve attendance session details.");
        }
    }

    // =========================================================
    // SESSION - CREATE
    // POST /api/v1/student-attendance/sessions
    // =========================================================
    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreateAttendanceSessionRequest request)
    {
        var collegeError = ResolveCollegeId(request.CollegeId, out var collegeId);
        if (collegeError != null) return collegeError;

        var attendanceDate = request.AttendanceDate == default
            ? DateTime.UtcNow.Date
            : request.AttendanceDate.Date;

        var actor = CurrentUserId();

        try
        {
            _logger.LogInformation(
                "Creating attendance session. CollegeId={CollegeId}, AcademicYearId={AcademicYearId}, SemesterId={SemesterId}, SectionId={SectionId}, SubjectId={SubjectId}, FacultyId={FacultyId}, AttendanceDate={AttendanceDate}, TimetableEntryId={TimetableEntryId}, UserId={UserId}",
                collegeId, request.AcademicYearId, request.SemesterId,
                request.SectionId, request.SubjectId, request.FacultyId,
                attendanceDate, request.TimetableEntryId, actor);

            await using var connection = Connection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();

            var academicContextError = await ValidateSessionContextAsync(
                connection,
                transaction,
                collegeId,
                request);

            if (academicContextError != null)
            {
                await transaction.RollbackAsync();
                _logger.LogWarning(
                    "Attendance session validation failed. CollegeId={CollegeId}, Reason={Reason}",
                    collegeId, academicContextError);

                return BadRequest(new { success = false, message = academicContextError });
            }

            if (request.TimetableEntryId.HasValue)
            {
                var timetableValid = await connection.ExecuteScalarAsync<int>(
                    @"SELECT COUNT(*)
                      FROM timetable_entries te
                      INNER JOIN timetables t ON t.timetable_id = te.timetable_id
                      WHERE te.timetable_entry_id = @timetableEntryId
                        AND te.status = 1
                        AND te.faculty_id = @facultyId
                        AND te.subject_id = @subjectId
                        AND te.section_id = @sectionId
                        AND t.academic_year_id = @academicYearId
                        AND t.semester_id = @semesterId
                        AND (@timetableId IS NULL OR te.timetable_id = @timetableId)
                        AND (@timetableSlotId IS NULL OR te.timetable_slot_id = @timetableSlotId);",
                    new
                    {
                        request.TimetableEntryId,
                        request.FacultyId,
                        request.SubjectId,
                        request.SectionId,
                        request.AcademicYearId,
                        request.SemesterId,
                        request.TimetableId,
                        request.TimetableSlotId
                    },
                    transaction);

                if (timetableValid == 0)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new
                    {
                        success = false,
                        message = "The timetable entry does not match the selected academic year, semester, section, subject and faculty."
                    });
                }
            }

            var duplicateCount = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(*)
                  FROM student_attendance
                  WHERE college_id = @collegeId
                    AND attendance_date = @attendanceDate
                    AND section_id = @sectionId
                    AND (
                        (@timetableEntryId IS NOT NULL AND timetable_entry_id = @timetableEntryId)
                        OR
                        (@timetableEntryId IS NULL AND @timetableSlotId IS NOT NULL AND timetable_slot_id = @timetableSlotId)
                        OR
                        (@timetableEntryId IS NULL AND @timetableSlotId IS NULL
                         AND timetable_entry_id IS NULL AND timetable_slot_id IS NULL
                         AND subject_id = @subjectId AND faculty_id = @facultyId)
                    );",
                new
                {
                    collegeId,
                    attendanceDate,
                    request.SectionId,
                    request.SubjectId,
                    request.FacultyId,
                    request.TimetableEntryId,
                    request.TimetableSlotId
                },
                transaction);

            if (duplicateCount > 0)
            {
                await transaction.RollbackAsync();
                _logger.LogWarning(
                    "Duplicate attendance session blocked. CollegeId={CollegeId}, SectionId={SectionId}, AttendanceDate={AttendanceDate}, TimetableEntryId={TimetableEntryId}, TimetableSlotId={TimetableSlotId}",
                    collegeId, request.SectionId, attendanceDate,
                    request.TimetableEntryId, request.TimetableSlotId);

                return Conflict(new
                {
                    success = false,
                    message = "An attendance session already exists for the same class/period/date."
                });
            }

            await connection.ExecuteAsync(
                @"INSERT INTO student_attendance
                  (college_id, academic_year_id, semester_id, section_id,
                   subject_id, faculty_id, timetable_id, timetable_entry_id,
                   timetable_slot_id, attendance_date, session_status,
                   remarks, created_at, created_by)
                  VALUES
                  (@collegeId, @academicYearId, @semesterId, @sectionId,
                   @subjectId, @facultyId, @timetableId, @timetableEntryId,
                   @timetableSlotId, @attendanceDate, 'OPEN',
                   @remarks, UTC_TIMESTAMP(), @createdBy);",
                new
                {
                    collegeId,
                    request.AcademicYearId,
                    request.SemesterId,
                    request.SectionId,
                    request.SubjectId,
                    request.FacultyId,
                    request.TimetableId,
                    request.TimetableEntryId,
                    request.TimetableSlotId,
                    attendanceDate,
                    remarks = NormalizeOptionalText(request.Remarks),
                    createdBy = actor
                },
                transaction);

            var sessionId = await connection.ExecuteScalarAsync<long>(
                "SELECT LAST_INSERT_ID();",
                transaction: transaction);

            await transaction.CommitAsync();

            _logger.LogInformation(
                "Attendance session created. SessionId={SessionId}, CollegeId={CollegeId}, UserId={UserId}",
                sessionId, collegeId, actor);

            return CreatedAtAction(
                nameof(GetSessionById),
                new { sessionId, collegeId },
                new
                {
                    success = true,
                    message = "Attendance session created successfully.",
                    data = new { attendanceSessionId = sessionId }
                });
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex,
                "Database error creating attendance session. CollegeId={CollegeId}, SectionId={SectionId}, SubjectId={SubjectId}",
                collegeId, request.SectionId, request.SubjectId);

            return DatabaseError("Unable to create attendance session.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unexpected error creating attendance session. CollegeId={CollegeId}",
                collegeId);

            return DatabaseError("Unable to create attendance session.");
        }
    }

    // =========================================================
    // MARKING - ROSTER + CURRENT MARKS
    // GET /api/v1/student-attendance/sessions/{sessionId}/students
    // =========================================================
    [HttpGet("sessions/{sessionId:long}/students")]
    public async Task<IActionResult> GetSessionStudents(
        long sessionId,
        [FromQuery] long? collegeId)
    {
        if (sessionId <= 0)
            return BadRequest(new { success = false, message = "Invalid attendance session ID." });

        var collegeError = ResolveCollegeId(collegeId, out var resolvedCollegeId);
        if (collegeError != null) return collegeError;

        const string rosterSql = @"
SELECT
    st.student_id AS studentId,
    st.student_code AS studentCode,
    st.full_name AS studentName,
    st.email AS email,
    st.mobile AS mobile,
    d.attendance_detail_id AS attendanceDetailId,
    COALESCE(d.attendance_status, 'UNMARKED') AS attendanceStatus,
    d.remarks AS remarks,
    d.marked_at AS markedAt,
    d.updated_at AS updatedAt
FROM students st
LEFT JOIN student_section_assignments ssa
    ON ssa.student_id = st.student_id
   AND ssa.section_id = @sectionId
   AND ssa.academic_year_id = @academicYearId
   AND ssa.status = 1
   AND ssa.removed_at IS NULL
LEFT JOIN student_attendance_details d
    ON d.student_id = st.student_id
   AND d.attendance_session_id = @sessionId
WHERE st.college_id = @collegeId
  AND st.deleted_at IS NULL
  AND (ssa.student_section_assignment_id IS NOT NULL OR d.attendance_detail_id IS NOT NULL)
ORDER BY st.student_code, st.full_name, st.student_id;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var session = await connection.QueryFirstOrDefaultAsync(
                @"SELECT attendance_session_id AS attendanceSessionId,
                         section_id AS sectionId,
                         academic_year_id AS academicYearId,
                         session_status AS sessionStatus
                  FROM student_attendance
                  WHERE attendance_session_id = @sessionId
                    AND college_id = @collegeId
                  LIMIT 1;",
                new { sessionId, collegeId = resolvedCollegeId });

            if (session == null)
                return NotFound(new { success = false, message = "Attendance session not found." });

            _logger.LogInformation(
                "Loading attendance marking roster. SessionId={SessionId}, CollegeId={CollegeId}",
                sessionId, resolvedCollegeId);

            var students = (await connection.QueryAsync(rosterSql, new
            {
                sessionId,
                sectionId = (long)session.sectionId,
                academicYearId = (long)session.academicYearId,
                collegeId = resolvedCollegeId
            })).ToList();

            var summary = await GetSessionSummaryAsync(connection, sessionId);

            return Ok(new
            {
                success = true,
                message = "Attendance marking roster retrieved successfully.",
                data = new
                {
                    attendanceSessionId = sessionId,
                    sessionStatus = (string)session.sessionStatus,
                    studentCount = students.Count,
                    summary,
                    students
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load attendance roster. SessionId={SessionId}", sessionId);
            return DatabaseError("Unable to retrieve attendance marking roster.");
        }
    }

    // =========================================================
    // MARKING - BULK INSERT (DUPLICATES BLOCKED)
    // PUT /api/v1/student-attendance/sessions/{sessionId}/mark
    // =========================================================
    [HttpPut("sessions/{sessionId:long}/mark")]
    public async Task<IActionResult> MarkAttendance(
        long sessionId,
        [FromQuery] long? collegeId,
        [FromBody] MarkAttendanceRequest request)
    {
        if (sessionId <= 0)
            return BadRequest(new { success = false, message = "Invalid attendance session ID." });

        var marks = request.Students ?? new List<AttendanceMarkItemRequest>();

        if (marks.Count == 0 && !request.MarkUnlistedAsAbsent)
        {
            return BadRequest(new
            {
                success = false,
                message = "Provide at least one student mark or set markUnlistedAsAbsent=true."
            });
        }

        var duplicateStudentId = marks
            .GroupBy(x => x.StudentId)
            .FirstOrDefault(g => g.Count() > 1)?.Key;

        if (duplicateStudentId.HasValue)
        {
            return BadRequest(new
            {
                success = false,
                message = $"Student ID {duplicateStudentId.Value} is repeated in the request."
            });
        }

        foreach (var item in marks)
        {
            var status = item.AttendanceStatus?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(status) || !AllowedAttendanceStatuses.Contains(status))
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Invalid attendance status for student ID {item.StudentId}. Allowed: PRESENT, ABSENT, LATE, LEAVE."
                });
            }
        }

        var collegeError = ResolveCollegeId(collegeId, out var resolvedCollegeId);
        if (collegeError != null) return collegeError;

        var actor = CurrentUserId();

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();

            var session = await connection.QueryFirstOrDefaultAsync(
                @"SELECT attendance_session_id AS attendanceSessionId,
                         section_id AS sectionId,
                         academic_year_id AS academicYearId,
                         session_status AS sessionStatus
                  FROM student_attendance
                  WHERE attendance_session_id = @sessionId
                    AND college_id = @collegeId
                  LIMIT 1
                  FOR UPDATE;",
                new { sessionId, collegeId = resolvedCollegeId },
                transaction);

            if (session == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { success = false, message = "Attendance session not found." });
            }

            var sessionStatus = ((string)session.sessionStatus).ToUpperInvariant();
            if (sessionStatus != "OPEN")
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    success = false,
                    message = $"Attendance cannot be marked because the session is {sessionStatus}. Reopen it first if a correction is required."
                });
            }

            // Prevent marking a student more than once in the same attendance session.
            if (marks.Count > 0)
            {
                var existingMarkedStudentIds = (await connection.QueryAsync<long>(
                    @"SELECT student_id
                      FROM student_attendance_details
                      WHERE attendance_session_id = @sessionId
                        AND student_id IN @studentIds;",
                    new
                    {
                        sessionId,
                        studentIds = marks.Select(x => x.StudentId).Distinct().ToArray()
                    },
                    transaction)).ToHashSet();

                if (existingMarkedStudentIds.Count > 0)
                {
                    await transaction.RollbackAsync();

                    _logger.LogWarning(
                        "Duplicate attendance marking blocked. SessionId={SessionId}, StudentIds={StudentIds}",
                        sessionId,
                        string.Join(',', existingMarkedStudentIds));

                    return Conflict(new
                    {
                        success = false,
                        message = "Attendance has already been marked for one or more students in this session.",
                        studentIds = existingMarkedStudentIds.OrderBy(x => x).ToList()
                    });
                }
            }

            var rosterIds = (await connection.QueryAsync<long>(
                @"SELECT st.student_id
                  FROM student_section_assignments ssa
                  INNER JOIN students st ON st.student_id = ssa.student_id
                  WHERE ssa.section_id = @sectionId
                    AND ssa.academic_year_id = @academicYearId
                    AND ssa.status = 1
                    AND ssa.removed_at IS NULL
                    AND st.college_id = @collegeId
                    AND st.status = 1
                    AND st.deleted_at IS NULL;",
                new
                {
                    sectionId = (long)session.sectionId,
                    academicYearId = (long)session.academicYearId,
                    collegeId = resolvedCollegeId
                },
                transaction)).ToHashSet();

            var invalidStudents = marks
                .Where(x => !rosterIds.Contains(x.StudentId))
                .Select(x => x.StudentId)
                .Distinct()
                .ToList();

            if (invalidStudents.Count > 0)
            {
                await transaction.RollbackAsync();
                _logger.LogWarning(
                    "Attendance marking blocked for students outside roster. SessionId={SessionId}, StudentIds={StudentIds}",
                    sessionId, string.Join(',', invalidStudents));

                return BadRequest(new
                {
                    success = false,
                    message = "One or more students are not active members of this section for the session academic year.",
                    studentIds = invalidStudents
                });
            }

            if (request.MarkUnlistedAsAbsent)
            {
                await connection.ExecuteAsync(
                    @"INSERT INTO student_attendance_details
                      (attendance_session_id, student_id, attendance_status,
                       remarks, marked_at, marked_by, updated_at, updated_by)
                      SELECT @sessionId, st.student_id, 'ABSENT', NULL,
                             UTC_TIMESTAMP(), @actor, UTC_TIMESTAMP(), @actor
                      FROM student_section_assignments ssa
                      INNER JOIN students st ON st.student_id = ssa.student_id
                      WHERE ssa.section_id = @sectionId
                        AND ssa.academic_year_id = @academicYearId
                        AND ssa.status = 1
                        AND ssa.removed_at IS NULL
                        AND st.college_id = @collegeId
                        AND st.status = 1
                        AND st.deleted_at IS NULL
                        AND NOT EXISTS (
                            SELECT 1
                            FROM student_attendance_details existing
                            WHERE existing.attendance_session_id = @sessionId
                              AND existing.student_id = st.student_id
                        );",
                    new
                    {
                        sessionId,
                        sectionId = (long)session.sectionId,
                        academicYearId = (long)session.academicYearId,
                        collegeId = resolvedCollegeId,
                        actor
                    },
                    transaction);
            }

            const string upsertSql = @"
INSERT INTO student_attendance_details
(attendance_session_id, student_id, attendance_status,
 remarks, marked_at, marked_by, updated_at, updated_by)
VALUES
(@sessionId, @studentId, @attendanceStatus,
 @remarks, UTC_TIMESTAMP(), @actor, UTC_TIMESTAMP(), @actor);";

            foreach (var item in marks)
            {
                await connection.ExecuteAsync(
                    upsertSql,
                    new
                    {
                        sessionId,
                        studentId = item.StudentId,
                        attendanceStatus = item.AttendanceStatus.Trim().ToUpperInvariant(),
                        remarks = NormalizeOptionalText(item.Remarks),
                        actor
                    },
                    transaction);
            }

            if (request.CompleteSession)
            {
                var activeStudentCount = rosterIds.Count;
                var unmarkedActiveCount = await connection.ExecuteScalarAsync<int>(
                    @"SELECT COUNT(*)
                      FROM student_section_assignments ssa
                      INNER JOIN students st ON st.student_id = ssa.student_id
                      LEFT JOIN student_attendance_details d
                        ON d.attendance_session_id = @sessionId
                       AND d.student_id = st.student_id
                      WHERE ssa.section_id = @sectionId
                        AND ssa.academic_year_id = @academicYearId
                        AND ssa.status = 1
                        AND ssa.removed_at IS NULL
                        AND st.college_id = @collegeId
                        AND st.status = 1
                        AND st.deleted_at IS NULL
                        AND d.attendance_detail_id IS NULL;",
                    new
                    {
                        sessionId,
                        sectionId = (long)session.sectionId,
                        academicYearId = (long)session.academicYearId,
                        collegeId = resolvedCollegeId
                    },
                    transaction);

                if (unmarkedActiveCount > 0)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new
                    {
                        success = false,
                        message = "The session cannot be completed until every active student in the section has an attendance mark.",
                        activeStudentCount,
                        markedActiveStudentCount = activeStudentCount - unmarkedActiveCount,
                        unmarkedActiveCount
                    });
                }

                await connection.ExecuteAsync(
                    @"UPDATE student_attendance
                      SET session_status = 'COMPLETED',
                          updated_at = UTC_TIMESTAMP(),
                          updated_by = @actor
                      WHERE attendance_session_id = @sessionId;",
                    new { sessionId, actor },
                    transaction);
            }

            await transaction.CommitAsync();

            _logger.LogInformation(
                "Student attendance marked. SessionId={SessionId}, ExplicitMarks={ExplicitMarks}, MarkUnlistedAsAbsent={MarkUnlistedAsAbsent}, CompleteSession={CompleteSession}, UserId={UserId}",
                sessionId,
                marks.Count,
                request.MarkUnlistedAsAbsent,
                request.CompleteSession,
                actor);

            var summary = await GetSessionSummaryAsync(connection, sessionId);

            return Ok(new
            {
                success = true,
                message = request.CompleteSession
                    ? "Attendance marked and session completed successfully."
                    : "Attendance marked successfully.",
                data = new
                {
                    attendanceSessionId = sessionId,
                    summary
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to mark student attendance. SessionId={SessionId}", sessionId);
            return DatabaseError("Unable to mark student attendance.");
        }
    }

    // =========================================================
    // SESSION - STATUS (OPEN / COMPLETED / CANCELLED)
    // PATCH /api/v1/student-attendance/sessions/{sessionId}/status
    // =========================================================
    [HttpPatch("sessions/{sessionId:long}/status")]
    public async Task<IActionResult> UpdateSessionStatus(
        long sessionId,
        [FromQuery] long? collegeId,
        [FromBody] UpdateAttendanceSessionStatusRequest request)
    {
        if (sessionId <= 0)
            return BadRequest(new { success = false, message = "Invalid attendance session ID." });

        var normalizedStatus = request.SessionStatus?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(normalizedStatus) || !AllowedSessionStatuses.Contains(normalizedStatus))
            return BadRequest(new { success = false, message = "sessionStatus must be OPEN, COMPLETED or CANCELLED." });

        var collegeError = ResolveCollegeId(collegeId, out var resolvedCollegeId);
        if (collegeError != null) return collegeError;

        var actor = CurrentUserId();

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            if (normalizedStatus == "COMPLETED")
            {
                var counts = await connection.QueryFirstOrDefaultAsync(
                    @"SELECT
                          (SELECT COUNT(*)
                           FROM student_section_assignments ssa
                           INNER JOIN students st ON st.student_id = ssa.student_id
                           WHERE ssa.section_id = a.section_id
                             AND ssa.academic_year_id = a.academic_year_id
                             AND ssa.status = 1
                             AND ssa.removed_at IS NULL
                             AND st.college_id = a.college_id
                             AND st.status = 1
                             AND st.deleted_at IS NULL) AS activeStudentCount,
                          (SELECT COUNT(*)
                           FROM student_section_assignments ssa
                           INNER JOIN students st ON st.student_id = ssa.student_id
                           LEFT JOIN student_attendance_details d
                             ON d.attendance_session_id = a.attendance_session_id
                            AND d.student_id = st.student_id
                           WHERE ssa.section_id = a.section_id
                             AND ssa.academic_year_id = a.academic_year_id
                             AND ssa.status = 1
                             AND ssa.removed_at IS NULL
                             AND st.college_id = a.college_id
                             AND st.status = 1
                             AND st.deleted_at IS NULL
                             AND d.attendance_detail_id IS NULL) AS unmarkedActiveCount
                      FROM student_attendance a
                      WHERE a.attendance_session_id = @sessionId
                        AND a.college_id = @collegeId
                      LIMIT 1;",
                    new { sessionId, collegeId = resolvedCollegeId });

                if (counts == null)
                    return NotFound(new { success = false, message = "Attendance session not found." });

                if ((long)counts.unmarkedActiveCount > 0)
                {
                    var activeStudentCount = (long)counts.activeStudentCount;
                    var unmarkedActiveCount = (long)counts.unmarkedActiveCount;

                    return Conflict(new
                    {
                        success = false,
                        message = "The session cannot be completed until every active student in the section has an attendance mark.",
                        activeStudentCount,
                        markedActiveStudentCount = activeStudentCount - unmarkedActiveCount,
                        unmarkedActiveCount
                    });
                }
            }

            var affected = await connection.ExecuteAsync(
                @"UPDATE student_attendance
                  SET session_status = @status,
                      remarks = COALESCE(@remarks, remarks),
                      updated_at = UTC_TIMESTAMP(),
                      updated_by = @actor
                  WHERE attendance_session_id = @sessionId
                    AND college_id = @collegeId;",
                new
                {
                    status = normalizedStatus,
                    remarks = NormalizeOptionalText(request.Remarks),
                    actor,
                    sessionId,
                    collegeId = resolvedCollegeId
                });

            if (affected == 0)
                return NotFound(new { success = false, message = "Attendance session not found." });

            _logger.LogInformation(
                "Attendance session status changed. SessionId={SessionId}, Status={Status}, UserId={UserId}",
                sessionId, normalizedStatus, actor);

            return Ok(new
            {
                success = true,
                message = "Attendance session status updated successfully.",
                data = new
                {
                    attendanceSessionId = sessionId,
                    sessionStatus = normalizedStatus
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update attendance session status. SessionId={SessionId}", sessionId);
            return DatabaseError("Unable to update attendance session status.");
        }
    }

    // =========================================================
    // DAILY REPORT
    // GET /api/v1/student-attendance/reports/daily?date=2026-09-22
    // =========================================================
    [HttpGet("reports/daily")]
    public async Task<IActionResult> GetDailyReport(
        [FromQuery] DateTime date,
        [FromQuery] long? collegeId,
        [FromQuery] long? academicYearId,
        [FromQuery] long? semesterId,
        [FromQuery] long? sectionId,
        [FromQuery] long? subjectId,
        [FromQuery] long? facultyId)
    {
        if (date == default)
            return BadRequest(new { success = false, message = "date is required." });

        var collegeError = ResolveCollegeId(collegeId, out var resolvedCollegeId);
        if (collegeError != null) return collegeError;

        const string rowsSql = @"
SELECT
    a.attendance_session_id AS attendanceSessionId,
    a.attendance_date AS attendanceDate,
    a.session_status AS sessionStatus,
    a.section_id AS sectionId,
    sec.section_code AS sectionCode,
    sec.section_name AS sectionName,
    a.subject_id AS subjectId,
    sub.subject_code AS subjectCode,
    sub.subject_name AS subjectName,
    a.faculty_id AS facultyId,
    f.faculty_name AS facultyName,
    ts.slot_number AS slotNumber,
    ts.slot_name AS slotName,
    (SELECT COUNT(*)
     FROM student_section_assignments ssa
     INNER JOIN students st ON st.student_id = ssa.student_id
     WHERE ssa.section_id = a.section_id
       AND ssa.academic_year_id = a.academic_year_id
       AND ssa.status = 1
       AND ssa.removed_at IS NULL
       AND st.status = 1
       AND st.deleted_at IS NULL
       AND st.college_id = a.college_id) AS enrolledStudents,
    COUNT(d.attendance_detail_id) AS markedStudents,
    SUM(CASE WHEN d.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
    SUM(CASE WHEN d.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
    SUM(CASE WHEN d.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
    SUM(CASE WHEN d.attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
    ROUND(
        100.0 * SUM(CASE WHEN d.attendance_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(d.attendance_detail_id), 0), 2
    ) AS attendancePercentage
FROM student_attendance a
INNER JOIN sections sec ON sec.section_id = a.section_id
INNER JOIN subjects sub ON sub.subject_id = a.subject_id
INNER JOIN faculty f ON f.faculty_id = a.faculty_id
LEFT JOIN timetable_slots ts ON ts.timetable_slot_id = a.timetable_slot_id
LEFT JOIN student_attendance_details d ON d.attendance_session_id = a.attendance_session_id
WHERE a.college_id = @collegeId
  AND a.attendance_date = @date
  AND a.session_status <> 'CANCELLED'
  AND (@academicYearId IS NULL OR a.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR a.semester_id = @semesterId)
  AND (@sectionId IS NULL OR a.section_id = @sectionId)
  AND (@subjectId IS NULL OR a.subject_id = @subjectId)
  AND (@facultyId IS NULL OR a.faculty_id = @facultyId)
GROUP BY
    a.attendance_session_id, a.attendance_date, a.session_status,
    a.section_id, sec.section_code, sec.section_name,
    a.subject_id, sub.subject_code, sub.subject_name,
    a.faculty_id, f.faculty_name, ts.slot_number, ts.slot_name
ORDER BY sec.section_code, ts.slot_number, sub.subject_name;";

        const string summarySql = @"
SELECT
    COUNT(DISTINCT a.attendance_session_id) AS totalSessions,
    COUNT(d.attendance_detail_id) AS totalMarks,
    SUM(CASE WHEN d.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
    SUM(CASE WHEN d.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
    SUM(CASE WHEN d.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
    SUM(CASE WHEN d.attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
    ROUND(
        100.0 * SUM(CASE WHEN d.attendance_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(d.attendance_detail_id), 0), 2
    ) AS attendancePercentage
FROM student_attendance a
LEFT JOIN student_attendance_details d ON d.attendance_session_id = a.attendance_session_id
WHERE a.college_id = @collegeId
  AND a.attendance_date = @date
  AND a.session_status <> 'CANCELLED'
  AND (@academicYearId IS NULL OR a.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR a.semester_id = @semesterId)
  AND (@sectionId IS NULL OR a.section_id = @sectionId)
  AND (@subjectId IS NULL OR a.subject_id = @subjectId)
  AND (@facultyId IS NULL OR a.faculty_id = @facultyId);";

        try
        {
            _logger.LogInformation(
                "Daily attendance report requested. CollegeId={CollegeId}, Date={Date}, SectionId={SectionId}, SubjectId={SubjectId}",
                resolvedCollegeId, date.Date, sectionId, subjectId);

            await using var connection = Connection();
            await connection.OpenAsync();

            var parameters = new
            {
                collegeId = resolvedCollegeId,
                date = date.Date,
                academicYearId,
                semesterId,
                sectionId,
                subjectId,
                facultyId
            };

            var rows = (await connection.QueryAsync(rowsSql, parameters)).ToList();
            var summary = await connection.QueryFirstAsync(summarySql, parameters);

            return Ok(new
            {
                success = true,
                message = "Daily attendance report retrieved successfully.",
                data = new
                {
                    reportDate = date.Date,
                    summary,
                    sessions = rows
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate daily attendance report. Date={Date}", date.Date);
            return DatabaseError("Unable to generate daily attendance report.");
        }
    }

    // =========================================================
    // SUBJECT REPORT
    // GET /api/v1/student-attendance/reports/subject?subjectId=1
    // =========================================================
    [HttpGet("reports/subject")]
    public async Task<IActionResult> GetSubjectReport(
        [FromQuery] long subjectId,
        [FromQuery] long? collegeId,
        [FromQuery] long? academicYearId,
        [FromQuery] long? semesterId,
        [FromQuery] long? sectionId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        if (subjectId <= 0)
            return BadRequest(new { success = false, message = "subjectId is required." });

        if (fromDate.HasValue && toDate.HasValue && fromDate.Value.Date > toDate.Value.Date)
            return BadRequest(new { success = false, message = "fromDate cannot be after toDate." });

        var collegeError = ResolveCollegeId(collegeId, out var resolvedCollegeId);
        if (collegeError != null) return collegeError;

        const string subjectSql = @"
SELECT subject_id AS subjectId, subject_code AS subjectCode, subject_name AS subjectName
FROM subjects
WHERE subject_id = @subjectId
LIMIT 1;";

        const string summarySql = @"
SELECT
    COUNT(DISTINCT a.attendance_session_id) AS totalSessions,
    COUNT(d.attendance_detail_id) AS totalMarks,
    SUM(CASE WHEN d.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
    SUM(CASE WHEN d.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
    SUM(CASE WHEN d.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
    SUM(CASE WHEN d.attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
    ROUND(
        100.0 * SUM(CASE WHEN d.attendance_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(d.attendance_detail_id), 0), 2
    ) AS attendancePercentage
FROM student_attendance a
LEFT JOIN student_attendance_details d ON d.attendance_session_id = a.attendance_session_id
WHERE a.college_id = @collegeId
  AND a.subject_id = @subjectId
  AND a.session_status <> 'CANCELLED'
  AND (@academicYearId IS NULL OR a.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR a.semester_id = @semesterId)
  AND (@sectionId IS NULL OR a.section_id = @sectionId)
  AND (@fromDate IS NULL OR a.attendance_date >= @fromDate)
  AND (@toDate IS NULL OR a.attendance_date <= @toDate);";

        const string studentsSql = @"
SELECT
    st.student_id AS studentId,
    st.student_code AS studentCode,
    st.full_name AS studentName,
    COUNT(DISTINCT a.attendance_session_id) AS markedSessions,
    SUM(CASE WHEN d.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
    SUM(CASE WHEN d.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
    SUM(CASE WHEN d.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
    SUM(CASE WHEN d.attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
    ROUND(
        100.0 * SUM(CASE WHEN d.attendance_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(d.attendance_detail_id), 0), 2
    ) AS attendancePercentage
FROM student_attendance a
INNER JOIN student_attendance_details d ON d.attendance_session_id = a.attendance_session_id
INNER JOIN students st ON st.student_id = d.student_id
WHERE a.college_id = @collegeId
  AND a.subject_id = @subjectId
  AND a.session_status <> 'CANCELLED'
  AND (@academicYearId IS NULL OR a.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR a.semester_id = @semesterId)
  AND (@sectionId IS NULL OR a.section_id = @sectionId)
  AND (@fromDate IS NULL OR a.attendance_date >= @fromDate)
  AND (@toDate IS NULL OR a.attendance_date <= @toDate)
GROUP BY st.student_id, st.student_code, st.full_name
ORDER BY st.student_code, st.full_name;";

        try
        {
            _logger.LogInformation(
                "Subject attendance report requested. CollegeId={CollegeId}, SubjectId={SubjectId}, FromDate={FromDate}, ToDate={ToDate}",
                resolvedCollegeId, subjectId, fromDate?.Date, toDate?.Date);

            await using var connection = Connection();
            await connection.OpenAsync();

            var subject = await connection.QueryFirstOrDefaultAsync(subjectSql, new { subjectId });
            if (subject == null)
                return NotFound(new { success = false, message = "Subject not found." });

            var parameters = new
            {
                collegeId = resolvedCollegeId,
                subjectId,
                academicYearId,
                semesterId,
                sectionId,
                fromDate = fromDate?.Date,
                toDate = toDate?.Date
            };

            var summary = await connection.QueryFirstAsync(summarySql, parameters);
            var students = (await connection.QueryAsync(studentsSql, parameters)).ToList();

            return Ok(new
            {
                success = true,
                message = "Subject attendance report retrieved successfully.",
                data = new
                {
                    subject,
                    fromDate = fromDate?.Date,
                    toDate = toDate?.Date,
                    summary,
                    students
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate subject attendance report. SubjectId={SubjectId}", subjectId);
            return DatabaseError("Unable to generate subject attendance report.");
        }
    }

    // =========================================================
    // MONTHLY REPORT
    // GET /api/v1/student-attendance/reports/monthly?year=2026&month=9
    // =========================================================
    [HttpGet("reports/monthly")]
    public async Task<IActionResult> GetMonthlyReport(
        [FromQuery] int year,
        [FromQuery] int month,
        [FromQuery] long? collegeId,
        [FromQuery] long? academicYearId,
        [FromQuery] long? semesterId,
        [FromQuery] long? sectionId,
        [FromQuery] long? subjectId,
        [FromQuery] long? facultyId)
    {
        if (year < 2000 || year > 2100)
            return BadRequest(new { success = false, message = "year must be between 2000 and 2100." });

        if (month < 1 || month > 12)
            return BadRequest(new { success = false, message = "month must be between 1 and 12." });

        var collegeError = ResolveCollegeId(collegeId, out var resolvedCollegeId);
        if (collegeError != null) return collegeError;

        var fromDate = new DateTime(year, month, 1);
        var toDate = fromDate.AddMonths(1);

        const string dailySql = @"
SELECT
    a.attendance_date AS attendanceDate,
    COUNT(DISTINCT a.attendance_session_id) AS totalSessions,
    COUNT(d.attendance_detail_id) AS totalMarks,
    SUM(CASE WHEN d.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
    SUM(CASE WHEN d.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
    SUM(CASE WHEN d.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
    SUM(CASE WHEN d.attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
    ROUND(
        100.0 * SUM(CASE WHEN d.attendance_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(d.attendance_detail_id), 0), 2
    ) AS attendancePercentage
FROM student_attendance a
LEFT JOIN student_attendance_details d ON d.attendance_session_id = a.attendance_session_id
WHERE a.college_id = @collegeId
  AND a.attendance_date >= @fromDate
  AND a.attendance_date < @toDate
  AND a.session_status <> 'CANCELLED'
  AND (@academicYearId IS NULL OR a.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR a.semester_id = @semesterId)
  AND (@sectionId IS NULL OR a.section_id = @sectionId)
  AND (@subjectId IS NULL OR a.subject_id = @subjectId)
  AND (@facultyId IS NULL OR a.faculty_id = @facultyId)
GROUP BY a.attendance_date
ORDER BY a.attendance_date;";

        const string summarySql = @"
SELECT
    COUNT(DISTINCT a.attendance_session_id) AS totalSessions,
    COUNT(DISTINCT a.attendance_date) AS conductedDays,
    COUNT(d.attendance_detail_id) AS totalMarks,
    SUM(CASE WHEN d.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
    SUM(CASE WHEN d.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
    SUM(CASE WHEN d.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
    SUM(CASE WHEN d.attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
    ROUND(
        100.0 * SUM(CASE WHEN d.attendance_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(d.attendance_detail_id), 0), 2
    ) AS attendancePercentage
FROM student_attendance a
LEFT JOIN student_attendance_details d ON d.attendance_session_id = a.attendance_session_id
WHERE a.college_id = @collegeId
  AND a.attendance_date >= @fromDate
  AND a.attendance_date < @toDate
  AND a.session_status <> 'CANCELLED'
  AND (@academicYearId IS NULL OR a.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR a.semester_id = @semesterId)
  AND (@sectionId IS NULL OR a.section_id = @sectionId)
  AND (@subjectId IS NULL OR a.subject_id = @subjectId)
  AND (@facultyId IS NULL OR a.faculty_id = @facultyId);";

        const string studentsSql = @"
SELECT
    st.student_id AS studentId,
    st.student_code AS studentCode,
    st.full_name AS studentName,
    COUNT(d.attendance_detail_id) AS markedSessions,
    SUM(CASE WHEN d.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
    SUM(CASE WHEN d.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
    SUM(CASE WHEN d.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
    SUM(CASE WHEN d.attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
    ROUND(
        100.0 * SUM(CASE WHEN d.attendance_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(d.attendance_detail_id), 0), 2
    ) AS attendancePercentage
FROM student_attendance a
INNER JOIN student_attendance_details d ON d.attendance_session_id = a.attendance_session_id
INNER JOIN students st ON st.student_id = d.student_id
WHERE a.college_id = @collegeId
  AND a.attendance_date >= @fromDate
  AND a.attendance_date < @toDate
  AND a.session_status <> 'CANCELLED'
  AND (@academicYearId IS NULL OR a.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR a.semester_id = @semesterId)
  AND (@sectionId IS NULL OR a.section_id = @sectionId)
  AND (@subjectId IS NULL OR a.subject_id = @subjectId)
  AND (@facultyId IS NULL OR a.faculty_id = @facultyId)
GROUP BY st.student_id, st.student_code, st.full_name
ORDER BY st.student_code, st.full_name;";

        try
        {
            _logger.LogInformation(
                "Monthly attendance report requested. CollegeId={CollegeId}, Year={Year}, Month={Month}, SectionId={SectionId}, SubjectId={SubjectId}",
                resolvedCollegeId, year, month, sectionId, subjectId);

            await using var connection = Connection();
            await connection.OpenAsync();

            var parameters = new
            {
                collegeId = resolvedCollegeId,
                fromDate,
                toDate,
                academicYearId,
                semesterId,
                sectionId,
                subjectId,
                facultyId
            };

            var summary = await connection.QueryFirstAsync(summarySql, parameters);
            var days = (await connection.QueryAsync(dailySql, parameters)).ToList();
            var students = (await connection.QueryAsync(studentsSql, parameters)).ToList();

            return Ok(new
            {
                success = true,
                message = "Monthly attendance report retrieved successfully.",
                data = new
                {
                    year,
                    month,
                    monthName = fromDate.ToString("MMMM"),
                    summary,
                    days,
                    students
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate monthly attendance report. Year={Year}, Month={Month}", year, month);
            return DatabaseError("Unable to generate monthly attendance report.");
        }
    }

    // =========================================================
    // PRIVATE HELPERS
    // =========================================================
    private async Task<string?> ValidateSessionContextAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long collegeId,
        CreateAttendanceSessionRequest request)
    {
        var academicYearExists = await connection.ExecuteScalarAsync<int>(
            @"SELECT COUNT(*) FROM academicyears
              WHERE academic_year_id = @id AND deleted_at IS NULL;",
            new { id = request.AcademicYearId },
            transaction);

        if (academicYearExists == 0)
            return "Academic year not found.";

        var sectionValid = await connection.ExecuteScalarAsync<int>(
            @"SELECT COUNT(*)
              FROM sections
              WHERE section_id = @sectionId
                AND college_id = @collegeId
                AND academic_year_id = @academicYearId
                AND semester_id = @semesterId
                AND status = 1
                AND is_archived = 0
                AND deleted_at IS NULL;",
            new
            {
                request.SectionId,
                collegeId,
                request.AcademicYearId,
                request.SemesterId
            },
            transaction);

        if (sectionValid == 0)
            return "Section does not match the selected college, academic year and semester, or it is inactive.";

        var semesterValid = await connection.ExecuteScalarAsync<int>(
            @"SELECT COUNT(*) FROM semesters
              WHERE semester_id = @semesterId
                AND status = 1
                AND is_archived = 0;",
            new { request.SemesterId },
            transaction);

        if (semesterValid == 0)
            return "Semester not found or inactive.";

        var subjectValid = await connection.ExecuteScalarAsync<int>(
            @"SELECT COUNT(*)
              FROM subjects s
              WHERE s.subject_id = @subjectId
                AND s.status = 1
                AND (
                    EXISTS (
                        SELECT 1
                        FROM subject_semester_assignments ssa
                        WHERE ssa.subject_id = s.subject_id
                          AND ssa.semester_id = @semesterId
                          AND ssa.status = 1
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM subject_semesters ss
                        WHERE ss.subject_id = s.subject_id
                          AND ss.semester_id = @semesterId
                          AND ss.status = 1
                    )
                );",
            new { request.SubjectId, request.SemesterId },
            transaction);

        if (subjectValid == 0)
            return "Subject is not active or is not assigned to the selected semester.";

        var facultyValid = await connection.ExecuteScalarAsync<int>(
            @"SELECT COUNT(*) FROM faculty
              WHERE faculty_id = @facultyId
                AND college_id = @collegeId
                AND status = 1
                AND deleted_at IS NULL;",
            new { request.FacultyId, collegeId },
            transaction);

        if (facultyValid == 0)
            return "Faculty not found, inactive, or does not belong to the selected college.";

        return null;
    }

    private static async Task<dynamic?> GetSessionAsync(
        MySqlConnection connection,
        long sessionId,
        long collegeId)
    {
        return await connection.QueryFirstOrDefaultAsync(
            @"SELECT
                  a.attendance_session_id AS attendanceSessionId,
                  a.college_id AS collegeId,
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
                  f.faculty_code AS facultyCode,
                  f.faculty_name AS facultyName,
                  a.timetable_id AS timetableId,
                  a.timetable_entry_id AS timetableEntryId,
                  a.timetable_slot_id AS timetableSlotId,
                  ts.slot_number AS slotNumber,
                  ts.slot_name AS slotName,
                  ts.start_time AS startTime,
                  ts.end_time AS endTime,
                  a.attendance_date AS attendanceDate,
                  a.session_status AS sessionStatus,
                  a.remarks AS remarks,
                  a.created_at AS createdAt,
                  a.created_by AS createdBy,
                  a.updated_at AS updatedAt,
                  a.updated_by AS updatedBy
              FROM student_attendance a
              INNER JOIN academicyears ay ON ay.academic_year_id = a.academic_year_id
              INNER JOIN semesters sem ON sem.semester_id = a.semester_id
              INNER JOIN sections sec ON sec.section_id = a.section_id
              INNER JOIN subjects sub ON sub.subject_id = a.subject_id
              INNER JOIN faculty f ON f.faculty_id = a.faculty_id
              LEFT JOIN timetable_slots ts ON ts.timetable_slot_id = a.timetable_slot_id
              WHERE a.attendance_session_id = @sessionId
                AND a.college_id = @collegeId
              LIMIT 1;",
            new { sessionId, collegeId });
    }

    private static async Task<dynamic> GetSessionSummaryAsync(
        MySqlConnection connection,
        long sessionId)
    {
        return await connection.QueryFirstAsync(
            @"SELECT
                  COUNT(*) AS markedCount,
                  SUM(CASE WHEN attendance_status = 'PRESENT' THEN 1 ELSE 0 END) AS presentCount,
                  SUM(CASE WHEN attendance_status = 'ABSENT' THEN 1 ELSE 0 END) AS absentCount,
                  SUM(CASE WHEN attendance_status = 'LATE' THEN 1 ELSE 0 END) AS lateCount,
                  SUM(CASE WHEN attendance_status = 'LEAVE' THEN 1 ELSE 0 END) AS leaveCount,
                  ROUND(
                      100.0 * SUM(CASE WHEN attendance_status IN ('PRESENT','LATE') THEN 1 ELSE 0 END)
                      / NULLIF(COUNT(*), 0), 2
                  ) AS attendancePercentage
              FROM student_attendance_details
              WHERE attendance_session_id = @sessionId;",
            new { sessionId });
    }

    private static string? NormalizeOptionalText(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private ObjectResult DatabaseError(string message)
        => StatusCode(StatusCodes.Status500InternalServerError, new
        {
            success = false,
            message
        });
}
