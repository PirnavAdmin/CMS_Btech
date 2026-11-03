using System.Security.Claims;
using BTech.DTOs.Meetings;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize]
[Route("api/v1/meetings")]
public sealed class MeetingsController : ControllerBase
{
    private readonly IMeetingManagementService _service;
    private readonly ILogger<MeetingsController> _logger;

    public MeetingsController(IMeetingManagementService service, ILogger<MeetingsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetMeetings([FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null, [FromQuery] string? status = null, [FromQuery] string? search = null)
    {
        var data = await _service.GetMeetingsAsync(ResolveCollegeId(null), fromDate, toDate, status, search);
        return Ok(new { success = true, message = "Meetings retrieved successfully.", count = data.Count, data });
    }

    [HttpGet("{meetingId:long}")]
    public async Task<IActionResult> GetMeeting(long meetingId) => Ok(new { success = true, message = "Meeting retrieved successfully.", data = await _service.GetMeetingAsync(meetingId, ResolveCollegeId(null)) });

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateMeeting([FromBody] SaveMeetingRequest request)
    {
        var collegeId = ResolveCollegeId(null);
        var data = await _service.CreateMeetingAsync(collegeId, request, GetUserId());
        _logger.LogInformation("Meeting created via API. MeetingId={MeetingId}, CollegeId={CollegeId}", data.MeetingId, collegeId);
        return CreatedAtAction(nameof(GetMeeting), new { meetingId = data.MeetingId }, new { success = true, message = "Meeting created successfully.", data });
    }

    [HttpPut("{meetingId:long}")]
    public async Task<IActionResult> UpdateMeeting(long meetingId, [FromBody] SaveMeetingRequest request) => Ok(new { success = true, message = "Meeting updated successfully.", data = await _service.UpdateMeetingAsync(meetingId, ResolveCollegeId(null), request, GetUserId()) });

    [HttpDelete("{meetingId:long}")]
    public async Task<IActionResult> DeleteMeeting(long meetingId)
    {
        await _service.DeleteMeetingAsync(meetingId, ResolveCollegeId(null), GetUserId());
        return Ok(new { success = true, message = "Meeting deleted successfully.", meetingId });
    }

    [HttpGet("{meetingId:long}/participants")]
    public async Task<IActionResult> GetParticipants(long meetingId) => Ok(new { success = true, message = "Meeting participants retrieved successfully.", data = await _service.GetParticipantsAsync(meetingId, ResolveCollegeId(null)) });

    [HttpGet("{meetingId:long}/participants/{participantId:long}")]
    public async Task<IActionResult> GetParticipant(long meetingId, long participantId) => Ok(new { success = true, message = "Meeting participant retrieved successfully.", data = await _service.GetParticipantAsync(meetingId, participantId, ResolveCollegeId(null)) });

    [HttpPost("{meetingId:long}/participants")]
    public async Task<IActionResult> AddParticipant(long meetingId, [FromBody] SaveMeetingParticipantRequest request)
    {
        var data = await _service.CreateParticipantAsync(meetingId, ResolveCollegeId(null), request, GetUserId());
        return CreatedAtAction(nameof(GetParticipant), new { meetingId, participantId = data.ParticipantId }, new { success = true, message = "Participant added successfully.", data });
    }

    [HttpPut("{meetingId:long}/participants/{participantId:long}")]
    public async Task<IActionResult> UpdateParticipant(long meetingId, long participantId, [FromBody] SaveMeetingParticipantRequest request) => Ok(new { success = true, message = "Participant updated successfully.", data = await _service.UpdateParticipantAsync(meetingId, participantId, ResolveCollegeId(null), request, GetUserId()) });

    [HttpDelete("{meetingId:long}/participants/{participantId:long}")]
    public async Task<IActionResult> DeleteParticipant(long meetingId, long participantId)
    {
        await _service.DeleteParticipantAsync(meetingId, participantId, ResolveCollegeId(null));
        return Ok(new { success = true, message = "Participant removed successfully.", meetingId, participantId });
    }

    [HttpGet("{meetingId:long}/attendance")]
    public async Task<IActionResult> GetAttendance(long meetingId) => Ok(new { success = true, message = "Meeting attendance retrieved successfully.", data = await _service.GetAttendanceAsync(meetingId, ResolveCollegeId(null)) });

    [HttpPut("{meetingId:long}/attendance")]
    public async Task<IActionResult> SaveAttendance(long meetingId, [FromBody] SaveMeetingAttendanceRequest request) => Ok(new { success = true, message = "Meeting attendance saved successfully.", data = await _service.SaveAttendanceAsync(meetingId, ResolveCollegeId(null), request, GetUserId()) });

    [HttpDelete("{meetingId:long}/attendance/{attendanceId:long}")]
    public async Task<IActionResult> DeleteAttendance(long meetingId, long attendanceId)
    {
        await _service.DeleteAttendanceAsync(meetingId, attendanceId, ResolveCollegeId(null));
        return Ok(new { success = true, message = "Meeting attendance deleted successfully.", meetingId, attendanceId });
    }

    [HttpGet("{meetingId:long}/minutes")]
    public async Task<IActionResult> GetMinutes(long meetingId) => Ok(new { success = true, message = "Meeting minutes retrieved successfully.", data = await _service.GetMinutesAsync(meetingId, ResolveCollegeId(null)) });

    [HttpPost("{meetingId:long}/minutes")]
    public async Task<IActionResult> CreateMinutes(long meetingId, [FromBody] SaveMeetingMinutesRequest request)
    {
        var data = await _service.CreateMinutesAsync(meetingId, ResolveCollegeId(null), request, GetUserId());
        return CreatedAtAction(nameof(GetMinutes), new { meetingId }, new { success = true, message = "Meeting minutes created successfully.", data });
    }

    [HttpPut("{meetingId:long}/minutes/{minutesId:long}")]
    public async Task<IActionResult> UpdateMinutes(long meetingId, long minutesId, [FromBody] SaveMeetingMinutesRequest request) => Ok(new { success = true, message = "Meeting minutes updated successfully.", data = await _service.UpdateMinutesAsync(meetingId, minutesId, ResolveCollegeId(null), request, GetUserId()) });

    [HttpDelete("{meetingId:long}/minutes/{minutesId:long}")]
    public async Task<IActionResult> DeleteMinutes(long meetingId, long minutesId)
    {
        await _service.DeleteMinutesAsync(meetingId, minutesId, ResolveCollegeId(null));
        return Ok(new { success = true, message = "Meeting minutes deleted successfully.", meetingId, minutesId });
    }

    [HttpGet("{meetingId:long}/documents")]
    public async Task<IActionResult> GetDocuments(long meetingId) => Ok(new { success = true, message = "Meeting documents retrieved successfully.", data = await _service.GetDocumentsAsync(meetingId, ResolveCollegeId(null)) });

    [HttpGet("{meetingId:long}/documents/{meetingDocumentId:long}")]
    public async Task<IActionResult> GetDocument(long meetingId, long meetingDocumentId) => Ok(new { success = true, message = "Meeting document retrieved successfully.", data = await _service.GetDocumentAsync(meetingId, meetingDocumentId, ResolveCollegeId(null)) });

    [HttpPost("{meetingId:long}/documents")]
    public async Task<IActionResult> AddDocument(long meetingId, [FromBody] SaveMeetingDocumentRequest request)
    {
        var data = await _service.CreateDocumentAsync(meetingId, ResolveCollegeId(null), request, GetUserId());
        return CreatedAtAction(nameof(GetDocument), new { meetingId, meetingDocumentId = data.MeetingDocumentId }, new { success = true, message = "Meeting document added successfully.", data });
    }

    [HttpPut("{meetingId:long}/documents/{meetingDocumentId:long}")]
    public async Task<IActionResult> UpdateDocument(long meetingId, long meetingDocumentId, [FromBody] SaveMeetingDocumentRequest request) => Ok(new { success = true, message = "Meeting document updated successfully.", data = await _service.UpdateDocumentAsync(meetingId, meetingDocumentId, ResolveCollegeId(null), request) });

    [HttpDelete("{meetingId:long}/documents/{meetingDocumentId:long}")]
    public async Task<IActionResult> DeleteDocument(long meetingId, long meetingDocumentId)
    {
        await _service.DeleteDocumentAsync(meetingId, meetingDocumentId, ResolveCollegeId(null));
        return Ok(new { success = true, message = "Meeting document deleted successfully.", meetingId, meetingDocumentId });
    }

    private long ResolveCollegeId(long? requested)
    {
        if (requested.HasValue && requested.Value > 0) return requested.Value;
        var claim = User.FindFirstValue("collegeId") ?? User.FindFirstValue("college_id");
        if (long.TryParse(claim, out var collegeId) && collegeId > 0) return collegeId;
        // SuperAdmin tokens intentionally have no fixed college claim; allow explicit query scope for them.
        if (long.TryParse(Request.Query["collegeId"].FirstOrDefault(), out var queryCollegeId) && queryCollegeId > 0) return queryCollegeId;
        throw new ArgumentException("The authenticated user's collegeId claim is missing. SuperAdmin requests must provide ?collegeId=.");
    }

    private long? GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("userId") ?? User.FindFirstValue("user_id");
        return long.TryParse(value, out var userId) && userId > 0 ? userId : null;
    }
}
