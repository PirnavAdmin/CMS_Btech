using BTech.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/faculty-attendance")]
[Authorize]
public class FacultyAttendanceViewsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public FacultyAttendanceViewsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private MySqlConnection Connection() =>
        new(_configuration.GetConnectionString("DefaultConnection"));

    // GET: api/v1/faculty-attendance/daily
    [HttpGet("daily")]
    public async Task<IActionResult> Daily(
        [FromQuery] DateTime? date,
        [FromQuery] string? department,
        [FromQuery] string? facultyId,
        [FromQuery] string? status,
        [FromQuery] string? search)
    {
        var attendanceDate = (date ?? DateTime.Today).Date;

        const string sql = @"
SELECT
    f.faculty_id AS FacultyId,
    f.faculty_code AS EmployeeId,
    f.faculty_name AS FacultyName,
    f.designation AS Designation,
    f.employment_type AS EmploymentType,
    d.department_name AS Department,
    a.attendance_id AS AttendanceId,
    a.attendance_date AS AttendanceDate,
    a.status AS AttendanceStatus,
    a.check_in AS CheckIn,
    a.check_out AS CheckOut,
    a.remarks AS Remarks
FROM faculty f
INNER JOIN departments d
    ON d.department_id = f.department_id
LEFT JOIN faculty_attendance a
    ON a.faculty_id = f.faculty_id
   AND a.attendance_date = @attendanceDate
WHERE f.deleted_at IS NULL
  AND f.status = 1
  AND (@department IS NULL OR @department = '' OR d.department_name = @department)
  AND (
        @facultyId IS NULL OR @facultyId = ''
        OR CAST(f.faculty_id AS CHAR) = @facultyId
        OR f.faculty_code = @facultyId
      )
  AND (
        @search IS NULL OR @search = ''
        OR f.faculty_code LIKE CONCAT('%', @search, '%')
        OR f.faculty_name LIKE CONCAT('%', @search, '%')
      )
ORDER BY f.faculty_id;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var rows = (await connection.QueryAsync<AttendanceViewRow>(
                sql,
                new
                {
                    attendanceDate,
                    department,
                    facultyId,
                    search
                })).ToList();

            var result = rows
                .Where(row => string.IsNullOrWhiteSpace(status) ||
                              string.Equals(
                                  ToDisplayStatus(row.AttendanceStatus),
                                  ToDisplayStatus(status),
                                  StringComparison.OrdinalIgnoreCase))
                .Select(ToDailyRow)
                .ToList();

            return Ok(new
            {
                success = true,
                message = "Daily faculty attendance retrieved successfully.",
                data = new
                {
                    date = attendanceDate.ToString("yyyy-MM-dd"),
                    totalRecords = result.Count,
                    rows = result
                }
            });
        }
        catch (MySqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Unable to retrieve daily faculty attendance.",
                error = ex.Message
            });
        }
    }

    // POST: api/v1/faculty-attendance/bulk
    [HttpPost("bulk")]
    public async Task<IActionResult> Bulk([FromBody] BulkAttendanceRequest request)
    {
        if (request.FacultyIds == null || request.FacultyIds.Count == 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "At least one faculty ID is required."
            });
        }

        var status = NormalizeStatus(request.Status);
        if (status == "NOT_MARKED")
        {
            return BadRequest(new
            {
                success = false,
                message = "Not Marked cannot be saved as an attendance status."
            });
        }

        var attendanceDate = (request.AttendanceDate ?? DateTime.Today).Date;

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();

            const string facultyCheckSql = @"
SELECT faculty_id
FROM faculty
WHERE faculty_id IN @FacultyIds
  AND status = 1
  AND deleted_at IS NULL;";

            var validFacultyIds = (await connection.QueryAsync<long>(
                facultyCheckSql,
                new { request.FacultyIds },
                transaction)).ToHashSet();

            var invalidIds = request.FacultyIds
                .Distinct()
                .Where(id => !validFacultyIds.Contains(id))
                .ToList();

            if (invalidIds.Count > 0)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    success = false,
                    message = "One or more faculty IDs are invalid or inactive.",
                    invalidFacultyIds = invalidIds
                });
            }

            const string upsertSql = @"
INSERT INTO faculty_attendance
(
    faculty_id,
    attendance_date,
    status,
    remarks,
    created_at,
    created_by,
    updated_at,
    updated_by
)
VALUES
(
    @FacultyId,
    @AttendanceDate,
    @Status,
    @Remarks,
    UTC_TIMESTAMP(),
    @UserId,
    UTC_TIMESTAMP(),
    @UserId
)
ON DUPLICATE KEY UPDATE
    status = @Status,
    remarks = @Remarks,
    updated_at = UTC_TIMESTAMP(),
    updated_by = @UserId;";

            var userId = CurrentUserId();

            foreach (var id in request.FacultyIds.Distinct())
            {
                await connection.ExecuteAsync(
                    upsertSql,
                    new
                    {
                        FacultyId = id,
                        AttendanceDate = attendanceDate,
                        Status = status,
                        request.Remarks,
                        UserId = userId
                    },
                    transaction);
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Faculty attendance updated successfully for selected faculty.",
                data = new
                {
                    attendanceDate = attendanceDate.ToString("yyyy-MM-dd"),
                    status = ToDisplayStatus(status),
                    statusCode = ToStatusCode(status),
                    updatedCount = request.FacultyIds.Distinct().Count(),
                    facultyIds = request.FacultyIds.Distinct().ToArray()
                }
            });
        }
        catch (MySqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Unable to save bulk faculty attendance.",
                error = ex.Message
            });
        }
    }

    // GET: api/v1/faculty-attendance/reports/weekly
    [HttpGet("reports/weekly")]
    public async Task<IActionResult> Weekly(
        [FromQuery] DateTime? weekStart,
        [FromQuery] string? facultyType,
        [FromQuery] string? department,
        [FromQuery] string? facultyId,
        [FromQuery] string? status,
        [FromQuery] string? search)
    {
        var start = StartOfWeek(weekStart ?? DateTime.Today);
        var end = start.AddDays(6);

        return await BuildMatrixReport(
            "Weekly",
            start,
            end,
            facultyType,
            department,
            facultyId,
            status,
            search);
    }

    // GET: api/v1/faculty-attendance/reports/monthly
    [HttpGet("reports/monthly")]
    public async Task<IActionResult> Monthly(
        [FromQuery] int? month,
        [FromQuery] int? year,
        [FromQuery] string? facultyType,
        [FromQuery] string? department,
        [FromQuery] string? facultyId,
        [FromQuery] string? status,
        [FromQuery] string? search)
    {
        var selectedYear = year ?? DateTime.Today.Year;
        var selectedMonth = month ?? DateTime.Today.Month;

        if (selectedYear < 1900 || selectedYear > 9999 ||
            selectedMonth < 1 || selectedMonth > 12)
        {
            return BadRequest(new
            {
                success = false,
                message = "Select a valid reporting month and year."
            });
        }

        var start = new DateTime(selectedYear, selectedMonth, 1);
        var end = start.AddMonths(1).AddDays(-1);

        return await BuildMatrixReport(
            "Monthly",
            start,
            end,
            facultyType,
            department,
            facultyId,
            status,
            search);
    }

    private async Task<IActionResult> BuildMatrixReport(
        string reportType,
        DateTime start,
        DateTime end,
        string? facultyType,
        string? department,
        string? facultyId,
        string? status,
        string? search)
    {
        const string sql = @"
SELECT
    f.faculty_id AS FacultyId,
    f.faculty_code AS EmployeeId,
    f.faculty_name AS FacultyName,
    f.designation AS Designation,
    f.employment_type AS EmploymentType,
    d.department_name AS Department,
    a.attendance_id AS AttendanceId,
    a.attendance_date AS AttendanceDate,
    a.status AS AttendanceStatus,
    a.check_in AS CheckIn,
    a.check_out AS CheckOut,
    a.remarks AS Remarks
FROM faculty f
INNER JOIN departments d
    ON d.department_id = f.department_id
LEFT JOIN faculty_attendance a
    ON a.faculty_id = f.faculty_id
   AND a.attendance_date BETWEEN @startDate AND @endDate
WHERE f.deleted_at IS NULL
  AND f.status = 1
  AND (@department IS NULL OR @department = '' OR d.department_name = @department)
  AND (
        @facultyId IS NULL OR @facultyId = ''
        OR CAST(f.faculty_id AS CHAR) = @facultyId
        OR f.faculty_code = @facultyId
      )
  AND (
        @search IS NULL OR @search = ''
        OR f.faculty_code LIKE CONCAT('%', @search, '%')
        OR f.faculty_name LIKE CONCAT('%', @search, '%')
      )
ORDER BY f.faculty_id, a.attendance_date;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var rows = (await connection.QueryAsync<AttendanceViewRow>(
                sql,
                new
                {
                    startDate = start.Date,
                    endDate = end.Date,
                    department,
                    facultyId,
                    search
                })).ToList();

            var normalizedStatus = string.IsNullOrWhiteSpace(status)
                ? null
                : NormalizeStatus(status);

            var grouped = rows
                .GroupBy(x => new
                {
                    x.FacultyId,
                    x.EmployeeId,
                    x.FacultyName,
                    x.Designation,
                    x.EmploymentType,
                    x.Department
                })
                .Select(group =>
                {
                    var facultyCategory = GetFacultyType(group.Key.EmploymentType, group.Key.Designation);

                    if (!MatchesFacultyType(facultyCategory, facultyType))
                        return null;

                    var attendanceByDate = group
                        .Where(x => x.AttendanceDate.HasValue)
                        .ToDictionary(
                            x => x.AttendanceDate!.Value.Date,
                            x => x);

                    var days = new List<object>();
                    var present = 0;
                    var absent = 0;
                    var late = 0;
                    var halfDay = 0;
                    var onLeave = 0;
                    var lop = 0;
                    var notMarked = 0;
                    var workingMinutes = 0;

                    for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
                    {
                        if (attendanceByDate.TryGetValue(date, out var record))
                        {
                            var displayStatus = ToDisplayStatus(record.AttendanceStatus);
                            var code = ToStatusCode(displayStatus);

                            if (displayStatus == "Present") present++;
                            else if (displayStatus == "Absent") absent++;
                            else if (displayStatus == "Late") late++;
                            else if (displayStatus == "Half Day") halfDay++;
                            else if (displayStatus == "On Leave") onLeave++;
                            else if (displayStatus == "LOP") lop++;
                            else notMarked++;

                            var minutes = WorkingMinutes(record.CheckIn, record.CheckOut);
                            workingMinutes += minutes;

                            days.Add(new
                            {
                                date = date.ToString("yyyy-MM-dd"),
                                status = displayStatus,
                                code,
                                attendanceId = record.AttendanceId,
                                checkIn = record.CheckIn,
                                checkOut = record.CheckOut,
                                workingMinutes = minutes,
                                remarks = record.Remarks
                            });
                        }
                        else
                        {
                            notMarked++;

                            days.Add(new
                            {
                                date = date.ToString("yyyy-MM-dd"),
                                status = "Not Marked",
                                code = "—",
                                attendanceId = (long?)null,
                                checkIn = (DateTime?)null,
                                checkOut = (DateTime?)null,
                                workingMinutes = 0,
                                remarks = (string?)null
                            });
                        }
                    }

                    var marked = present + absent + late + halfDay + onLeave + lop;
                    var counted = present + late + halfDay;
                    var percentage = marked == 0
                        ? 0
                        : (int)Math.Round((double)counted / marked * 100, MidpointRounding.AwayFromZero);

                    var matchesStatus = normalizedStatus == null
                        || (normalizedStatus == "NOT_MARKED" && notMarked > 0)
                        || (normalizedStatus == "PRESENT" && present > 0)
                        || (normalizedStatus == "ABSENT" && absent > 0)
                        || (normalizedStatus == "LATE" && late > 0)
                        || (normalizedStatus == "HALF_DAY" && halfDay > 0)
                        || (normalizedStatus == "LEAVE" && onLeave > 0)
                        || (normalizedStatus == "LOP" && lop > 0);

                    return new
                    {
                        facultyId = group.Key.FacultyId,
                        employeeId = group.Key.EmployeeId,
                        facultyName = group.Key.FacultyName,
                        designation = group.Key.Designation,
                        department = group.Key.Department,
                        facultyType = facultyCategory,
                        days,
                        totals = new
                        {
                            present,
                            absent,
                            late,
                            halfDay,
                            onLeave,
                            lop,
                            notMarked,
                            percentage = $"{percentage}%"
                        },
                        totalWorkingMinutes = workingMinutes,
                        matchesStatus
                    };
                })
                .Where(x => x != null && x.matchesStatus)
                .ToList();

            return Ok(new
            {
                success = true,
                message = $"{reportType} faculty attendance report retrieved successfully.",
                data = new
                {
                    reportType,
                    fromDate = start.ToString("yyyy-MM-dd"),
                    toDate = end.ToString("yyyy-MM-dd"),
                    totalRecords = grouped.Count,
                    rows = grouped
                }
            });
        }
        catch (MySqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = $"Unable to retrieve {reportType.ToLowerInvariant()} faculty attendance report.",
                error = ex.Message
            });
        }
    }

    private static object ToDailyRow(AttendanceViewRow row)
    {
        var status = row.AttendanceId.HasValue
            ? ToDisplayStatus(row.AttendanceStatus)
            : "Not Marked";

        var minutes = WorkingMinutes(row.CheckIn, row.CheckOut);

        return new
        {
            attendanceId = row.AttendanceId,
            facultyId = row.FacultyId,
            employeeId = row.EmployeeId,
            facultyName = row.FacultyName,
            designation = row.Designation,
            department = row.Department,
            facultyType = GetFacultyType(row.EmploymentType, row.Designation),
            date = row.AttendanceDate?.ToString("yyyy-MM-dd"),
            status,
            statusCode = ToStatusCode(status),
            checkIn = row.CheckIn,
            checkOut = row.CheckOut,
            workingMinutes = minutes,
            workingHours = FormatMinutes(minutes),
            remarks = row.Remarks,
            source = "Manual"
        };
    }

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return "NOT_MARKED";

        var value = status.Trim()
            .Replace("-", "_")
            .Replace(" ", "_")
            .ToUpperInvariant();

        return value switch
        {
            "P" or "PRESENT" => "PRESENT",
            "A" or "ABSENT" => "ABSENT",
            "L" or "LATE" => "LATE",
            "HD" or "HALF_DAY" => "HALF_DAY",
            "OL" or "LEAVE" or "ON_LEAVE" => "LEAVE",
            "LOP" => "LOP",
            "NOT_MARKED" or "PENDING" => "NOT_MARKED",
            _ => value
        };
    }

    private static string ToDisplayStatus(string? status)
    {
        return NormalizeStatus(status) switch
        {
            "PRESENT" => "Present",
            "ABSENT" => "Absent",
            "LATE" => "Late",
            "HALF_DAY" => "Half Day",
            "LEAVE" => "On Leave",
            "LOP" => "LOP",
            _ => "Not Marked"
        };
    }

    private static string ToStatusCode(string? status)
    {
        return ToDisplayStatus(status) switch
        {
            "Present" => "P",
            "Absent" => "A",
            "Late" => "L",
            "Half Day" => "HD",
            "On Leave" => "OL",
            "LOP" => "LOP",
            _ => "—"
        };
    }

    private static string GetFacultyType(string? employmentType, string? designation = null)
    {
        // The existing faculty table has employment_type, not a separate
        // employee_category column. Existing faculty records are treated as
        // Teaching unless the value explicitly identifies non-teaching staff.
        var value = (employmentType ?? string.Empty).Trim().ToLowerInvariant();

        var role = (designation ?? string.Empty).Trim().ToLowerInvariant();
        var nonTeachingDesignation = new[]
        {
            "librarian", "lab", "system", "network", "account", "administrat",
            "office", "junior assistant", "store", "technical assistant", "clerk", "attender"
        }.Any(keyword => role.Contains(keyword));

        return value is "non-teaching" or "non_teaching" or "nonteaching" || nonTeachingDesignation
            ? "Non-Teaching"
            : "Teaching";
    }

    private static bool MatchesFacultyType(string actual, string? requested)
    {
        return string.IsNullOrWhiteSpace(requested) ||
               string.Equals(actual, requested.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    private static DateTime StartOfWeek(DateTime date)
    {
        var value = date.Date;
        var diff = (7 + (value.DayOfWeek - DayOfWeek.Monday)) % 7;
        return value.AddDays(-diff);
    }

    private static int WorkingMinutes(DateTime? checkIn, DateTime? checkOut)
    {
        if (!checkIn.HasValue || !checkOut.HasValue || checkOut.Value <= checkIn.Value)
            return 0;

        return (int)Math.Round(
            (checkOut.Value - checkIn.Value).TotalMinutes,
            MidpointRounding.AwayFromZero);
    }

    private static string FormatMinutes(int minutes)
    {
        if (minutes <= 0)
            return "0h";

        var hours = minutes / 60;
        var remaining = minutes % 60;

        return remaining == 0
            ? $"{hours}h"
            : $"{hours}h {remaining}m";
    }

    private long? CurrentUserId()
    {
        var value = User.FindFirst("user_id")?.Value ??
                    User.FindFirst("sub")?.Value;

        return long.TryParse(value, out var id) ? id : null;
    }

    private sealed class AttendanceViewRow
    {
        public long FacultyId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FacultyName { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public string? EmploymentType { get; set; }
        public string Department { get; set; } = string.Empty;
        public long? AttendanceId { get; set; }
        public DateTime? AttendanceDate { get; set; }
        public string? AttendanceStatus { get; set; }
        public DateTime? CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
        public string? Remarks { get; set; }
    }

    public sealed class BulkAttendanceRequest
    {
        public List<long> FacultyIds { get; set; } = new();
        public DateTime? AttendanceDate { get; set; }
        public string Status { get; set; } = "PRESENT";
        public string? Remarks { get; set; }
    }
}
