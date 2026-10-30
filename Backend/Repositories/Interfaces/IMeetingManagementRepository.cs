using BTech.DTOs.Meetings;

namespace BTech.Repositories.Interfaces;

public interface IMeetingManagementRepository
{
    Task<List<MeetingDto>> GetMeetingsAsync(long collegeId, DateTime? fromDate, DateTime? toDate, string? status, string? search);
    Task<MeetingDto?> GetMeetingAsync(long meetingId, long collegeId);
    Task<long> CreateMeetingAsync(long collegeId, SaveMeetingRequest request, long? actorUserId);
    Task<bool> UpdateMeetingAsync(long meetingId, long collegeId, SaveMeetingRequest request, long? actorUserId);
    Task<bool> SoftDeleteMeetingAsync(long meetingId, long collegeId, long? actorUserId);
    Task<List<MeetingParticipantDto>> GetParticipantsAsync(long meetingId, long collegeId);
    Task<MeetingParticipantDto?> GetParticipantAsync(long meetingId, long participantId, long collegeId);
    Task<long> CreateParticipantAsync(long meetingId, long collegeId, SaveMeetingParticipantRequest request, long? actorUserId);
    Task<bool> UpdateParticipantAsync(long meetingId, long participantId, long collegeId, SaveMeetingParticipantRequest request, long? actorUserId);
    Task<bool> DeleteParticipantAsync(long meetingId, long participantId, long collegeId);
    Task<List<MeetingAttendanceDto>> GetAttendanceAsync(long meetingId, long collegeId);
    Task<MeetingAttendanceDto?> GetAttendanceByParticipantAsync(long meetingId, long participantId, long collegeId);
    Task<long> SaveAttendanceAsync(long meetingId, long collegeId, SaveMeetingAttendanceRequest request, long? actorUserId);
    Task<bool> DeleteAttendanceAsync(long meetingId, long attendanceId, long collegeId);
    Task<MeetingMinutesDto?> GetMinutesAsync(long meetingId, long collegeId);
    Task<long> CreateMinutesAsync(long meetingId, long collegeId, SaveMeetingMinutesRequest request, long? actorUserId);
    Task<bool> UpdateMinutesAsync(long meetingId, long minutesId, long collegeId, SaveMeetingMinutesRequest request, long? actorUserId);
    Task<bool> DeleteMinutesAsync(long meetingId, long minutesId, long collegeId);
    Task<List<MeetingDocumentDto>> GetDocumentsAsync(long meetingId, long collegeId);
    Task<MeetingDocumentDto?> GetDocumentAsync(long meetingId, long meetingDocumentId, long collegeId);
    Task<long> CreateDocumentAsync(long meetingId, long collegeId, SaveMeetingDocumentRequest request, long? actorUserId);
    Task<bool> UpdateDocumentAsync(long meetingId, long meetingDocumentId, long collegeId, SaveMeetingDocumentRequest request);
    Task<bool> DeleteDocumentAsync(long meetingId, long meetingDocumentId, long collegeId);
}
