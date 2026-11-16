using System.Globalization;
using System.Text;
using BTech.CampusManagement;
using BTech.Services;
using System.Security.Claims;
using BTech.DTOs.Rooms;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize]
[Route("api/v1/rooms")]
public sealed class RoomsController : ControllerBase
{
    private readonly IRoomManagementService _service;
    private readonly ILogger<RoomsController> _logger;

    public RoomsController(IRoomManagementService service, ILogger<RoomsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [CampusScoped]
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRooms(
        [FromQuery] long? collegeId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? roomType = null,
        [FromQuery] string? buildingBlock = null,
        [FromQuery] string? status = null)
    {
        var data = await _service.GetRoomsAsync(ResolveCollegeId(collegeId), search, roomType, buildingBlock, status);
        return Ok(new { success = true, message = "Rooms retrieved successfully.", data, count = data.Count });
    }

    [CampusScoped]
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] long? collegeId, [FromQuery] string? search,
        [FromQuery] string? roomType, [FromQuery] string? buildingBlock, [FromQuery] string? status)
    {
        var data = await _service.GetRoomsAsync(ResolveCollegeId(collegeId), search, roomType, buildingBlock, status);
        var csv = new StringBuilder("RoomNumber,RoomName,BuildingBlock,Floor,RoomType,Capacity,Status\r\n");
        foreach (var row in data)
        {
            object?[] fields = [row.RoomNumber, row.RoomName, row.BuildingBlock, row.Floor, row.RoomType, row.Capacity, row.Status];
            csv.AppendLine(string.Join(",", fields.Select(ScreenExportsController.EscapeCsv)));
        }
        Response.Headers["X-Total-Count"] = data.Count.ToString(CultureInfo.InvariantCulture);
        Response.Headers["Cache-Control"] = "no-store";
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv; charset=utf-8", "rooms.csv");
    }

    [HttpGet("options")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetOptions() => Ok(new { success = true, message = "Room options retrieved successfully.", data = _service.GetOptions() });

    [CampusScoped]
    [HttpGet("{classroomId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRoom(long classroomId, [FromQuery] long? collegeId = null)
    {
        var data = await _service.GetRoomAsync(classroomId, ResolveCollegeId(collegeId));
        return Ok(new { success = true, message = "Room retrieved successfully.", data });
    }

    [CampusScoped]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateRoom([FromBody] SaveRoomRequest request)
    {
        var collegeId = ResolveCollegeId(request.CollegeId);
        var actor = GetUserId();
        _logger.LogInformation("Create room requested. RoomNumber={RoomNumber}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", request.RoomNumber, collegeId, actor);
        var data = await _service.CreateRoomAsync(collegeId, request, actor);
        return CreatedAtAction(nameof(GetRoom), new { classroomId = data.Id, collegeId }, new { success = true, message = "Room created successfully.", data });
    }

    [CampusScoped]
    [HttpPut("{classroomId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRoom(long classroomId, [FromBody] SaveRoomRequest request)
    {
        var collegeId = ResolveCollegeId(request.CollegeId);
        var actor = GetUserId();
        var data = await _service.UpdateRoomAsync(classroomId, collegeId, request, actor);
        return Ok(new { success = true, message = "Room updated successfully.", data });
    }

    [CampusScoped]
    [HttpDelete("{classroomId:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteRoom(long classroomId, [FromQuery] long? collegeId = null)
    {
        var effectiveCollegeId = ResolveCollegeId(collegeId);
        var actor = GetUserId();
        await _service.DeleteRoomAsync(classroomId, effectiveCollegeId, actor);
        return Ok(new { success = true, message = "Room deleted successfully.", classroomId });
    }

    [CampusScoped]
    [HttpPut("{classroomId:long}/allocation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AllocateRoom(long classroomId, [FromQuery] long? collegeId, [FromBody] AllocateRoomRequest request)
    {
        var effectiveCollegeId = ResolveCollegeId(collegeId);
        var actor = GetUserId();
        var data = await _service.AllocateRoomAsync(classroomId, effectiveCollegeId, request.SectionId, actor);
        return Ok(new { success = true, message = "Room allocated successfully.", data });
    }

    [CampusScoped]
    [HttpDelete("{classroomId:long}/allocation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeallocateRoom(long classroomId, [FromQuery] long? collegeId = null)
    {
        var effectiveCollegeId = ResolveCollegeId(collegeId);
        var actor = GetUserId();
        var data = await _service.DeallocateRoomAsync(classroomId, effectiveCollegeId, actor);
        return Ok(new { success = true, message = "Room deallocated successfully.", data });
    }

    private long ResolveCollegeId(long? requested)
    {
        if (CampusWorkspaceScope.From(HttpContext) is { } scope)
        {
            if (requested.HasValue && requested != scope.CollegeId)
                throw new ContractException(403, "CROSS_COLLEGE_ACCESS", "The selected college does not match the request.");
            return scope.CollegeId;
        }
        if (requested.HasValue && requested.Value > 0) return requested.Value;
        var claim = User.FindFirstValue("collegeId");
        if (long.TryParse(claim, out var collegeId) && collegeId > 0) return collegeId;
        throw new ArgumentException("collegeId is required.");
    }

    private long? GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var userId) && userId > 0 ? userId : null;
    }
}
