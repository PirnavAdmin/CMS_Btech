using System.Security.Claims;
using BTech.DTOs.TimetableManagement;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/timetable-entries")]
[Authorize]
public sealed class TimetableEntriesController : ControllerBase
{
    private const string AdminRoles="SUPER_ADMIN,COLLEGE_ADMIN,PRINCIPAL,HOD";
    private readonly ITimetableService _service;
    public TimetableEntriesController(ITimetableService service)=>_service=service;

    [HttpPost]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Create([FromBody] CreateTimetableEntryRequest request)
    {
        try
        {
            var rows=await _service.LegacyCreateEntryAsync(request,UserId(),CollegeId(),IsSuperAdmin());
            return StatusCode(201,new{success=true,message="Timetable entry created successfully.",data=rows});
        } catch(Exception ex){return Error(ex);}
    }

    [HttpPut("{timetableEntryId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Update(long timetableEntryId,[FromBody] CreateTimetableEntryRequest request)
    {
        try { await _service.LegacyUpdateEntryAsync(timetableEntryId,request,UserId(),CollegeId(),IsSuperAdmin()); return Ok(new{success=true,message="Timetable entry updated successfully."});}
        catch(Exception ex){return Error(ex);}
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] long? facultyId,[FromQuery] long? timetableId,[FromQuery] string? dayOfWeek)
    {
        try { var rows=await _service.ListEntriesAsync(timetableId,facultyId,dayOfWeek,CollegeId(),IsSuperAdmin()); return Ok(new{success=true,count=rows.Count,data=rows});}
        catch(Exception ex){return Error(ex);}
    }

    [HttpDelete("{timetableEntryId:long}")]
    [Authorize(Roles=AdminRoles)]
    public async Task<IActionResult> Delete(long timetableEntryId)
    {
        try { await _service.LegacyDeleteEntryAsync(timetableEntryId,UserId(),CollegeId(),IsSuperAdmin()); return Ok(new{success=true,message="Timetable entry deactivated successfully."});}
        catch(Exception ex){return Error(ex);}
    }

    private IActionResult Error(Exception ex)
    {
        if(ex is ArgumentException)return BadRequest(new{success=false,message=ex.Message});
        if(ex is KeyNotFoundException)return NotFound(new{success=false,message=ex.Message});
        if(ex is UnauthorizedAccessException)return Unauthorized(new{success=false,message=ex.Message});
        if(ex is MySqlException my&&my.SqlState=="45000")return Conflict(new{success=false,message=my.Message});
        return StatusCode(500,new{success=false,message="Unable to process timetable entry request."});
    }
    private long? UserId(){var raw=User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue("sub")??User.FindFirstValue("user_id");return long.TryParse(raw,out var id)?id:null;}
    private long? CollegeId(){var raw=User.FindFirstValue("collegeId");return long.TryParse(raw,out var id)&&id>0?id:null;}
    private bool IsSuperAdmin()=>User.IsInRole("SUPER_ADMIN");
}
