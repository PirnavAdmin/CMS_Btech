using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.MeetingEventValidation;

public sealed class ValidateEventRequest
{
    [Range(1, long.MaxValue)] public long EventId { get; set; }
    [Required, RegularExpression("^(VIEW|CREATE|EDIT|PUBLISH|CANCEL)$", ErrorMessage = "Action must be VIEW, CREATE, EDIT, PUBLISH, or CANCEL.")]
    public string Action { get; set; } = "EDIT";
    public List<long> ParticipantUserIds { get; set; } = new();
}

public sealed class ValidateMeetingRequest
{
    [Range(1, long.MaxValue)] public long MeetingId { get; set; }
    [Required, RegularExpression("^(VIEW|CREATE|EDIT|CANCEL|INVITE)$", ErrorMessage = "Action must be VIEW, CREATE, EDIT, CANCEL, or INVITE.")]
    public string Action { get; set; } = "EDIT";
    public List<long> ParticipantUserIds { get; set; } = new();
}

public sealed class ValidateScheduleRequest
{
    [Range(1, long.MaxValue)] public long CollegeId { get; set; }
    [Required] public string Title { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public long? ClassroomId { get; set; }
    public long? ExcludeEventId { get; set; }
    public long? ExcludeMeetingId { get; set; }
}

public sealed class ValidationIssueDto
{
    public string Code { get; set; } = string.Empty;
    public string Severity { get; set; } = "ERROR";
    public string Message { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public long? EntityId { get; set; }
}

public sealed class MeetingEventValidationResultDto
{
    public string EntityType { get; set; } = string.Empty;
    public long EntityId { get; set; }
    public bool IsValid { get; set; }
    public DateTime ValidatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<ValidationIssueDto> Issues { get; set; } = new();
}
