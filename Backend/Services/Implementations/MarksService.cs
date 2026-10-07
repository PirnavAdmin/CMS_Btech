using BTech.DTOs.MarksManagement;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class MarksService : IMarksService
{
    private readonly IMarksRepository _repository;

    public MarksService(IMarksRepository repository) => _repository = repository;

    public Task<MarkDto> AddAsync(MarkEntryRequest r, long? actorId, long? collegeId, bool superAdmin)
    {
        ValidateEntry(r);
        return _repository.AddAsync(r, actorId, collegeId, superAdmin);
    }

    public Task<MarkDto> EditAsync(long id, MarkEditRequest r, long? actorId, long? collegeId, bool superAdmin)
    {
        RequirePositive(id, nameof(id));
        ValidateMarkValues(r.MarksObtained, r.MaxMarks);
        return _repository.EditAsync(id, r, actorId, collegeId, superAdmin);
    }

    public Task<IReadOnlyList<MarkDto>> ListAsync(MarkListFilter filter, long? collegeId, bool superAdmin)
        => _repository.ListAsync(filter ?? new MarkListFilter(), collegeId, superAdmin);

    public async Task<MarkDto> GetAsync(long id, long? collegeId, bool superAdmin)
        => await _repository.GetAsync(Positive(id, nameof(id)), collegeId, superAdmin)
           ?? throw new KeyNotFoundException("Mark entry not found.");

    public Task<BulkMarksResultDto> BulkPreviewAsync(BulkUploadPreviewRequest r, long? collegeId, bool superAdmin)
    {
        ValidateBulk(r.ExamId, r.Rows);
        return _repository.BulkPreviewAsync(r, collegeId, superAdmin);
    }

    public Task<BulkMarksResultDto> BulkUploadAsync(BulkMarksRequest r, long? actorId, long? collegeId, bool superAdmin)
    {
        ValidateBulk(r.ExamId, r.Rows);
        return _repository.BulkUploadAsync(r, actorId, collegeId, superAdmin);
    }

    public Task<MarksSummaryReportDto> GetSummaryReportAsync(MarksReportFilter r, long? collegeId, bool superAdmin)
    {
        RequirePositive(r.ExamId, nameof(r.ExamId));
        return _repository.GetSummaryReportAsync(r, collegeId, superAdmin);
    }

    public Task<StudentMarksReportDto> GetStudentReportAsync(MarksReportFilter r, long? collegeId, bool superAdmin)
    {
        RequirePositive(r.ExamId, nameof(r.ExamId));
        RequirePositive(r.StudentId ?? 0, nameof(r.StudentId));
        return _repository.GetStudentReportAsync(r, collegeId, superAdmin);
    }

    public Task<IReadOnlyList<SubjectMarksReportDto>> GetSubjectReportAsync(MarksReportFilter r, long? collegeId, bool superAdmin)
    {
        RequirePositive(r.ExamId, nameof(r.ExamId));
        return _repository.GetSubjectReportAsync(r, collegeId, superAdmin);
    }

    public Task<MarksApprovalResultDto> SubmitAsync(MarksWorkflowRequest r, long? actorId, long? collegeId, bool superAdmin)
        => Workflow(r, actorId, collegeId, superAdmin, _repository.SubmitAsync);

    public Task<MarksApprovalResultDto> ApproveAsync(MarksWorkflowRequest r, long? actorId, long? collegeId, bool superAdmin)
        => Workflow(r, actorId, collegeId, superAdmin, _repository.ApproveAsync);

    public Task<MarksApprovalResultDto> RejectAsync(MarksWorkflowRequest r, long? actorId, long? collegeId, bool superAdmin)
        => Workflow(r, actorId, collegeId, superAdmin, _repository.RejectAsync);

    public Task<IReadOnlyList<MarksApprovalDto>> PendingApprovalsAsync(long examId, long? sectionId, long? subjectId, long? collegeId, bool superAdmin)
    {
        RequirePositive(examId, nameof(examId));
        return _repository.PendingApprovalsAsync(examId, sectionId, subjectId, collegeId, superAdmin);
    }

    public Task<IReadOnlyList<MarksApprovalHistoryDto>> ApprovalHistoryAsync(long markId, long? collegeId, bool superAdmin)
    {
        RequirePositive(markId, nameof(markId));
        return _repository.ApprovalHistoryAsync(markId, collegeId, superAdmin);
    }

    private static Task<MarksApprovalResultDto> Workflow(
        MarksWorkflowRequest r, long? actorId, long? collegeId, bool superAdmin,
        Func<MarksWorkflowRequest, long?, long?, bool, Task<MarksApprovalResultDto>> action)
    {
        if (r is null) throw new ArgumentException("Workflow request is required.");
        RequirePositive(r.ExamId, nameof(r.ExamId));
        if (r.MarkIds is null || r.MarkIds.Count == 0)
            throw new ArgumentException("At least one MarkId is required.");
        if (r.MarkIds.Any(x => x <= 0))
            throw new ArgumentException("MarkIds must contain only positive values.");
        r.MarkIds = r.MarkIds.Distinct().ToList();
        return action(r, actorId, collegeId, superAdmin);
    }

    private static void ValidateBulk(long examId, List<MarkBulkRow> rows)
    {
        RequirePositive(examId, nameof(examId));
        if (rows is null || rows.Count == 0) throw new ArgumentException("At least one bulk row is required.");
        if (rows.Count > 5000) throw new ArgumentException("A maximum of 5000 rows is allowed per upload.");
        for (var i = 0; i < rows.Count; i++)
        {
            if (string.IsNullOrWhiteSpace(rows[i].StudentCode))
                throw new ArgumentException($"Row {i + 1}: StudentCode is required.");
            if (string.IsNullOrWhiteSpace(rows[i].SubjectCode))
                throw new ArgumentException($"Row {i + 1}: SubjectCode is required.");
            ValidateMarkValues(rows[i].MarksObtained, rows[i].MaxMarks);
        }
    }

    private static void ValidateEntry(MarkEntryRequest r)
    {
        RequirePositive(r.ExamId, nameof(r.ExamId));
        RequirePositive(r.StudentId, nameof(r.StudentId));
        RequirePositive(r.SubjectId, nameof(r.SubjectId));
        ValidateMarkValues(r.MarksObtained, r.MaxMarks);
    }

    private static void ValidateMarkValues(decimal marks, decimal? max)
    {
        if (marks < 0) throw new ArgumentException("MarksObtained cannot be negative.");
        if (max.HasValue && max.Value <= 0) throw new ArgumentException("MaxMarks must be greater than zero.");
        if (max.HasValue && marks > max.Value) throw new ArgumentException("MarksObtained cannot exceed MaxMarks.");
    }

    private static void RequirePositive(long value, string name)
    {
        if (value <= 0) throw new ArgumentException($"{name} must be greater than zero.");
    }

    private static long Positive(long value, string name)
    {
        RequirePositive(value, name);
        return value;
    }
}
