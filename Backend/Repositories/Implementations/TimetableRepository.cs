using System.Data;
using System.Text.Json;
using Dapper;
using MySqlConnector;
using BTech.DTOs;
using BTech.DTOs.TimetableManagement;
using BTech.Repositories.Interfaces;

namespace BTech.Repositories.Implementations;

public sealed class TimetableRepository : ITimetableRepository
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TimetableRepository> _logger;

    public TimetableRepository(IConfiguration configuration, ILogger<TimetableRepository> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private MySqlConnection CreateConnection()
    {
        var cs = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("DefaultConnection is missing from appsettings.json.");
        return new MySqlConnection(cs);
    }

    private static CommandDefinition Cmd(string name, object? args = null)
        => new(name, args, commandType: CommandType.StoredProcedure);

    private static CommandDefinition Cmd(string name, object? args, MySqlTransaction transaction)
        => new(name, args, transaction: transaction, commandType: CommandType.StoredProcedure);

    private static string LockName(long timetableId) => $"cms_btech:timetable:{timetableId}";

    private static async Task<T> WithTimetableLockAsync<T>(MySqlConnection c, long timetableId, Func<MySqlTransaction, Task<T>> action)
    {
        await c.OpenAsync();
        var lockTaken = await c.ExecuteScalarAsync<int>(new CommandDefinition("SELECT GET_LOCK(@lock_name, 15);", new { lock_name = LockName(timetableId) }));
        if (lockTaken != 1) throw new InvalidOperationException("Timetable is currently being modified by another request. Please retry.");
        await using var tx = await c.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        try
        {
            var result = await action(tx);
            await tx.CommitAsync();
            return result;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
        finally
        {
            try { await c.ExecuteAsync(new CommandDefinition("SELECT RELEASE_LOCK(@lock_name);", new { lock_name = LockName(timetableId) })); }
            catch { }
        }
    }

    private static async Task WithTimetableLockAsync(MySqlConnection c, long timetableId, Func<MySqlTransaction, Task> action)
        => await WithTimetableLockAsync(c, timetableId, async tx => { await action(tx); return true; });

    private static string Json(object value) =>
        JsonSerializer.Serialize(value, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

    private static long? NullableId(long? value) => value is > 0 ? value : null;

    public async Task<IReadOnlyList<PeriodConfigurationDto>> GetPeriodsAsync(long academicYearId)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<PeriodConfigurationDto>(Cmd("sp_tt_period_list", new { p_academic_year_id = academicYearId }));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<PeriodConfigurationDto>> GenerateAutomaticPeriodsAsync(AutomaticPeriodSetupRequest r, long? actorId)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<PeriodConfigurationDto>(Cmd("sp_tt_period_generate_automatic", new
        {
            p_academic_year_id = r.AcademicYearId,
            p_start_time = TimeSpan.Parse(r.StartTime),
            p_end_time = TimeSpan.Parse(r.EndTime),
            p_duration_minutes = r.PeriodDurationMinutes,
            p_working_days_json = Json(r.WorkingDays),
            p_breaks_json = Json(r.Breaks),
            p_actor_id = actorId
        }));
        return rows.AsList();
    }

    public async Task<long> CreatePeriodAsync(PeriodConfigurationRequest r, long? actorId)
    {
        await using var c = CreateConnection();
        return await c.ExecuteScalarAsync<long>(Cmd("sp_tt_period_create", new
        {
            p_academic_year_id = r.AcademicYearId, p_period_number = r.PeriodNumber,
            p_period_name = r.PeriodName, p_start_time = TimeSpan.Parse(r.StartTime),
            p_end_time = TimeSpan.Parse(r.EndTime), p_period_type = r.PeriodType,
            p_display_order = r.DisplayOrder, p_status = r.Active ? 1 : 0, p_actor_id = actorId
        }));
    }

    public async Task UpdatePeriodAsync(long id, PeriodConfigurationRequest r, long? actorId)
    {
        await using var c = CreateConnection();
        await c.ExecuteAsync(Cmd("sp_tt_period_update", new
        {
            p_period_id = id, p_academic_year_id = r.AcademicYearId, p_period_number = r.PeriodNumber,
            p_period_name = r.PeriodName, p_start_time = TimeSpan.Parse(r.StartTime),
            p_end_time = TimeSpan.Parse(r.EndTime), p_period_type = r.PeriodType,
            p_display_order = r.DisplayOrder, p_status = r.Active ? 1 : 0, p_actor_id = actorId
        }));
    }

    public async Task DeletePeriodAsync(long id, long? actorId)
    {
        await using var c = CreateConnection();
        await c.ExecuteAsync(Cmd("sp_tt_period_delete", new { p_period_id = id, p_actor_id = actorId }));
    }

    public async Task ReorderPeriodsAsync(PeriodReorderRequest r, long? actorId)
    {
        await using var c = CreateConnection();
        await c.ExecuteAsync(Cmd("sp_tt_period_reorder", new
        {
            p_academic_year_id = r.AcademicYearId,
            p_period_ids_json = Json(r.PeriodIds),
            p_actor_id = actorId
        }));
    }

    public async Task<CalendarConfigurationDto> GetCalendarAsync(long academicYearId)
    {
        await using var c = CreateConnection();
        using var multi = await c.QueryMultipleAsync(Cmd("sp_tt_calendar_get", new { p_academic_year_id = academicYearId }));
        var header = await multi.ReadSingleOrDefaultAsync<CalendarConfigurationDto>()
            ?? throw new KeyNotFoundException("Academic year not found.");
        header.WorkingDays = (await multi.ReadAsync<string>()).ToList();
        header.Holidays = (await multi.ReadAsync<CalendarExceptionDto>()).ToList();
        return header;
    }

    public async Task<CalendarConfigurationDto> SaveCalendarAsync(CalendarConfigurationRequest r, long? actorId)
    {
        await using var c = CreateConnection();
        await c.ExecuteAsync(Cmd("sp_tt_calendar_save", new
        {
            p_academic_year_id = r.AcademicYearId,
            p_reviewed = r.Reviewed ? 1 : 0,
            p_working_days_json = Json(r.WorkingDays),
            p_holidays_json = Json(r.Holidays),
            p_actor_id = actorId
        }));
        return await GetCalendarAsync(r.AcademicYearId);
    }

    public async Task<IReadOnlyList<ClassroomDto>> GetClassroomsAsync(long? collegeId, bool activeOnly)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<ClassroomDto>(Cmd("sp_tt_classroom_list", new
        {
            p_college_id = NullableId(collegeId), p_active_only = activeOnly ? 1 : 0
        }));
        return rows.AsList();
    }

    public async Task<long> CreateClassroomAsync(ClassroomRequest r, long? actorId)
    {
        await using var c = CreateConnection();
        return await c.ExecuteScalarAsync<long>(Cmd("sp_tt_classroom_create", new
        {
            p_college_id = r.CollegeId, p_classroom_code = r.ClassroomCode,
            p_classroom_name = r.ClassroomName, p_room_type = r.RoomType,
            p_capacity = r.Capacity, p_status = r.Active ? 1 : 0, p_actor_id = actorId
        }));
    }

    public async Task UpdateClassroomAsync(long id, ClassroomRequest r, long? actorId)
    {
        await using var c = CreateConnection();
        await c.ExecuteAsync(Cmd("sp_tt_classroom_update", new
        {
            p_classroom_id = id, p_college_id = r.CollegeId, p_classroom_code = r.ClassroomCode,
            p_classroom_name = r.ClassroomName, p_room_type = r.RoomType,
            p_capacity = r.Capacity, p_status = r.Active ? 1 : 0, p_actor_id = actorId
        }));
    }

    public async Task<IReadOnlyList<TimetableMasterDto>> ListTimetablesAsync(long? ay, long? course, long? branch, long? sem, long? section, string? status, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<TimetableMasterDto>(Cmd("sp_tt_timetable_list", new
        {
            p_academic_year_id = ay, p_course_id = course, p_branch_id = branch, p_semester_id = sem,
            p_section_id = section, p_status = status, p_college_id = college, p_is_super_admin = superAdmin ? 1 : 0
        }));
        return rows.AsList();
    }

    public async Task<TimetableDetailDto?> GetTimetableAsync(long id, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        using var multi = await c.QueryMultipleAsync(Cmd("sp_tt_timetable_detail", new
        {
            p_timetable_id = id, p_college_id = college, p_is_super_admin = superAdmin ? 1 : 0
        }));
        var master = await multi.ReadSingleOrDefaultAsync<TimetableMasterDto>();
        if (master is null) return null;
        return new TimetableDetailDto
        {
            Timetable = master,
            Slots = (await multi.ReadAsync<TimetableSlotDto>()).ToList(),
            Requirements = (await multi.ReadAsync<TimetableRequirementDto>()).ToList(),
            Entries = (await multi.ReadAsync<TimetableEntryDto>()).ToList()
        };
    }

    public async Task<long> CreateTimetableAsync(CreateAdvancedTimetableRequest r, long? actor, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        return await c.ExecuteScalarAsync<long>(Cmd("sp_tt_timetable_create", new
        {
            p_academic_year_id = r.AcademicYearId, p_course_id = r.CourseId,
            p_branch_id = r.BranchId, p_semester_id = r.SemesterId, p_section_id = r.SectionId,
            p_timetable_name = r.TimetableName, p_effective_from = r.EffectiveFrom?.Date,
            p_effective_to = r.EffectiveTo?.Date, p_actor_id = actor,
            p_college_id = college, p_is_super_admin = superAdmin ? 1 : 0
        }));
    }

    public async Task UpdateTimetableAsync(long id, UpdateAdvancedTimetableRequest r, long? actor, long? college, bool superAdmin)
    {
        await using var c=CreateConnection();
        await WithTimetableLockAsync(c,id,tx => c.ExecuteAsync(Cmd("sp_tt_timetable_update",new
        {p_timetable_id=id,p_timetable_name=r.TimetableName,p_effective_from=r.EffectiveFrom?.Date,p_effective_to=r.EffectiveTo?.Date,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx)));
    }

    public async Task<IReadOnlyList<TimetableSlotDto>> SyncSlotsAsync(long id, long? actor, long? college, bool superAdmin)
    {
        await using var c=CreateConnection();
        return await WithTimetableLockAsync(c,id,async tx =>
        {
            var rows=await c.QueryAsync<TimetableSlotDto>(Cmd("sp_tt_slots_sync",new {p_timetable_id=id,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx));
            return (IReadOnlyList<TimetableSlotDto>)rows.AsList();
        });
    }

    public async Task<IReadOnlyList<TimetableRequirementDto>> GetRequirementsAsync(long id, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        using var multi = await c.QueryMultipleAsync(Cmd("sp_tt_requirements_get", new
        {
            p_timetable_id = id, p_college_id = college, p_is_super_admin = superAdmin ? 1 : 0
        }));

        var requirements = (await multi.ReadAsync<TimetableRequirementDto>()).ToList();
        var faculty = (await multi.ReadAsync<FacultyOptionRow>()).ToList();

        foreach (var requirement in requirements)
        {
            requirement.Faculty = faculty
                .Where(x => x.SubjectId == requirement.SubjectId)
                .Select(x => new FacultyOptionDto
                {
                    FacultyId = x.FacultyId,
                    FacultyCode = x.FacultyCode ?? string.Empty,
                    FacultyName = x.FacultyName ?? string.Empty,
                    AllocatedPeriodsPerWeek = x.AllocatedPeriodsPerWeek
                })
                .ToList();
        }

        return requirements;
    }

    public async Task<IReadOnlyList<TimetableRequirementDto>> SaveRequirementsAsync(long id, SaveTimetableRequirementsRequest r, long? actor, long? college, bool superAdmin)
    {
        await using var c=CreateConnection();
        await WithTimetableLockAsync(c,id,tx => c.ExecuteAsync(Cmd("sp_tt_requirements_save",new {p_timetable_id=id,p_requirements_json=Json(r.Requirements),p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx)));
        return await GetRequirementsAsync(id,college,superAdmin);
    }

    public async Task<TimetableStatusDto> GetStatusAsync(long id, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        return await c.QuerySingleOrDefaultAsync<TimetableStatusDto>(Cmd("sp_tt_status_get", new
        { p_timetable_id=id, p_college_id=college, p_is_super_admin=superAdmin ? 1 : 0 }))
            ?? throw new KeyNotFoundException("Timetable not found.");
    }

    public async Task<TimetableGenerationResultDto> RegenerateAsync(long id, GenerateTimetableRequest r, long? actor, long? college, bool superAdmin)
    {
        r.ReplaceGenerated = true;
        return await GenerateAsync(id,r,false,actor,college,superAdmin);
    }

    public async Task<IReadOnlyList<TimetableRoomAvailabilityDto>> GetRoomAvailabilityAsync(long id,long slotId,string day,long? college,bool superAdmin)
    {
        await using var c = CreateConnection();
        var rows=await c.QueryAsync<TimetableRoomAvailabilityDto>(Cmd("sp_tt_room_availability",new
        {p_timetable_id=id,p_timetable_slot_id=slotId,p_day_of_week=day,p_college_id=college,p_is_super_admin=superAdmin?1:0}));
        return rows.AsList();
    }

    public async Task<TimetableValidationDto> ValidateGlobalAsync(long id,long? college,bool superAdmin)
    {
        await using var c=CreateConnection();
        using var multi=await c.QueryMultipleAsync(Cmd("sp_tt_validate_global",new
        {p_timetable_id=id,p_college_id=college,p_is_super_admin=superAdmin?1:0}));
        var valid=await multi.ReadSingleOrDefaultAsync<ValidationFlag>();
        var result=new TimetableValidationDto{Valid=valid?.Valid==1};
        result.Conflicts=(await multi.ReadAsync<TimetableConflictDto>()).ToList();
        result.Unscheduled=(await multi.ReadAsync<TimetableUnscheduledDto>()).ToList();
        await multi.ReadAsync<WarningRow>();
        return result;
    }

    public async Task<TimetableGenerationResultDto> GenerateAsync(long id, GenerateTimetableRequest r, bool missingOnly, long? actor, long? college, bool superAdmin)
    {
        await using var c=CreateConnection();
        var result=await WithTimetableLockAsync(c,id,async tx =>
        {
            using var multi=await c.QueryMultipleAsync(Cmd("sp_tt_generate",new {p_timetable_id=id,p_replace_generated=r.ReplaceGenerated?1:0,p_missing_only=missingOnly?1:0,p_classroom_ids_json=Json(r.ClassroomIds??new()),p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx));
            var summary=await multi.ReadSingleOrDefaultAsync<GenerationSummary>();
            var x=new TimetableGenerationResultDto{TimetableId=id,ScheduledCount=summary?.ScheduledCount??0,AddedCount=summary?.AddedCount??0,Unscheduled=(await multi.ReadAsync<TimetableUnscheduledDto>()).ToList(),Conflicts=(await multi.ReadAsync<TimetableConflictDto>()).ToList()};
            return x;
        });
        result.Timetable=await GetTimetableAsync(id,college,superAdmin);
        return result;
    }

    public async Task<TimetableValidationDto> ValidateAsync(long id, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        using var multi = await c.QueryMultipleAsync(Cmd("sp_tt_validate", new
        {
            p_timetable_id = id, p_college_id = college, p_is_super_admin = superAdmin ? 1 : 0
        }));
        var valid = await multi.ReadSingleOrDefaultAsync<ValidationFlag>();
        var result = new TimetableValidationDto { Valid = valid?.Valid == 1 };
        result.Conflicts = (await multi.ReadAsync<TimetableConflictDto>()).ToList();
        result.Unscheduled = (await multi.ReadAsync<TimetableUnscheduledDto>()).ToList();
        await multi.ReadAsync<WarningRow>();
        return result;
    }

    public async Task PublishAsync(long id, long? actor, long? college, bool superAdmin)
    {
        await using var c=CreateConnection();
        await WithTimetableLockAsync(c,id,tx => c.ExecuteAsync(Cmd("sp_tt_publish",new {p_timetable_id=id,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx)));
    }

    public async Task ReopenAsync(long id, long? actor, long? college, bool superAdmin)
    {
        await using var c=CreateConnection();
        await WithTimetableLockAsync(c,id,tx => c.ExecuteAsync(Cmd("sp_tt_reopen",new {p_timetable_id=id,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx)));
    }

    public async Task<IReadOnlyList<TimetableEntryDto>> AddEntryAsync(long id, ManualTimetableEntryRequest r, long? actor, long? college, bool superAdmin)
    {
        var slotIds=r.TimetableSlotIds?.Where(x=>x>0).Distinct().ToList()??new List<long>();
        if(r.TimetableSlotId>0 && !slotIds.Contains(r.TimetableSlotId)) slotIds.Insert(0,r.TimetableSlotId);
        long? classroomId=r.ClassroomId>0?r.ClassroomId:null;
        await using var c=CreateConnection();
        return await WithTimetableLockAsync(c,id,async tx =>
        {
            var rows=await c.QueryAsync<TimetableEntryDto>(Cmd("sp_tt_entry_add",new {p_timetable_id=id,p_slot_ids_json=Json(slotIds),p_day_of_week=r.DayOfWeek,p_subject_id=r.SubjectId,p_faculty_id=r.FacultyId,p_classroom_id=classroomId,p_entry_type=r.EntryType,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx));
            return (IReadOnlyList<TimetableEntryDto>)rows.AsList();
        });
    }

    public async Task UpdateEntryAsync(long timetableId,long entryId,ManualTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        long slotId=r.TimetableSlotId;
        if(slotId<=0 && r.TimetableSlotIds!=null) slotId=r.TimetableSlotIds.FirstOrDefault(x=>x>0);
        if(slotId<=0) throw new ArgumentException("A timetable slot is required.");
        long? classroomId=r.ClassroomId>0?r.ClassroomId:null;
        await using var c=CreateConnection();
        await WithTimetableLockAsync(c,timetableId,tx => c.ExecuteAsync(Cmd("sp_tt_entry_update",new {p_timetable_id=timetableId,p_entry_id=entryId,p_slot_id=slotId,p_day_of_week=r.DayOfWeek,p_subject_id=r.SubjectId,p_faculty_id=r.FacultyId,p_classroom_id=classroomId,p_entry_type=r.EntryType,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx)));
    }

    public async Task MoveEntryAsync(long timetableId,long entryId,MoveTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        await using var c=CreateConnection();
        await WithTimetableLockAsync(c,timetableId,tx => c.ExecuteAsync(Cmd("sp_tt_entry_move",new {p_timetable_id=timetableId,p_entry_id=entryId,p_slot_id=r.TimetableSlotId,p_day_of_week=r.DayOfWeek,p_classroom_id=r.ClassroomId,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx)));
    }

    public async Task DeleteEntryAsync(long timetableId,long entryId,long? actor,long? college,bool superAdmin)
    {
        await using var c=CreateConnection();
        await WithTimetableLockAsync(c,timetableId,tx => c.ExecuteAsync(Cmd("sp_tt_entry_delete",new {p_timetable_id=timetableId,p_entry_id=entryId,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0},tx)));
    }

    public async Task<IReadOnlyList<TimetableEntryDto>> ListEntriesAsync(long? timetableId, long? facultyId, string? dayOfWeek, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<TimetableEntryDto>(Cmd("sp_tt_entry_list", new
        {
            p_timetable_id = timetableId, p_faculty_id = facultyId,
            p_day_of_week = string.IsNullOrWhiteSpace(dayOfWeek) ? null : dayOfWeek,
            p_college_id = college, p_is_super_admin = superAdmin ? 1 : 0
        }));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<TimetableViewRowDto>> GetFacultyViewAsync(long id, long? ay, DateTime? date, long? college, bool superAdmin)
        => await ViewAsync("sp_tt_view_faculty", new { p_faculty_id=id, p_academic_year_id=ay, p_date=date?.Date, p_college_id=college, p_is_super_admin=superAdmin ? 1 : 0 });

    public async Task<IReadOnlyList<TimetableViewRowDto>> GetStudentViewAsync(long id, long? ay, DateTime? date, long? college, bool superAdmin)
        => await ViewAsync("sp_tt_view_student", new { p_student_id=id, p_academic_year_id=ay, p_date=date?.Date, p_college_id=college, p_is_super_admin=superAdmin ? 1 : 0 });

    public async Task<IReadOnlyList<TimetableViewRowDto>> GetClassroomViewAsync(long id, long? ay, DateTime? date, long? college, bool superAdmin)
        => await ViewAsync("sp_tt_view_classroom", new { p_classroom_id=id, p_academic_year_id=ay, p_date=date?.Date, p_college_id=college, p_is_super_admin=superAdmin ? 1 : 0 });

    public async Task<IReadOnlyList<TimetableViewRowDto>> GetSectionViewAsync(long id, long? ay, DateTime? date, long? college, bool superAdmin)
        => await ViewAsync("sp_tt_view_section", new { p_section_id=id, p_academic_year_id=ay, p_date=date?.Date, p_college_id=college, p_is_super_admin=superAdmin ? 1 : 0 });

    private async Task<IReadOnlyList<TimetableViewRowDto>> ViewAsync(string sp, object args)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<TimetableViewRowDto>(Cmd(sp, args));
        return rows.AsList();
    }

    public async Task<DateOccurrenceResponse> GetOccurrencesAsync(DateTime date, long? section, long? faculty, long? classroom, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        using var multi = await c.QueryMultipleAsync(Cmd("sp_tt_occurrences", new
        {
            p_date = date.Date, p_section_id = section, p_faculty_id = faculty,
            p_classroom_id = classroom, p_college_id = college, p_is_super_admin = superAdmin ? 1 : 0
        }));
        var header = await multi.ReadSingleOrDefaultAsync<OccurrenceHeader>()
            ?? new OccurrenceHeader { Date = date.Date, WorkingDay = 0 };
        return new DateOccurrenceResponse
        {
            Date = header.Date,
            WorkingDay = header.WorkingDay == 1,
            ExceptionType = header.ExceptionType,
            ExceptionDescription = header.ExceptionDescription,
            Classes = (await multi.ReadAsync<TimetableViewRowDto>()).ToList()
        };
    }

    public async Task<long> LegacyCreateAsync(TimetableCreateRequest r, long? actor, long? college, bool superAdmin)
    {
        await using var c = CreateConnection();
        return await c.ExecuteScalarAsync<long>(Cmd("sp_tt_legacy_create", new
        {
            p_academic_year_id=r.AcademicYearId,p_course_id=r.CourseId,p_branch_id=r.BranchId,p_semester_id=r.SemesterId,
            p_section_id=r.SectionId,p_subject_id=r.SubjectId,p_faculty_id=r.FacultyId,p_day_of_week=r.DayOfWeek,
            p_start_time=TimeSpan.Parse(r.StartTime),p_end_time=TimeSpan.Parse(r.EndTime),p_room_no=r.RoomNo,
            p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0
        }));
    }

    public async Task LegacyUpdateAsync(long id, TimetableUpdateRequest r, long? actor, long? college, bool superAdmin)
    {
        await using var c=CreateConnection();
        await c.ExecuteAsync(Cmd("sp_tt_legacy_update", new {
            p_timetable_id=id,p_academic_year_id=r.AcademicYearId,p_course_id=r.CourseId,p_branch_id=r.BranchId,
            p_semester_id=r.SemesterId,p_section_id=r.SectionId,p_subject_id=r.SubjectId,p_faculty_id=r.FacultyId,
            p_day_of_week=r.DayOfWeek,p_start_time=TimeSpan.Parse(r.StartTime),p_end_time=TimeSpan.Parse(r.EndTime),
            p_room_no=r.RoomNo,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0
        }));
    }

    public async Task<IReadOnlyList<TimetableViewRowDto>> LegacyListAsync(long? sem,long? branch,long? section,long? faculty,string? day,byte? published,long? college,bool superAdmin)
    {
        await using var c=CreateConnection();
        var rows=await c.QueryAsync<TimetableViewRowDto>(Cmd("sp_tt_legacy_list",new{
            p_semester_id=sem,p_branch_id=branch,p_section_id=section,p_faculty_id=faculty,p_day_of_week=day,
            p_published=published,p_college_id=college,p_is_super_admin=superAdmin?1:0
        }));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<TimetableEntryDto>> LegacyCreateEntryAsync(CreateTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        await using var c=CreateConnection();
        var rows=await c.QueryAsync<TimetableEntryDto>(Cmd("sp_tt_legacy_entry_create",new{
            p_timetable_id=r.TimetableId,p_slot_id=r.TimetableSlotId,p_faculty_id=r.FacultyId,p_subject_id=r.SubjectId,
            p_section_id=r.SectionId,p_day_of_week=r.DayOfWeek,p_classroom=r.Classroom,p_entry_type=r.EntryType,
            p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0
        }));
        return rows.AsList();
    }

    public async Task LegacyUpdateEntryAsync(long entryId,CreateTimetableEntryRequest r,long? actor,long? college,bool superAdmin)
    {
        await using var c=CreateConnection();
        await c.ExecuteAsync(Cmd("sp_tt_legacy_entry_update",new{
            p_entry_id=entryId,p_timetable_id=r.TimetableId,p_slot_id=r.TimetableSlotId,p_faculty_id=r.FacultyId,
            p_subject_id=r.SubjectId,p_section_id=r.SectionId,p_day_of_week=r.DayOfWeek,p_classroom=r.Classroom,
            p_entry_type=r.EntryType,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0
        }));
    }

    public async Task LegacyDeleteEntryAsync(long entryId,long? actor,long? college,bool superAdmin)
    {
        await using var c=CreateConnection();
        await c.ExecuteAsync(Cmd("sp_tt_legacy_entry_delete",new{
            p_entry_id=entryId,p_actor_id=actor,p_college_id=college,p_is_super_admin=superAdmin?1:0
        }));
    }

    private sealed class FacultyOptionRow
    {
        public long SubjectId { get; set; }
        public long FacultyId { get; set; }
        public string? FacultyCode { get; set; }
        public string? FacultyName { get; set; }
        public int AllocatedPeriodsPerWeek { get; set; }
    }

    private sealed class GenerationSummary { public long TimetableId { get; set; } public int ScheduledCount { get; set; } public int AddedCount { get; set; } }
    private sealed class ValidationFlag { public int Valid { get; set; } }
    private sealed class WarningRow { public string? Warning { get; set; } }
    private sealed class OccurrenceHeader { public DateTime Date { get; set; } public int WorkingDay { get; set; } public string? ExceptionType { get; set; } public string? ExceptionDescription { get; set; } }
}
