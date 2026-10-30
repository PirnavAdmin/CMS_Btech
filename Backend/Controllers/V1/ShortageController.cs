using BTech.Data;
using BTech.DTOs.FacultyManagement;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/shortages")]
[Authorize]
public class ShortageController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;

    public ShortageController(
        IConfiguration configuration,
        ApplicationDbContext context)
    {
        _configuration = configuration;
        _context = context;
    }

    private MySqlConnection Connection()
        => new(_configuration.GetConnectionString("DefaultConnection"));

    // =========================================================
    // 1. GET: api/v1/shortages/department/{departmentId}
    // Department Shortage
    // =========================================================

    [HttpGet("department/{departmentId:long}")]
    public async Task<IActionResult> GetDepartmentShortage(long departmentId)
    {
        if (departmentId <= 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid department ID."
            });
        }

        const string sql = @"
SELECT
    s.shortage_id AS ShortageId,
    s.faculty_id AS FacultyId,
    s.academic_year_id AS AcademicYearId,
    s.course_id AS CourseId,
    s.branch_id AS BranchId,
    s.semester_id AS SemesterId,
    s.section_id AS SectionId,
    s.required_percentage AS RequiredPercentage,
    s.actual_percentage AS ActualPercentage,
    s.shortage_percentage AS ShortagePercentage,
    s.total_working_days AS TotalWorkingDays,
    s.present_days AS PresentDays,
    s.absent_days AS AbsentDays,
    s.leave_days AS LeaveDays,
    s.shortage_status AS ShortageStatus,
    s.remarks AS Remarks,
    s.created_at AS CreatedAt
FROM faculty_attendance_shortages s
INNER JOIN employee_profiles ep
    ON ep.employee_profile_id = s.faculty_id
WHERE ep.department_id = @departmentId
ORDER BY s.shortage_percentage DESC,
         s.shortage_id DESC;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var rows = (await connection.QueryAsync(
                sql,
                new
                {
                    departmentId
                })).ToList();

            return Ok(new
            {
                success = true,
                message = "Department shortage details retrieved successfully.",
                data = rows
            });
        }
        catch (MySqlException ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Unable to retrieve department shortage details.",
                    error = ex.Message
                });
        }
        catch (Exception ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Unable to retrieve department shortage details.",
                    error = ex.Message
                });
        }
    }

    // =========================================================
    // 2. GET: api/v1/shortages/student/{studentId}
    // Student Shortage Details
    // =========================================================

    [HttpGet("student/{studentId:long}")]
    public async Task<IActionResult> GetStudentShortage(long studentId)
    {
        if (studentId <= 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid student ID."
            });
        }

        const string sql = @"
SELECT
    s.shortage_id AS ShortageId,
    s.student_id AS StudentId,
    st.student_code AS StudentCode,
    st.full_name AS StudentName,
    s.academic_year_id AS AcademicYearId,
    s.course_id AS CourseId,
    s.branch_id AS BranchId,
    s.semester_id AS SemesterId,
    s.section_id AS SectionId,
    s.required_percentage AS RequiredPercentage,
    s.actual_percentage AS ActualPercentage,
    s.shortage_percentage AS ShortagePercentage,
    s.total_working_days AS TotalWorkingDays,
    s.present_days AS PresentDays,
    s.absent_days AS AbsentDays,
    s.leave_days AS LeaveDays,
    s.shortage_status AS ShortageStatus,
    s.remarks AS Remarks,
    s.created_at AS CreatedAt
FROM student_attendance_shortages s
INNER JOIN students st
    ON st.student_id = s.student_id
WHERE s.student_id = @studentId
ORDER BY s.created_at DESC,
         s.shortage_id DESC;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var rows = (await connection.QueryAsync(
                sql,
                new
                {
                    studentId
                })).ToList();

            if (rows.Count == 0)
            {
                return NotFound(new
                {
                    success = false,
                    message = "No shortage details found for this student."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Student shortage details retrieved successfully.",
                data = rows
            });
        }
        catch (MySqlException ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Unable to retrieve student shortage details.",
                    error = ex.Message
                });
        }
        catch (Exception ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Unable to retrieve student shortage details.",
                    error = ex.Message
                });
        }
    }

    // =========================================================
    // 3. POST: api/v1/shortages/calculate
    // Shortage Calculation
    // =========================================================

    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateShortage(
        [FromBody] ShortageCalculationRequestDto request)
    {
        if (request == null)
        {
            return BadRequest(new
            {
                success = false,
                message = "Request data is required."
            });
        }

        if (request.FacultyId <= 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid faculty ID."
            });
        }

        if (request.RequiredPercentage <= 0 ||
            request.RequiredPercentage > 100)
        {
            return BadRequest(new
            {
                success = false,
                message = "Required percentage must be between 1 and 100."
            });
        }

        const string attendanceSql = @"
SELECT
    COUNT(*) AS TotalWorkingDays,
    COALESCE(SUM(
        CASE
            WHEN UPPER(status) = 'PRESENT' THEN 1
            ELSE 0
        END
    ), 0) AS PresentDays,
    COALESCE(SUM(
        CASE
            WHEN UPPER(status) = 'ABSENT' THEN 1
            ELSE 0
        END
    ), 0) AS AbsentDays,
    COALESCE(SUM(
        CASE
            WHEN UPPER(status) = 'LEAVE' THEN 1
            ELSE 0
        END
    ), 0) AS LeaveDays
FROM faculty_attendance
WHERE faculty_id = @facultyId;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var attendance =
                await connection.QuerySingleAsync<dynamic>(
                    attendanceSql,
                    new
                    {
                        facultyId = request.FacultyId
                    });

            int totalWorkingDays =
                Convert.ToInt32(attendance.TotalWorkingDays);

            int presentDays =
                Convert.ToInt32(attendance.PresentDays);

            int absentDays =
                Convert.ToInt32(attendance.AbsentDays);

            int leaveDays =
                Convert.ToInt32(attendance.LeaveDays);

            decimal actualPercentage =
                totalWorkingDays == 0
                    ? 0
                    : Math.Round(
                        (decimal)presentDays /
                        totalWorkingDays * 100,
                        2);

            decimal shortagePercentage =
                actualPercentage < request.RequiredPercentage
                    ? Math.Round(
                        request.RequiredPercentage -
                        actualPercentage,
                        2)
                    : 0;

            string shortageStatus =
                actualPercentage < request.RequiredPercentage
                    ? "ACTIVE"
                    : "NORMAL";

            string remarks =
                actualPercentage < request.RequiredPercentage
                    ? "Attendance is below the configured threshold."
                    : "Attendance meets the configured threshold.";

            const string insertSql = @"
INSERT INTO faculty_attendance_shortages
(
    faculty_id,
    academic_year_id,
    course_id,
    branch_id,
    semester_id,
    section_id,
    required_percentage,
    actual_percentage,
    shortage_percentage,
    total_working_days,
    present_days,
    absent_days,
    leave_days,
    shortage_status,
    remarks,
    created_at
)
VALUES
(
    @facultyId,
    @academicYearId,
    @courseId,
    @branchId,
    @semesterId,
    @sectionId,
    @requiredPercentage,
    @actualPercentage,
    @shortagePercentage,
    @totalWorkingDays,
    @presentDays,
    @absentDays,
    @leaveDays,
    @shortageStatus,
    @remarks,
    CURRENT_TIMESTAMP
);";

            await connection.ExecuteAsync(
                insertSql,
                new
                {
                    facultyId = request.FacultyId,
                    academicYearId = request.AcademicYearId,
                    courseId = request.CourseId,
                    branchId = request.BranchId,
                    semesterId = request.SemesterId,
                    sectionId = request.SectionId,
                    requiredPercentage = request.RequiredPercentage,
                    actualPercentage,
                    shortagePercentage,
                    totalWorkingDays,
                    presentDays,
                    absentDays,
                    leaveDays,
                    shortageStatus,
                    remarks
                });

            return Ok(new
            {
                success = true,
                message = "Shortage calculated successfully.",
                data = new
                {
                    facultyId = request.FacultyId,
                    academicYearId = request.AcademicYearId,
                    courseId = request.CourseId,
                    branchId = request.BranchId,
                    semesterId = request.SemesterId,
                    sectionId = request.SectionId,
                    requiredPercentage = request.RequiredPercentage,
                    actualPercentage,
                    shortagePercentage,
                    totalWorkingDays,
                    presentDays,
                    absentDays,
                    leaveDays,
                    shortageStatus
                }
            });
        }
        catch (MySqlException ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Unable to calculate shortage.",
                    error = ex.Message
                });
        }
        catch (Exception ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message = "Unable to calculate shortage.",
                    error = ex.Message
                });
        }
    }
}