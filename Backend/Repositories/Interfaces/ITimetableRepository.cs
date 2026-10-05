using BTech.DTOs;
using BTech.DTOs.TimetableManagement;

namespace BTech.Repositories.Interfaces;

public interface ITimetableRepository
{
    Task<IReadOnlyList<PeriodConfigurationDto>> GetPeriodsAsync(long academicYearId);
    Task<IReadOnlyList<PeriodConfigurationDto>> GenerateAutomaticPeriodsAsync(AutomaticPeriodSetupRequest request, long? actorId);
    Task<long> CreatePeriodAsync(PeriodConfigurationRequest request, long? actorId);
    Task UpdatePeriodAsync(long periodId, PeriodConfigurationRequest request, long? actorId);
    Task DeletePeriodAsync(long periodId, long? actorId);
    Task ReorderPeriodsAsync(PeriodReorderRequest request, long? actorId);

    Task<CalendarConfigurationDto> GetCalendarAsync(long academicYearId);
    Task<CalendarConfigurationDto> SaveCalendarAsync(CalendarConfigurationRequest request, long? actorId);

    Task<IReadOnlyList<ClassroomDto>> GetClassroomsAsync(long? collegeId, bool activeOnly);
    Task<long> CreateClassroomAsync(ClassroomRequest request, long? actorId);
    Task UpdateClassroomAsync(long classroomId, ClassroomRequest request, long? actorId);

    Task<IReadOnlyList<TimetableMasterDto>> ListTimetablesAsync(
        long? academicYearId, long? courseId, long? branchId, long? semesterId,
        long? sectionId, string? status, long? collegeId, bool isSuperAdmin);

    Task<TimetableDetailDto?> GetTimetableAsync(long timetableId, long? collegeId, bool isSuperAdmin);
    Task<long> CreateTimetableAsync(CreateAdvancedTimetableRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task UpdateTimetableAsync(long timetableId, UpdateAdvancedTimetableRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableSlotDto>> SyncSlotsAsync(long timetableId, long? actorId, long? collegeId, bool isSuperAdmin);

    Task<IReadOnlyList<TimetableRequirementDto>> GetRequirementsAsync(long timetableId, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableRequirementDto>> SaveRequirementsAsync(long timetableId, SaveTimetableRequirementsRequest request, long? actorId, long? collegeId, bool isSuperAdmin);

    Task<TimetableStatusDto> GetStatusAsync(long timetableId, long? tokenCollegeId, bool isSuperAdmin);
    Task<TimetableGenerationResultDto> RegenerateAsync(long timetableId, GenerateTimetableRequest request, long? actorId, long? tokenCollegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableRoomAvailabilityDto>> GetRoomAvailabilityAsync(long timetableId, long timetableSlotId, string dayOfWeek, long? tokenCollegeId, bool isSuperAdmin);
    Task<TimetableValidationDto> ValidateGlobalAsync(long timetableId, long? tokenCollegeId, bool isSuperAdmin);

    Task<TimetableGenerationResultDto> GenerateAsync(long timetableId, GenerateTimetableRequest request, bool missingOnly, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<TimetableValidationDto> ValidateAsync(long timetableId, long? collegeId, bool isSuperAdmin);
    Task PublishAsync(long timetableId, long? actorId, long? collegeId, bool isSuperAdmin);
    Task ReopenAsync(long timetableId, long? actorId, long? collegeId, bool isSuperAdmin);

    Task<IReadOnlyList<TimetableEntryDto>> AddEntryAsync(long timetableId, ManualTimetableEntryRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task UpdateEntryAsync(long timetableId, long entryId, ManualTimetableEntryRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task MoveEntryAsync(long timetableId, long entryId, MoveTimetableEntryRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task DeleteEntryAsync(long timetableId, long entryId, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableEntryDto>> ListEntriesAsync(long? timetableId, long? facultyId, string? dayOfWeek, long? collegeId, bool isSuperAdmin);

    Task<IReadOnlyList<TimetableViewRowDto>> GetFacultyViewAsync(long facultyId, long? academicYearId, DateTime? date, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableViewRowDto>> GetStudentViewAsync(long studentId, long? academicYearId, DateTime? date, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableViewRowDto>> GetClassroomViewAsync(long classroomId, long? academicYearId, DateTime? date, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableViewRowDto>> GetSectionViewAsync(long sectionId, long? academicYearId, DateTime? date, long? collegeId, bool isSuperAdmin);
    Task<DateOccurrenceResponse> GetOccurrencesAsync(DateTime date, long? sectionId, long? facultyId, long? classroomId, long? collegeId, bool isSuperAdmin);

    // Compatibility API used by the original /api/v1/timetables endpoints.
    Task<long> LegacyCreateAsync(TimetableCreateRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task LegacyUpdateAsync(long timetableId, TimetableUpdateRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableViewRowDto>> LegacyListAsync(long? semesterId, long? branchId, long? sectionId, long? facultyId, string? dayOfWeek, byte? published, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<TimetableEntryDto>> LegacyCreateEntryAsync(CreateTimetableEntryRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task LegacyUpdateEntryAsync(long entryId, CreateTimetableEntryRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task LegacyDeleteEntryAsync(long entryId, long? actorId, long? collegeId, bool isSuperAdmin);
}
