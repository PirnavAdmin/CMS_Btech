using BTech.DTOs.MeetingEventValidation;

namespace BTech.Services.Interfaces;

public interface IMeetingEventValidationService
{
    Task<MeetingEventValidationResultDto> ValidateEventAsync(ValidateEventRequest request, long actorUserId, long? collegeId, bool isSuperAdmin);
    Task<MeetingEventValidationResultDto> ValidateMeetingAsync(ValidateMeetingRequest request, long actorUserId, long? collegeId, bool isSuperAdmin);
    Task<MeetingEventValidationResultDto> ValidateScheduleAsync(ValidateScheduleRequest request, long actorUserId, long? collegeId, bool isSuperAdmin);
}
