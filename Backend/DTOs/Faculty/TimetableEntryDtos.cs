using System.ComponentModel.DataAnnotations;

namespace BTech.Task_TimetableEntries.DTOs;

public class CreateTimetableEntryRequest
{
    [Range(1, long.MaxValue)]
    public long TimetableId { get; set; }

    [Range(1, long.MaxValue)]
    public long TimetableSlotId { get; set; }

    [Range(1, long.MaxValue)]
    public long FacultyId { get; set; }

    [Range(1, long.MaxValue)]
    public long SubjectId { get; set; }

    [Range(1, long.MaxValue)]
    public long SectionId { get; set; }

    [Required]
    public string DayOfWeek { get; set; } = string.Empty;

    public string? Classroom { get; set; }
    public string EntryType { get; set; } = "LECTURE";
    public long? CreatedBy { get; set; }
}

public sealed class UpdateTimetableEntryRequest : CreateTimetableEntryRequest
{
    public bool Status { get; set; } = true;
    public long? UpdatedBy { get; set; }
}

public sealed class TimetableEntryResponse
{
    public long TimetableEntryId { get; set; }
    public long TimetableId { get; set; }
    public string? TimetableName { get; set; }
    public long TimetableSlotId { get; set; }
    public int SlotNumber { get; set; }
    public string? SlotName { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public long FacultyId { get; set; }
    public string? FacultyCode { get; set; }
    public string? FacultyName { get; set; }
    public long SubjectId { get; set; }
    public long SectionId { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
    public string? Classroom { get; set; }
    public string EntryType { get; set; } = string.Empty;
    public bool Status { get; set; }
}
