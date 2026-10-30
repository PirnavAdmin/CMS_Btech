using System.Security.Claims;
using BTech.DTOs.Exams;
using BTech.Exceptions;
using BTech.Repositories.Implementations;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

/// <summary>
/// Additive API for the schedule read views and exam-hall allocation task.
/// Existing ExamsController schedule routes are intentionally untouched.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/exam-schedules")]
public sealed class ExamSchedulesViewsController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ExamSchedulesViewsController> _logger;

    public ExamSchedulesViewsController(
        IConfiguration configuration,
        ILogger<ExamSchedulesViewsController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private string ConnectionString => _configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection is not configured.");

    private long CollegeId
    {
        get
        {
            var value = User.FindFirstValue("collegeId")
                        ?? User.FindFirstValue("college_id");
            if (!long.TryParse(value, out var collegeId) || collegeId <= 0)
                throw new InvalidOperationException("A valid collegeId claim is required.");
            return collegeId;
        }
    }

    private long? ActorId
    {
        get
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub")
                        ?? User.FindFirstValue("user_id");
            return long.TryParse(value, out var id) && id > 0 ? id : null;
        }
    }

    // ---------------------------------------------------------------------
    // SCHEDULE VIEWS
    // ---------------------------------------------------------------------

    [HttpGet("views")]
    public async Task<IActionResult> GetScheduleView(
        [FromQuery] long? examId = null,
        [FromQuery] long? examScheduleId = null,
        [FromQuery] DateTime? examDate = null)
    {
        await using var connection = await OpenConnectionAsync();
        const string sql = """
            SELECT *
            FROM vw_exam_schedule_details
            WHERE college_id = @CollegeId
              AND (@ExamId IS NULL OR exam_id = @ExamId)
              AND (@ExamScheduleId IS NULL OR exam_schedule_id = @ExamScheduleId)
              AND (@ExamDate IS NULL OR exam_date = @ExamDate)
            ORDER BY exam_date, start_time, exam_schedule_id;
            """;

        var rows = (await connection.QueryAsync(sql, new
        {
            CollegeId,
            ExamId = examId,
            ExamScheduleId = examScheduleId,
            ExamDate = examDate?.Date
        })).ToList();

        return Ok(new { success = true, message = "Exam schedule view retrieved successfully.", data = rows, count = rows.Count });
    }

    [HttpGet("views/hall-summary")]
    public async Task<IActionResult> GetHallSummary(
        [FromQuery] long? examId = null,
        [FromQuery] DateTime? examDate = null)
    {
        await using var connection = await OpenConnectionAsync();
        const string sql = """
            SELECT *
            FROM vw_exam_schedule_hall_summary
            WHERE college_id = @CollegeId
              AND (@ExamId IS NULL OR exam_id = @ExamId)
              AND (@ExamDate IS NULL OR exam_date = @ExamDate)
            ORDER BY exam_date, start_time, exam_schedule_id;
            """;

        var rows = (await connection.QueryAsync(sql, new
        {
            CollegeId,
            ExamId = examId,
            ExamDate = examDate?.Date
        })).ToList();

        return Ok(new { success = true, message = "Exam schedule hall summary retrieved successfully.", data = rows, count = rows.Count });
    }

    // ---------------------------------------------------------------------
    // EXAM HALL ALLOCATION
    // ---------------------------------------------------------------------

    [HttpGet("hall-allocations")]
    public async Task<IActionResult> GetHallAllocations(
        [FromQuery] long? examScheduleId = null,
        [FromQuery] long? classroomId = null)
    {
        await using var connection = await OpenConnectionAsync();
        const string sql = """
            SELECT *
            FROM vw_exam_hall_allocation_details
            WHERE college_id = @CollegeId
              AND (@ExamScheduleId IS NULL OR exam_schedule_id = @ExamScheduleId)
              AND (@ClassroomId IS NULL OR classroom_id = @ClassroomId)
            ORDER BY exam_date, start_time, exam_hall_allocation_id;
            """;

        var rows = (await connection.QueryAsync(sql, new
        {
            CollegeId,
            ExamScheduleId = examScheduleId,
            ClassroomId = classroomId
        })).ToList();

        return Ok(new { success = true, message = "Exam hall allocations retrieved successfully.", data = rows, count = rows.Count });
    }

    [HttpGet("hall-allocations/{allocationId:long}")]
    public async Task<IActionResult> GetHallAllocation(long allocationId)
    {
        if (allocationId <= 0) return BadRequest(new { success = false, message = "allocationId must be greater than zero." });

        await using var connection = await OpenConnectionAsync();
        var row = await connection.QuerySingleOrDefaultAsync("""
            SELECT *
            FROM vw_exam_hall_allocation_details
            WHERE college_id = @CollegeId
              AND exam_hall_allocation_id = @AllocationId;
            """, new { CollegeId, AllocationId = allocationId });

        return row is null
            ? NotFound(new { success = false, message = "Exam hall allocation not found." })
            : Ok(new { success = true, message = "Exam hall allocation retrieved successfully.", data = row });
    }

    [HttpPost("hall-allocations")]
    public async Task<IActionResult> CreateHallAllocation([FromBody] ExamHallAllocationWriteRequest request)
    {
        if (request.ExamScheduleId <= 0 || request.ClassroomId <= 0)
            return BadRequest(new { success = false, message = "A valid examScheduleId and classroomId are required." });

        if (request.SeatStartNumber.HasValue != request.SeatEndNumber.HasValue)
            return BadRequest(new { success = false, message = "seatStartNumber and seatEndNumber must be supplied together." });

        if (request.SeatStartNumber.HasValue && request.SeatEndNumber < request.SeatStartNumber)
            return BadRequest(new { success = false, message = "seatEndNumber must be greater than or equal to seatStartNumber." });

        await using var connection = await OpenConnectionAsync();
        await using var conflictLease = await AcquireConflictLeaseAsync(connection);
        if (conflictLease is null)
            return Conflict(new { success = false, message = "Another exam scheduling request is in progress. Please retry." });
        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            await ValidateScheduleAndClassroomAsync(connection, transaction, request.ExamScheduleId, request.ClassroomId);
            await ValidateAllocationCapacityAsync(connection, transaction, request.ExamScheduleId, request.ClassroomId,
                request.AllocatedStudents, null);
            if (request.Status ?? true)
                await ValidateHallOverlapAsync(connection, transaction, request.ExamScheduleId, request.ClassroomId);

            var id = await connection.ExecuteScalarAsync<long>("""
                INSERT INTO exam_hall_allocations
                (exam_schedule_id, classroom_id, allocated_students, seat_start_number,
                 seat_end_number, status, created_by, updated_by)
                VALUES
                (@ExamScheduleId, @ClassroomId, @AllocatedStudents, @SeatStartNumber,
                 @SeatEndNumber, @Status, @ActorId, @ActorId);
                SELECT LAST_INSERT_ID();
                """, new
            {
                request.ExamScheduleId,
                request.ClassroomId,
                request.AllocatedStudents,
                request.SeatStartNumber,
                request.SeatEndNumber,
                Status = request.Status ?? true,
                ActorId
            }, transaction);

            await transaction.CommitAsync();
            _logger.LogInformation("Exam hall allocation created. AllocationId={AllocationId}, ScheduleId={ScheduleId}, ClassroomId={ClassroomId}, CollegeId={CollegeId}, ActorId={ActorId}",
                id, request.ExamScheduleId, request.ClassroomId, CollegeId, ActorId);

            return CreatedAtAction(nameof(GetHallAllocation), new { allocationId = id },
                new { success = true, message = "Exam hall allocation created successfully.", examHallAllocationId = id });
        }
        catch (ExamConflictException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogWarning("Exam hall allocation conflict. Message={Message}, CorrelationId={CorrelationId}",
                ex.Message, HttpContext.TraceIdentifier);
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            await transaction.RollbackAsync();
            return Conflict(new { success = false, message = "This classroom is already allocated to the selected exam schedule." });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpPut("hall-allocations/{allocationId:long}")]
    public async Task<IActionResult> UpdateHallAllocation(long allocationId, [FromBody] ExamHallAllocationWriteRequest request)
    {
        if (allocationId <= 0) return BadRequest(new { success = false, message = "allocationId must be greater than zero." });
        if (request.ExamScheduleId <= 0 || request.ClassroomId <= 0)
            return BadRequest(new { success = false, message = "A valid examScheduleId and classroomId are required." });
        if (request.SeatStartNumber.HasValue != request.SeatEndNumber.HasValue)
            return BadRequest(new { success = false, message = "seatStartNumber and seatEndNumber must be supplied together." });
        if (request.SeatStartNumber.HasValue && request.SeatEndNumber < request.SeatStartNumber)
            return BadRequest(new { success = false, message = "seatEndNumber must be greater than or equal to seatStartNumber." });

        await using var connection = await OpenConnectionAsync();
        await using var conflictLease = await AcquireConflictLeaseAsync(connection);
        if (conflictLease is null)
            return Conflict(new { success = false, message = "Another exam scheduling request is in progress. Please retry." });
        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            var owned = await connection.ExecuteScalarAsync<long?>("""
                SELECT eha.exam_hall_allocation_id
                FROM exam_hall_allocations eha
                JOIN exam_schedules es ON es.exam_schedule_id = eha.exam_schedule_id
                JOIN exams e ON e.exam_id = es.exam_id
                WHERE eha.exam_hall_allocation_id = @AllocationId
                  AND e.college_id = @CollegeId
                  AND eha.deleted_at IS NULL
                LIMIT 1;
                """, new { AllocationId = allocationId, CollegeId }, transaction);

            if (!owned.HasValue)
            {
                await transaction.RollbackAsync();
                return NotFound(new { success = false, message = "Exam hall allocation not found." });
            }

            await ValidateScheduleAndClassroomAsync(connection, transaction, request.ExamScheduleId, request.ClassroomId);
            await ValidateAllocationCapacityAsync(connection, transaction, request.ExamScheduleId, request.ClassroomId,
                request.AllocatedStudents, allocationId);
            if (request.Status ?? true)
                await ValidateHallOverlapAsync(connection, transaction, request.ExamScheduleId, request.ClassroomId);

            await connection.ExecuteAsync("""
                UPDATE exam_hall_allocations
                SET exam_schedule_id = @ExamScheduleId,
                    classroom_id = @ClassroomId,
                    allocated_students = @AllocatedStudents,
                    seat_start_number = @SeatStartNumber,
                    seat_end_number = @SeatEndNumber,
                    status = @Status,
                    updated_by = @ActorId,
                    updated_at = CURRENT_TIMESTAMP
                WHERE exam_hall_allocation_id = @AllocationId
                  AND deleted_at IS NULL;
                """, new
            {
                AllocationId = allocationId,
                request.ExamScheduleId,
                request.ClassroomId,
                request.AllocatedStudents,
                request.SeatStartNumber,
                request.SeatEndNumber,
                Status = request.Status ?? true,
                ActorId
            }, transaction);

            await transaction.CommitAsync();
            return Ok(new { success = true, message = "Exam hall allocation updated successfully.", examHallAllocationId = allocationId });
        }
        catch (ExamConflictException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogWarning("Exam hall allocation conflict. Message={Message}, CorrelationId={CorrelationId}",
                ex.Message, HttpContext.TraceIdentifier);
            return Conflict(new { success = false, message = ex.Message });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            await transaction.RollbackAsync();
            return Conflict(new { success = false, message = "This classroom is already allocated to the selected exam schedule." });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpDelete("hall-allocations/{allocationId:long}")]
    public async Task<IActionResult> DeleteHallAllocation(long allocationId)
    {
        if (allocationId <= 0) return BadRequest(new { success = false, message = "allocationId must be greater than zero." });

        await using var connection = await OpenConnectionAsync();
        await using var conflictLease = await AcquireConflictLeaseAsync(connection);
        if (conflictLease is null)
            return Conflict(new { success = false, message = "Another exam scheduling request is in progress. Please retry." });
        var affected = await connection.ExecuteAsync("""
            UPDATE exam_hall_allocations eha
            JOIN exam_schedules es ON es.exam_schedule_id = eha.exam_schedule_id
            JOIN exams e ON e.exam_id = es.exam_id
            SET eha.deleted_at = CURRENT_TIMESTAMP,
                eha.deleted_by = @ActorId,
                eha.status = 0,
                eha.updated_at = CURRENT_TIMESTAMP,
                eha.updated_by = @ActorId
            WHERE eha.exam_hall_allocation_id = @AllocationId
              AND e.college_id = @CollegeId
              AND eha.deleted_at IS NULL;
            """, new { AllocationId = allocationId, CollegeId, ActorId });

        return affected == 0
            ? NotFound(new { success = false, message = "Exam hall allocation not found." })
            : Ok(new { success = true, message = "Exam hall allocation deleted successfully.", examHallAllocationId = allocationId });
    }

    private async Task ValidateScheduleAndClassroomAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long scheduleId,
        long classroomId)
    {
        var schedule = await connection.QuerySingleOrDefaultAsync<(long ExamId, long CollegeId, long? SectionId, DateTime ExamDate, TimeSpan StartTime, TimeSpan EndTime)>("""
            SELECT es.exam_id AS ExamId,
                   e.college_id AS CollegeId,
                   es.section_id AS SectionId,
                   es.exam_date AS ExamDate,
                   es.start_time AS StartTime,
                   es.end_time AS EndTime
            FROM exam_schedules es
            JOIN exams e ON e.exam_id = es.exam_id
            WHERE es.exam_schedule_id = @ScheduleId
              AND es.status = 1
              AND es.deleted_at IS NULL
              AND e.status = 1
              AND e.deleted_at IS NULL
              AND e.college_id = @CollegeId;
            """, new { ScheduleId = scheduleId, CollegeId }, transaction);

        if (schedule.ExamId == 0)
            throw new InvalidOperationException("Active exam schedule was not found for this college.");

        var room = await connection.QuerySingleOrDefaultAsync<(long ClassroomId, long CollegeId, int? Capacity)>("""
            SELECT classroom_id AS ClassroomId,
                   college_id AS CollegeId,
                   capacity AS Capacity
            FROM classrooms
            WHERE classroom_id = @ClassroomId
              AND college_id = @CollegeId
              AND status = 1
              AND deleted_at IS NULL;
            """, new { ClassroomId = classroomId, CollegeId }, transaction);

        if (room.ClassroomId == 0)
            throw new InvalidOperationException("Active classroom was not found for this college.");
    }

    private async Task ValidateAllocationCapacityAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long scheduleId,
        long classroomId,
        int allocatedStudents,
        long? currentAllocationId)
    {
        if (allocatedStudents < 0)
            throw new ArgumentException("allocatedStudents cannot be negative.");

        var capacity = await connection.ExecuteScalarAsync<int?>("""
            SELECT capacity
            FROM classrooms
            WHERE classroom_id = @ClassroomId
              AND college_id = @CollegeId
              AND status = 1
              AND deleted_at IS NULL;
            """, new { ClassroomId = classroomId, CollegeId }, transaction);

        if (capacity.HasValue && allocatedStudents > capacity.Value)
            throw new InvalidOperationException($"Allocated students ({allocatedStudents}) cannot exceed classroom capacity ({capacity.Value}).");

        var sectionCapacity = await connection.ExecuteScalarAsync<int?>("""
            SELECT sec.capacity
            FROM exam_schedules es
            LEFT JOIN sections sec ON sec.section_id = es.section_id
            WHERE es.exam_schedule_id = @ScheduleId;
            """, new { ScheduleId = scheduleId }, transaction);

        var existing = await connection.ExecuteScalarAsync<int>("""
            SELECT COALESCE(SUM(allocated_students), 0)
            FROM exam_hall_allocations
            WHERE exam_schedule_id = @ScheduleId
              AND status = 1
              AND deleted_at IS NULL
              AND (@CurrentAllocationId IS NULL OR exam_hall_allocation_id <> @CurrentAllocationId);
            """, new { ScheduleId = scheduleId, CurrentAllocationId = currentAllocationId }, transaction);

        if (sectionCapacity.HasValue && existing + allocatedStudents > sectionCapacity.Value)
            throw new InvalidOperationException($"Total allocated students ({existing + allocatedStudents}) cannot exceed the section capacity ({sectionCapacity.Value}).");
    }

    private async Task ValidateHallOverlapAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long scheduleId,
        long classroomId)
    {
        var conflict = await connection.ExecuteScalarAsync<long?>("""
            SELECT other_es.exam_schedule_id
            FROM exam_schedules other_es
            JOIN exams other_e ON other_e.exam_id = other_es.exam_id
            JOIN exam_schedules target_es ON target_es.exam_schedule_id = @ScheduleId
            WHERE other_es.exam_schedule_id <> @ScheduleId
              AND other_es.status = 1 AND other_es.deleted_at IS NULL
              AND other_e.status = 1 AND other_e.deleted_at IS NULL
              AND other_es.exam_date = target_es.exam_date
              AND other_es.start_time < target_es.end_time
              AND other_es.end_time > target_es.start_time
              AND (
                  other_es.classroom_id = @ClassroomId
                  OR EXISTS (
                      SELECT 1 FROM exam_hall_allocations eha
                      WHERE eha.exam_schedule_id = other_es.exam_schedule_id
                        AND eha.classroom_id = @ClassroomId
                        AND eha.status = 1 AND eha.deleted_at IS NULL
                  )
              )
            ORDER BY other_es.exam_schedule_id
            LIMIT 1;
            """, new { ScheduleId = scheduleId, ClassroomId = classroomId }, transaction);

        if (conflict.HasValue)
            throw new ExamConflictException("classroomId",
                $"The selected classroom is already booked by overlapping exam schedule {conflict.Value}.");
    }

    private async Task<IAsyncDisposable?> AcquireConflictLeaseAsync(MySqlConnection connection)
    {
        try
        {
            return await ExamConflictGuard.AcquireAsync(connection, _logger, HttpContext.RequestAborted);
        }
        catch (ExamConflictException ex)
        {
            _logger.LogWarning("Exam hall allocation lock unavailable. Message={Message}, CorrelationId={CorrelationId}",
                ex.Message, HttpContext.TraceIdentifier);
            return null;
        }
    }

    private async Task<MySqlConnection> OpenConnectionAsync()
    {
        var connection = new MySqlConnection(ConnectionString);
        await connection.OpenAsync(HttpContext.RequestAborted);
        return connection;
    }
}
