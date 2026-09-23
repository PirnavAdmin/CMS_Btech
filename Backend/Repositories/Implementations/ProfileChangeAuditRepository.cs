using System.Data;
using System.Data.Common;
using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public sealed class ProfileChangeAuditRepository : IProfileChangeAuditRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ProfileChangeAuditRepository> _logger;

        public ProfileChangeAuditRepository(
            ApplicationDbContext context,
            ILogger<ProfileChangeAuditRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<long> CreateAsync(
            long userId,
            long changedBy,
            string changedInformationJson)
        {
            _logger.LogInformation(
                "Creating profile change audit. UserId={UserId}, ChangedBy={ChangedBy}",
                userId,
                changedBy);

            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            try
            {
                if (shouldClose)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();
                command.CommandText = "sp_ProfileChangeAudit_Create";
                command.CommandType = CommandType.StoredProcedure;

                if (_context.Database.CurrentTransaction != null)
                    command.Transaction = _context.Database.CurrentTransaction.GetDbTransaction();

                AddParameter(command, "p_user_id", userId);
                AddParameter(command, "p_changed_by", changedBy);
                AddParameter(command, "p_changed_information", changedInformationJson);

                var result = await command.ExecuteScalarAsync();
                var auditId = Convert.ToInt64(result);

                _logger.LogInformation(
                    "Profile change audit created. AuditId={AuditId}, UserId={UserId}",
                    auditId,
                    userId);

                return auditId;
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                _logger.LogWarning(
                    ex,
                    "Profile audit validation failed. UserId={UserId}",
                    userId);
                throw new ArgumentException(ex.Message, ex);
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while creating profile audit. UserId={UserId}, ChangedBy={ChangedBy}",
                    userId,
                    changedBy);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while creating profile audit. UserId={UserId}",
                    userId);
                throw;
            }
            finally
            {
                if (shouldClose && _context.Database.CurrentTransaction == null)
                    await connection.CloseAsync();
            }
        }

        public async Task<IReadOnlyList<ProfileChangeAudit>> GetByUserIdAsync(long userId)
        {
            _logger.LogInformation(
                "Retrieving profile change history. UserId={UserId}",
                userId);

            var items = new List<ProfileChangeAudit>();
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            try
            {
                if (shouldClose)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();
                command.CommandText = "sp_ProfileChangeAudit_GetByUserId";
                command.CommandType = CommandType.StoredProcedure;
                AddParameter(command, "p_user_id", userId);

                await using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    items.Add(new ProfileChangeAudit
                    {
                        ProfileChangeAuditId = Convert.ToInt64(reader["profile_change_audit_id"]),
                        UserId = Convert.ToInt64(reader["user_id"]),
                        ChangedBy = Convert.ToInt64(reader["changed_by"]),
                        ChangedByName = reader["changed_by_name"] == DBNull.Value
                            ? null
                            : Convert.ToString(reader["changed_by_name"]),
                        ChangedAt = Convert.ToDateTime(reader["changed_at"]),
                        ChangedInformation = Convert.ToString(reader["changed_information"]) ?? "[]"
                    });
                }

                return items;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while retrieving profile change history. UserId={UserId}",
                    userId);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while retrieving profile change history. UserId={UserId}",
                    userId);
                throw;
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        private static void AddParameter(DbCommand command, string name, object? value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }
    }
}
