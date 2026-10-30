using BTech.DTOs.Meetings;

namespace BTech.Services.Interfaces;

public interface IMeetingManagementService
{
    Task<List<MeetingDto>> GetMeetingsAsync(long collegeId, DateTime? fromDate, DateTime? toDate, string? status, string? search);
    Task<MeetingDto> GetMeetingAsync(long meetingId, long collegeId);
    Task<MeetingDto> CreateMeetingAsync(long collegeId, SaveMeetingRequest request, long? actorUserId);
    Task<MeetingDto> UpdateMeetingAsync(long meetingId, long collegeId, SaveMeetingRequest request, long? actorUserId);
    Task DeleteMeetingAsync(long meetingId, long collegeId, long? actorUserId);
    Task<List<MeetingParticipantDto>> GetParticipantsAsync(long meetingId, long collegeId);
    Task<MeetingParticipantDto> GetParticipantAsync(long meetingId, long participantId, long collegeId);
    Task<MeetingParticipantDto> CreateParticipantAsync(long meetingId, long collegeId, SaveMeetingParticipantRequest request, long? actorUserId);
    Task<MeetingParticipantDto> UpdateParticipantAsync(long meetingId, long participantId, long collegeId, SaveMeetingParticipantRequest request, long? actorUserId);
    Task DeleteParticipantAsync(long meetingId, long participantId, long collegeId);
    Task<List<MeetingAttendanceDto>> GetAttendanceAsync(long meetingId, long collegeId);
    Task<MeetingAttendanceDto> SaveAttendanceAsync(long meetingId, long collegeId, SaveMeetingAttendanceRequest request, long? actorUserId);
    Task DeleteAttendanceAsync(long meetingId, long attendanceId, long collegeId);
    Task<MeetingMinutesDto?> GetMinutesAsync(long meetingId, long collegeId);
    Task<MeetingMinutesDto> CreateMinutesAsync(long meetingId, long collegeId, SaveMeetingMinutesRequest request, long? actorUserId);
    Task<MeetingMinutesDto> UpdateMinutesAsync(long meetingId, long minutesId, long collegeId, SaveMeetingMinutesRequest request, long? actorUserId);
    Task DeleteMinutesAsync(long meetingId, long minutesId, long collegeId);
    Task<List<MeetingDocumentDto>> GetDocumentsAsync(long meetingId, long collegeId);
    Task<MeetingDocumentDto> GetDocumentAsync(long meetingId, long meetingDocumentId, long collegeId);
    Task<MeetingDocumentDto> CreateDocumentAsync(long meetingId, long collegeId, SaveMeetingDocumentRequest request, long? actorUserId);
    Task<MeetingDocumentDto> UpdateDocumentAsync(long meetingId, long meetingDocumentId, long collegeId, SaveMeetingDocumentRequest request);
    Task DeleteDocumentAsync(long meetingId, long meetingDocumentId, long collegeId);
}
