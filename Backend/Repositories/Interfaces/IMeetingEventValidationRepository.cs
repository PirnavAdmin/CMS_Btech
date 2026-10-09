using BTech.DTOs.MeetingEventValidation;

namespace BTech.Repositories.Interfaces;

public interface IMeetingEventValidationRepository
{
    Task<MeetingEventValidationResultDto> ValidateEventAsync(long eventId, string action, IReadOnlyCollection<long> participantUserIds, long actorUserId, long? collegeId, bool isSuperAdmin);
    Task<MeetingEventValidationResultDto> ValidateMeetingAsync(long meetingId, string action, IReadOnlyCollection<long> participantUserIds, long actorUserId, long? collegeId, bool isSuperAdmin);
    Task<MeetingEventValidationResultDto> ValidateScheduleAsync(ValidateScheduleRequest request, long actorUserId, long? collegeId, bool isSuperAdmin);
}
