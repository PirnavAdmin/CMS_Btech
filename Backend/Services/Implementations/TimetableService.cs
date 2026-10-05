using BTech.DTOs;
using BTech.DTOs.TimetableManagement;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class TimetableService : ITimetableService
{
    private readonly ITimetableRepository _repository;

    public TimetableService(ITimetableRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<PeriodConfigurationDto>> GetPeriodsAsync(long academicYearId)
    {
        RequirePositive(academicYearId, nameof(academicYearId));
        return _repository.GetPeriodsAsync(academicYearId);
    }

    public Task<IReadOnlyList<PeriodConfigurationDto>> GenerateAutomaticPeriodsAsync(AutomaticPeriodSetupRequest r, long? actor)
    {
        RequirePositive(r.AcademicYearId, nameof(r.AcademicYearId));
        if (!TimeSpan.TryParse(r.StartTime, out var start) || !TimeSpan.TryParse(r.EndTime, out var end) || start >= end)
            throw new ArgumentException("StartTime and EndTime must be valid and EndTime must be later than StartTime.");
        if (r.PeriodDurationMinutes <= 0) throw new ArgumentException("PeriodDurationMinutes must be greater than zero.");
        return _repository.GenerateAutomaticPeriodsAsync(r, actor);
    }

    public Task<long> CreatePeriodAsync(PeriodConfigurationRequest r, long? actor)
    {
        ValidatePeriod(r);
        return _repository.CreatePeriodAsync(r, actor);
    }

    public Task UpdatePeriodAsync(long id, PeriodConfigurationRequest r, long? actor)
    {
        RequirePositive(id, nameof(id)); ValidatePeriod(r);
        return _repository.UpdatePeriodAsync(id, r, actor);
    }

    public Task DeletePeriodAsync(long id, long? actor) { RequirePositive(id, nameof(id)); return _repository.DeletePeriodAsync(id, actor); }
    public Task ReorderPeriodsAsync(PeriodReorderRequest r, long? actor)
    {
        RequirePositive(r.AcademicYearId, nameof(r.AcademicYearId));
        if (r.PeriodIds is null || r.PeriodIds.Count == 0) throw new ArgumentException("At least one period is required.");
        return _repository.ReorderPeriodsAsync(r, actor);
    }

    public Task<CalendarConfigurationDto> GetCalendarAsync(long id) { RequirePositive(id, nameof(id)); return _repository.GetCalendarAsync(id); }
    public Task<CalendarConfigurationDto> SaveCalendarAsync(CalendarConfigurationRequest r, long? actor)
    {
        RequirePositive(r.AcademicYearId, nameof(r.AcademicYearId));
        return _repository.SaveCalendarAsync(r, actor);
    }

    public Task<IReadOnlyList<ClassroomDto>> GetClassroomsAsync(long? collegeId, bool activeOnly)
        => _repository.GetClassroomsAsync(collegeId, activeOnly);

    public Task<long> CreateClassroomAsync(ClassroomRequest r, long? actor)
    {
        if (r.CollegeId <= 0) throw new ArgumentException("CollegeId is required.");
        if (string.IsNullOrWhiteSpace(r.ClassroomCode) || string.IsNullOrWhiteSpace(r.ClassroomName))
            throw new ArgumentException("ClassroomCode and ClassroomName are required.");
        return _repository.CreateClassroomAsync(r, actor);
    }

    public Task UpdateClassroomAsync(long id, ClassroomRequest r, long? actor)
    {
        RequirePositive(id, nameof(id));
        if (r.CollegeId <= 0) throw new ArgumentException("CollegeId is required.");
        return _repository.UpdateClassroomAsync(id, r, actor);
    }

    public Task<IReadOnlyList<TimetableMasterDto>> ListTimetablesAsync(long? ay,long? course,long? branch,long? sem,long? section,string? status,long? college,bool superAdmin)
        => _repository.ListTimetablesAsync(ay,course,branch,sem,section,status,college,superAdmin);

    public async Task<TimetableDetailDto> GetTimetableAsync(long id,long? college,bool superAdmin)
        => await _repository.GetTimetableAsync(id,college,superAdmin) ?? throw new KeyNotFoundException("Timetable not found.");

    public Task<long> CreateTimetableAsync(CreateAdvancedTimetableRequest r,long? actor,long? college,bool superAdmin)
    {
        ValidateCreateTimetable(r);
        return _repository.CreateTimetableAsync(r,actor,college,superAdmin);
    }

    public Task UpdateTimetableAsync(long id,UpdateAdvancedTimetableRequest r,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id));
        if (string.IsNullOrWhiteSpace(r.TimetableName)) throw new ArgumentException("TimetableName is required.");
        if (r.EffectiveFrom.HasValue && r.EffectiveTo.HasValue && r.EffectiveFrom > r.EffectiveTo)
            throw new ArgumentException("EffectiveFrom cannot be after EffectiveTo.");
        return _repository.UpdateTimetableAsync(id,r,actor,college,superAdmin);
    }

    public Task<IReadOnlyList<TimetableSlotDto>> SyncSlotsAsync(long id,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id)); return _repository.SyncSlotsAsync(id,actor,college,superAdmin);
    }

    public Task<IReadOnlyList<TimetableRequirementDto>> GetRequirementsAsync(long id,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id)); return _repository.GetRequirementsAsync(id,college,superAdmin);
    }

    public Task<IReadOnlyList<TimetableRequirementDto>> SaveRequirementsAsync(long id,SaveTimetableRequirementsRequest r,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id));
        if (r.Requirements is null) throw new ArgumentException("Requirements cannot be null.");
        foreach(var x in r.Requirements)
        {
            if(x.SubjectId<=0 || x.PeriodsPerWeek<=0 || x.BlockSize<=0)
                throw new ArgumentException("Each requirement needs SubjectId, positive PeriodsPerWeek and positive BlockSize.");
        }
        return _repository.SaveRequirementsAsync(id,r,actor,college,superAdmin);
    }

    public Task<TimetableStatusDto> GetStatusAsync(long id,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id));
        return _repository.GetStatusAsync(id,college,superAdmin);
    }

    public async Task<TimetableGenerationResultDto> RegenerateAsync(long id,GenerateTimetableRequest r,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id));
        r ??= new GenerateTimetableRequest();
        r.ReplaceGenerated = true;
        return await _repository.RegenerateAsync(id,r,actor,college,superAdmin);
    }

    public Task<IReadOnlyList<TimetableRoomAvailabilityDto>> GetRoomAvailabilityAsync(long id,long slotId,string day,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id));
        RequirePositive(slotId,nameof(slotId));
        if(string.IsNullOrWhiteSpace(day)) throw new ArgumentException("DayOfWeek is required.");
        return _repository.GetRoomAvailabilityAsync(id,slotId,day,college,superAdmin);
    }

    public Task<TimetableValidationDto> ValidateGlobalAsync(long id,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id));
        return _repository.ValidateGlobalAsync(id,college,superAdmin);
    }

    public async Task<TimetableGenerationResultDto> GenerateAsync(long id,GenerateTimetableRequest r,bool missingOnly,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id));
        var result=await _repository.GenerateAsync(id,r,missingOnly,actor,college,superAdmin);
        return result;
    }

    public Task<TimetableValidationDto> ValidateAsync(long id,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id)); return _repository.ValidateAsync(id,college,superAdmin);
    }
    public Task PublishAsync(long id,long? actor,long? college,bool superAdmin) => _repository.PublishAsync(id,actor,college,superAdmin);
    public Task ReopenAsync(long id,long? actor,long? college,bool superAdmin) => _repository.ReopenAsync(id,actor,college,superAdmin);

    public Task<IReadOnlyList<TimetableEntryDto>> AddEntryAsync(long id,ManualTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        ValidateEntry(r);
        return _repository.AddEntryAsync(id,r,actor,college,superAdmin);
    }

    public Task UpdateEntryAsync(long id,long entryId,ManualTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id)); RequirePositive(entryId,nameof(entryId)); ValidateEntry(r);
        return _repository.UpdateEntryAsync(id,entryId,r,actor,college,superAdmin);
    }

    public Task MoveEntryAsync(long id,long entryId,MoveTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id)); RequirePositive(entryId,nameof(entryId));
        if(string.IsNullOrWhiteSpace(r.DayOfWeek) || r.TimetableSlotId<=0) throw new ArgumentException("DayOfWeek and TimetableSlotId are required.");
        return _repository.MoveEntryAsync(id,entryId,r,actor,college,superAdmin);
    }

    public Task DeleteEntryAsync(long id,long entryId,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id)); RequirePositive(entryId,nameof(entryId));
        return _repository.DeleteEntryAsync(id,entryId,actor,college,superAdmin);
    }

    public Task<IReadOnlyList<TimetableEntryDto>> ListEntriesAsync(long? timetableId,long? facultyId,string? day,long? college,bool superAdmin)
        => _repository.ListEntriesAsync(timetableId,facultyId,day,college,superAdmin);

    public Task<IReadOnlyList<TimetableViewRowDto>> GetFacultyViewAsync(long id,long? ay,DateTime? date,long? college,bool superAdmin)
        => _repository.GetFacultyViewAsync(id,ay,date,college,superAdmin);
    public Task<IReadOnlyList<TimetableViewRowDto>> GetStudentViewAsync(long id,long? ay,DateTime? date,long? college,bool superAdmin)
        => _repository.GetStudentViewAsync(id,ay,date,college,superAdmin);
    public Task<IReadOnlyList<TimetableViewRowDto>> GetClassroomViewAsync(long id,long? ay,DateTime? date,long? college,bool superAdmin)
        => _repository.GetClassroomViewAsync(id,ay,date,college,superAdmin);
    public Task<IReadOnlyList<TimetableViewRowDto>> GetSectionViewAsync(long id,long? ay,DateTime? date,long? college,bool superAdmin)
        => _repository.GetSectionViewAsync(id,ay,date,college,superAdmin);
    public Task<DateOccurrenceResponse> GetOccurrencesAsync(DateTime date,long? section,long? faculty,long? classroom,long? college,bool superAdmin)
        => _repository.GetOccurrencesAsync(date,section,faculty,classroom,college,superAdmin);

    public Task<long> LegacyCreateAsync(TimetableCreateRequest r,long? actor,long? college,bool superAdmin)
    {
        if(!TimeSpan.TryParse(r.StartTime,out var start)||!TimeSpan.TryParse(r.EndTime,out var end)||start>=end)
            throw new ArgumentException("StartTime and EndTime must be valid and EndTime must be later than StartTime.");
        if(r.AcademicYearId<=0||r.SemesterId<=0||r.SectionId<=0||r.SubjectId<=0||r.FacultyId<=0)
            throw new ArgumentException("AcademicYearId, SemesterId, SectionId, SubjectId and FacultyId are required.");
        return _repository.LegacyCreateAsync(r,actor,college,superAdmin);
    }

    public Task LegacyUpdateAsync(long id,TimetableUpdateRequest r,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id));
        if(!TimeSpan.TryParse(r.StartTime,out var start)||!TimeSpan.TryParse(r.EndTime,out var end)||start>=end)
            throw new ArgumentException("StartTime and EndTime must be valid and EndTime must be later than StartTime.");
        return _repository.LegacyUpdateAsync(id,r,actor,college,superAdmin);
    }

    public Task<IReadOnlyList<TimetableViewRowDto>> LegacyListAsync(long? sem,long? branch,long? section,long? faculty,string? day,byte? published,long? college,bool superAdmin)
        => _repository.LegacyListAsync(sem,branch,section,faculty,day,published,college,superAdmin);

    public Task<IReadOnlyList<TimetableEntryDto>> LegacyCreateEntryAsync(CreateTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        if(r.TimetableId<=0||r.TimetableSlotId<=0||r.FacultyId<=0||r.SubjectId<=0||r.SectionId<=0)
            throw new ArgumentException("TimetableId, TimetableSlotId, FacultyId, SubjectId and SectionId are required.");
        return _repository.LegacyCreateEntryAsync(r,actor,college,superAdmin);
    }

    public Task LegacyUpdateEntryAsync(long id,CreateTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id)); return _repository.LegacyUpdateEntryAsync(id,r,actor,college,superAdmin);
    }

    public Task LegacyDeleteEntryAsync(long id,long? actor,long? college,bool superAdmin)
    {
        RequirePositive(id,nameof(id)); return _repository.LegacyDeleteEntryAsync(id,actor,college,superAdmin);
    }

    private static void ValidatePeriod(PeriodConfigurationRequest r)
    {
        if(r.AcademicYearId<=0||string.IsNullOrWhiteSpace(r.PeriodName)||r.DisplayOrder<=0)
            throw new ArgumentException("AcademicYearId, PeriodName and DisplayOrder are required.");
        if(!TimeSpan.TryParse(r.StartTime,out var s)||!TimeSpan.TryParse(r.EndTime,out var e)||s>=e)
            throw new ArgumentException("StartTime and EndTime must be valid and EndTime must be later than StartTime.");
    }
    private static void ValidateCreateTimetable(CreateAdvancedTimetableRequest r)
    {
        if(r.AcademicYearId<=0||r.SemesterId<=0||r.SectionId<=0)
            throw new ArgumentException("AcademicYearId, SemesterId and SectionId are required.");
        if(string.IsNullOrWhiteSpace(r.TimetableName)) throw new ArgumentException("TimetableName is required.");
        if(r.EffectiveFrom.HasValue&&r.EffectiveTo.HasValue&&r.EffectiveFrom>r.EffectiveTo)
            throw new ArgumentException("EffectiveFrom cannot be after EffectiveTo.");
    }
    private static void ValidateEntry(ManualTimetableEntryRequest r)
    {
        if(string.IsNullOrWhiteSpace(r.DayOfWeek)||r.SubjectId<=0||r.FacultyId<=0||r.TimetableSlotId<=0&&r.TimetableSlotIds.All(x=>x<=0))
            throw new ArgumentException("DayOfWeek, SubjectId, FacultyId and at least one timetable slot are required.");
    }
    private static void RequirePositive(long value,string name)
    {
        if(value<=0) throw new ArgumentException($"{name} must be greater than zero.");
    }
}
