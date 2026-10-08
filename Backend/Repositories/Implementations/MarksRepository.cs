using System.Data;
using System.Text.Json;
using BTech.DTOs.MarksManagement;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class MarksRepository : IMarksRepository
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<MarksRepository> _logger;

    public MarksRepository(IConfiguration configuration, ILogger<MarksRepository> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private MySqlConnection CreateConnection()
    {
        var cs = _configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("DefaultConnection is missing from appsettings.json.");
        return new MySqlConnection(cs);
    }

    private static CommandDefinition Cmd(string name, object? args = null, MySqlTransaction? tx = null)
        => new(name, args, transaction: tx, commandType: CommandType.StoredProcedure);

    private static string Json(object value) =>
        JsonSerializer.Serialize(value, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

    private static int Scope(long? collegeId, bool superAdmin) => superAdmin ? 1 : 0;

    public async Task<MarkDto> AddAsync(MarkEntryRequest r, long? actorId, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        return await c.QuerySingleAsync<MarkDto>(Cmd("sp_marks_entry_add", new
        {
            p_exam_id = r.ExamId, p_student_id = r.StudentId, p_subject_id = r.SubjectId,
            p_section_id = r.SectionId, p_marks_obtained = r.MarksObtained,
            p_max_marks = r.MaxMarks, p_grade = r.Grade, p_remarks = r.Remarks,
            p_actor_id = actorId, p_college_id = collegeId, p_is_super_admin = Scope(collegeId, superAdmin)
        }));
    }

    public async Task<MarkDto> EditAsync(long markId, MarkEditRequest r, long? actorId, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        return await c.QuerySingleAsync<MarkDto>(Cmd("sp_marks_entry_update", new
        {
            p_mark_id = markId, p_marks_obtained = r.MarksObtained, p_max_marks = r.MaxMarks,
            p_grade = r.Grade, p_remarks = r.Remarks, p_actor_id = actorId,
            p_college_id = collegeId, p_is_super_admin = Scope(collegeId, superAdmin)
        }));
    }

    public async Task<IReadOnlyList<MarkDto>> ListAsync(MarkListFilter f, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<MarkDto>(Cmd("sp_marks_list", new
        {
            p_exam_id = f.ExamId, p_student_id = f.StudentId, p_subject_id = f.SubjectId,
            p_section_id = f.SectionId, p_workflow_status = f.WorkflowStatus,
            p_search = f.Search, p_college_id = collegeId, p_is_super_admin = Scope(collegeId, superAdmin)
        }));
        return rows.AsList();
    }

    public async Task<MarkDto?> GetAsync(long markId, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        return await c.QuerySingleOrDefaultAsync<MarkDto>(Cmd("sp_marks_get", new
        {
            p_mark_id = markId, p_college_id = collegeId, p_is_super_admin = Scope(collegeId, superAdmin)
        }));
    }

    public async Task<BulkMarksResultDto> BulkPreviewAsync(BulkUploadPreviewRequest r, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        using var multi = await c.QueryMultipleAsync(Cmd("sp_marks_bulk_preview", new
        {
            p_exam_id = r.ExamId, p_section_id = r.SectionId,
            p_rows_json = Json(r.Rows), p_college_id = collegeId,
            p_is_super_admin = Scope(collegeId, superAdmin)
        }));
        var result = await multi.ReadSingleAsync<BulkMarksResultDto>();
        result.Errors = (await multi.ReadAsync<BulkMarkErrorDto>()).ToList();
        return result;
    }

    public async Task<BulkMarksResultDto> BulkUploadAsync(BulkMarksRequest r, long? actorId, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        await c.OpenAsync();
        await using var tx = await c.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        try
        {
            using var multi = await c.QueryMultipleAsync(Cmd("sp_marks_bulk_upload", new
            {
                p_exam_id = r.ExamId, p_section_id = r.SectionId,
                p_rows_json = Json(r.Rows), p_upsert_drafts = r.UpsertDrafts ? 1 : 0,
                p_actor_id = actorId, p_college_id = collegeId,
                p_is_super_admin = Scope(collegeId, superAdmin)
            }, tx));
            var result = await multi.ReadSingleAsync<BulkMarksResultDto>();
            result.Errors = (await multi.ReadAsync<BulkMarkErrorDto>()).ToList();
            await tx.CommitAsync();
            return result;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<MarksSummaryReportDto> GetSummaryReportAsync(MarksReportFilter f, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        return await c.QuerySingleAsync<MarksSummaryReportDto>(Cmd("sp_marks_report_summary", new
        {
            p_exam_id = f.ExamId, p_section_id = f.SectionId, p_subject_id = f.SubjectId,
            p_student_id = f.StudentId, p_workflow_status = f.WorkflowStatus,
            p_college_id = collegeId, p_is_super_admin = Scope(collegeId, superAdmin)
        }));
    }

    public async Task<StudentMarksReportDto> GetStudentReportAsync(MarksReportFilter f, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        using var multi = await c.QueryMultipleAsync(Cmd("sp_marks_report_student", new
        {
            p_exam_id = f.ExamId, p_student_id = f.StudentId, p_college_id = collegeId,
            p_is_super_admin = Scope(collegeId, superAdmin)
        }));
        var header = await multi.ReadSingleOrDefaultAsync<StudentMarksReportDto>()
            ?? throw new KeyNotFoundException("Student marks report not found.");
        header.Subjects = (await multi.ReadAsync<StudentSubjectMarkDto>()).ToList();
        return header;
    }

    public async Task<IReadOnlyList<SubjectMarksReportDto>> GetSubjectReportAsync(MarksReportFilter f, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<SubjectMarksReportDto>(Cmd("sp_marks_report_subject", new
        {
            p_exam_id = f.ExamId, p_section_id = f.SectionId, p_subject_id = f.SubjectId,
            p_workflow_status = f.WorkflowStatus, p_college_id = collegeId,
            p_is_super_admin = Scope(collegeId, superAdmin)
        }));
        return rows.AsList();
    }

    public async Task<MarksApprovalResultDto> SubmitAsync(MarksWorkflowRequest r, long? actorId, long? collegeId, bool superAdmin)
        => await Workflow("sp_marks_submit", r, actorId, collegeId, superAdmin);

    public async Task<MarksApprovalResultDto> ApproveAsync(MarksWorkflowRequest r, long? actorId, long? collegeId, bool superAdmin)
        => await Workflow("sp_marks_approve", r, actorId, collegeId, superAdmin);

    public async Task<MarksApprovalResultDto> RejectAsync(MarksWorkflowRequest r, long? actorId, long? collegeId, bool superAdmin)
        => await Workflow("sp_marks_reject", r, actorId, collegeId, superAdmin);

    private async Task<MarksApprovalResultDto> Workflow(string procedure, MarksWorkflowRequest r, long? actorId, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        using var multi = await c.QueryMultipleAsync(Cmd(procedure, new
        {
            p_exam_id = r.ExamId, p_mark_ids_json = Json(r.MarkIds), p_section_id = r.SectionId,
            p_subject_id = r.SubjectId, p_remarks = r.Remarks, p_actor_id = actorId,
            p_college_id = collegeId, p_is_super_admin = Scope(collegeId, superAdmin)
        }));
        var result = await multi.ReadSingleAsync<MarksApprovalResultDto>();
        result.ProcessedMarkIds = (await multi.ReadAsync<long>()).ToList();
        result.Errors = (await multi.ReadAsync<BulkMarkErrorDto>()).ToList();
        return result;
    }

    public async Task<IReadOnlyList<MarksApprovalDto>> PendingApprovalsAsync(long examId, long? sectionId, long? subjectId, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<MarksApprovalDto>(Cmd("sp_marks_approval_pending", new
        {
            p_exam_id = examId, p_section_id = sectionId, p_subject_id = subjectId,
            p_college_id = collegeId, p_is_super_admin = Scope(collegeId, superAdmin)
        }));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<MarksApprovalHistoryDto>> ApprovalHistoryAsync(long markId, long? collegeId, bool superAdmin)
    {
        await using var c = CreateConnection();
        var rows = await c.QueryAsync<MarksApprovalHistoryDto>(Cmd("sp_marks_approval_history", new
        {
            p_mark_id = markId, p_college_id = collegeId, p_is_super_admin = Scope(collegeId, superAdmin)
        }));
        return rows.AsList();
    }
}
