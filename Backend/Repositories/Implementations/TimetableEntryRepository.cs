using BTech.Task_TimetableEntries.DTOs;
using BTech.Task_TimetableEntries.Exceptions;
using Dapper;
using MySqlConnector;

namespace BTech.Task_TimetableEntries.Repositories;

public sealed class TimetableEntryRepository
{
    private static readonly HashSet<string> ValidDays =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY",
            "FRIDAY", "SATURDAY", "SUNDAY"
        };

    private readonly IConfiguration _configuration;

    public TimetableEntryRepository(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private MySqlConnection CreateConnection()
    {
        var connectionString =
            _configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "DefaultConnection is missing from appsettings.json.");
        }

        return new MySqlConnection(connectionString);
    }

    public async Task<long> CreateAsync(CreateTimetableEntryRequest request)
    {
        var day = ValidateRequest(request);

        await using var connection = CreateConnection();
        await connection.OpenAsync();

        var lockName = BuildLockName(request.FacultyId);
        await AcquireLockAsync(connection, lockName);

        try
        {
            await using var transaction = await connection.BeginTransactionAsync();

            try
            {
                var context = await GetScheduleContextAsync(
                    connection, transaction, request);

                await ValidateFacultyAsync(
                    connection, transaction, request.FacultyId);

                await EnsureNoFacultyConflictAsync(
                    connection,
                    transaction,
                    timetableEntryId: null,
                    request.FacultyId,
                    day,
                    context);

                const string insertSql = """
                    INSERT INTO timetable_entries
                    (
                        timetable_id,
                        timetable_slot_id,
                        faculty_id,
                        subject_id,
                        section_id,
                        day_of_week,
                        classroom,
                        entry_type,
                        status,
                        created_by
                    )
                    VALUES
                    (
                        @TimetableId,
                        @TimetableSlotId,
                        @FacultyId,
                        @SubjectId,
                        @SectionId,
                        @DayOfWeek,
                        @Classroom,
                        @EntryType,
                        1,
                        @CreatedBy
                    );

                    SELECT LAST_INSERT_ID();
                    """;

                var entryId = await connection.ExecuteScalarAsync<long>(
                    new CommandDefinition(
                        insertSql,
                        new
                        {
                            request.TimetableId,
                            request.TimetableSlotId,
                            request.FacultyId,
                            request.SubjectId,
                            request.SectionId,
                            DayOfWeek = day,
                            Classroom = Normalize(request.Classroom),
                            EntryType = Normalize(request.EntryType) ?? "LECTURE",
                            request.CreatedBy
                        },
                        transaction));

                await transaction.CommitAsync();
                return entryId;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        finally
        {
            await ReleaseLockAsync(connection, lockName);
        }
    }

    public async Task UpdateAsync(
        long timetableEntryId,
        UpdateTimetableEntryRequest request)
    {
        if (timetableEntryId <= 0)
            throw new ArgumentException("TimetableEntryId must be greater than zero.");

        var day = ValidateRequest(request);

        await using var connection = CreateConnection();
        await connection.OpenAsync();

        var oldFacultyId = await connection.QuerySingleOrDefaultAsync<long?>(
            """
            SELECT faculty_id
            FROM timetable_entries
            WHERE timetable_entry_id = @TimetableEntryId;
            """,
            new { TimetableEntryId = timetableEntryId });

        if (!oldFacultyId.HasValue)
            throw new KeyNotFoundException("Timetable entry not found.");

        var lockNames = new[]
        {
            BuildLockName(oldFacultyId.Value),
            BuildLockName(request.FacultyId)
        }
        .Distinct(StringComparer.Ordinal)
        .OrderBy(name => name, StringComparer.Ordinal)
        .ToArray();

        var acquiredLocks = new List<string>();

        try
        {
            foreach (var lockName in lockNames)
            {
                await AcquireLockAsync(connection, lockName);
                acquiredLocks.Add(lockName);
            }

            await using var transaction = await connection.BeginTransactionAsync();

            try
            {
                var context = await GetScheduleContextAsync(
                    connection, transaction, request);

                await ValidateFacultyAsync(
                    connection, transaction, request.FacultyId);

                if (request.Status)
                {
                    await EnsureNoFacultyConflictAsync(
                        connection,
                        transaction,
                        timetableEntryId,
                        request.FacultyId,
                        day,
                        context);
                }

                const string updateSql = """
                    UPDATE timetable_entries
                    SET timetable_id = @TimetableId,
                        timetable_slot_id = @TimetableSlotId,
                        faculty_id = @FacultyId,
                        subject_id = @SubjectId,
                        section_id = @SectionId,
                        day_of_week = @DayOfWeek,
                        classroom = @Classroom,
                        entry_type = @EntryType,
                        status = @Status,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = @UpdatedBy
                    WHERE timetable_entry_id = @TimetableEntryId;
                    """;

                var affected = await connection.ExecuteAsync(
                    new CommandDefinition(
                        updateSql,
                        new
                        {
                            TimetableEntryId = timetableEntryId,
                            request.TimetableId,
                            request.TimetableSlotId,
                            request.FacultyId,
                            request.SubjectId,
                            request.SectionId,
                            DayOfWeek = day,
                            Classroom = Normalize(request.Classroom),
                            EntryType = Normalize(request.EntryType) ?? "LECTURE",
                            Status = request.Status ? 1 : 0,
                            request.UpdatedBy
                        },
                        transaction));

                if (affected == 0)
                    throw new KeyNotFoundException("Timetable entry not found.");

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        finally
        {
            foreach (var lockName in acquiredLocks.AsEnumerable().Reverse())
                await ReleaseLockAsync(connection, lockName);
        }
    }

    public async Task<IReadOnlyList<TimetableEntryResponse>> ListAsync(
        long? facultyId,
        long? timetableId,
        string? dayOfWeek)
    {
        if (facultyId.HasValue && facultyId.Value <= 0)
            throw new ArgumentException("FacultyId must be greater than zero.");
        if (timetableId.HasValue && timetableId.Value <= 0)
            throw new ArgumentException("TimetableId must be greater than zero.");

        string? normalizedDay = null;
        if (!string.IsNullOrWhiteSpace(dayOfWeek))
        {
            normalizedDay = dayOfWeek.Trim().ToUpperInvariant();
            if (!ValidDays.Contains(normalizedDay))
                throw new ArgumentException("DayOfWeek is invalid.");
        }

        const string sql = """
            SELECT
                e.timetable_entry_id AS TimetableEntryId,
                e.timetable_id AS TimetableId,
                t.timetable_name AS TimetableName,
                e.timetable_slot_id AS TimetableSlotId,
                s.slot_number AS SlotNumber,
                s.slot_name AS SlotName,
                s.start_time AS StartTime,
                s.end_time AS EndTime,
                e.faculty_id AS FacultyId,
                f.faculty_code AS FacultyCode,
                f.faculty_name AS FacultyName,
                e.subject_id AS SubjectId,
                e.section_id AS SectionId,
                e.day_of_week AS DayOfWeek,
                e.classroom AS Classroom,
                e.entry_type AS EntryType,
                e.status AS Status
            FROM timetable_entries e
            INNER JOIN timetables t ON t.timetable_id = e.timetable_id
            INNER JOIN timetable_slots s
                ON s.timetable_slot_id = e.timetable_slot_id
               AND s.timetable_id = e.timetable_id
            INNER JOIN faculty f ON f.faculty_id = e.faculty_id
            WHERE (@FacultyId IS NULL OR e.faculty_id = @FacultyId)
              AND (@TimetableId IS NULL OR e.timetable_id = @TimetableId)
              AND (@DayOfWeek IS NULL OR UPPER(e.day_of_week) = @DayOfWeek)
            ORDER BY e.day_of_week, s.start_time, e.timetable_entry_id;
            """;

        await using var connection = CreateConnection();
        var rows = await connection.QueryAsync<TimetableEntryResponse>(
            sql,
            new
            {
                FacultyId = facultyId,
                TimetableId = timetableId,
                DayOfWeek = normalizedDay
            });

        return rows.AsList();
    }

    public async Task DeleteAsync(long timetableEntryId)
    {
        if (timetableEntryId <= 0)
            throw new ArgumentException("TimetableEntryId must be greater than zero.");

        await using var connection = CreateConnection();
        var affected = await connection.ExecuteAsync(
            """
            UPDATE timetable_entries
            SET status = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE timetable_entry_id = @TimetableEntryId
              AND status <> 0;
            """,
            new { TimetableEntryId = timetableEntryId });

        if (affected == 0)
            throw new KeyNotFoundException("Active timetable entry not found.");
    }

    private static string ValidateRequest(CreateTimetableEntryRequest request)
    {
        if (request.TimetableId <= 0)
            throw new ArgumentException("TimetableId must be greater than zero.");
        if (request.TimetableSlotId <= 0)
            throw new ArgumentException("TimetableSlotId must be greater than zero.");
        if (request.FacultyId <= 0)
            throw new ArgumentException("FacultyId must be greater than zero.");
        if (request.SubjectId <= 0)
            throw new ArgumentException("SubjectId must be greater than zero.");
        if (request.SectionId <= 0)
            throw new ArgumentException("SectionId must be greater than zero.");

        var day = request.DayOfWeek?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(day) || !ValidDays.Contains(day))
        {
            throw new ArgumentException(
                "DayOfWeek must be MONDAY through SUNDAY.");
        }

        return day;
    }

    private static async Task<ScheduleContext> GetScheduleContextAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        CreateTimetableEntryRequest request)
    {
        const string sql = """
            SELECT
                t.academic_year_id AS AcademicYearId,
                t.section_id AS TimetableSectionId,
                t.effective_from AS EffectiveFrom,
                t.effective_to AS EffectiveTo,
                s.start_time AS StartTime,
                s.end_time AS EndTime
            FROM timetables t
            INNER JOIN timetable_slots s
                ON s.timetable_id = t.timetable_id
            WHERE t.timetable_id = @TimetableId
              AND s.timetable_slot_id = @TimetableSlotId
              AND s.status = 1;
            """;

        var context = await connection.QuerySingleOrDefaultAsync<ScheduleContext>(
            new CommandDefinition(sql, request, transaction));

        if (context is null)
        {
            throw new KeyNotFoundException(
                "Timetable or active timetable slot not found, or the slot does not belong to the timetable.");
        }

        if (context.TimetableSectionId != request.SectionId)
        {
            throw new ArgumentException(
                "SectionId must match the section configured for the timetable.");
        }

        return context;
    }

    private static async Task ValidateFacultyAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long facultyId)
    {
        var exists = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(
                """
                SELECT COUNT(1)
                FROM faculty
                WHERE faculty_id = @FacultyId
                  AND status = 1;
                """,
                new { FacultyId = facultyId },
                transaction));

        if (exists == 0)
            throw new KeyNotFoundException("Faculty not found or inactive.");
    }

    private static async Task EnsureNoFacultyConflictAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long? timetableEntryId,
        long facultyId,
        string dayOfWeek,
        ScheduleContext requested)
    {
        const string sql = """
            SELECT e.timetable_entry_id
            FROM timetable_entries e
            INNER JOIN timetable_slots existing_slot
                ON existing_slot.timetable_slot_id = e.timetable_slot_id
               AND existing_slot.timetable_id = e.timetable_id
            INNER JOIN timetables existing_timetable
                ON existing_timetable.timetable_id = e.timetable_id
            WHERE e.faculty_id = @FacultyId
              AND UPPER(TRIM(e.day_of_week)) = @DayOfWeek
              AND e.status = 1
              AND existing_slot.status = 1
              AND existing_timetable.academic_year_id = @AcademicYearId
              AND (@TimetableEntryId IS NULL
                   OR e.timetable_entry_id <> @TimetableEntryId)
              AND existing_slot.start_time < @EndTime
              AND existing_slot.end_time > @StartTime
              AND COALESCE(existing_timetable.effective_from, '1000-01-01')
                    <= COALESCE(@EffectiveTo, '9999-12-31')
              AND COALESCE(existing_timetable.effective_to, '9999-12-31')
                    >= COALESCE(@EffectiveFrom, '1000-01-01')
            LIMIT 1;
            """;

        var conflictId = await connection.QuerySingleOrDefaultAsync<long?>(
            new CommandDefinition(
                sql,
                new
                {
                    TimetableEntryId = timetableEntryId,
                    FacultyId = facultyId,
                    DayOfWeek = dayOfWeek,
                    requested.AcademicYearId,
                    requested.StartTime,
                    requested.EndTime,
                    requested.EffectiveFrom,
                    requested.EffectiveTo
                },
                transaction));

        if (conflictId.HasValue)
        {
            throw new FacultyDoubleBookingException(
                $"Faculty is already assigned during this day and time. " +
                $"Conflicting timetable entry ID: {conflictId.Value}.");
        }
    }

    private static string BuildLockName(long facultyId) =>
        $"cms:timetable:faculty:{facultyId}";

    private static async Task AcquireLockAsync(
        MySqlConnection connection,
        string lockName)
    {
        var acquired = await connection.ExecuteScalarAsync<int?>(
            "SELECT GET_LOCK(@LockName, 10);",
            new { LockName = lockName });

        if (acquired != 1)
        {
            throw new InvalidOperationException(
                "The faculty timetable is currently being updated. Please retry.");
        }
    }

    private static async Task ReleaseLockAsync(
        MySqlConnection connection,
        string lockName)
    {
        if (connection.State == System.Data.ConnectionState.Open)
        {
            await connection.ExecuteScalarAsync<int?>(
                "SELECT RELEASE_LOCK(@LockName);",
                new { LockName = lockName });
        }
    }

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed class ScheduleContext
    {
        public long AcademicYearId { get; set; }
        public long TimetableSectionId { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
    }
}
