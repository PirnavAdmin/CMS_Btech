using System.Security.Claims;
using BTech.DTOs.MeetingEventValidation;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/meeting-event-validation")]
[Authorize]
public sealed class MeetingEventValidationController : ControllerBase
{
    private const string AdminRoles = "SUPER_ADMIN,COLLEGE_ADMIN,PRINCIPAL,HOD";
    private readonly IMeetingEventValidationService _service;

    public MeetingEventValidationController(IMeetingEventValidationService service) => _service = service;

    [HttpPost("events/validate")]
    [Authorize(Roles = AdminRoles)]
    public Task<IActionResult> ValidateEvent([FromBody] ValidateEventRequest request)
        => Execute(() => _service.ValidateEventAsync(request, UserId(), CollegeId(), IsSuperAdmin()), "Event validation completed.");

    [HttpPost("meetings/validate")]
    [Authorize(Roles = AdminRoles)]
    public Task<IActionResult> ValidateMeeting([FromBody] ValidateMeetingRequest request)
        => Execute(() => _service.ValidateMeetingAsync(request, UserId(), CollegeId(), IsSuperAdmin()), "Meeting validation completed.");

    [HttpPost("schedules/validate")]
    [Authorize(Roles = AdminRoles)]
    public Task<IActionResult> ValidateSchedule([FromBody] ValidateScheduleRequest request)
        => Execute(() => _service.ValidateScheduleAsync(request, UserId(), CollegeId(), IsSuperAdmin()), "Schedule validation completed.");

    private long UserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? User.FindFirstValue("user_id");
        return long.TryParse(value, out var id) && id > 0 ? id : throw new UnauthorizedAccessException("Authenticated user ID is missing from token.");
    }

    private long? CollegeId()
    {
        var value = User.FindFirstValue("college_id") ?? User.FindFirstValue("CollegeId");
        return long.TryParse(value, out var id) && id > 0 ? id : null;
    }

    private bool IsSuperAdmin() => User.IsInRole("SUPER_ADMIN");

    private async Task<IActionResult> Execute<T>(Func<Task<T>> action, string message)
    {
        try
        {
            var result = await action();
            return Ok(new { success = true, message, data = result });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (MySqlException ex) when (ex.Number == 1644)
        {
            return Conflict(new { success = false, message = ex.Message });
        }
    }
}
