namespace BTech.DTOs.TimetableManagement;

public sealed class AutomaticPeriodSetupRequest
{
    public long AcademicYearId { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int PeriodDurationMinutes { get; set; }
    public List<string> WorkingDays { get; set; } = new();
    public List<AutomaticBreakRequest> Breaks { get; set; } = new();
}

public sealed class AutomaticBreakRequest
{
    public string Type { get; set; } = "BREAK";
    public int AfterPeriod { get; set; }
    public int DurationMinutes { get; set; }
    public string? Name { get; set; }
}

public sealed class PeriodConfigurationRequest
{
    public long AcademicYearId { get; set; }
    public int? PeriodNumber { get; set; }
    public string PeriodName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string PeriodType { get; set; } = "CLASS";
    public int DisplayOrder { get; set; }
    public bool Active { get; set; } = true;
}

public sealed class PeriodReorderRequest
{
    public long AcademicYearId { get; set; }
    public List<long> PeriodIds { get; set; } = new();
}

public sealed class PeriodConfigurationDto
{
    public long PeriodId { get; set; }
    public long AcademicYearId { get; set; }
    public int? PeriodNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string Type { get; set; } = "CLASS";
    public int DisplayOrder { get; set; }
    public bool Active { get; set; }
}

public sealed class CalendarConfigurationRequest
{
    public long AcademicYearId { get; set; }
    public bool Reviewed { get; set; }
    public List<string> WorkingDays { get; set; } = new();
    public List<CalendarExceptionRequest> Holidays { get; set; } = new();
}

public sealed class CalendarExceptionRequest
{
    public DateTime Date { get; set; }
    public string Type { get; set; } = "HOLIDAY";
    public string? Description { get; set; }
}

public sealed class CalendarConfigurationDto
{
    public long AcademicYearId { get; set; }
    public DateTime AcademicYearStartDate { get; set; }
    public DateTime AcademicYearEndDate { get; set; }
    public bool Reviewed { get; set; }
    public List<string> WorkingDays { get; set; } = new();
    public List<CalendarExceptionDto> Holidays { get; set; } = new();
}

public sealed class CalendarExceptionDto
{
    public long CalendarDayId { get; set; }
    public DateTime Date { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public sealed class ClassroomRequest
{
    public long CollegeId { get; set; }
    public string ClassroomCode { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public string? RoomType { get; set; }
    public int? Capacity { get; set; }
    public bool Active { get; set; } = true;
}

public sealed class ClassroomDto
{
    public long ClassroomId { get; set; }
    public long CollegeId { get; set; }
    public string ClassroomCode { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public string? RoomType { get; set; }
    public int? Capacity { get; set; }
    public bool Active { get; set; }
}

public sealed class CreateAdvancedTimetableRequest
{
    public long AcademicYearId { get; set; }
    public long CourseId { get; set; }
    public long BranchId { get; set; }
    public long SemesterId { get; set; }
    public long SectionId { get; set; }
    public string TimetableName { get; set; } = string.Empty;
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
}

public sealed class UpdateAdvancedTimetableRequest
{
    public string TimetableName { get; set; } = string.Empty;
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
}

public sealed class TimetableRequirementRequest
{
    public long SubjectId { get; set; }
    public int PeriodsPerWeek { get; set; }
    public int BlockSize { get; set; } = 1;
}

public sealed class SaveTimetableRequirementsRequest
{
    public List<TimetableRequirementRequest> Requirements { get; set; } = new();
}

public sealed class TimetableRequirementDto
{
    public long SubjectId { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string? SubjectType { get; set; }
    public int PeriodsPerWeek { get; set; }
    public int BlockSize { get; set; }
    public string Source { get; set; } = string.Empty;
    public List<FacultyOptionDto> Faculty { get; set; } = new();
}

public sealed class FacultyOptionDto
{
    public long FacultyId { get; set; }
    public string FacultyCode { get; set; } = string.Empty;
    public string FacultyName { get; set; } = string.Empty;
    public int AllocatedPeriodsPerWeek { get; set; }
}

public sealed class GenerateTimetableRequest
{
    public bool ReplaceGenerated { get; set; } = true;
    public List<long> ClassroomIds { get; set; } = new();
}

public sealed class ManualTimetableEntryRequest
{
    public string DayOfWeek { get; set; } = string.Empty;
    public long SubjectId { get; set; }
    public long FacultyId { get; set; }
    public long ClassroomId { get; set; }
    public long TimetableSlotId { get; set; }
    public List<long> TimetableSlotIds { get; set; } = new();
    public string EntryType { get; set; } = "LECTURE";
}

public sealed class MoveTimetableEntryRequest
{
    public string DayOfWeek { get; set; } = string.Empty;
    public long TimetableSlotId { get; set; }
    public long? ClassroomId { get; set; }
}

public sealed class TimetableMasterDto
{
    public long TimetableId { get; set; }
    public long AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = string.Empty;
    public long CourseId { get; set; }
    public string CourseName { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public long SemesterId { get; set; }
    public string SemesterName { get; set; } = string.Empty;
    public long SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public int SectionCapacity { get; set; }
    public long CollegeId { get; set; }
    public string TimetableName { get; set; } = string.Empty;
    public string Status { get; set; } = "DRAFT";
    public DateTime? EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int Revision { get; set; }
}

public sealed class TimetableSlotDto
{
    public long TimetableSlotId { get; set; }
    public int SlotNumber { get; set; }
    public string SlotName { get; set; } = string.Empty;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public bool Active { get; set; }
}

public sealed class TimetableEntryDto
{
    public long TimetableEntryId { get; set; }
    public long TimetableId { get; set; }
    public long TimetableSlotId { get; set; }
    public int SlotNumber { get; set; }
    public string SlotName { get; set; } = string.Empty;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
    public long SubjectId { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public long FacultyId { get; set; }
    public string FacultyCode { get; set; } = string.Empty;
    public string FacultyName { get; set; } = string.Empty;
    public long SectionId { get; set; }
    public string SectionName { get; set; } = string.Empty;
    public long? ClassroomId { get; set; }
    public string? ClassroomCode { get; set; }
    public string? ClassroomName { get; set; }
    public string? Classroom { get; set; }
    public string EntryType { get; set; } = string.Empty;
    public string GeneratedSource { get; set; } = "MANUAL";
    public string? ScheduleGroupKey { get; set; }
    public bool Active { get; set; }
}

public sealed class TimetableDetailDto
{
    public TimetableMasterDto Timetable { get; set; } = new();
    public List<TimetableSlotDto> Slots { get; set; } = new();
    public List<TimetableRequirementDto> Requirements { get; set; } = new();
    public List<TimetableEntryDto> Entries { get; set; } = new();
}

public sealed class TimetableConflictDto
{
    public string Type { get; set; } = string.Empty;
    public long? FacultyId { get; set; }
    public long? ClassroomId { get; set; }
    public long? SectionId { get; set; }
    public long? ConflictingEntryId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public sealed class TimetableUnscheduledDto
{
    public long SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string ReasonCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public sealed class TimetableValidationDto
{
    public bool Valid { get; set; }
    public List<TimetableConflictDto> Conflicts { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public List<TimetableUnscheduledDto> Unscheduled { get; set; } = new();
}

public sealed class TimetableGenerationResultDto
{
    public long TimetableId { get; set; }
    public int ScheduledCount { get; set; }
    public int AddedCount { get; set; }
    public List<TimetableUnscheduledDto> Unscheduled { get; set; } = new();
    public List<TimetableConflictDto> Conflicts { get; set; } = new();
    public TimetableDetailDto? Timetable { get; set; }
}

public sealed class TimetableViewRowDto
{
    public long TimetableId { get; set; }
    public long TimetableEntryId { get; set; }
    public long AcademicYearId { get; set; }
    public string AcademicYearName { get; set; } = string.Empty;
    public long CourseId { get; set; }
    public string CourseName { get; set; } = string.Empty;
    public long BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public long SemesterId { get; set; }
    public string SemesterName { get; set; } = string.Empty;
    public long SectionId { get; set; }
    public int SectionCapacity { get; set; }
    public string SectionCode { get; set; } = string.Empty;
    public string SectionName { get; set; } = string.Empty;
    public long SubjectId { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public long FacultyId { get; set; }
    public string FacultyCode { get; set; } = string.Empty;
    public string FacultyName { get; set; } = string.Empty;
    public long? ClassroomId { get; set; }
    public string? ClassroomCode { get; set; }
    public string? ClassroomName { get; set; }
    public string DayOfWeek { get; set; } = string.Empty;
    public long TimetableSlotId { get; set; }
    public int SlotNumber { get; set; }
    public string SlotName { get; set; } = string.Empty;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string EntryType { get; set; } = string.Empty;
}

public sealed class DateOccurrenceResponse
{
    public DateTime Date { get; set; }
    public bool WorkingDay { get; set; }
    public string? ExceptionType { get; set; }
    public string? ExceptionDescription { get; set; }
    public List<TimetableViewRowDto> Classes { get; set; } = new();
}


public sealed class TimetableStatusDto
{
    public long TimetableId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Revision { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public bool CanGenerate { get; set; }
    public bool CanGenerateMissing { get; set; }
    public bool CanRegenerate { get; set; }
    public bool CanValidate { get; set; }
    public bool CanPublish { get; set; }
    public bool CanReopen { get; set; }
}

public sealed class TimetableRoomAvailabilityDto
{
    public long ClassroomId { get; set; }
    public long CollegeId { get; set; }
    public string ClassroomCode { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public string? RoomType { get; set; }
    public int? Capacity { get; set; }
    public bool Available { get; set; }
    public long? ConflictingTimetableId { get; set; }
    public long? ConflictingEntryId { get; set; }
    public string? ConflictTimetableName { get; set; }
}
