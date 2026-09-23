using BTech.Task_FacultyStatusHistory.DTOs;
using Dapper;
using MySqlConnector;

namespace BTech.Task_FacultyStatusHistory.Repositories;

public sealed class FacultyStatusRepository : IFacultyStatusRepository
{
    private readonly IConfiguration _configuration;

    public FacultyStatusRepository(IConfiguration configuration)
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

    public async Task<bool> UpdateStatusAsync(
        long facultyId,
        UpdateFacultyStatusRequest request,
        long? changedBy)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            throw new ArgumentException(
                "Status is required.",
                nameof(request.Status));
        }

        int newStatusValue;

        if (request.Status.Equals(
                "ACTIVE",
                StringComparison.OrdinalIgnoreCase))
        {
            newStatusValue = 1;
        }
        else if (request.Status.Equals(
                     "INACTIVE",
                     StringComparison.OrdinalIgnoreCase))
        {
            newStatusValue = 0;
        }
        else
        {
            throw new ArgumentException(
                "Status must be either ACTIVE or INACTIVE.",
                nameof(request.Status));
        }

        await using var connection = CreateConnection();

        await connection.OpenAsync();

        await using var transaction =
            await connection.BeginTransactionAsync();

        try
        {
            // ----------------------------------------------------
            // 1. Get current faculty status
            // ----------------------------------------------------

            const string selectStatusSql = """
                SELECT status
                FROM faculty
                WHERE faculty_id = @FacultyId
                LIMIT 1;
                """;

            var oldStatusValue =
                await connection.QuerySingleOrDefaultAsync<int?>(
                    new CommandDefinition(
                        selectStatusSql,
                        new
                        {
                            FacultyId = facultyId
                        },
                        transaction));

            // Faculty not found
            if (oldStatusValue == null)
            {
                await transaction.RollbackAsync();

                return false;
            }

            // ----------------------------------------------------
            // 2. If status is already same, don't create history
            // ----------------------------------------------------

            if (oldStatusValue.Value == newStatusValue)
            {
                await transaction.CommitAsync();

                return true;
            }

            // ----------------------------------------------------
            // 3. Update faculty status
            // ----------------------------------------------------

            const string updateStatusSql = """
                UPDATE faculty
                SET status = @Status
                WHERE faculty_id = @FacultyId;
                """;

            var affectedRows =
                await connection.ExecuteAsync(
                    new CommandDefinition(
                        updateStatusSql,
                        new
                        {
                            FacultyId = facultyId,
                            Status = newStatusValue
                        },
                        transaction));

            if (affectedRows != 1)
            {
                throw new InvalidOperationException(
                    "Faculty status update failed.");
            }

            // ----------------------------------------------------
            // 4. Insert status history
            // ----------------------------------------------------
            // Actual DB columns:
            // history_id
            // faculty_id
            // old_status
            // new_status
            // changed_at
            // changed_by
            // remarks

            const string insertHistorySql = """
                INSERT INTO faculty_status_history
                (
                    faculty_id,
                    old_status,
                    new_status,
                    changed_at,
                    changed_by,
                    remarks
                )
                VALUES
                (
                    @FacultyId,
                    @OldStatus,
                    @NewStatus,
                    CURRENT_TIMESTAMP,
                    @ChangedBy,
                    @Remarks
                );
                """;

            await connection.ExecuteAsync(
                new CommandDefinition(
                    insertHistorySql,
                    new
                    {
                        FacultyId = facultyId,
                        OldStatus = oldStatusValue.Value,
                        NewStatus = newStatusValue,
                        ChangedBy = changedBy,
                        Remarks = request.Reason
                    },
                    transaction));

            // ----------------------------------------------------
            // 5. Commit both operations
            // ----------------------------------------------------

            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<IEnumerable<FacultyStatusHistoryResponse>>
        GetStatusHistoryAsync(long facultyId)
    {
        await using var connection = CreateConnection();

        await connection.OpenAsync();

        // --------------------------------------------------------
        // Get faculty status history
        // --------------------------------------------------------

        const string sql = """
            SELECT
                history_id AS FacultyStatusHistoryId,
                faculty_id AS FacultyId,

                CASE
                    WHEN old_status = 1 THEN 'ACTIVE'
                    WHEN old_status = 0 THEN 'INACTIVE'
                    ELSE CAST(old_status AS CHAR)
                END AS OldStatus,

                CASE
                    WHEN new_status = 1 THEN 'ACTIVE'
                    WHEN new_status = 0 THEN 'INACTIVE'
                    ELSE CAST(new_status AS CHAR)
                END AS NewStatus,

                remarks AS Reason,
                changed_by AS ChangedBy,
                changed_at AS ChangedAt

            FROM faculty_status_history

            WHERE faculty_id = @FacultyId

            ORDER BY
                changed_at DESC,
                history_id DESC;
            """;

        return await connection.QueryAsync<FacultyStatusHistoryResponse>(
            new CommandDefinition(
                sql,
                new
                {
                    FacultyId = facultyId
                }));
    }
}