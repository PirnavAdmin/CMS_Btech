using System.Data;
using System.Globalization;
using BTech.DTOs.Exams;
using BTech.Exceptions;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class ExamManagementRepository
{
    private readonly string _connectionString;
    private readonly ILogger<ExamManagementRepository> _logger;

    public ExamManagementRepository(IConfiguration configuration, ILogger<ExamManagementRepository> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Database connection is missing.");
        _logger = logger;
    }

    private MySqlConnection Connection() => new(_connectionString);
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static byte Status(bool? value, byte defaultValue = 1) => value.HasValue ? (byte)(value.Value ? 1 : 0) : defaultValue;
    private static Dictionary<string, object?> Row(object value) =>
        ((IDictionary<string, object>)value).ToDictionary(x => x.Key, x => (object?)x.Value);

    // ---------------------------------------------------------------------
    // EXAM TYPES
    // ---------------------------------------------------------------------
    public async Task<List<Dictionary<string, object?>>> ListTypesAsync(ExamTypeSearchRequest request, long? examTypeId, CancellationToken ct)
    {
        const string sql = """
            SELECT
                et.exam_type_id AS examTypeId,
                et.college_id AS collegeId,
                c.college_name AS collegeName,
                et.type_code AS code,
                et.type_name AS name,
                et.description,
                et.default_duration_minutes AS defaultDurationMinutes,
                et.status AS statusValue,
                CASE WHEN et.status = 1 THEN 'Active' ELSE 'Inactive' END AS status,
                et.created_at AS createdAt,
                et.created_by AS createdBy,
                et.updated_at AS updatedAt,
                et.updated_by AS updatedBy,
                (SELECT COUNT(*) FROM exams e
                  WHERE e.exam_type_id = et.exam_type_id AND e.deleted_at IS NULL) AS examCount
            FROM exam_types et
            INNER JOIN colleges c ON c.college_id = et.college_id
            WHERE et.deleted_at IS NULL
              AND (@ExamTypeId IS NULL OR et.exam_type_id = @ExamTypeId)
              AND (@CollegeId IS NULL OR et.college_id = @CollegeId)
              AND (@Status IS NULL OR et.status = @Status)
              AND (@Search IS NULL OR et.type_code LIKE CONCAT('%', @Search, '%')
                                  OR et.type_name LIKE CONCAT('%', @Search, '%'))
            ORDER BY et.type_name, et.exam_type_id;
            """;

        await using var c = Connection();
        var rows = await c.QueryAsync(new CommandDefinition(sql, new
        {
            ExamTypeId = examTypeId,
            request.CollegeId,
            Status = request.Status.HasValue ? (byte?)(request.Status.Value ? 1 : 0) : null,
            Search = Clean(request.Search)
        }, cancellationToken: ct));
        return rows.Select(x => Row((object)x)).ToList();
    }

    public async Task<long> CreateTypeAsync(ExamTypeWriteRequest request, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await ValidateCollegeAsync(c, request.CollegeId, ct);
        await ValidateTypeCodeAsync(c, request.CollegeId, request.NormalizedCode, null, ct);

        const string sql = """
            INSERT INTO exam_types
                (college_id, type_code, type_name, description, default_duration_minutes,
                 status, created_at, created_by, updated_at, updated_by)
            VALUES
                (@CollegeId, @Code, @Name, @Description, @DefaultDurationMinutes,
                 @Status, UTC_TIMESTAMP(), @Actor, UTC_TIMESTAMP(), @Actor);
            SELECT LAST_INSERT_ID();
            """;

        var id = await c.ExecuteScalarAsync<long>(new CommandDefinition(sql, new
        {
            request.CollegeId,
            Code = request.NormalizedCode,
            Name = request.NormalizedName,
            Description = request.NormalizedDescription,
            request.DefaultDurationMinutes,
            Status = Status(request.Status),
            Actor = actor
        }, cancellationToken: ct));

        _logger.LogInformation("Exam type created. ExamTypeId={ExamTypeId}, Code={Code}, CollegeId={CollegeId}, Actor={Actor}",
            id, request.NormalizedCode, request.CollegeId, actor);
        return id;
    }

    public async Task UpdateTypeAsync(long examTypeId, ExamTypeWriteRequest request, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await EnsureTypeExistsAsync(c, examTypeId, ct);
        var currentCollegeId = await c.ExecuteScalarAsync<long>(new CommandDefinition(
            "SELECT college_id FROM exam_types WHERE exam_type_id=@ExamTypeId AND deleted_at IS NULL;",
            new { ExamTypeId = examTypeId }, cancellationToken: ct));
        if (currentCollegeId != request.CollegeId)
        {
            var usageCount = await c.ExecuteScalarAsync<long>(new CommandDefinition(
                "SELECT COUNT(*) FROM exams WHERE exam_type_id=@ExamTypeId AND deleted_at IS NULL;",
                new { ExamTypeId = examTypeId }, cancellationToken: ct));
            if (usageCount > 0)
                throw new ExamConflictException("collegeId", "Cannot move an exam type to another college while exams are using it.");
        }
        await ValidateCollegeAsync(c, request.CollegeId, ct);
        await ValidateTypeCodeAsync(c, request.CollegeId, request.NormalizedCode, examTypeId, ct);

        const string sql = """
            UPDATE exam_types
               SET college_id = @CollegeId,
                   type_code = @Code,
                   type_name = @Name,
                   description = @Description,
                   default_duration_minutes = @DefaultDurationMinutes,
                   status = COALESCE(@Status, status),
                   updated_at = UTC_TIMESTAMP(),
                   updated_by = @Actor
             WHERE exam_type_id = @ExamTypeId AND deleted_at IS NULL;
            """;

        await c.ExecuteAsync(new CommandDefinition(sql, new
        {
            ExamTypeId = examTypeId,
            request.CollegeId,
            Code = request.NormalizedCode,
            Name = request.NormalizedName,
            Description = request.NormalizedDescription,
            request.DefaultDurationMinutes,
            Status = request.Status.HasValue ? (byte?)(request.Status.Value ? 1 : 0) : null,
            Actor = actor
        }, cancellationToken: ct));

        _logger.LogInformation("Exam type updated. ExamTypeId={ExamTypeId}, Actor={Actor}", examTypeId, actor);
    }

    public async Task DeleteTypeAsync(long examTypeId, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await EnsureTypeExistsAsync(c, examTypeId, ct);

        var used = await c.ExecuteScalarAsync<long>(new CommandDefinition(
            "SELECT COUNT(*) FROM exams WHERE exam_type_id=@ExamTypeId AND deleted_at IS NULL;",
            new { ExamTypeId = examTypeId }, cancellationToken: ct));
        if (used > 0)
            throw new ExamConflictException("examTypeId", "Exam type is already used by exams and cannot be deleted.");

        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE exam_types
               SET status=0, deleted_at=UTC_TIMESTAMP(), deleted_by=@Actor,
                   updated_at=UTC_TIMESTAMP(), updated_by=@Actor
             WHERE exam_type_id=@ExamTypeId AND deleted_at IS NULL;
            """, new { ExamTypeId = examTypeId, Actor = actor }, cancellationToken: ct));

        _logger.LogInformation("Exam type deleted. ExamTypeId={ExamTypeId}, Actor={Actor}", examTypeId, actor);
    }

    // ---------------------------------------------------------------------
    // EXAMS
    // ---------------------------------------------------------------------
    public async Task<List<Dictionary<string, object?>>> ListExamsAsync(ExamSearchRequest request, long? examId, CancellationToken ct)
    {
        const string sql = """
            SELECT
                e.exam_id AS examId,
                e.college_id AS collegeId,
                c.college_name AS collegeName,
                e.academic_year_id AS academicYearId,
                ay.academic_year_name AS academicYear,
                e.course_id AS courseId,
                co.course_code AS courseCode,
                co.course_name AS courseName,
                e.branch_id AS branchId,
                b.branch_code AS branchCode,
                b.branch_name AS branchName,
                e.semester_id AS semesterId,
                s.semester_number AS semesterNumber,
                s.semester_name AS semesterName,
                e.exam_type_id AS examTypeId,
                et.type_code AS examTypeCode,
                et.type_name AS examTypeName,
                e.exam_code AS examCode,
                e.exam_name AS examName,
                e.description,
                e.start_date AS startDate,
                e.end_date AS endDate,
                e.status AS statusValue,
                CASE WHEN e.status=1 THEN 'Active' ELSE 'Inactive' END AS status,
                e.created_at AS createdAt,
                e.created_by AS createdBy,
                e.updated_at AS updatedAt,
                e.updated_by AS updatedBy,
                (SELECT COUNT(*) FROM exam_schedules es
                  WHERE es.exam_id=e.exam_id AND es.deleted_at IS NULL) AS scheduleCount,
                (SELECT COUNT(*) FROM exam_rules er
                  WHERE er.exam_id=e.exam_id AND er.deleted_at IS NULL) AS ruleCount
            FROM exams e
            INNER JOIN colleges c ON c.college_id=e.college_id
            INNER JOIN academicyears ay ON ay.academic_year_id=e.academic_year_id
            INNER JOIN courses co ON co.course_id=e.course_id
            INNER JOIN branches b ON b.branch_id=e.branch_id
            INNER JOIN semesters s ON s.semester_id=e.semester_id
            INNER JOIN exam_types et ON et.exam_type_id=e.exam_type_id
            WHERE e.deleted_at IS NULL
              AND (@ExamId IS NULL OR e.exam_id=@ExamId)
              AND (@CollegeId IS NULL OR e.college_id=@CollegeId)
              AND (@AcademicYearId IS NULL OR e.academic_year_id=@AcademicYearId)
              AND (@CourseId IS NULL OR e.course_id=@CourseId)
              AND (@BranchId IS NULL OR e.branch_id=@BranchId)
              AND (@SemesterId IS NULL OR e.semester_id=@SemesterId)
              AND (@ExamTypeId IS NULL OR e.exam_type_id=@ExamTypeId)
              AND (@Status IS NULL OR e.status=@Status)
              AND (@Search IS NULL OR e.exam_code LIKE CONCAT('%',@Search,'%')
                                  OR e.exam_name LIKE CONCAT('%',@Search,'%')
                                  OR et.type_name LIKE CONCAT('%',@Search,'%'))
            ORDER BY e.start_date DESC, e.exam_name, e.exam_id DESC;
            """;

        await using var c = Connection();
        var rows = await c.QueryAsync(new CommandDefinition(sql, new
        {
            ExamId = examId,
            request.CollegeId,
            request.AcademicYearId,
            request.CourseId,
            request.BranchId,
            request.SemesterId,
            request.ExamTypeId,
            Status = request.Status.HasValue ? (byte?)(request.Status.Value ? 1 : 0) : null,
            Search = Clean(request.Search)
        }, cancellationToken: ct));
        return rows.Select(x => Row((object)x)).ToList();
    }

    public async Task<long> CreateExamAsync(ExamWriteRequest request, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await using var conflictLease = await ExamConflictGuard.AcquireAsync(c, _logger, ct);
        await ValidateExamRequestAsync(c, request, null, ct);

        const string sql = """
            INSERT INTO exams
                (college_id, academic_year_id, course_id, branch_id, semester_id, exam_type_id,
                 exam_code, exam_name, description, start_date, end_date, status,
                 created_at, created_by, updated_at, updated_by)
            VALUES
                (@CollegeId, @AcademicYearId, @CourseId, @BranchId, @SemesterId, @ExamTypeId,
                 @ExamCode, @ExamName, @Description, @StartDate, @EndDate, @Status,
                 UTC_TIMESTAMP(), @Actor, UTC_TIMESTAMP(), @Actor);
            SELECT LAST_INSERT_ID();
            """;

        var id = await c.ExecuteScalarAsync<long>(new CommandDefinition(sql, new
        {
            request.CollegeId,
            request.AcademicYearId,
            request.CourseId,
            request.BranchId,
            request.SemesterId,
            request.ExamTypeId,
            ExamCode = request.NormalizedCode,
            ExamName = request.NormalizedName,
            Description = request.NormalizedDescription,
            StartDate = request.StartDate.Date,
            EndDate = request.EndDate.Date,
            Status = Status(request.Status),
            Actor = actor
        }, cancellationToken: ct));

        _logger.LogInformation("Exam created. ExamId={ExamId}, ExamCode={ExamCode}, Actor={Actor}", id, request.NormalizedCode, actor);
        return id;
    }

    public async Task UpdateExamAsync(long examId, ExamWriteRequest request, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await using var conflictLease = await ExamConflictGuard.AcquireAsync(c, _logger, ct);
        await EnsureExamExistsAsync(c, examId, ct);

        var current = await c.QuerySingleAsync<dynamic>(new CommandDefinition("""
            SELECT college_id, academic_year_id, course_id, branch_id, semester_id
              FROM exams WHERE exam_id=@ExamId AND deleted_at IS NULL;
            """, new { ExamId = examId }, cancellationToken: ct));
        var scheduleCount = await c.ExecuteScalarAsync<long>(new CommandDefinition(
            "SELECT COUNT(*) FROM exam_schedules WHERE exam_id=@ExamId AND deleted_at IS NULL;",
            new { ExamId = examId }, cancellationToken: ct));
        if (scheduleCount > 0 &&
            (Convert.ToInt64(current.college_id) != request.CollegeId ||
             Convert.ToInt64(current.academic_year_id) != request.AcademicYearId ||
             Convert.ToInt64(current.course_id) != request.CourseId ||
             Convert.ToInt64(current.branch_id) != request.BranchId ||
             Convert.ToInt64(current.semester_id) != request.SemesterId))
        {
            throw new ExamConflictException("examId",
                "Exam academic context cannot be changed after schedules are created. Delete/recreate the schedules first.");
        }

        var outsideDateCount = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM exam_schedules
             WHERE exam_id=@ExamId AND deleted_at IS NULL
               AND (exam_date < @StartDate OR exam_date > @EndDate);
            """, new { ExamId = examId, StartDate = request.StartDate.Date, EndDate = request.EndDate.Date }, cancellationToken: ct));
        if (outsideDateCount > 0)
            throw new ExamConflictException("startDate", "Existing schedules fall outside the requested exam date range.");

        await ValidateExamRequestAsync(c, request, examId, ct);

        var effectiveStatus = request.Status.HasValue ? Status(request.Status)
            : await c.ExecuteScalarAsync<byte>(new CommandDefinition(
                "SELECT status FROM exams WHERE exam_id=@ExamId;",
                new { ExamId = examId }, cancellationToken: ct));
        if (effectiveStatus == 1)
        {
            var schedules = await c.QueryAsync<dynamic>(new CommandDefinition("""
                SELECT exam_schedule_id, classroom_id, section_id, exam_date, start_time, end_time
                  FROM exam_schedules
                 WHERE exam_id=@ExamId AND status=1 AND deleted_at IS NULL;
                """, new { ExamId = examId }, cancellationToken: ct));
            foreach (var schedule in schedules)
            {
                await ExamConflictGuard.ValidateOverlapAsync(c, examId,
                    Convert.ToInt64(schedule.exam_schedule_id),
                    schedule.classroom_id is null ? (long?)null : Convert.ToInt64(schedule.classroom_id),
                    schedule.section_id is null ? (long?)null : Convert.ToInt64(schedule.section_id),
                    Convert.ToDateTime(schedule.exam_date), (TimeSpan)schedule.start_time, (TimeSpan)schedule.end_time,
                    request.CollegeId, request.AcademicYearId, request.CourseId, request.BranchId,
                    request.SemesterId, _logger, ct);
            }
        }

        const string sql = """
            UPDATE exams
               SET college_id=@CollegeId,
                   academic_year_id=@AcademicYearId,
                   course_id=@CourseId,
                   branch_id=@BranchId,
                   semester_id=@SemesterId,
                   exam_type_id=@ExamTypeId,
                   exam_code=@ExamCode,
                   exam_name=@ExamName,
                   description=@Description,
                   start_date=@StartDate,
                   end_date=@EndDate,
                   status=COALESCE(@Status,status),
                   updated_at=UTC_TIMESTAMP(),
                   updated_by=@Actor
             WHERE exam_id=@ExamId AND deleted_at IS NULL;
            """;

        await c.ExecuteAsync(new CommandDefinition(sql, new
        {
            ExamId = examId,
            request.CollegeId,
            request.AcademicYearId,
            request.CourseId,
            request.BranchId,
            request.SemesterId,
            request.ExamTypeId,
            ExamCode = request.NormalizedCode,
            ExamName = request.NormalizedName,
            Description = request.NormalizedDescription,
            StartDate = request.StartDate.Date,
            EndDate = request.EndDate.Date,
            Status = request.Status.HasValue ? (byte?)(request.Status.Value ? 1 : 0) : null,
            Actor = actor
        }, cancellationToken: ct));

        _logger.LogInformation("Exam updated. ExamId={ExamId}, Actor={Actor}", examId, actor);
    }

    public async Task DeleteExamAsync(long examId, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await using var conflictLease = await ExamConflictGuard.AcquireAsync(c, _logger, ct);
        await EnsureExamExistsAsync(c, examId, ct);
        await using var tx = await c.BeginTransactionAsync(ct);

        var args = new { ExamId = examId, Actor = actor };
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE exam_schedules
               SET status=0, deleted_at=COALESCE(deleted_at,UTC_TIMESTAMP()), deleted_by=COALESCE(deleted_by,@Actor),
                   updated_at=UTC_TIMESTAMP(), updated_by=@Actor
             WHERE exam_id=@ExamId AND deleted_at IS NULL;
            """, args, transaction: tx, cancellationToken: ct));
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE exam_rules
               SET status=0, deleted_at=COALESCE(deleted_at,UTC_TIMESTAMP()), deleted_by=COALESCE(deleted_by,@Actor),
                   updated_at=UTC_TIMESTAMP(), updated_by=@Actor
             WHERE exam_id=@ExamId AND deleted_at IS NULL;
            """, args, transaction: tx, cancellationToken: ct));
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE exams
               SET status=0, deleted_at=UTC_TIMESTAMP(), deleted_by=@Actor,
                   updated_at=UTC_TIMESTAMP(), updated_by=@Actor
             WHERE exam_id=@ExamId AND deleted_at IS NULL;
            """, args, transaction: tx, cancellationToken: ct));

        await tx.CommitAsync(ct);
        _logger.LogInformation("Exam soft-deleted with schedules and rules. ExamId={ExamId}, Actor={Actor}", examId, actor);
    }

    // ---------------------------------------------------------------------
    // SCHEDULES
    // ---------------------------------------------------------------------
    public async Task<List<Dictionary<string, object?>>> ListSchedulesAsync(long examId, long? scheduleId, CancellationToken ct)
    {
        const string sql = """
            SELECT
                es.exam_schedule_id AS examScheduleId,
                es.exam_id AS examId,
                es.subject_id AS subjectId,
                sub.subject_code AS subjectCode,
                sub.subject_name AS subjectName,
                es.section_id AS sectionId,
                sec.section_name AS sectionName,
                sec.section_code AS sectionCode,
                es.classroom_id AS classroomId,
                cr.classroom_code AS classroomCode,
                cr.classroom_name AS classroomName,
                es.exam_date AS examDate,
                TIME_FORMAT(es.start_time,'%H:%i:%s') AS startTime,
                TIME_FORMAT(es.end_time,'%H:%i:%s') AS endTime,
                IF(es.reporting_time IS NULL,NULL,TIME_FORMAT(es.reporting_time,'%H:%i:%s')) AS reportingTime,
                es.instructions,
                es.status AS statusValue,
                CASE WHEN es.status=1 THEN 'Active' ELSE 'Inactive' END AS status,
                es.created_at AS createdAt,
                es.updated_at AS updatedAt
            FROM exam_schedules es
            INNER JOIN subjects sub ON sub.subject_id=es.subject_id
            LEFT JOIN sections sec ON sec.section_id=es.section_id
            LEFT JOIN classrooms cr ON cr.classroom_id=es.classroom_id
            WHERE es.exam_id=@ExamId
              AND es.deleted_at IS NULL
              AND (@ScheduleId IS NULL OR es.exam_schedule_id=@ScheduleId)
            ORDER BY es.exam_date, es.start_time, sub.subject_name, sec.section_name;
            """;

        await using var c = Connection();
        await EnsureExamExistsAsync(c, examId, ct);
        var rows = await c.QueryAsync(new CommandDefinition(sql, new { ExamId = examId, ScheduleId = scheduleId }, cancellationToken: ct));
        return rows.Select(x => Row((object)x)).ToList();
    }

    public async Task<long> CreateScheduleAsync(long examId, ExamScheduleWriteRequest request, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await using var conflictLease = await ExamConflictGuard.AcquireAsync(c, _logger, ct);
        var context = await ValidateScheduleAsync(c, examId, request, null, ct);

        const string sql = """
            INSERT INTO exam_schedules
                (exam_id, subject_id, section_id, classroom_id, exam_date, start_time, end_time,
                 reporting_time, instructions, status, created_at, created_by, updated_at, updated_by)
            VALUES
                (@ExamId, @SubjectId, @SectionId, @ClassroomId, @ExamDate, @StartTime, @EndTime,
                 @ReportingTime, @Instructions, @Status, UTC_TIMESTAMP(), @Actor, UTC_TIMESTAMP(), @Actor);
            SELECT LAST_INSERT_ID();
            """;

        var id = await c.ExecuteScalarAsync<long>(new CommandDefinition(sql, new
        {
            ExamId = examId,
            request.SubjectId,
            request.SectionId,
            request.ClassroomId,
            ExamDate = request.ExamDate.Date,
            StartTime = context.StartTime,
            EndTime = context.EndTime,
            ReportingTime = context.ReportingTime,
            Instructions = request.NormalizedInstructions,
            Status = Status(request.Status),
            Actor = actor
        }, cancellationToken: ct));

        _logger.LogInformation("Exam schedule created. ExamId={ExamId}, ScheduleId={ScheduleId}, SubjectId={SubjectId}, Actor={Actor}",
            examId, id, request.SubjectId, actor);
        return id;
    }

    public async Task UpdateScheduleAsync(long examId, long scheduleId, ExamScheduleWriteRequest request, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await using var conflictLease = await ExamConflictGuard.AcquireAsync(c, _logger, ct);
        await EnsureScheduleExistsAsync(c, examId, scheduleId, ct);
        var context = await ValidateScheduleAsync(c, examId, request, scheduleId, ct);

        const string sql = """
            UPDATE exam_schedules
               SET subject_id=@SubjectId,
                   section_id=@SectionId,
                   classroom_id=@ClassroomId,
                   exam_date=@ExamDate,
                   start_time=@StartTime,
                   end_time=@EndTime,
                   reporting_time=@ReportingTime,
                   instructions=@Instructions,
                   status=COALESCE(@Status,status),
                   updated_at=UTC_TIMESTAMP(),
                   updated_by=@Actor
             WHERE exam_schedule_id=@ScheduleId AND exam_id=@ExamId AND deleted_at IS NULL;
            """;

        await c.ExecuteAsync(new CommandDefinition(sql, new
        {
            ExamId = examId,
            ScheduleId = scheduleId,
            request.SubjectId,
            request.SectionId,
            request.ClassroomId,
            ExamDate = request.ExamDate.Date,
            StartTime = context.StartTime,
            EndTime = context.EndTime,
            ReportingTime = context.ReportingTime,
            Instructions = request.NormalizedInstructions,
            Status = request.Status.HasValue ? (byte?)(request.Status.Value ? 1 : 0) : null,
            Actor = actor
        }, cancellationToken: ct));

        _logger.LogInformation("Exam schedule updated. ExamId={ExamId}, ScheduleId={ScheduleId}, Actor={Actor}", examId, scheduleId, actor);
    }

    public async Task DeleteScheduleAsync(long examId, long scheduleId, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await using var conflictLease = await ExamConflictGuard.AcquireAsync(c, _logger, ct);
        await EnsureScheduleExistsAsync(c, examId, scheduleId, ct);
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE exam_schedules
               SET status=0, deleted_at=UTC_TIMESTAMP(), deleted_by=@Actor,
                   updated_at=UTC_TIMESTAMP(), updated_by=@Actor
             WHERE exam_schedule_id=@ScheduleId AND exam_id=@ExamId AND deleted_at IS NULL;
            """, new { ExamId = examId, ScheduleId = scheduleId, Actor = actor }, cancellationToken: ct));
        _logger.LogInformation("Exam schedule deleted. ExamId={ExamId}, ScheduleId={ScheduleId}, Actor={Actor}", examId, scheduleId, actor);
    }

    // ---------------------------------------------------------------------
    // RULES
    // ---------------------------------------------------------------------
    public async Task<List<Dictionary<string, object?>>> ListRulesAsync(long examId, long? ruleId, CancellationToken ct)
    {
        const string sql = """
            SELECT
                er.exam_rule_id AS examRuleId,
                er.exam_id AS examId,
                er.rule_code AS ruleCode,
                er.rule_name AS ruleName,
                er.rule_category AS ruleCategory,
                er.rule_value AS ruleValue,
                er.description,
                er.status AS statusValue,
                CASE WHEN er.status=1 THEN 'Active' ELSE 'Inactive' END AS status,
                er.created_at AS createdAt,
                er.updated_at AS updatedAt
            FROM exam_rules er
            WHERE er.exam_id=@ExamId
              AND er.deleted_at IS NULL
              AND (@RuleId IS NULL OR er.exam_rule_id=@RuleId)
            ORDER BY er.rule_category, er.rule_name, er.exam_rule_id;
            """;

        await using var c = Connection();
        await EnsureExamExistsAsync(c, examId, ct);
        var rows = await c.QueryAsync(new CommandDefinition(sql, new { ExamId = examId, RuleId = ruleId }, cancellationToken: ct));
        return rows.Select(x => Row((object)x)).ToList();
    }

    public async Task<long> CreateRuleAsync(long examId, ExamRuleWriteRequest request, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await EnsureExamExistsAsync(c, examId, ct);
        await ValidateRuleCodeAsync(c, examId, request.NormalizedCode, null, ct);

        const string sql = """
            INSERT INTO exam_rules
                (exam_id, rule_code, rule_name, rule_category, rule_value, description,
                 status, created_at, created_by, updated_at, updated_by)
            VALUES
                (@ExamId, @RuleCode, @RuleName, @RuleCategory, @RuleValue, @Description,
                 @Status, UTC_TIMESTAMP(), @Actor, UTC_TIMESTAMP(), @Actor);
            SELECT LAST_INSERT_ID();
            """;

        var id = await c.ExecuteScalarAsync<long>(new CommandDefinition(sql, new
        {
            ExamId = examId,
            RuleCode = request.NormalizedCode,
            RuleName = request.NormalizedName,
            RuleCategory = request.NormalizedCategory,
            RuleValue = request.NormalizedValue,
            Description = request.NormalizedDescription,
            Status = Status(request.Status),
            Actor = actor
        }, cancellationToken: ct));

        _logger.LogInformation("Exam rule created. ExamId={ExamId}, RuleId={RuleId}, RuleCode={RuleCode}, Actor={Actor}",
            examId, id, request.NormalizedCode, actor);
        return id;
    }

    public async Task UpdateRuleAsync(long examId, long ruleId, ExamRuleWriteRequest request, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await EnsureRuleExistsAsync(c, examId, ruleId, ct);
        await ValidateRuleCodeAsync(c, examId, request.NormalizedCode, ruleId, ct);

        const string sql = """
            UPDATE exam_rules
               SET rule_code=@RuleCode,
                   rule_name=@RuleName,
                   rule_category=@RuleCategory,
                   rule_value=@RuleValue,
                   description=@Description,
                   status=COALESCE(@Status,status),
                   updated_at=UTC_TIMESTAMP(),
                   updated_by=@Actor
             WHERE exam_rule_id=@RuleId AND exam_id=@ExamId AND deleted_at IS NULL;
            """;

        await c.ExecuteAsync(new CommandDefinition(sql, new
        {
            ExamId = examId,
            RuleId = ruleId,
            RuleCode = request.NormalizedCode,
            RuleName = request.NormalizedName,
            RuleCategory = request.NormalizedCategory,
            RuleValue = request.NormalizedValue,
            Description = request.NormalizedDescription,
            Status = request.Status.HasValue ? (byte?)(request.Status.Value ? 1 : 0) : null,
            Actor = actor
        }, cancellationToken: ct));

        _logger.LogInformation("Exam rule updated. ExamId={ExamId}, RuleId={RuleId}, Actor={Actor}", examId, ruleId, actor);
    }

    public async Task DeleteRuleAsync(long examId, long ruleId, long? actor, CancellationToken ct)
    {
        await using var c = Connection();
        await c.OpenAsync(ct);
        await EnsureRuleExistsAsync(c, examId, ruleId, ct);
        await c.ExecuteAsync(new CommandDefinition("""
            UPDATE exam_rules
               SET status=0, deleted_at=UTC_TIMESTAMP(), deleted_by=@Actor,
                   updated_at=UTC_TIMESTAMP(), updated_by=@Actor
             WHERE exam_rule_id=@RuleId AND exam_id=@ExamId AND deleted_at IS NULL;
            """, new { ExamId = examId, RuleId = ruleId, Actor = actor }, cancellationToken: ct));
        _logger.LogInformation("Exam rule deleted. ExamId={ExamId}, RuleId={RuleId}, Actor={Actor}", examId, ruleId, actor);
    }

    // ---------------------------------------------------------------------
    // LOOKUPS
    // ---------------------------------------------------------------------
    public async Task<object> LookupsAsync(long? collegeId, long? academicYearId, long? courseId, long? branchId, long? semesterId, CancellationToken ct)
    {
        const string sql = """
            SELECT exam_type_id AS id, type_code AS code, type_name AS name
              FROM exam_types
             WHERE deleted_at IS NULL AND status=1 AND (@CollegeId IS NULL OR college_id=@CollegeId)
             ORDER BY type_name;

            SELECT academic_year_id AS id, academic_year_name AS name, start_date AS startDate, end_date AS endDate
              FROM academicyears
             WHERE deleted_at IS NULL AND is_archived=0
             ORDER BY start_date DESC;

            SELECT course_id AS id, course_code AS code, course_name AS name
              FROM courses
             WHERE deleted_at IS NULL AND status=1 AND (@CollegeId IS NULL OR college_id=@CollegeId)
             ORDER BY course_name;

            SELECT branch_id AS id, branch_code AS code, branch_name AS name, course_id AS courseId
              FROM branches
             WHERE deleted_at IS NULL AND status=1 AND (@CourseId IS NULL OR course_id=@CourseId)
             ORDER BY branch_name;

            SELECT semester_id AS id, semester_number AS semesterNumber, semester_name AS name,
                   course_id AS courseId, branch_id AS branchId, academic_year_id AS academicYearId
              FROM semesters
             WHERE status=1 AND is_archived=0
               AND (@AcademicYearId IS NULL OR academic_year_id=@AcademicYearId)
               AND (@CourseId IS NULL OR course_id=@CourseId)
               AND (@BranchId IS NULL OR branch_id=@BranchId)
             ORDER BY semester_number, semester_id;

            SELECT DISTINCT sub.subject_id AS id, sub.subject_code AS code, sub.subject_name AS name
              FROM subjects sub
              INNER JOIN subject_semesters ss ON ss.subject_id=sub.subject_id AND ss.status=1
             WHERE sub.deleted_at IS NULL AND sub.status=1
               AND (@CourseId IS NULL OR ss.course_id=@CourseId)
               AND (@BranchId IS NULL OR ss.branch_id=@BranchId)
               AND (@SemesterId IS NULL OR ss.semester_id=@SemesterId)
             ORDER BY sub.subject_name;

            SELECT section_id AS id, section_code AS code, section_name AS name
              FROM sections
             WHERE deleted_at IS NULL AND status=1 AND is_archived=0
               AND (@CollegeId IS NULL OR college_id=@CollegeId)
               AND (@AcademicYearId IS NULL OR academic_year_id=@AcademicYearId)
               AND (@CourseId IS NULL OR course_id=@CourseId)
               AND (@BranchId IS NULL OR branch_id=@BranchId)
               AND (@SemesterId IS NULL OR semester_id=@SemesterId)
             ORDER BY section_name, section_code;

            SELECT classroom_id AS id, classroom_code AS code, classroom_name AS name,
                   capacity, room_type AS roomType, building_block AS buildingBlock, floor_name AS floor
              FROM classrooms
             WHERE deleted_at IS NULL AND status=1 AND (@CollegeId IS NULL OR college_id=@CollegeId)
             ORDER BY classroom_name;
            """;

        await using var c = Connection();
        using var sets = await c.QueryMultipleAsync(new CommandDefinition(sql, new
        {
            CollegeId = collegeId,
            AcademicYearId = academicYearId,
            CourseId = courseId,
            BranchId = branchId,
            SemesterId = semesterId
        }, cancellationToken: ct));

        var types = (await sets.ReadAsync()).Select(x => Row((object)x)).ToList();
        var academicYears = (await sets.ReadAsync()).Select(x => Row((object)x)).ToList();
        var courses = (await sets.ReadAsync()).Select(x => Row((object)x)).ToList();
        var branches = (await sets.ReadAsync()).Select(x => Row((object)x)).ToList();
        var semesters = (await sets.ReadAsync()).Select(x => Row((object)x)).ToList();
        var subjects = (await sets.ReadAsync()).Select(x => Row((object)x)).ToList();
        var sections = (await sets.ReadAsync()).Select(x => Row((object)x)).ToList();
        var classrooms = (await sets.ReadAsync()).Select(x => Row((object)x)).ToList();
        return new { examTypes = types, academicYears, courses, branches, semesters, subjects, sections, classrooms };
    }

    // ---------------------------------------------------------------------
    // VALIDATION HELPERS
    // ---------------------------------------------------------------------
    private static async Task ValidateCollegeAsync(MySqlConnection c, long collegeId, CancellationToken ct)
    {
        var count = await c.ExecuteScalarAsync<long>(new CommandDefinition(
            "SELECT COUNT(*) FROM colleges WHERE college_id=@CollegeId AND status=1 AND deleted_at IS NULL;",
            new { CollegeId = collegeId }, cancellationToken: ct));
        if (count == 0) throw new ExamValidationException("collegeId", "Active college not found.");
    }

    private static async Task ValidateTypeCodeAsync(MySqlConnection c, long collegeId, string code, long? currentId, CancellationToken ct)
    {
        var count = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM exam_types
             WHERE college_id=@CollegeId AND deleted_at IS NULL
               AND LOWER(TRIM(type_code))=LOWER(TRIM(@Code))
               AND (@CurrentId IS NULL OR exam_type_id<>@CurrentId);
            """, new { CollegeId = collegeId, Code = code, CurrentId = currentId }, cancellationToken: ct));
        if (count > 0) throw new ExamConflictException("code", "Exam type code already exists for this college.");
    }

    private static async Task EnsureTypeExistsAsync(MySqlConnection c, long examTypeId, CancellationToken ct)
    {
        var count = await c.ExecuteScalarAsync<long>(new CommandDefinition(
            "SELECT COUNT(*) FROM exam_types WHERE exam_type_id=@ExamTypeId AND deleted_at IS NULL;",
            new { ExamTypeId = examTypeId }, cancellationToken: ct));
        if (count == 0) throw new ExamNotFoundException("examTypeId", "Exam type not found.");
    }

    private static async Task EnsureExamExistsAsync(MySqlConnection c, long examId, CancellationToken ct)
    {
        var count = await c.ExecuteScalarAsync<long>(new CommandDefinition(
            "SELECT COUNT(*) FROM exams WHERE exam_id=@ExamId AND deleted_at IS NULL;",
            new { ExamId = examId }, cancellationToken: ct));
        if (count == 0) throw new ExamNotFoundException("examId", "Exam not found.");
    }

    private static async Task ValidateExamRequestAsync(MySqlConnection c, ExamWriteRequest r, long? currentId, CancellationToken ct)
    {
        if (r.StartDate == default) throw new ExamValidationException("startDate", "Exam start date is required.");
        if (r.EndDate == default) throw new ExamValidationException("endDate", "Exam end date is required.");
        if (r.EndDate.Date < r.StartDate.Date) throw new ExamValidationException("endDate", "Exam end date cannot be before start date.");

        await ValidateCollegeAsync(c, r.CollegeId, ct);

        var ay = await c.QuerySingleOrDefaultAsync<dynamic>(new CommandDefinition("""
            SELECT academic_year_id, start_date, end_date
              FROM academicyears
             WHERE academic_year_id=@AcademicYearId AND deleted_at IS NULL AND is_archived=0;
            """, new { r.AcademicYearId }, cancellationToken: ct));
        if (ay is null) throw new ExamValidationException("academicYearId", "Academic year not found or archived.");

        DateTime ayStart = Convert.ToDateTime(ay.start_date, CultureInfo.InvariantCulture).Date;
        DateTime ayEnd = Convert.ToDateTime(ay.end_date, CultureInfo.InvariantCulture).Date;
        if (r.StartDate.Date < ayStart || r.EndDate.Date > ayEnd)
            throw new ExamValidationException("startDate", "Exam dates must fall inside the selected academic year.");

        var course = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM courses
             WHERE course_id=@CourseId AND college_id=@CollegeId AND status=1 AND deleted_at IS NULL;
            """, new { r.CourseId, r.CollegeId }, cancellationToken: ct));
        if (course == 0) throw new ExamValidationException("courseId", "Course does not belong to the selected college or is inactive.");

        var branch = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM branches
             WHERE branch_id=@BranchId AND course_id=@CourseId AND status=1 AND deleted_at IS NULL;
            """, new { r.BranchId, r.CourseId }, cancellationToken: ct));
        if (branch == 0) throw new ExamValidationException("branchId", "Branch does not belong to the selected course or is inactive.");

        var semester = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM semesters
             WHERE semester_id=@SemesterId AND course_id=@CourseId AND branch_id=@BranchId
               AND academic_year_id=@AcademicYearId AND status=1 AND is_archived=0;
            """, new { r.SemesterId, r.CourseId, r.BranchId, r.AcademicYearId }, cancellationToken: ct));
        if (semester == 0) throw new ExamValidationException("semesterId", "Semester does not match the selected academic year/course/branch.");

        var type = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM exam_types
             WHERE exam_type_id=@ExamTypeId AND college_id=@CollegeId AND status=1 AND deleted_at IS NULL;
            """, new { r.ExamTypeId, r.CollegeId }, cancellationToken: ct));
        if (type == 0) throw new ExamValidationException("examTypeId", "Active exam type does not belong to the selected college.");

        var duplicate = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM exams
             WHERE college_id=@CollegeId AND academic_year_id=@AcademicYearId AND deleted_at IS NULL
               AND LOWER(TRIM(exam_code))=LOWER(TRIM(@ExamCode))
               AND (@CurrentId IS NULL OR exam_id<>@CurrentId);
            """, new { r.CollegeId, r.AcademicYearId, ExamCode = r.NormalizedCode, CurrentId = currentId }, cancellationToken: ct));
        if (duplicate > 0) throw new ExamConflictException("examCode", "Exam code already exists for this college and academic year.");
    }

    private sealed record ScheduleValidationContext(TimeSpan StartTime, TimeSpan EndTime, TimeSpan? ReportingTime);

    private async Task<ScheduleValidationContext> ValidateScheduleAsync(
        MySqlConnection c, long examId, ExamScheduleWriteRequest r, long? currentScheduleId, CancellationToken ct)
    {
        var exam = await c.QuerySingleOrDefaultAsync<dynamic>(new CommandDefinition("""
            SELECT exam_id, college_id, academic_year_id, course_id, branch_id, semester_id, start_date, end_date, status
              FROM exams
             WHERE exam_id=@ExamId AND deleted_at IS NULL;
            """, new { ExamId = examId }, cancellationToken: ct));
        if (exam is null) throw new ExamNotFoundException("examId", "Exam not found.");
        if (Convert.ToByte(exam.status, CultureInfo.InvariantCulture) != 1)
            throw new ExamConflictException("examId", "Cannot schedule an inactive exam.");

        if (r.ExamDate == default) throw new ExamValidationException("examDate", "Exam date is required.");
        DateTime examDate = r.ExamDate.Date;
        DateTime startDate = Convert.ToDateTime(exam.start_date, CultureInfo.InvariantCulture).Date;
        DateTime endDate = Convert.ToDateTime(exam.end_date, CultureInfo.InvariantCulture).Date;
        if (examDate < startDate || examDate > endDate)
            throw new ExamValidationException("examDate", "Schedule date must fall inside the exam date range.");

        if (!TimeSpan.TryParse(r.StartTime, CultureInfo.InvariantCulture, out var startTime))
            throw new ExamValidationException("startTime", "Start time is invalid.");
        if (!TimeSpan.TryParse(r.EndTime, CultureInfo.InvariantCulture, out var endTime))
            throw new ExamValidationException("endTime", "End time is invalid.");
        if (endTime <= startTime)
            throw new ExamValidationException("endTime", "End time must be after start time.");

        TimeSpan? reportingTime = null;
        if (!string.IsNullOrWhiteSpace(r.ReportingTime))
        {
            if (!TimeSpan.TryParse(r.ReportingTime, CultureInfo.InvariantCulture, out var parsedReporting))
                throw new ExamValidationException("reportingTime", "Reporting time is invalid.");
            if (parsedReporting > startTime)
                throw new ExamValidationException("reportingTime", "Reporting time cannot be after exam start time.");
            reportingTime = parsedReporting;
        }

        long courseId = Convert.ToInt64(exam.course_id, CultureInfo.InvariantCulture);
        long branchId = Convert.ToInt64(exam.branch_id, CultureInfo.InvariantCulture);
        long semesterId = Convert.ToInt64(exam.semester_id, CultureInfo.InvariantCulture);
        long academicYearId = Convert.ToInt64(exam.academic_year_id, CultureInfo.InvariantCulture);
        long collegeId = Convert.ToInt64(exam.college_id, CultureInfo.InvariantCulture);

        var subject = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*)
              FROM subject_semesters ss
              INNER JOIN subjects sub ON sub.subject_id=ss.subject_id
             WHERE ss.subject_id=@SubjectId AND ss.course_id=@CourseId AND ss.branch_id=@BranchId
               AND ss.semester_id=@SemesterId AND ss.status=1
               AND sub.status=1 AND sub.deleted_at IS NULL;
            """, new { r.SubjectId, CourseId = courseId, BranchId = branchId, SemesterId = semesterId }, cancellationToken: ct));
        if (subject == 0) throw new ExamValidationException("subjectId", "Subject is not mapped to this exam's course/branch/semester.");

        if (r.SectionId.HasValue)
        {
            var section = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
                SELECT COUNT(*) FROM sections
                 WHERE section_id=@SectionId AND college_id=@CollegeId AND academic_year_id=@AcademicYearId
                   AND course_id=@CourseId AND branch_id=@BranchId AND semester_id=@SemesterId
                   AND status=1 AND is_archived=0 AND deleted_at IS NULL;
                """, new
            {
                r.SectionId,
                CollegeId = collegeId,
                AcademicYearId = academicYearId,
                CourseId = courseId,
                BranchId = branchId,
                SemesterId = semesterId
            }, cancellationToken: ct));
            if (section == 0) throw new ExamValidationException("sectionId", "Section does not match this exam's academic context.");
        }

        if (r.ClassroomId.HasValue)
        {
            var room = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
                SELECT COUNT(*) FROM classrooms
                 WHERE classroom_id=@ClassroomId AND college_id=@CollegeId AND status=1 AND deleted_at IS NULL;
                """, new { r.ClassroomId, CollegeId = collegeId }, cancellationToken: ct));
            if (room == 0) throw new ExamValidationException("classroomId", "Active classroom not found in the exam's college.");
        }

        var duplicate = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM exam_schedules
             WHERE exam_id=@ExamId AND subject_id=@SubjectId AND deleted_at IS NULL
               AND ((section_id IS NULL AND @SectionId IS NULL) OR section_id=@SectionId)
               AND (@CurrentScheduleId IS NULL OR exam_schedule_id<>@CurrentScheduleId);
            """, new { ExamId = examId, r.SubjectId, r.SectionId, CurrentScheduleId = currentScheduleId }, cancellationToken: ct));
        if (duplicate > 0)
            throw new ExamConflictException("subjectId", "This subject already has a schedule for the selected section in this exam.");

        // Explicit inactive writes do not reserve hall/student time. Omitted status on PUT
        // retains the stored status, matching the existing UPDATE COALESCE behavior.
        var effectiveStatus = r.Status.HasValue ? Status(r.Status) : currentScheduleId.HasValue
            ? await c.ExecuteScalarAsync<byte>(new CommandDefinition(
                "SELECT status FROM exam_schedules WHERE exam_schedule_id=@ScheduleId;",
                new { ScheduleId = currentScheduleId.Value }, cancellationToken: ct))
            : (byte)1;
        if (effectiveStatus == 1)
        {
            await ExamConflictGuard.ValidateOverlapAsync(c, examId, currentScheduleId,
                r.ClassroomId, r.SectionId, examDate, startTime, endTime,
                collegeId, academicYearId, courseId, branchId, semesterId, _logger, ct);
        }

        return new ScheduleValidationContext(startTime, endTime, reportingTime);
    }

    private static async Task EnsureScheduleExistsAsync(MySqlConnection c, long examId, long scheduleId, CancellationToken ct)
    {
        var count = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM exam_schedules
             WHERE exam_schedule_id=@ScheduleId AND exam_id=@ExamId AND deleted_at IS NULL;
            """, new { ExamId = examId, ScheduleId = scheduleId }, cancellationToken: ct));
        if (count == 0) throw new ExamNotFoundException("scheduleId", "Exam schedule not found.");
    }

    private static async Task ValidateRuleCodeAsync(MySqlConnection c, long examId, string code, long? currentRuleId, CancellationToken ct)
    {
        var count = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM exam_rules
             WHERE exam_id=@ExamId AND deleted_at IS NULL
               AND LOWER(TRIM(rule_code))=LOWER(TRIM(@Code))
               AND (@CurrentRuleId IS NULL OR exam_rule_id<>@CurrentRuleId);
            """, new { ExamId = examId, Code = code, CurrentRuleId = currentRuleId }, cancellationToken: ct));
        if (count > 0) throw new ExamConflictException("ruleCode", "Rule code already exists for this exam.");
    }

    private static async Task EnsureRuleExistsAsync(MySqlConnection c, long examId, long ruleId, CancellationToken ct)
    {
        var count = await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            SELECT COUNT(*) FROM exam_rules
             WHERE exam_rule_id=@RuleId AND exam_id=@ExamId AND deleted_at IS NULL;
            """, new { ExamId = examId, RuleId = ruleId }, cancellationToken: ct));
        if (count == 0) throw new ExamNotFoundException("ruleId", "Exam rule not found.");
    }
}
