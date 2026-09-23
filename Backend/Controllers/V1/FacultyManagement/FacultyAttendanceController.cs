using System.Data;
using BTech.Data;
using ClosedXML.Excel;
using BTech.DTOs.FacultyAttendance;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/faculty-attendance")]
[Authorize]
public class FacultyAttendanceController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;

    public FacultyAttendanceController(IConfiguration configuration, ApplicationDbContext context)
    {
        _configuration = configuration;
        _context = context;
    }

    private MySqlConnection Connection() => new(_configuration.GetConnectionString("DefaultConnection"));

    // GET: api/v1/faculty-attendance
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? facultyId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string? status)
    {
        const string sql = @"
SELECT * FROM faculty_attendance
WHERE (@facultyId IS NULL OR faculty_id = @facultyId)
  AND (@fromDate IS NULL OR attendance_date >= @fromDate)
  AND (@toDate IS NULL OR attendance_date <= @toDate)
  AND (@status IS NULL OR status = @status)
ORDER BY attendance_date DESC, attendance_id DESC;";
        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            var rows = await connection.QueryAsync(sql, new { facultyId, fromDate, toDate, status });
            return Ok(new { success = true, message = "Faculty attendance retrieved successfully.", data = rows });
        }
        catch (MySqlException)
        {
            return DbError();
        }
    }

    // GET: api/v1/faculty-attendance/{attendanceId}
    [HttpGet("{attendanceId:long}")]
    public async Task<IActionResult> GetById(long attendanceId)
    {
        if (attendanceId <= 0) return BadRequest(new { success = false, message = "Invalid attendance ID." });
        const string sql = "SELECT * FROM faculty_attendance WHERE attendance_id = @attendanceId LIMIT 1;";
        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            var row = await connection.QueryFirstOrDefaultAsync(sql, new { attendanceId });
            return row == null
                ? NotFound(new { success = false, message = "Attendance record not found." })
                : Ok(new { success = true, message = "Faculty attendance retrieved successfully.", data = row });
        }
        catch (MySqlException) { return DbError(); }
    }

    // POST: api/v1/faculty-attendance
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FacultyAttendanceCreateRequest request)
    {
        if (!await _context.Faculties.AnyAsync(x => x.FacultyId == request.FacultyId && x.DeletedAt == null))
            return BadRequest(new { success = false, message = "Faculty not found." });

        var date = (request.AttendanceDate ?? DateTime.Now).Date;
        const string duplicateSql = "SELECT COUNT(*) FROM faculty_attendance WHERE faculty_id = @facultyId AND attendance_date = @date;";
        const string insertSql = @"
INSERT INTO faculty_attendance
(faculty_id, attendance_date, status, remarks, created_at, created_by)
VALUES (@facultyId, @date, @status, @remarks, UTC_TIMESTAMP(), @createdBy);
SELECT LAST_INSERT_ID();";
        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            var exists = await connection.ExecuteScalarAsync<long>(duplicateSql, new { facultyId = request.FacultyId, date });
            if (exists > 0) return Conflict(new { success = false, message = "Attendance already exists for this faculty and date." });
            var id = await connection.ExecuteScalarAsync<long>(insertSql, new { facultyId = request.FacultyId, date, status = request.Status, request.Remarks, createdBy = CurrentUserId() });
            return CreatedAtAction(nameof(GetById), new { attendanceId = id }, new { success = true, message = "Faculty attendance created successfully.", data = new { attendanceId = id } });
        }
        catch (MySqlException) { return DbError(); }
    }

    // POST: api/v1/faculty-attendance/{attendanceId}/check-in
    [HttpPost("{attendanceId:long}/check-in")]
    public Task<IActionResult> CheckIn(long attendanceId, [FromBody] FacultyAttendanceCheckInRequest? request)
        => SetCheckTime(attendanceId, request?.CheckIn ?? DateTime.Now, true);

    // POST: api/v1/faculty-attendance/{attendanceId}/check-out
    [HttpPost("{attendanceId:long}/check-out")]
    public Task<IActionResult> CheckOut(long attendanceId, [FromBody] FacultyAttendanceCheckOutRequest? request)
        => SetCheckTime(attendanceId, request?.CheckOut ?? DateTime.Now, false);

    private async Task<IActionResult> SetCheckTime(long attendanceId, DateTime value, bool checkIn)
    {
        if (attendanceId <= 0) return BadRequest(new { success = false, message = "Invalid attendance ID." });
        var sql = checkIn
            ? "UPDATE faculty_attendance SET check_in = @value, status = CASE WHEN status IS NULL OR status = '' THEN 'PRESENT' ELSE status END, updated_at = UTC_TIMESTAMP(), updated_by = @updatedBy WHERE attendance_id = @attendanceId;"
            : "UPDATE faculty_attendance SET check_out = @value, updated_at = UTC_TIMESTAMP(), updated_by = @updatedBy WHERE attendance_id = @attendanceId;";
        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            var affected = await connection.ExecuteAsync(sql, new { attendanceId, value, updatedBy = CurrentUserId() });
            if (affected == 0) return NotFound(new { success = false, message = "Attendance record not found." });
            return Ok(new { success = true, message = checkIn ? "Faculty check-in recorded successfully." : "Faculty check-out recorded successfully." });
        }
        catch (MySqlException) { return DbError(); }
    }
    // PUT: api/v1/faculty-attendance/{attendanceId}
    [HttpPut("{attendanceId:long}")]
    public async Task<IActionResult> Update(
        long attendanceId,
        [FromBody] FacultyAttendanceUpdateRequest request)
    {
        if (attendanceId <= 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid attendance ID."
            });
        }

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            // Check attendance record exists
            const string checkSql = @"
SELECT attendance_id
FROM faculty_attendance
WHERE attendance_id = @AttendanceId
LIMIT 1;";

            var existingId = await connection.QueryFirstOrDefaultAsync<long?>(
                checkSql,
                new
                {
                    AttendanceId = attendanceId
                });

            if (existingId == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Attendance record not found."
                });
            }

            // Update record
            const string updateSql = @"
UPDATE faculty_attendance
SET
    attendance_date = COALESCE(@AttendanceDate, attendance_date),
    status = COALESCE(@Status, status),
    check_in = COALESCE(@CheckIn, check_in),
    check_out = COALESCE(@CheckOut, check_out),
    remarks = COALESCE(@Remarks, remarks),
    updated_at = UTC_TIMESTAMP(),
    updated_by = @UpdatedBy
WHERE attendance_id = @AttendanceId;";

            var parameters = new
            {
                AttendanceId = attendanceId,
                AttendanceDate = request.AttendanceDate,
                Status = request.Status,
                CheckIn = request.CheckIn,
                CheckOut = request.CheckOut,
                Remarks = request.Remarks,
                UpdatedBy = CurrentUserId()
            };

            var affected = await connection.ExecuteAsync(
                updateSql,
                parameters);

            if (affected == 0)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Attendance record not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Faculty attendance updated successfully.",
                data = new
                {
                    attendanceId = attendanceId
                }
            });
        }
        catch (MySqlException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Unable to update faculty attendance.",
                error = ex.Message
            });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Unexpected error while updating faculty attendance.",
                error = ex.Message
            });
        }
    }

    // GET: api/v1/faculty-attendance/reports
    [HttpGet("reports")]
    public async Task<IActionResult> Reports([FromQuery] long? facultyId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        const string sql = @"
SELECT faculty_id,
       COUNT(*) AS total_days,
       SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present_days,
       SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_days,
       SUM(CASE WHEN status = 'LEAVE' THEN 1 ELSE 0 END) AS leave_days,
       ROUND(100.0 * SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2) AS attendance_percentage
FROM faculty_attendance
WHERE (@facultyId IS NULL OR faculty_id = @facultyId)
  AND (@fromDate IS NULL OR attendance_date >= @fromDate)
  AND (@toDate IS NULL OR attendance_date <= @toDate)
GROUP BY faculty_id
ORDER BY faculty_id;";
        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            var rows = await connection.QueryAsync(sql, new { facultyId, fromDate, toDate });
            return Ok(new { success = true, message = "Faculty attendance reports retrieved successfully.", data = rows });
        }
        catch (MySqlException) { return DbError(); }
    }

    // GET: api/v1/faculty-attendance/export
    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] long? facultyId,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        const string sql = @"
SELECT
    attendance_id AS AttendanceId,
    faculty_id AS FacultyId,
    attendance_date AS AttendanceDate,
    status AS Status,
    check_in AS CheckIn,
    check_out AS CheckOut,
    remarks AS Remarks
FROM faculty_attendance
WHERE (@facultyId IS NULL OR faculty_id = @facultyId)
  AND (@fromDate IS NULL OR attendance_date >= @fromDate)
  AND (@toDate IS NULL OR attendance_date <= @toDate)
ORDER BY attendance_date DESC, attendance_id DESC;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var rows = (await connection.QueryAsync<FacultyAttendanceExportRow>(
                sql,
                new
                {
                    facultyId,
                    fromDate,
                    toDate
                })).ToList();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Faculty Attendance");

            // Header
            worksheet.Cell(1, 1).Value = "attendance_id";
            worksheet.Cell(1, 2).Value = "faculty_id";
            worksheet.Cell(1, 3).Value = "attendance_date";
            worksheet.Cell(1, 4).Value = "status";
            worksheet.Cell(1, 5).Value = "check_in";
            worksheet.Cell(1, 6).Value = "check_out";
            worksheet.Cell(1, 7).Value = "remarks";

            int rowNumber = 2;

            foreach (var row in rows)
            {
                worksheet.Cell(rowNumber, 1).Value = row.AttendanceId;
                worksheet.Cell(rowNumber, 2).Value = row.FacultyId;

                if (row.AttendanceDate.HasValue)
                {
                    worksheet.Cell(rowNumber, 3).Value = row.AttendanceDate.Value;
                    worksheet.Cell(rowNumber, 3).Style.DateFormat.Format = "yyyy-mm-dd";
                }

                worksheet.Cell(rowNumber, 4).Value = row.Status ?? "";

                if (row.CheckIn.HasValue)
                {
                    worksheet.Cell(rowNumber, 5).Value = row.CheckIn.Value;
                    worksheet.Cell(rowNumber, 5).Style.DateFormat.Format = "hh:mm:ss";
                }

                if (row.CheckOut.HasValue)
                {
                    worksheet.Cell(rowNumber, 6).Value = row.CheckOut.Value;
                    worksheet.Cell(rowNumber, 6).Style.DateFormat.Format = "hh:mm:ss";
                }

                worksheet.Cell(rowNumber, 7).Value = row.Remarks ?? "";

                rowNumber++;
            }

            // Header formatting
            worksheet.Range(1, 1, 1, 7).Style.Font.Bold = true;

            // Automatic column width
            worksheet.Columns().AdjustToContents();

            // Minimum widths
            worksheet.Column(1).Width = Math.Max(worksheet.Column(1).Width, 16);
            worksheet.Column(2).Width = Math.Max(worksheet.Column(2).Width, 12);
            worksheet.Column(3).Width = Math.Max(worksheet.Column(3).Width, 18);
            worksheet.Column(4).Width = Math.Max(worksheet.Column(4).Width, 14);
            worksheet.Column(5).Width = Math.Max(worksheet.Column(5).Width, 14);
            worksheet.Column(6).Width = Math.Max(worksheet.Column(6).Width, 14);
            worksheet.Column(7).Width = Math.Max(worksheet.Column(7).Width, 25);

            // Freeze header row
            worksheet.SheetView.FreezeRows(1);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return File(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"faculty-attendance-{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx"
            );
        }
        catch (MySqlException)
        {
            return DbError();
        }
    }

    // Export DTO
    public class FacultyAttendanceExportRow
    {
        public long AttendanceId { get; set; }
        public long FacultyId { get; set; }
        public DateTime? AttendanceDate { get; set; }
        public string? Status { get; set; }
        public DateTime? CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
        public string? Remarks { get; set; }
    }

    private long? CurrentUserId()
    {
        var value = User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value;
        return long.TryParse(value, out var id) ? id : null;
    }

    private IActionResult DbError() => StatusCode(StatusCodes.Status500InternalServerError, new
    {
        success = false,
        message = "Unable to access the existing faculty attendance database table. No database migration was added by this change."
    });
}
