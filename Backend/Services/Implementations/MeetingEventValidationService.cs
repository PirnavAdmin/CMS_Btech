using BTech.DTOs.MeetingEventValidation;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class MeetingEventValidationService : IMeetingEventValidationService
{
    private readonly IMeetingEventValidationRepository _repository;

    public MeetingEventValidationService(IMeetingEventValidationRepository repository) => _repository = repository;

    public Task<MeetingEventValidationResultDto> ValidateEventAsync(ValidateEventRequest request, long actorUserId, long? collegeId, bool isSuperAdmin)
    {
        ArgumentNullException.ThrowIfNull(request);
        RequirePositive(request.EventId, nameof(request.EventId));
        RequirePositive(actorUserId, nameof(actorUserId));
        ValidateAction(request.Action, "VIEW", "CREATE", "EDIT", "PUBLISH", "CANCEL");
        ValidateParticipants(request.ParticipantUserIds);
        return _repository.ValidateEventAsync(request.EventId, request.Action.Trim().ToUpperInvariant(),
            request.ParticipantUserIds.Distinct().ToArray(), actorUserId, collegeId, isSuperAdmin);
    }

    public Task<MeetingEventValidationResultDto> ValidateMeetingAsync(ValidateMeetingRequest request, long actorUserId, long? collegeId, bool isSuperAdmin)
    {
        ArgumentNullException.ThrowIfNull(request);
        RequirePositive(request.MeetingId, nameof(request.MeetingId));
        RequirePositive(actorUserId, nameof(actorUserId));
        ValidateAction(request.Action, "VIEW", "CREATE", "EDIT", "CANCEL", "INVITE");
        ValidateParticipants(request.ParticipantUserIds);
        return _repository.ValidateMeetingAsync(request.MeetingId, request.Action.Trim().ToUpperInvariant(),
            request.ParticipantUserIds.Distinct().ToArray(), actorUserId, collegeId, isSuperAdmin);
    }

    public Task<MeetingEventValidationResultDto> ValidateScheduleAsync(ValidateScheduleRequest request, long actorUserId, long? collegeId, bool isSuperAdmin)
    {
        ArgumentNullException.ThrowIfNull(request);
        RequirePositive(actorUserId, nameof(actorUserId));
        if (request.CollegeId <= 0) throw new ArgumentException("CollegeId must be greater than zero.");
        if (!isSuperAdmin && (!collegeId.HasValue || request.CollegeId != collegeId.Value))
            throw new UnauthorizedAccessException("The requested college does not match the college in the authenticated token.");
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length > 250)
            throw new ArgumentException("Title is required and must not exceed 250 characters.");
        if (request.StartAt == default || request.EndAt <= request.StartAt)
            throw new ArgumentException("EndAt must be later than StartAt.");
        if (request.ClassroomId is <= 0 || request.ExcludeEventId is <= 0 || request.ExcludeMeetingId is <= 0)
            throw new ArgumentException("Optional identifiers must be positive when supplied.");
        return _repository.ValidateScheduleAsync(request, actorUserId, collegeId, isSuperAdmin);
    }

    private static void ValidateParticipants(IReadOnlyCollection<long>? ids)
    {
        if (ids is null) throw new ArgumentException("ParticipantUserIds cannot be null.");
        if (ids.Count > 500) throw new ArgumentException("A maximum of 500 participant IDs can be validated in one request.");
        if (ids.Any(x => x <= 0)) throw new ArgumentException("Participant user IDs must be positive.");
        if (ids.Distinct().Count() != ids.Count) throw new ArgumentException("ParticipantUserIds contains duplicate IDs.");
    }

    private static void ValidateAction(string action, params string[] allowed)
    {
        if (string.IsNullOrWhiteSpace(action) || !allowed.Contains(action.Trim(), StringComparer.OrdinalIgnoreCase))
            throw new ArgumentException($"Action must be one of: {string.Join(", ", allowed)}.");
    }

    private static void RequirePositive(long value, string name)
    {
        if (value <= 0) throw new ArgumentException($"{name} must be greater than zero.");
    }
}
