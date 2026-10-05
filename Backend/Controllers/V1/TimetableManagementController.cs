using System.Security.Claims;
using BTech.DTOs.TimetableManagement;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/timetable-management")]
[Authorize]
public sealed class TimetableManagementController : ControllerBase
{
    private const string AdminRoles = "SUPER_ADMIN,COLLEGE_ADMIN,PRINCIPAL,HOD";
    private readonly ITimetableService _service;

    public TimetableManagementController(ITimetableService service) => _service = service;

    [HttpGet("periods")]
    public async Task<IActionResult> GetPeriods([FromQuery] long academicYearId)
        => await Execute(() => _service.GetPeriodsAsync(academicYearId), "Period configuration retrieved successfully.");

    [HttpPost("periods/automatic")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> GenerateAutomaticPeriods([FromBody] AutomaticPeriodSetupRequest request)
        => await Execute(() => _service.GenerateAutomaticPeriodsAsync(request, UserId()), "Automatic period configuration saved successfully.");

    [HttpPost("periods")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> CreatePeriod([FromBody] PeriodConfigurationRequest request)
        => await Execute(() => _service.CreatePeriodAsync(request, UserId()), "Period created successfully.", StatusCodes.Status201Created, id => new { periodId=id });

    [HttpPut("periods/{periodId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> UpdatePeriod(long periodId,[FromBody] PeriodConfigurationRequest request)
        => await Execute(() => _service.UpdatePeriodAsync(periodId,request,UserId()), "Period updated successfully.");

    [HttpDelete("periods/{periodId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> DeletePeriod(long periodId)
        => await Execute(() => _service.DeletePeriodAsync(periodId,UserId()), "Period deactivated successfully.");

    [HttpPut("periods/reorder")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> ReorderPeriods([FromBody] PeriodReorderRequest request)
        => await Execute(() => _service.ReorderPeriodsAsync(request,UserId()), "Periods reordered successfully.");

    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar([FromQuery] long academicYearId)
        => await Execute(() => _service.GetCalendarAsync(academicYearId), "Academic calendar retrieved successfully.");

    [HttpPut("calendar")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> SaveCalendar([FromBody] CalendarConfigurationRequest request)
        => await Execute(() => _service.SaveCalendarAsync(request,UserId()), "Academic calendar saved successfully.");

    [HttpGet("classrooms")]
    public async Task<IActionResult> GetClassrooms([FromQuery] long? collegeId=null,[FromQuery] bool activeOnly=true)
    {
        try { return Ok(Success("Classrooms retrieved successfully.",await _service.GetClassroomsAsync(IsSuperAdmin()?collegeId:CollegeId(),activeOnly))); }
        catch(Exception ex){ return Error(ex); }
    }

    [HttpPost("classrooms")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> CreateClassroom([FromBody] ClassroomRequest request)
    {
        if(!IsSuperAdmin()) request.CollegeId=CollegeId()??throw new UnauthorizedAccessException("College context is missing from the token.");
        return await Execute(()=>_service.CreateClassroomAsync(request,UserId()),"Classroom created successfully.",StatusCodes.Status201Created,id=>new{classroomId=id});
    }

    [HttpPut("classrooms/{classroomId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> UpdateClassroom(long classroomId,[FromBody] ClassroomRequest request)
    {
        if(!IsSuperAdmin()) request.CollegeId=CollegeId()??throw new UnauthorizedAccessException("College context is missing from the token.");
        return await Execute(()=>_service.UpdateClassroomAsync(classroomId,request,UserId()),"Classroom updated successfully.");
    }

    [HttpGet("timetables")]
    public async Task<IActionResult> ListTimetables([FromQuery] long? academicYearId=null,[FromQuery] long? courseId=null,[FromQuery] long? branchId=null,[FromQuery] long? semesterId=null,[FromQuery] long? sectionId=null,[FromQuery] string? status=null)
        => await Execute(()=>_service.ListTimetablesAsync(academicYearId,courseId,branchId,semesterId,sectionId,status,CollegeId(),IsSuperAdmin()),"Timetables retrieved successfully.");

    [HttpGet("timetables/{timetableId:long}")]
    public async Task<IActionResult> GetTimetable(long timetableId)
        => await Execute(()=>_service.GetTimetableAsync(timetableId,CollegeId(),IsSuperAdmin()),"Timetable details retrieved successfully.");

    [HttpPost("timetables")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> CreateTimetable([FromBody] CreateAdvancedTimetableRequest request)
        => await Execute(()=>_service.CreateTimetableAsync(request,UserId(),CollegeId(),IsSuperAdmin()),"Draft timetable created successfully.",StatusCodes.Status201Created,id=>new{timetableId=id});

    [HttpPut("timetables/{timetableId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> UpdateTimetable(long timetableId,[FromBody] UpdateAdvancedTimetableRequest request)
        => await Execute(()=>_service.UpdateTimetableAsync(timetableId,request,UserId(),CollegeId(),IsSuperAdmin()),"Timetable setup updated successfully.");

    [HttpPost("timetables/{timetableId:long}/sync-periods")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> SyncPeriods(long timetableId)
        => await Execute(()=>_service.SyncSlotsAsync(timetableId,UserId(),CollegeId(),IsSuperAdmin()),"Timetable slots synchronized successfully.");

    [HttpGet("timetables/{timetableId:long}/requirements")]
    public async Task<IActionResult> GetRequirements(long timetableId)
        => await Execute(()=>_service.GetRequirementsAsync(timetableId,CollegeId(),IsSuperAdmin()),"Weekly subject requirements retrieved successfully.");

    [HttpPut("timetables/{timetableId:long}/requirements")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> SaveRequirements(long timetableId,[FromBody] SaveTimetableRequirementsRequest request)
        => await Execute(()=>_service.SaveRequirementsAsync(timetableId,request,UserId(),CollegeId(),IsSuperAdmin()),"Weekly subject requirements saved successfully.");

    [HttpPost("timetables/{timetableId:long}/generate")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Generate(long timetableId,[FromBody] GenerateTimetableRequest request)
        => await Execute(()=>_service.GenerateAsync(timetableId,request,false,UserId(),CollegeId(),IsSuperAdmin()),"Timetable generation completed.");

    [HttpGet("timetables/{timetableId:long}/status")]
    public async Task<IActionResult> GetStatus(long timetableId)
        => await Execute(() => _service.GetStatusAsync(timetableId, CollegeId(), IsSuperAdmin()), "Timetable status retrieved successfully.");

    [HttpPost("timetables/{timetableId:long}/regenerate")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Regenerate(long timetableId, [FromBody] GenerateTimetableRequest request)
        => await Execute(() => _service.RegenerateAsync(timetableId, request, UserId(), CollegeId(), IsSuperAdmin()), "Timetable regeneration completed.");

    [HttpGet("timetables/{timetableId:long}/rooms/availability")]
    public async Task<IActionResult> RoomAvailability(long timetableId, [FromQuery] long timetableSlotId, [FromQuery] string dayOfWeek)
        => await Execute(() => _service.GetRoomAvailabilityAsync(timetableId, timetableSlotId, dayOfWeek, CollegeId(), IsSuperAdmin()), "Room availability retrieved successfully.");

    [HttpPost("timetables/{timetableId:long}/generate-missing")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> GenerateMissing(long timetableId,[FromBody] GenerateTimetableRequest request)
        => await Execute(()=>_service.GenerateAsync(timetableId,request,true,UserId(),CollegeId(),IsSuperAdmin()),"Missing timetable slots generation completed.");

    [HttpGet("timetables/{timetableId:long}/entries")]
    public async Task<IActionResult> ListEntries(long timetableId,[FromQuery] long? facultyId=null,[FromQuery] string? dayOfWeek=null)
        => await Execute(()=>_service.ListEntriesAsync(timetableId,facultyId,dayOfWeek,CollegeId(),IsSuperAdmin()),"Timetable entries retrieved successfully.");

    [HttpPost("timetables/{timetableId:long}/entries")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> AddEntry(long timetableId,[FromBody] ManualTimetableEntryRequest request)
        => await Execute(()=>_service.AddEntryAsync(timetableId,request,UserId(),CollegeId(),IsSuperAdmin()),"Class added to draft timetable successfully.",StatusCodes.Status201Created);

    [HttpPut("timetables/{timetableId:long}/entries/{entryId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> UpdateEntry(long timetableId,long entryId,[FromBody] ManualTimetableEntryRequest request)
        => await Execute(()=>_service.UpdateEntryAsync(timetableId,entryId,request,UserId(),CollegeId(),IsSuperAdmin()),"Class updated successfully.");

    [HttpPut("timetables/{timetableId:long}/entries/{entryId:long}/move")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> MoveEntry(long timetableId,long entryId,[FromBody] MoveTimetableEntryRequest request)
        => await Execute(()=>_service.MoveEntryAsync(timetableId,entryId,request,UserId(),CollegeId(),IsSuperAdmin()),"Class moved successfully.");

    [HttpDelete("timetables/{timetableId:long}/entries/{entryId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> DeleteEntry(long timetableId,long entryId)
        => await Execute(()=>_service.DeleteEntryAsync(timetableId,entryId,UserId(),CollegeId(),IsSuperAdmin()),"Class removed from draft timetable successfully.");

    [HttpPost("timetables/{timetableId:long}/validate")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> ValidateTimetable(long timetableId)
        => await Execute(()=>_service.ValidateAsync(timetableId,CollegeId(),IsSuperAdmin()),"Timetable validation completed.");

    [HttpPost("timetables/{timetableId:long}/validate-global")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> ValidateGlobal(long timetableId)
        => await Execute(() => _service.ValidateGlobalAsync(timetableId, CollegeId(), IsSuperAdmin()), "Global timetable validation completed.");

    [HttpPost("timetables/{timetableId:long}/publish")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Publish(long timetableId)
        => await Execute(()=>_service.PublishAsync(timetableId,UserId(),CollegeId(),IsSuperAdmin()),"Timetable published successfully.");

    [HttpPost("timetables/{timetableId:long}/reopen")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Reopen(long timetableId)
        => await Execute(()=>_service.ReopenAsync(timetableId,UserId(),CollegeId(),IsSuperAdmin()),"Timetable moved back to Draft successfully.");

    [HttpGet("views/faculty/{facultyId:long}")]
    public async Task<IActionResult> FacultyView(long facultyId,[FromQuery] long? academicYearId=null,[FromQuery] DateTime? date=null)
        => await Execute(()=>_service.GetFacultyViewAsync(facultyId,academicYearId,date,CollegeId(),IsSuperAdmin()),"Faculty timetable retrieved successfully.");

    [HttpGet("views/student/{studentId:long}")]
    public async Task<IActionResult> StudentView(long studentId,[FromQuery] long? academicYearId=null,[FromQuery] DateTime? date=null)
        => await Execute(()=>_service.GetStudentViewAsync(studentId,academicYearId,date,CollegeId(),IsSuperAdmin()),"Student timetable retrieved successfully.");

    [HttpGet("views/classroom/{classroomId:long}")]
    public async Task<IActionResult> ClassroomView(long classroomId,[FromQuery] long? academicYearId=null,[FromQuery] DateTime? date=null)
        => await Execute(()=>_service.GetClassroomViewAsync(classroomId,academicYearId,date,CollegeId(),IsSuperAdmin()),"Classroom timetable retrieved successfully.");

    [HttpGet("views/section/{sectionId:long}")]
    public async Task<IActionResult> SectionView(long sectionId,[FromQuery] long? academicYearId=null,[FromQuery] DateTime? date=null)
        => await Execute(()=>_service.GetSectionViewAsync(sectionId,academicYearId,date,CollegeId(),IsSuperAdmin()),"Section timetable retrieved successfully.");

    [HttpGet("occurrences")]
    public async Task<IActionResult> Occurrences([FromQuery] DateTime date,[FromQuery] long? sectionId=null,[FromQuery] long? facultyId=null,[FromQuery] long? classroomId=null)
        => await Execute(()=>_service.GetOccurrencesAsync(date,sectionId,facultyId,classroomId,CollegeId(),IsSuperAdmin()),"Scheduled class occurrences resolved successfully.");

    private async Task<IActionResult> Execute<T>(Func<Task<T>> action,string message,int status=200,Func<T,object>? map=null)
    {
        try { var data=await action(); return StatusCode(status,Success(message,map is null?data:map(data))); }
        catch(Exception ex){ return Error(ex); }
    }
    private async Task<IActionResult> Execute(Func<Task> action,string message)
    {
        try { await action(); return Ok(Success(message)); } catch(Exception ex){ return Error(ex); }
    }
    private object Success(string message,object? data=null)=>data is null?new{success=true,message}:new{success=true,message,data};
    private IActionResult Error(Exception ex)
    {
        if(ex is ArgumentException) return BadRequest(new{success=false,message=ex.Message});
        if(ex is KeyNotFoundException) return NotFound(new{success=false,message=ex.Message});
        if(ex is UnauthorizedAccessException) return Unauthorized(new{success=false,message=ex.Message});
        if(ex is MySqlException my && my.SqlState=="45000") return Conflict(new{success=false,message=my.Message});
        return StatusCode(500,new{success=false,message="Unable to process timetable request."});
    }
    private long? UserId(){var raw=User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")??User.FindFirstValue("user_id");return long.TryParse(raw,out var id)?id:null;}
    private long? CollegeId(){var raw=User.FindFirstValue("collegeId");return long.TryParse(raw,out var id)&&id>0?id:null;}
    private bool IsSuperAdmin()=>User.IsInRole("SUPER_ADMIN");
}
