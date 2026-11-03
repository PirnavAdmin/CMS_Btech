using System.ComponentModel.DataAnnotations;

namespace BTech.EventManagement;

public sealed class EventRequest
{
    [Range(1, long.MaxValue)] public long? CollegeId { get; set; }
    [Range(1, long.MaxValue)] public long? AcademicYearId { get; set; }
    [Range(1, long.MaxValue)] public long? DepartmentId { get; set; }
    [Range(1, long.MaxValue)] public long? OrganizerUserId { get; set; }
    [Required, StringLength(50)] public string EventCode { get; set; } = "";
    [Required, StringLength(200)] public string EventName { get; set; } = "";
    [Required] public string EventType { get; set; } = "OTHER";
    [StringLength(16000)] public string? Description { get; set; }
    [StringLength(255)] public string? Venue { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public DateTime? RegistrationOpensAt { get; set; }
    public DateTime? RegistrationClosesAt { get; set; }
    [Range(1, int.MaxValue)] public int? MaxParticipants { get; set; }
    [Range(typeof(decimal), "0", "9999999999.99")] public decimal RegistrationFee { get; set; }
    public bool CertificateEnabled { get; set; }
    [StringLength(500)] public string? BannerPath { get; set; }
    [Required] public string Status { get; set; } = "DRAFT";
}
public sealed class RegistrationRequest
{
    [Required] public string ParticipantType { get; set; } = "STUDENT";
    [Range(1, long.MaxValue)] public long? StudentId { get; set; }
    [Range(1, long.MaxValue)] public long? UserId { get; set; }
    [StringLength(150)] public string? ParticipantName { get; set; }
    [EmailAddress, StringLength(150)] public string? Email { get; set; }
    [StringLength(20)] public string? Mobile { get; set; }
    [StringLength(1000)] public string? Remarks { get; set; }
}
public sealed class EventStatusRequest
{
    [Required] public string Status { get; set; } = "";
}
public sealed class AttendanceRequest
{
    [Required] public string AttendanceStatus { get; set; } = "PRESENT";
    public DateTime? CheckedInAt { get; set; }
}
public sealed class ScheduleRequest
{
    [Required, StringLength(50)] public string SessionCode { get; set; } = "";
    [Required, StringLength(200)] public string SessionTitle { get; set; } = "";
    [StringLength(16000)] public string? Description { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    [Range(1, long.MaxValue)] public long? ClassroomId { get; set; }
    [StringLength(255)] public string? Venue { get; set; }
    [StringLength(150)] public string? SpeakerName { get; set; }
    [Range(1, long.MaxValue)] public long? SpeakerUserId { get; set; }
    [Range(0, int.MaxValue)] public int DisplayOrder { get; set; }
    [Required] public string Status { get; set; } = "SCHEDULED";
}
public sealed class CertificateRequest
{
    [Range(1, long.MaxValue)] public long RegistrationId { get; set; }
    [Required] public string CertificateType { get; set; } = "PARTICIPATION";
    [Required, StringLength(255)] public string Title { get; set; } = "Certificate of Participation";
}
public sealed class RevokeCertificateRequest
{
    [Required, StringLength(1000)] public string Reason { get; set; } = "";
}
public sealed class GalleryRequest
{
    [Required, StringLength(50)] public string MediaCode { get; set; } = "";
    [Required] public string MediaType { get; set; } = "IMAGE";
    [Required, StringLength(200)] public string Title { get; set; } = "";
    [StringLength(1000)] public string? Caption { get; set; }
    [Range(0, int.MaxValue)] public int DisplayOrder { get; set; }
    [Required] public string Status { get; set; } = "DRAFT";
}
public sealed class GalleryUploadRequest
{
    [Required] public IFormFile File { get; set; } = null!;
}
public sealed record EventActor(long UserId, long? TokenCollegeId);
public sealed class EventApiException : Exception
{
    public int StatusCode { get; }
    public EventApiException(int statusCode, string message) : base(message) => StatusCode = statusCode;
}
