using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.StudentAttendance;

public sealed class CreateAttendanceSessionRequest
{
    // Required only for SUPER_ADMIN because normal users already carry collegeId in JWT.
    [Range(1, long.MaxValue)]
    public long? CollegeId { get; set; }

    [Range(1, long.MaxValue)]
    public long AcademicYearId { get; set; }

    [Range(1, long.MaxValue)]
    public long SemesterId { get; set; }

    [Range(1, long.MaxValue)]
    public long SectionId { get; set; }

    [Range(1, long.MaxValue)]
    public long SubjectId { get; set; }

    [Range(1, long.MaxValue)]
    public long FacultyId { get; set; }

    [Range(1, long.MaxValue)]
    public long? TimetableId { get; set; }

    [Range(1, long.MaxValue)]
    public long? TimetableEntryId { get; set; }

    [Range(1, long.MaxValue)]
    public long? TimetableSlotId { get; set; }

    public DateTime AttendanceDate { get; set; }

    [StringLength(500)]
    public string? Remarks { get; set; }
}

public sealed class AttendanceMarkItemRequest
{
    [Range(1, long.MaxValue)]
    public long StudentId { get; set; }

    [Required]
    [StringLength(30)]
    public string AttendanceStatus { get; set; } = "PRESENT";

    [StringLength(500)]
    public string? Remarks { get; set; }
}

public sealed class MarkAttendanceRequest
{
    public List<AttendanceMarkItemRequest> Students { get; set; } = new();

    // When true, active students in the section who are not sent in Students
    // are automatically marked ABSENT before the supplied marks are applied.
    public bool MarkUnlistedAsAbsent { get; set; }

    // Optional convenience: close the session after marking.
    public bool CompleteSession { get; set; }
}

public sealed class UpdateAttendanceSessionStatusRequest
{
    [Required]
    [StringLength(30)]
    public string SessionStatus { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Remarks { get; set; }
}
