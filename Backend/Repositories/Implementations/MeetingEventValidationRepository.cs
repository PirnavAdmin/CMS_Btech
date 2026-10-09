using System.Data;
using System.Text.Json;
using Dapper;
using MySqlConnector;
using BTech.DTOs.MeetingEventValidation;
using BTech.Repositories.Interfaces;

namespace BTech.Repositories.Implementations;

public sealed class MeetingEventValidationRepository : IMeetingEventValidationRepository
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<MeetingEventValidationRepository> _logger;

    public MeetingEventValidationRepository(IConfiguration configuration, ILogger<MeetingEventValidationRepository> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private MySqlConnection CreateConnection()
    {
        var cs = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("DefaultConnection is missing from appsettings.json.");
        return new MySqlConnection(cs);
    }

    public Task<MeetingEventValidationResultDto> ValidateEventAsync(long eventId, string action, IReadOnlyCollection<long> participantUserIds, long actorUserId, long? collegeId, bool isSuperAdmin)
        => ExecuteValidationAsync("sp_mev_validate_event", new
        {
            p_event_id = eventId, p_action = action, p_actor_user_id = actorUserId,
            p_college_id = collegeId, p_is_super_admin = isSuperAdmin ? 1 : 0,
            p_participant_user_ids = JsonSerializer.Serialize(participantUserIds)
        }, "EVENT", eventId);

    public Task<MeetingEventValidationResultDto> ValidateMeetingAsync(long meetingId, string action, IReadOnlyCollection<long> participantUserIds, long actorUserId, long? collegeId, bool isSuperAdmin)
        => ExecuteValidationAsync("sp_mev_validate_meeting", new
        {
            p_meeting_id = meetingId, p_action = action, p_actor_user_id = actorUserId,
            p_college_id = collegeId, p_is_super_admin = isSuperAdmin ? 1 : 0,
            p_participant_user_ids = JsonSerializer.Serialize(participantUserIds)
        }, "MEETING", meetingId);

    public Task<MeetingEventValidationResultDto> ValidateScheduleAsync(ValidateScheduleRequest request, long actorUserId, long? collegeId, bool isSuperAdmin)
        => ExecuteValidationAsync("sp_mev_validate_schedule", new
        {
            p_college_id = request.CollegeId, p_title = request.Title.Trim(),
            p_start_at = request.StartAt, p_end_at = request.EndAt,
            p_classroom_id = request.ClassroomId, p_exclude_event_id = request.ExcludeEventId,
            p_exclude_meeting_id = request.ExcludeMeetingId, p_actor_user_id = actorUserId,
            p_token_college_id = collegeId, p_is_super_admin = isSuperAdmin ? 1 : 0
        }, "SCHEDULE", 0);

    private async Task<MeetingEventValidationResultDto> ExecuteValidationAsync(string procedure, object parameters, string entityType, long entityId)
    {
        try
        {
            await using var connection = CreateConnection();
            var rows = new List<ValidationIssueDto>();
            using var grid = await connection.QueryMultipleAsync(
                procedure, parameters, commandType: CommandType.StoredProcedure);
            while (!grid.IsConsumed)
            {
                var resultSet = await grid.ReadAsync<ValidationIssueDto>();
                rows.AddRange(resultSet);
            }

            var actualId = rows.Where(x => x.EntityId.HasValue).Select(x => x.EntityId!.Value).FirstOrDefault();
            return new MeetingEventValidationResultDto
            {
                EntityType = entityType,
                EntityId = actualId > 0 ? actualId : entityId,
                IsValid = rows.All(x => !string.Equals(x.Severity, "ERROR", StringComparison.OrdinalIgnoreCase)),
                ValidatedAtUtc = DateTime.UtcNow,
                Issues = rows
            };
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Stored procedure {Procedure} failed for {EntityType} {EntityId}", procedure, entityType, entityId);
            throw;
        }
    }
}
