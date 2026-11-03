using System.Security.Cryptography;
using System.Text;
using BTech.Exceptions;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

/// <summary>Serializes exam writes across API instances sharing one MySQL server/database.</summary>
internal static class ExamConflictGuard
{
    internal static async Task<IAsyncDisposable> AcquireAsync(
        MySqlConnection connection, ILogger logger, CancellationToken ct)
    {
        // MySQL named locks are connection scoped (not process scoped). Keep the connection
        // open until after validation and the write; release even when validation/cancellation fails.
        var database = connection.Database.ToLowerInvariant();
        var name = "cms_exam_" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(database)))[..48];
        var acquired = await connection.ExecuteScalarAsync<int?>(new CommandDefinition(
            "SELECT GET_LOCK(@Name, 10);", new { Name = name }, cancellationToken: ct));
        if (acquired != 1)
        {
            logger.LogWarning("Exam write lock unavailable. Database={Database}", database);
            throw new ExamConflictException("exam", "Another exam scheduling request is in progress. Please retry.");
        }
        return new Lease(connection, name, logger);
    }

    private sealed class Lease(MySqlConnection connection, string name, ILogger logger) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            try
            {
                await connection.ExecuteScalarAsync<int?>(new CommandDefinition(
                    "SELECT RELEASE_LOCK(@Name);", new { Name = name }, commandTimeout: 5,
                    cancellationToken: CancellationToken.None));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Unable to release exam write lock; discarding connection.");
                MySqlConnection.ClearPool(connection);
                await connection.CloseAsync();
            }
        }
    }

    internal static async Task ValidateOverlapAsync(MySqlConnection c, long examId,
        long? scheduleId, long? classroomId, long? sectionId, DateTime examDate,
        TimeSpan startTime, TimeSpan endTime, long collegeId, long academicYearId,
        long courseId, long branchId, long semesterId, ILogger logger, CancellationToken ct)
    {
        // Older installations may only have schedule.classroom_id. The supplied October
        // dump additionally has multi-hall allocations; include those when available.
        var hasHallAllocations = await c.ExecuteScalarAsync<int>(new CommandDefinition(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='exam_hall_allocations';",
            cancellationToken: ct)) > 0;
        var allocationHalls = hasHallAllocations
            ? """
                UNION
                SELECT exam_schedule_id, classroom_id FROM exam_hall_allocations
                 WHERE status=1 AND deleted_at IS NULL
                """
            : string.Empty;
        var candidateAllocationHalls = hasHallAllocations
            ? """
                UNION
                SELECT classroom_id FROM exam_hall_allocations
                 WHERE exam_schedule_id=@ScheduleId AND status=1 AND deleted_at IS NULL
                """
            : string.Empty;
        // Only fixed SQL fragments are interpolated; all request values are parameters.
        var sql = $$"""
            WITH reserved_halls AS (
                SELECT exam_schedule_id, classroom_id FROM exam_schedules
                 WHERE classroom_id IS NOT NULL
                {{allocationHalls}}
            ), candidate_halls AS (
                SELECT @ClassroomId AS classroom_id WHERE @ClassroomId IS NOT NULL
                -- A PUT replaces the primary classroom; retain additional allocated halls only.
                {{candidateAllocationHalls}}
            ), overlapping AS (
                SELECT es.exam_schedule_id AS scheduleId, es.exam_id AS examId,
                       CASE WHEN EXISTS (
                           SELECT 1 FROM reserved_halls h
                           INNER JOIN candidate_halls ch ON ch.classroom_id=h.classroom_id
                            WHERE h.exam_schedule_id=es.exam_schedule_id
                       ) THEN 'classroomId' ELSE 'sectionId' END AS field
                  FROM exam_schedules es
                  INNER JOIN exams ex ON ex.exam_id=es.exam_id
                 WHERE es.status=1 AND es.deleted_at IS NULL
                   AND ex.deleted_at IS NULL AND (ex.status=1 OR ex.exam_id=@ExamId)
                   AND es.exam_date=@ExamDate
                   AND es.start_time < @EndTime AND es.end_time > @StartTime
                   AND (@ScheduleId IS NULL OR es.exam_schedule_id<>@ScheduleId)
                   AND (
                       EXISTS (
                           SELECT 1 FROM reserved_halls h
                           INNER JOIN candidate_halls ch ON ch.classroom_id=h.classroom_id
                            WHERE h.exam_schedule_id=es.exam_schedule_id
                       )
                       OR (
                           ex.college_id=@CollegeId AND ex.academic_year_id=@AcademicYearId
                           AND ex.course_id=@CourseId AND ex.branch_id=@BranchId AND ex.semester_id=@SemesterId
                           AND (@SectionId IS NULL OR es.section_id IS NULL OR es.section_id=@SectionId)
                       )
                   )
            )
            SELECT scheduleId, examId, field FROM overlapping
             ORDER BY CASE WHEN field='classroomId' THEN 0 ELSE 1 END, scheduleId
             LIMIT 1;
            """;
        var conflict = await c.QuerySingleOrDefaultAsync<Overlap>(new CommandDefinition(sql, new
        {
            ExamId = examId, ScheduleId = scheduleId, ClassroomId = classroomId,
            SectionId = sectionId, ExamDate = examDate.Date, StartTime = startTime, EndTime = endTime,
            CollegeId = collegeId, AcademicYearId = academicYearId, CourseId = courseId,
            BranchId = branchId, SemesterId = semesterId
        }, cancellationToken: ct));
        if (conflict is null) return;
        logger.LogWarning("Exam time conflict. ExamId={ExamId}, ScheduleId={ScheduleId}, ConflictingExamId={ConflictingExamId}, ConflictingScheduleId={ConflictingScheduleId}, Field={Field}, Date={Date}, Start={Start}, End={End}",
            examId, scheduleId, conflict.ExamId, conflict.ScheduleId, conflict.Field, examDate.Date, startTime, endTime);
        var message = conflict.Field == "classroomId"
            ? $"Hall/classroom is already booked by exam {conflict.ExamId}, schedule {conflict.ScheduleId}, during this time."
            : $"Students in this section/academic cohort already have exam {conflict.ExamId}, schedule {conflict.ScheduleId}, during this time. A schedule without sectionId applies to every section in that cohort.";
        throw new ExamConflictException(conflict.Field, message);
    }

    private sealed class Overlap
    {
        public long ScheduleId { get; set; }
        public long ExamId { get; set; }
        public string Field { get; set; } = string.Empty;
    }
}
