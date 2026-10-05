using System.Security.Claims;
using BTech.DTOs.TimetableManagement;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/timetables")]
[Authorize]
public sealed class TimetableController : ControllerBase
{
    private const string AdminRoles="SUPER_ADMIN,COLLEGE_ADMIN,PRINCIPAL,HOD";
    private readonly ITimetableService _service;

    public TimetableController(ITimetableService service) => _service=service;

    [HttpPost]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Create([FromBody] TimetableCreateRequest request)
        => await Execute(()=>_service.LegacyCreateAsync(request,UserId(),CollegeId(),IsSuperAdmin()),"Timetable created successfully.",StatusCodes.Status201Created,id=>new{timetableId=id});

    [HttpPut("{timetableId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Update(long timetableId,[FromBody] TimetableUpdateRequest request)
        => await Execute(()=>_service.LegacyUpdateAsync(timetableId,request,UserId(),CollegeId(),IsSuperAdmin()),"Timetable updated successfully.");

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? semesterId,[FromQuery] long? branchId,[FromQuery] long? sectionId,[FromQuery] long? facultyId,[FromQuery] string? dayOfWeek,[FromQuery] byte? published)
        => await Execute(()=>_service.LegacyListAsync(semesterId,branchId,sectionId,facultyId,dayOfWeek,published,CollegeId(),IsSuperAdmin()),"Timetables retrieved successfully.");

    [HttpGet("view/class")]
    public async Task<IActionResult> ClassView([FromQuery] long semesterId,[FromQuery] long? branchId,[FromQuery] long? sectionId)
        => await Execute(()=>_service.LegacyListAsync(semesterId,branchId,sectionId,null,null,1,CollegeId(),IsSuperAdmin()),"Class timetable retrieved successfully.");

    [HttpGet("view/faculty")]
    public async Task<IActionResult> FacultyView([FromQuery] long facultyId)
        => await Execute(()=>_service.LegacyListAsync(null,null,null,facultyId,null,1,CollegeId(),IsSuperAdmin()),"Faculty timetable retrieved successfully.");

    [HttpPut("{timetableId:long}/publish")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Publish(long timetableId)
        => await Execute(()=>_service.PublishAsync(timetableId,UserId(),CollegeId(),IsSuperAdmin()),"Timetable published successfully.");

    [HttpPost("entries")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> CreateEntry([FromBody] CreateTimetableEntryRequest request)
        => await Execute(()=>_service.LegacyCreateEntryAsync(request,UserId(),CollegeId(),IsSuperAdmin()),"Timetable entry created successfully.",StatusCodes.Status201Created);

    [HttpPut("entries/{timetableEntryId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> UpdateEntry(long timetableEntryId,[FromBody] CreateTimetableEntryRequest request)
        => await Execute(()=>_service.LegacyUpdateEntryAsync(timetableEntryId,request,UserId(),CollegeId(),IsSuperAdmin()),"Timetable entry updated successfully.");

    [HttpDelete("entries/{timetableEntryId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> DeleteEntry(long timetableEntryId)
        => await Execute(()=>_service.LegacyDeleteEntryAsync(timetableEntryId,UserId(),CollegeId(),IsSuperAdmin()),"Timetable entry deactivated successfully.");

    private async Task<IActionResult> Execute<T>(Func<Task<T>> action,string message,int status=200,Func<T,object>? map=null)
    {
        try { var data=await action(); return StatusCode(status,new{success=true,message,data=map is null?data:map(data)}); }
        catch(Exception ex){return Error(ex);}
    }
    private async Task<IActionResult> Execute(Func<Task> action,string message)
    {
        try{await action();return Ok(new{success=true,message});}catch(Exception ex){return Error(ex);}
    }
    private IActionResult Error(Exception ex)
    {
        if(ex is ArgumentException)return BadRequest(new{success=false,message=ex.Message});
        if(ex is KeyNotFoundException)return NotFound(new{success=false,message=ex.Message});
        if(ex is UnauthorizedAccessException)return Unauthorized(new{success=false,message=ex.Message});
        if(ex is MySqlException my&&my.SqlState=="45000")return Conflict(new{success=false,message=my.Message});
        return StatusCode(500,new{success=false,message="Unable to process timetable request."});
    }
    private long? UserId(){var raw=User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")??User.FindFirstValue("user_id");return long.TryParse(raw,out var id)?id:null;}
    private long? CollegeId(){var raw=User.FindFirstValue("collegeId");return long.TryParse(raw,out var id)&&id>0?id:null;}
    private bool IsSuperAdmin()=>User.IsInRole("SUPER_ADMIN");
}
