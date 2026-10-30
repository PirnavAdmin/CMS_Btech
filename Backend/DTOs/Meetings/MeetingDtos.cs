using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Meetings;

public sealed class MeetingDto
{
    public long MeetingId { get; set; }
    public long CollegeId { get; set; }
    public string MeetingCode { get; set; } = "";
    public string Title { get; set; } = "";
    public string? MeetingType { get; set; }
    public string? Description { get; set; }
    public DateTime MeetingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public string? Venue { get; set; }
    public long? OrganizerId { get; set; }
    public string Status { get; set; } = "SCHEDULED";
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class SaveMeetingRequest
{
    [Required, StringLength(50)] public string MeetingCode { get; set; } = "";
    [Required, StringLength(250)] public string Title { get; set; } = "";
    [StringLength(50)] public string? MeetingType { get; set; }
    [StringLength(1000)] public string? Description { get; set; }
    public DateTime MeetingDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    [StringLength(250)] public string? Venue { get; set; }
    public long? OrganizerId { get; set; }
    public string Status { get; set; } = "SCHEDULED";
    [StringLength(500)] public string? Remarks { get; set; }
}

public sealed class MeetingParticipantDto
{
    public long ParticipantId { get; set; }
    public long MeetingId { get; set; }
    public long UserId { get; set; }
    public string UserName { get; set; } = "";
    public string? Email { get; set; }
    public string? ParticipantRole { get; set; }
    public string InvitationStatus { get; set; } = "INVITED";
    public bool IsRequired { get; set; }
    public DateTime? ResponseAt { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class SaveMeetingParticipantRequest
{
    [Range(1, long.MaxValue)] public long UserId { get; set; }
    [StringLength(50)] public string? ParticipantRole { get; set; }
    public string InvitationStatus { get; set; } = "INVITED";
    public bool IsRequired { get; set; } = true;
    [StringLength(500)] public string? Remarks { get; set; }
}

public sealed class MeetingAttendanceDto
{
    public long AttendanceId { get; set; }
    public long MeetingId { get; set; }
    public long ParticipantId { get; set; }
    public long UserId { get; set; }
    public string UserName { get; set; } = "";
    public string AttendanceStatus { get; set; } = "PENDING";
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class SaveMeetingAttendanceRequest
{
    [Range(1, long.MaxValue)] public long ParticipantId { get; set; }
    public string AttendanceStatus { get; set; } = "PENDING";
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    [StringLength(500)] public string? Remarks { get; set; }
}

public sealed class MeetingMinutesDto
{
    public long MinutesId { get; set; }
    public long MeetingId { get; set; }
    public string? MinutesTitle { get; set; }
    public string MinutesText { get; set; } = "";
    public long? PreparedBy { get; set; }
    public long? ApprovedBy { get; set; }
    public string ApprovalStatus { get; set; } = "DRAFT";
    public DateTime? ApprovedAt { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class SaveMeetingMinutesRequest
{
    [StringLength(250)] public string? MinutesTitle { get; set; }
    [Required] public string MinutesText { get; set; } = "";
    public long? PreparedBy { get; set; }
    public long? ApprovedBy { get; set; }
    public string ApprovalStatus { get; set; } = "DRAFT";
    [StringLength(500)] public string? Remarks { get; set; }
}

public sealed class MeetingDocumentDto
{
    public long MeetingDocumentId { get; set; }
    public long MeetingId { get; set; }
    public long? DocumentId { get; set; }
    public string DocumentTitle { get; set; } = "";
    public string? DocumentType { get; set; }
    public string? FileName { get; set; }
    public string? FilePath { get; set; }
    public string? FileUrl { get; set; }
    public string? MimeType { get; set; }
    public long? FileSize { get; set; }
    public long? UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? Remarks { get; set; }
}

public sealed class SaveMeetingDocumentRequest
{
    public long? DocumentId { get; set; }
    [Required, StringLength(250)] public string DocumentTitle { get; set; } = "";
    [StringLength(50)] public string? DocumentType { get; set; }
    [StringLength(255)] public string? FileName { get; set; }
    [StringLength(500)] public string? FilePath { get; set; }
    [StringLength(500)] public string? FileUrl { get; set; }
    [StringLength(150)] public string? MimeType { get; set; }
    [Range(0, long.MaxValue)] public long? FileSize { get; set; }
    [StringLength(500)] public string? Remarks { get; set; }
}
