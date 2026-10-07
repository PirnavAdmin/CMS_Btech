using BTech.DTOs.MarksManagement;

namespace BTech.Repositories.Interfaces;

public interface IMarksRepository
{
    Task<MarkDto> AddAsync(MarkEntryRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<MarkDto> EditAsync(long markId, MarkEditRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<MarkDto>> ListAsync(MarkListFilter filter, long? collegeId, bool isSuperAdmin);
    Task<MarkDto?> GetAsync(long markId, long? collegeId, bool isSuperAdmin);
    Task<BulkMarksResultDto> BulkPreviewAsync(BulkUploadPreviewRequest request, long? collegeId, bool isSuperAdmin);
    Task<BulkMarksResultDto> BulkUploadAsync(BulkMarksRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<MarksSummaryReportDto> GetSummaryReportAsync(MarksReportFilter filter, long? collegeId, bool isSuperAdmin);
    Task<StudentMarksReportDto> GetStudentReportAsync(MarksReportFilter filter, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<SubjectMarksReportDto>> GetSubjectReportAsync(MarksReportFilter filter, long? collegeId, bool isSuperAdmin);
    Task<MarksApprovalResultDto> SubmitAsync(MarksWorkflowRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<MarksApprovalResultDto> ApproveAsync(MarksWorkflowRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<MarksApprovalResultDto> RejectAsync(MarksWorkflowRequest request, long? actorId, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<MarksApprovalDto>> PendingApprovalsAsync(long examId, long? sectionId, long? subjectId, long? collegeId, bool isSuperAdmin);
    Task<IReadOnlyList<MarksApprovalHistoryDto>> ApprovalHistoryAsync(long markId, long? collegeId, bool isSuperAdmin);
}
