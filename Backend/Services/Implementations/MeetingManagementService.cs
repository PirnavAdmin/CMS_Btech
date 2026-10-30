using BTech.DTOs.Meetings;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class MeetingManagementService : IMeetingManagementService
{
    private readonly IMeetingManagementRepository _repository;
    private readonly ILogger<MeetingManagementService> _logger;

    private static readonly string[] MeetingStatuses = ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"];
    private static readonly string[] InvitationStatuses = ["INVITED", "ACCEPTED", "DECLINED", "TENTATIVE"];
    private static readonly string[] AttendanceStatuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "PENDING"];
    private static readonly string[] MinutesStatuses = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

    public MeetingManagementService(IMeetingManagementRepository repository, ILogger<MeetingManagementService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public Task<List<MeetingDto>> GetMeetingsAsync(long collegeId, DateTime? fromDate, DateTime? toDate, string? status, string? search)
    {
        EnsureCollege(collegeId);
        if (fromDate.HasValue && toDate.HasValue && fromDate.Value.Date > toDate.Value.Date) throw new ArgumentException("fromDate cannot be after toDate.");
        var normalizedStatus = NormalizeOptionalStatus(status, MeetingStatuses, "meeting status");
        return _repository.GetMeetingsAsync(collegeId, fromDate?.Date, toDate?.Date, normalizedStatus, Clean(search));
    }

    public async Task<MeetingDto> GetMeetingAsync(long meetingId, long collegeId)
    {
        EnsureIds(meetingId, collegeId);
        return await _repository.GetMeetingAsync(meetingId, collegeId) ?? throw new KeyNotFoundException("Meeting not found.");
    }

    public async Task<MeetingDto> CreateMeetingAsync(long collegeId, SaveMeetingRequest request, long? actorUserId)
    {
        EnsureCollege(collegeId);
        ValidateMeeting(request);
        var id = await _repository.CreateMeetingAsync(collegeId, request, actorUserId);
        _logger.LogInformation("Meeting created. MeetingId={MeetingId}, CollegeId={CollegeId}", id, collegeId);
        return await GetMeetingAsync(id, collegeId);
    }

    public async Task<MeetingDto> UpdateMeetingAsync(long meetingId, long collegeId, SaveMeetingRequest request, long? actorUserId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        ValidateMeeting(request);
        if (!await _repository.UpdateMeetingAsync(meetingId, collegeId, request, actorUserId)) throw new KeyNotFoundException("Meeting not found.");
        return await GetMeetingAsync(meetingId, collegeId);
    }

    public async Task DeleteMeetingAsync(long meetingId, long collegeId, long? actorUserId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        if (!await _repository.SoftDeleteMeetingAsync(meetingId, collegeId, actorUserId)) throw new KeyNotFoundException("Meeting not found.");
    }

    public Task<List<MeetingParticipantDto>> GetParticipantsAsync(long meetingId, long collegeId) => WithMeeting(meetingId, collegeId, () => _repository.GetParticipantsAsync(meetingId, collegeId));

    public async Task<MeetingParticipantDto> GetParticipantAsync(long meetingId, long participantId, long collegeId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        if (participantId <= 0) throw new ArgumentException("A valid participantId is required.");
        return await _repository.GetParticipantAsync(meetingId, participantId, collegeId) ?? throw new KeyNotFoundException("Meeting participant not found.");
    }

    public async Task<MeetingParticipantDto> CreateParticipantAsync(long meetingId, long collegeId, SaveMeetingParticipantRequest request, long? actorUserId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        ValidateParticipant(request);
        var id = await _repository.CreateParticipantAsync(meetingId, collegeId, request, actorUserId);
        return await GetParticipantAsync(meetingId, id, collegeId);
    }

    public async Task<MeetingParticipantDto> UpdateParticipantAsync(long meetingId, long participantId, long collegeId, SaveMeetingParticipantRequest request, long? actorUserId)
    {
        await GetParticipantAsync(meetingId, participantId, collegeId);
        ValidateParticipant(request);
        if (!await _repository.UpdateParticipantAsync(meetingId, participantId, collegeId, request, actorUserId)) throw new KeyNotFoundException("Meeting participant not found.");
        return await GetParticipantAsync(meetingId, participantId, collegeId);
    }

    public async Task DeleteParticipantAsync(long meetingId, long participantId, long collegeId)
    {
        await GetParticipantAsync(meetingId, participantId, collegeId);
        if (!await _repository.DeleteParticipantAsync(meetingId, participantId, collegeId)) throw new KeyNotFoundException("Meeting participant not found.");
    }

    public Task<List<MeetingAttendanceDto>> GetAttendanceAsync(long meetingId, long collegeId) => WithMeeting(meetingId, collegeId, () => _repository.GetAttendanceAsync(meetingId, collegeId));

    public async Task<MeetingAttendanceDto> SaveAttendanceAsync(long meetingId, long collegeId, SaveMeetingAttendanceRequest request, long? actorUserId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        if (request.ParticipantId <= 0) throw new ArgumentException("A valid participantId is required.");
        request.AttendanceStatus = NormalizeStatus(request.AttendanceStatus, AttendanceStatuses, "attendance status");
        if (request.CheckInAt.HasValue && request.CheckOutAt.HasValue && request.CheckOutAt.Value < request.CheckInAt.Value) throw new ArgumentException("checkOutAt cannot be earlier than checkInAt.");
        await GetParticipantAsync(meetingId, request.ParticipantId, collegeId);
        await _repository.SaveAttendanceAsync(meetingId, collegeId, request, actorUserId);
        return await _repository.GetAttendanceByParticipantAsync(meetingId, request.ParticipantId, collegeId) ?? throw new KeyNotFoundException("Attendance record not found after saving.");
    }

    public async Task DeleteAttendanceAsync(long meetingId, long attendanceId, long collegeId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        if (attendanceId <= 0 || !await _repository.DeleteAttendanceAsync(meetingId, attendanceId, collegeId)) throw new KeyNotFoundException("Meeting attendance not found.");
    }

    public async Task<MeetingMinutesDto?> GetMinutesAsync(long meetingId, long collegeId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        return await _repository.GetMinutesAsync(meetingId, collegeId);
    }

    public async Task<MeetingMinutesDto> CreateMinutesAsync(long meetingId, long collegeId, SaveMeetingMinutesRequest request, long? actorUserId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        ValidateMinutes(request);
        var id = await _repository.CreateMinutesAsync(meetingId, collegeId, request, actorUserId);
        return await _repository.GetMinutesAsync(meetingId, collegeId) ?? throw new KeyNotFoundException("Meeting minutes not found after saving.");
    }

    public async Task<MeetingMinutesDto> UpdateMinutesAsync(long meetingId, long minutesId, long collegeId, SaveMeetingMinutesRequest request, long? actorUserId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        if (minutesId <= 0) throw new ArgumentException("A valid minutesId is required.");
        ValidateMinutes(request);
        if (!await _repository.UpdateMinutesAsync(meetingId, minutesId, collegeId, request, actorUserId)) throw new KeyNotFoundException("Meeting minutes not found.");
        return await _repository.GetMinutesAsync(meetingId, collegeId) ?? throw new KeyNotFoundException("Meeting minutes not found.");
    }

    public async Task DeleteMinutesAsync(long meetingId, long minutesId, long collegeId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        if (minutesId <= 0 || !await _repository.DeleteMinutesAsync(meetingId, minutesId, collegeId)) throw new KeyNotFoundException("Meeting minutes not found.");
    }

    public Task<List<MeetingDocumentDto>> GetDocumentsAsync(long meetingId, long collegeId) => WithMeeting(meetingId, collegeId, () => _repository.GetDocumentsAsync(meetingId, collegeId));

    public async Task<MeetingDocumentDto> GetDocumentAsync(long meetingId, long meetingDocumentId, long collegeId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        if (meetingDocumentId <= 0) throw new ArgumentException("A valid meetingDocumentId is required.");
        return await _repository.GetDocumentAsync(meetingId, meetingDocumentId, collegeId) ?? throw new KeyNotFoundException("Meeting document not found.");
    }

    public async Task<MeetingDocumentDto> CreateDocumentAsync(long meetingId, long collegeId, SaveMeetingDocumentRequest request, long? actorUserId)
    {
        await GetMeetingAsync(meetingId, collegeId);
        ValidateDocument(request);
        var id = await _repository.CreateDocumentAsync(meetingId, collegeId, request, actorUserId);
        return await GetDocumentAsync(meetingId, id, collegeId);
    }

    public async Task<MeetingDocumentDto> UpdateDocumentAsync(long meetingId, long meetingDocumentId, long collegeId, SaveMeetingDocumentRequest request)
    {
        await GetDocumentAsync(meetingId, meetingDocumentId, collegeId);
        ValidateDocument(request);
        if (!await _repository.UpdateDocumentAsync(meetingId, meetingDocumentId, collegeId, request)) throw new KeyNotFoundException("Meeting document not found.");
        return await GetDocumentAsync(meetingId, meetingDocumentId, collegeId);
    }

    public async Task DeleteDocumentAsync(long meetingId, long meetingDocumentId, long collegeId)
    {
        await GetDocumentAsync(meetingId, meetingDocumentId, collegeId);
        if (!await _repository.DeleteDocumentAsync(meetingId, meetingDocumentId, collegeId)) throw new KeyNotFoundException("Meeting document not found.");
    }

    private async Task<T> WithMeeting<T>(long meetingId, long collegeId, Func<Task<T>> action)
    {
        await GetMeetingAsync(meetingId, collegeId);
        return await action();
    }

    private static void ValidateMeeting(SaveMeetingRequest request)
    {
        request.MeetingCode = request.MeetingCode?.Trim() ?? "";
        request.Title = request.Title?.Trim() ?? "";
        if (request.MeetingCode.Length == 0) throw new ArgumentException("meetingCode is required.");
        if (request.Title.Length == 0) throw new ArgumentException("title is required.");
        if (request.MeetingDate == default) throw new ArgumentException("A valid meetingDate is required.");
        request.Status = NormalizeStatus(request.Status, MeetingStatuses, "meeting status");
        if (request.EndTime.HasValue && request.EndTime.Value <= request.StartTime) throw new ArgumentException("endTime must be later than startTime.");
    }

    private static void ValidateParticipant(SaveMeetingParticipantRequest request)
    {
        if (request.UserId <= 0) throw new ArgumentException("A valid userId is required.");
        request.InvitationStatus = NormalizeStatus(request.InvitationStatus, InvitationStatuses, "invitation status");
    }

    private static void ValidateMinutes(SaveMeetingMinutesRequest request)
    {
        request.MinutesText = request.MinutesText?.Trim() ?? "";
        if (request.MinutesText.Length == 0) throw new ArgumentException("minutesText is required.");
        request.ApprovalStatus = NormalizeStatus(request.ApprovalStatus, MinutesStatuses, "minutes approval status");
        if (request.ApprovalStatus == "APPROVED" && !request.ApprovedBy.HasValue) throw new ArgumentException("approvedBy is required when approvalStatus is APPROVED.");
    }

    private static void ValidateDocument(SaveMeetingDocumentRequest request)
    {
        request.DocumentTitle = request.DocumentTitle?.Trim() ?? "";
        if (request.DocumentTitle.Length == 0) throw new ArgumentException("documentTitle is required.");
        if (request.FileSize < 0) throw new ArgumentException("fileSize cannot be negative.");
    }

    private static string NormalizeStatus(string? value, string[] allowed, string field)
    {
        var normalized = (value ?? "").Trim().ToUpperInvariant();
        if (!allowed.Contains(normalized, StringComparer.Ordinal)) throw new ArgumentException($"Invalid {field}. Allowed values: {string.Join(", ", allowed)}.");
        return normalized;
    }

    private static string? NormalizeOptionalStatus(string? value, string[] allowed, string field) =>
        string.IsNullOrWhiteSpace(value) ? null : NormalizeStatus(value, allowed, field);

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static void EnsureCollege(long collegeId) { if (collegeId <= 0) throw new ArgumentException("A valid collegeId is required."); }
    private static void EnsureIds(long meetingId, long collegeId) { EnsureCollege(collegeId); if (meetingId <= 0) throw new ArgumentException("A valid meetingId is required."); }
}
