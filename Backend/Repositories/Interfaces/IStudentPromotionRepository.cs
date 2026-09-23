using BTech.DTOs.StudentPromotion;

namespace BTech.Repositories.Interfaces
{
    public interface IStudentPromotionRepository
    {
        // =====================================================
        // GET ELIGIBLE STUDENTS
        // =====================================================

        Task<IEnumerable<EligibleStudentDto>>
            GetEligibleStudentsAsync(
                long collegeId,
                EligibleStudentRequestDto request);


        // =====================================================
        // PROMOTE SINGLE STUDENT
        // =====================================================

        Task<PromotionResponseDto?>
            PromoteStudentAsync(
                long studentId,
                long? createdBy);

        Task<PromotionResponseDto?> PromoteStudentContractAsync(
            PromoteStudentRequestDto request);

        Task<List<PromotionResponseDto>> PromoteStudentsBulkAtomicAsync(
            BulkPromoteStudentRequestDto request);


        // =====================================================
        // GET COMPLETE PROMOTION HISTORY
        // =====================================================

        Task<IEnumerable<CompletePromotionHistoryDto>>
            GetCompletePromotionHistoryAsync(long studentId);
    }
}