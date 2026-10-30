using BTech.DTOs.Meetings;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class MeetingManagementRepository : IMeetingManagementRepository
{
    private readonly string _connectionString;
    public MeetingManagementRepository(IConfiguration configuration) =>
        _connectionString = configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("DefaultConnection is missing.");
    private MySqlConnection CreateConnection() => new(_connectionString);

    public async Task<List<MeetingDto>> GetMeetingsAsync(long collegeId, DateTime? fromDate, DateTime? toDate, string? status, string? search)
    {
        const string sql = """
            SELECT meeting_id AS MeetingId, college_id AS CollegeId, meeting_code AS MeetingCode, title AS Title,
                   meeting_type AS MeetingType, description AS Description, meeting_date AS MeetingDate,
                   start_time AS StartTime, end_time AS EndTime, venue AS Venue, organizer_id AS OrganizerId,
                   status AS Status, remarks AS Remarks, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM meetings
            WHERE college_id=@collegeId AND deleted_at IS NULL
              AND (@fromDate IS NULL OR meeting_date >= @fromDate)
              AND (@toDate IS NULL OR meeting_date <= @toDate)
              AND (@status IS NULL OR status=@status)
              AND (@search IS NULL OR meeting_code LIKE CONCAT('%',@search,'%') OR title LIKE CONCAT('%',@search,'%') OR COALESCE(venue,'') LIKE CONCAT('%',@search,'%'))
            ORDER BY meeting_date DESC, start_time DESC, meeting_id DESC;
            """;
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<MeetingDto>(sql, new { collegeId, fromDate, toDate, status, search });
        return rows.AsList();
    }

    public async Task<MeetingDto?> GetMeetingAsync(long meetingId, long collegeId)
    {
        const string sql = """
            SELECT meeting_id AS MeetingId, college_id AS CollegeId, meeting_code AS MeetingCode, title AS Title,
                   meeting_type AS MeetingType, description AS Description, meeting_date AS MeetingDate,
                   start_time AS StartTime, end_time AS EndTime, venue AS Venue, organizer_id AS OrganizerId,
                   status AS Status, remarks AS Remarks, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM meetings WHERE meeting_id=@meetingId AND college_id=@collegeId AND deleted_at IS NULL LIMIT 1;
            """;
        await using var c = CreateConnection();
        return await c.QuerySingleOrDefaultAsync<MeetingDto>(sql, new { meetingId, collegeId });
    }

    public async Task<long> CreateMeetingAsync(long collegeId, SaveMeetingRequest r, long? actorUserId)
    {
        const string sql = """
            INSERT INTO meetings (college_id,meeting_code,title,meeting_type,description,meeting_date,start_time,end_time,venue,organizer_id,status,remarks,created_by)
            VALUES (@collegeId,@MeetingCode,@Title,@MeetingType,@Description,@MeetingDate,@StartTime,@EndTime,@Venue,@OrganizerId,@Status,@Remarks,@actorUserId);
            """;
        await using var c = CreateConnection();
        // Keep the INSERT and LAST_INSERT_ID() on the same open MySQL connection.
        // Dapper may otherwise open and close the connection for each operation,
        // which can cause LAST_INSERT_ID() to return 0 on a new connection.
        await c.OpenAsync();

        await c.ExecuteAsync(sql, new
        {
            collegeId,
            r.MeetingCode,
            r.Title,
            r.MeetingType,
            r.Description,
            MeetingDate = r.MeetingDate.Date,
            r.StartTime,
            r.EndTime,
            r.Venue,
            r.OrganizerId,
            r.Status,
            r.Remarks,
            actorUserId
        });

        var meetingId = await c.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID();");
        if (meetingId <= 0)
        {
            throw new InvalidOperationException("Meeting was inserted, but the database did not return a valid meeting ID.");
        }

        return meetingId;
    }

    public async Task<bool> UpdateMeetingAsync(long meetingId, long collegeId, SaveMeetingRequest r, long? actorUserId)
    {
        const string sql = """
            UPDATE meetings SET meeting_code=@MeetingCode,title=@Title,meeting_type=@MeetingType,description=@Description,
                meeting_date=@MeetingDate,start_time=@StartTime,end_time=@EndTime,venue=@Venue,organizer_id=@OrganizerId,
                status=@Status,remarks=@Remarks,updated_by=@actorUserId
            WHERE meeting_id=@meetingId AND college_id=@collegeId AND deleted_at IS NULL;
            """;
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, collegeId, r.MeetingCode, r.Title, r.MeetingType, r.Description, MeetingDate = r.MeetingDate.Date, r.StartTime, r.EndTime, r.Venue, r.OrganizerId, r.Status, r.Remarks, actorUserId }) > 0;
    }

    public async Task<bool> SoftDeleteMeetingAsync(long meetingId, long collegeId, long? actorUserId)
    {
        const string sql = "UPDATE meetings SET deleted_at=CURRENT_TIMESTAMP, deleted_by=@actorUserId, updated_by=@actorUserId WHERE meeting_id=@meetingId AND college_id=@collegeId AND deleted_at IS NULL;";
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, collegeId, actorUserId }) > 0;
    }

    public async Task<List<MeetingParticipantDto>> GetParticipantsAsync(long meetingId, long collegeId)
    {
        const string sql = """
            SELECT mp.participant_id AS ParticipantId,mp.meeting_id AS MeetingId,mp.user_id AS UserId,u.full_name AS UserName,u.email AS Email,
                   mp.participant_role AS ParticipantRole,mp.invitation_status AS InvitationStatus,CAST(mp.is_required AS UNSIGNED) AS IsRequired,
                   mp.response_at AS ResponseAt,mp.remarks AS Remarks,mp.created_at AS CreatedAt
            FROM meeting_participants mp JOIN users u ON u.user_id=mp.user_id
            JOIN meetings m ON m.meeting_id=mp.meeting_id
            WHERE mp.meeting_id=@meetingId AND m.college_id=@collegeId AND m.deleted_at IS NULL
            ORDER BY u.full_name,mp.participant_id;
            """;
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<MeetingParticipantDto>(sql, new { meetingId, collegeId });
        return rows.AsList();
    }

    public async Task<MeetingParticipantDto?> GetParticipantAsync(long meetingId, long participantId, long collegeId)
    {
        const string sql = """
            SELECT mp.participant_id AS ParticipantId,mp.meeting_id AS MeetingId,mp.user_id AS UserId,u.full_name AS UserName,u.email AS Email,
                   mp.participant_role AS ParticipantRole,mp.invitation_status AS InvitationStatus,CAST(mp.is_required AS UNSIGNED) AS IsRequired,
                   mp.response_at AS ResponseAt,mp.remarks AS Remarks,mp.created_at AS CreatedAt
            FROM meeting_participants mp JOIN users u ON u.user_id=mp.user_id JOIN meetings m ON m.meeting_id=mp.meeting_id
            WHERE mp.meeting_id=@meetingId AND mp.participant_id=@participantId AND m.college_id=@collegeId AND m.deleted_at IS NULL LIMIT 1;
            """;
        await using var c = CreateConnection();
        return await c.QuerySingleOrDefaultAsync<MeetingParticipantDto>(sql, new { meetingId, participantId, collegeId });
    }

    public async Task<long> CreateParticipantAsync(long meetingId, long collegeId, SaveMeetingParticipantRequest r, long? actorUserId)
    {
        const string sql = """
            INSERT INTO meeting_participants (meeting_id,user_id,participant_role,invitation_status,is_required,remarks,created_by)
            SELECT @meetingId,@UserId,@ParticipantRole,@InvitationStatus,@IsRequired,@Remarks,@actorUserId
            WHERE EXISTS (SELECT 1 FROM meetings WHERE meeting_id=@meetingId AND college_id=@collegeId AND deleted_at IS NULL)
              AND EXISTS (SELECT 1 FROM users WHERE user_id=@UserId AND (college_id=@collegeId OR college_id IS NULL) AND status=1 AND deleted_at IS NULL);
            """;
        await using var c = CreateConnection();
        var affected = await c.ExecuteAsync(sql, new { meetingId, collegeId, r.UserId, r.ParticipantRole, r.InvitationStatus, IsRequired = r.IsRequired ? 1 : 0, r.Remarks, actorUserId });
        if (affected == 0) throw new ArgumentException("The selected user does not exist, is inactive, or does not belong to this college.");
        return await c.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID();");
    }

    public async Task<bool> UpdateParticipantAsync(long meetingId, long participantId, long collegeId, SaveMeetingParticipantRequest r, long? actorUserId)
    {
        const string sql = """
            UPDATE meeting_participants mp JOIN meetings m ON m.meeting_id=mp.meeting_id
            SET mp.user_id=@UserId,mp.participant_role=@ParticipantRole,mp.invitation_status=@InvitationStatus,mp.is_required=@IsRequired,
                mp.response_at=CASE WHEN @InvitationStatus IN ('ACCEPTED','DECLINED','TENTATIVE') THEN CURRENT_TIMESTAMP ELSE mp.response_at END,
                mp.remarks=@Remarks,mp.updated_by=@actorUserId
            WHERE mp.meeting_id=@meetingId AND mp.participant_id=@participantId AND m.college_id=@collegeId AND m.deleted_at IS NULL
              AND EXISTS (SELECT 1 FROM users u WHERE u.user_id=@UserId AND (u.college_id=@collegeId OR u.college_id IS NULL) AND u.status=1 AND u.deleted_at IS NULL);
            """;
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, participantId, collegeId, r.UserId, r.ParticipantRole, r.InvitationStatus, IsRequired = r.IsRequired ? 1 : 0, r.Remarks, actorUserId }) > 0;
    }

    public async Task<bool> DeleteParticipantAsync(long meetingId, long participantId, long collegeId)
    {
        const string sql = "DELETE mp FROM meeting_participants mp JOIN meetings m ON m.meeting_id=mp.meeting_id WHERE mp.meeting_id=@meetingId AND mp.participant_id=@participantId AND m.college_id=@collegeId AND m.deleted_at IS NULL;";
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, participantId, collegeId }) > 0;
    }

    public async Task<List<MeetingAttendanceDto>> GetAttendanceAsync(long meetingId, long collegeId)
    {
        const string sql = """
            SELECT a.attendance_id AS AttendanceId,a.meeting_id AS MeetingId,a.participant_id AS ParticipantId,mp.user_id AS UserId,
                   u.full_name AS UserName,a.attendance_status AS AttendanceStatus,a.check_in_at AS CheckInAt,a.check_out_at AS CheckOutAt,
                   a.remarks AS Remarks,a.created_at AS CreatedAt,a.updated_at AS UpdatedAt
            FROM meeting_attendance a JOIN meeting_participants mp ON mp.participant_id=a.participant_id AND mp.meeting_id=a.meeting_id
            JOIN users u ON u.user_id=mp.user_id JOIN meetings m ON m.meeting_id=a.meeting_id
            WHERE a.meeting_id=@meetingId AND m.college_id=@collegeId AND m.deleted_at IS NULL ORDER BY u.full_name;
            """;
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<MeetingAttendanceDto>(sql, new { meetingId, collegeId });
        return rows.AsList();
    }

    public async Task<MeetingAttendanceDto?> GetAttendanceByParticipantAsync(long meetingId, long participantId, long collegeId)
    {
        const string sql = """
            SELECT a.attendance_id AS AttendanceId,a.meeting_id AS MeetingId,a.participant_id AS ParticipantId,mp.user_id AS UserId,
                   u.full_name AS UserName,a.attendance_status AS AttendanceStatus,a.check_in_at AS CheckInAt,a.check_out_at AS CheckOutAt,
                   a.remarks AS Remarks,a.created_at AS CreatedAt,a.updated_at AS UpdatedAt
            FROM meeting_attendance a JOIN meeting_participants mp ON mp.participant_id=a.participant_id AND mp.meeting_id=a.meeting_id
            JOIN users u ON u.user_id=mp.user_id JOIN meetings m ON m.meeting_id=a.meeting_id
            WHERE a.meeting_id=@meetingId AND a.participant_id=@participantId AND m.college_id=@collegeId AND m.deleted_at IS NULL LIMIT 1;
            """;
        await using var c = CreateConnection();
        return await c.QuerySingleOrDefaultAsync<MeetingAttendanceDto>(sql, new { meetingId, participantId, collegeId });
    }

    public async Task<long> SaveAttendanceAsync(long meetingId, long collegeId, SaveMeetingAttendanceRequest r, long? actorUserId)
    {
        const string sql = """
            INSERT INTO meeting_attendance (meeting_id,participant_id,attendance_status,check_in_at,check_out_at,remarks,created_by)
            SELECT @meetingId,@ParticipantId,@AttendanceStatus,@CheckInAt,@CheckOutAt,@Remarks,@actorUserId
            WHERE EXISTS (SELECT 1 FROM meetings WHERE meeting_id=@meetingId AND college_id=@collegeId AND deleted_at IS NULL)
              AND EXISTS (SELECT 1 FROM meeting_participants WHERE participant_id=@ParticipantId AND meeting_id=@meetingId)
            ON DUPLICATE KEY UPDATE attendance_status=VALUES(attendance_status),check_in_at=VALUES(check_in_at),check_out_at=VALUES(check_out_at),remarks=VALUES(remarks),updated_by=@actorUserId;
            """;
        await using var c = CreateConnection();
        await c.ExecuteAsync(sql, new { meetingId, collegeId, r.ParticipantId, r.AttendanceStatus, r.CheckInAt, r.CheckOutAt, r.Remarks, actorUserId });
        return await c.ExecuteScalarAsync<long>("SELECT attendance_id FROM meeting_attendance WHERE meeting_id=@meetingId AND participant_id=@ParticipantId LIMIT 1;", new { meetingId, r.ParticipantId });
    }

    public async Task<bool> DeleteAttendanceAsync(long meetingId, long attendanceId, long collegeId)
    {
        const string sql = "DELETE a FROM meeting_attendance a JOIN meetings m ON m.meeting_id=a.meeting_id WHERE a.meeting_id=@meetingId AND a.attendance_id=@attendanceId AND m.college_id=@collegeId AND m.deleted_at IS NULL;";
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, attendanceId, collegeId }) > 0;
    }

    public async Task<MeetingMinutesDto?> GetMinutesAsync(long meetingId, long collegeId)
    {
        const string sql = """
            SELECT mm.minutes_id AS MinutesId,mm.meeting_id AS MeetingId,mm.minutes_title AS MinutesTitle,mm.minutes_text AS MinutesText,
                   mm.prepared_by AS PreparedBy,mm.approved_by AS ApprovedBy,mm.approval_status AS ApprovalStatus,mm.approved_at AS ApprovedAt,
                   mm.remarks AS Remarks,mm.created_at AS CreatedAt,mm.updated_at AS UpdatedAt
            FROM meeting_minutes mm JOIN meetings m ON m.meeting_id=mm.meeting_id
            WHERE mm.meeting_id=@meetingId AND m.college_id=@collegeId AND m.deleted_at IS NULL LIMIT 1;
            """;
        await using var c = CreateConnection();
        return await c.QuerySingleOrDefaultAsync<MeetingMinutesDto>(sql, new { meetingId, collegeId });
    }

    public async Task<long> CreateMinutesAsync(long meetingId, long collegeId, SaveMeetingMinutesRequest r, long? actorUserId)
    {
        const string sql = """
            INSERT INTO meeting_minutes (meeting_id,minutes_title,minutes_text,prepared_by,approved_by,approval_status,approved_at,remarks,created_by)
            SELECT @meetingId,@MinutesTitle,@MinutesText,@PreparedBy,@ApprovedBy,@ApprovalStatus,
                   CASE WHEN @ApprovalStatus='APPROVED' THEN CURRENT_TIMESTAMP ELSE NULL END,@Remarks,@actorUserId
            WHERE EXISTS (SELECT 1 FROM meetings WHERE meeting_id=@meetingId AND college_id=@collegeId AND deleted_at IS NULL);
            """;
        await using var c = CreateConnection();
        var affected = await c.ExecuteAsync(sql, new { meetingId, collegeId, r.MinutesTitle, r.MinutesText, r.PreparedBy, r.ApprovedBy, r.ApprovalStatus, r.Remarks, actorUserId });
        if (affected == 0) throw new KeyNotFoundException("Meeting not found.");
        return await c.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID();");
    }

    public async Task<bool> UpdateMinutesAsync(long meetingId, long minutesId, long collegeId, SaveMeetingMinutesRequest r, long? actorUserId)
    {
        const string sql = """
            UPDATE meeting_minutes mm JOIN meetings m ON m.meeting_id=mm.meeting_id
            SET mm.minutes_title=@MinutesTitle,mm.minutes_text=@MinutesText,mm.prepared_by=@PreparedBy,mm.approved_by=@ApprovedBy,
                mm.approval_status=@ApprovalStatus,mm.approved_at=CASE WHEN @ApprovalStatus='APPROVED' THEN COALESCE(mm.approved_at,CURRENT_TIMESTAMP) ELSE NULL END,
                mm.remarks=@Remarks,mm.updated_by=@actorUserId
            WHERE mm.meeting_id=@meetingId AND mm.minutes_id=@minutesId AND m.college_id=@collegeId AND m.deleted_at IS NULL;
            """;
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, minutesId, collegeId, r.MinutesTitle, r.MinutesText, r.PreparedBy, r.ApprovedBy, r.ApprovalStatus, r.Remarks, actorUserId }) > 0;
    }

    public async Task<bool> DeleteMinutesAsync(long meetingId, long minutesId, long collegeId)
    {
        const string sql = "DELETE mm FROM meeting_minutes mm JOIN meetings m ON m.meeting_id=mm.meeting_id WHERE mm.meeting_id=@meetingId AND mm.minutes_id=@minutesId AND m.college_id=@collegeId AND m.deleted_at IS NULL;";
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, minutesId, collegeId }) > 0;
    }

    public async Task<List<MeetingDocumentDto>> GetDocumentsAsync(long meetingId, long collegeId)
    {
        const string sql = """
            SELECT md.meeting_document_id AS MeetingDocumentId,md.meeting_id AS MeetingId,md.document_id AS DocumentId,
                   md.document_title AS DocumentTitle,md.document_type AS DocumentType,md.file_name AS FileName,md.file_path AS FilePath,
                   md.file_url AS FileUrl,md.mime_type AS MimeType,md.file_size AS FileSize,md.uploaded_by AS UploadedBy,
                   md.uploaded_at AS UploadedAt,md.remarks AS Remarks
            FROM meeting_documents md JOIN meetings m ON m.meeting_id=md.meeting_id
            WHERE md.meeting_id=@meetingId AND m.college_id=@collegeId AND m.deleted_at IS NULL ORDER BY md.uploaded_at DESC,md.meeting_document_id DESC;
            """;
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<MeetingDocumentDto>(sql, new { meetingId, collegeId });
        return rows.AsList();
    }

    public async Task<MeetingDocumentDto?> GetDocumentAsync(long meetingId, long meetingDocumentId, long collegeId)
    {
        const string sql = """
            SELECT md.meeting_document_id AS MeetingDocumentId,md.meeting_id AS MeetingId,md.document_id AS DocumentId,
                   md.document_title AS DocumentTitle,md.document_type AS DocumentType,md.file_name AS FileName,md.file_path AS FilePath,
                   md.file_url AS FileUrl,md.mime_type AS MimeType,md.file_size AS FileSize,md.uploaded_by AS UploadedBy,
                   md.uploaded_at AS UploadedAt,md.remarks AS Remarks
            FROM meeting_documents md JOIN meetings m ON m.meeting_id=md.meeting_id
            WHERE md.meeting_id=@meetingId AND md.meeting_document_id=@meetingDocumentId AND m.college_id=@collegeId AND m.deleted_at IS NULL LIMIT 1;
            """;
        await using var c = CreateConnection();
        return await c.QuerySingleOrDefaultAsync<MeetingDocumentDto>(sql, new { meetingId, meetingDocumentId, collegeId });
    }

    public async Task<long> CreateDocumentAsync(long meetingId, long collegeId, SaveMeetingDocumentRequest r, long? actorUserId)
    {
        const string sql = """
            INSERT INTO meeting_documents (meeting_id,document_id,document_title,document_type,file_name,file_path,file_url,mime_type,file_size,uploaded_by,remarks)
            SELECT @meetingId,@DocumentId,@DocumentTitle,@DocumentType,@FileName,@FilePath,@FileUrl,@MimeType,@FileSize,@actorUserId,@Remarks
            WHERE EXISTS (SELECT 1 FROM meetings WHERE meeting_id=@meetingId AND college_id=@collegeId AND deleted_at IS NULL);
            """;
        await using var c = CreateConnection();
        var affected = await c.ExecuteAsync(sql, new { meetingId, collegeId, r.DocumentId, r.DocumentTitle, r.DocumentType, r.FileName, r.FilePath, r.FileUrl, r.MimeType, r.FileSize, actorUserId, r.Remarks });
        if (affected == 0) throw new KeyNotFoundException("Meeting not found.");
        return await c.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID();");
    }

    public async Task<bool> UpdateDocumentAsync(long meetingId, long meetingDocumentId, long collegeId, SaveMeetingDocumentRequest r)
    {
        const string sql = """
            UPDATE meeting_documents md JOIN meetings m ON m.meeting_id=md.meeting_id
            SET md.document_id=@DocumentId,md.document_title=@DocumentTitle,md.document_type=@DocumentType,md.file_name=@FileName,
                md.file_path=@FilePath,md.file_url=@FileUrl,md.mime_type=@MimeType,md.file_size=@FileSize,md.remarks=@Remarks
            WHERE md.meeting_id=@meetingId AND md.meeting_document_id=@meetingDocumentId AND m.college_id=@collegeId AND m.deleted_at IS NULL;
            """;
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, meetingDocumentId, collegeId, r.DocumentId, r.DocumentTitle, r.DocumentType, r.FileName, r.FilePath, r.FileUrl, r.MimeType, r.FileSize, r.Remarks }) > 0;
    }

    public async Task<bool> DeleteDocumentAsync(long meetingId, long meetingDocumentId, long collegeId)
    {
        const string sql = "DELETE md FROM meeting_documents md JOIN meetings m ON m.meeting_id=md.meeting_id WHERE md.meeting_id=@meetingId AND md.meeting_document_id=@meetingDocumentId AND m.college_id=@collegeId AND m.deleted_at IS NULL;";
        await using var c = CreateConnection();
        return await c.ExecuteAsync(sql, new { meetingId, meetingDocumentId, collegeId }) > 0;
    }
}
