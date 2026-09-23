using BTech.DTOs.Integration;

namespace BTech.Services.Interfaces
{
    public interface IStudentIntegrationService
    {
        Task<StudentDocumentDetailDto> UploadDocumentAsync(long studentId, StudentDocumentUploadDto request, long actorUserId);
        Task<StudentDocumentDetailDto?> GetDocumentAsync(long studentId, long documentId);
        Task<StudentDocumentDownloadDto?> DownloadDocumentAsync(long studentId, long documentId);
        Task<bool> DeleteDocumentAsync(long studentId, long documentId, long actorUserId);
        Task<AdmissionSubmissionDto?> SubmitAdmissionAsync(long admissionId, long actorUserId);
        Task<AdmissionFeeSummaryDto?> GetFeeSummaryAsync(long admissionId);
        Task<AdmissionFeeStructureDetailDto?> GetFeeStructureAsync(long admissionId);
        Task<AdmissionFeeSummaryDto?> UpdateFeeStructureAsync(long admissionId, AdmissionFeeStructureRequestDto request, long actorUserId);
        Task<IReadOnlyList<PreviousEducationRecordDto>> GetPreviousEducationAsync(long admissionId);
        Task<IReadOnlyList<PreviousEducationRecordDto>> UpdatePreviousEducationAsync(long admissionId, PreviousEducationUpdateDto request, long actorUserId);
        Task<PromotionDashboardDto> GetPromotionDashboardAsync(long? collegeId, long? academicYearId, long? courseId, long? branchId);
        Task<IntegrationPageDto<PromotionDirectoryItemDto>> GetPromotionDirectoryAsync(long? collegeId, string? search, long? academicYearId, long? courseId, long? branchId, int pageNumber, int pageSize);
        Task<IntegrationPageDto<PromotionHistoryDirectoryItemDto>> GetPromotionHistoryAsync(long? collegeId, string? search, string? status, int pageNumber, int pageSize);
    }
}
