using BTech.DTOs.StudentPromotion;

namespace BTech.Services.Interfaces
{
    public interface IStudentPromotionService
    {
        // =====================================================
        // GET ELIGIBLE STUDENTS
        // =====================================================

        Task<List<EligibleStudentDto>> GetEligibleStudentsAsync(
            long branchId,
            long academicYearId,
            int semesterNumber);


        // =====================================================
        // GET STUDENT ELIGIBILITY
        // =====================================================

        Task<EligibleStudentDto?> GetStudentEligibilityAsync(
            long studentId);


        // =====================================================
        // PROMOTE SINGLE STUDENT
        // =====================================================

        Task<PromotionResponseDto?> PromoteStudentAsync(
            PromoteStudentRequestDto request);


        // =====================================================
        // PROMOTE MULTIPLE STUDENTS
        // =====================================================

        Task<List<PromotionResponseDto>> PromoteStudentsBulkAsync(
            BulkPromoteStudentRequestDto request);


        // =====================================================
        // GET PROMOTED STUDENTS
        // =====================================================

        Task<List<PromotionResponseDto>> GetPromotedStudentsAsync(
            long? branchId,
            long? academicYearId,
            int? semesterNumber);


        // =====================================================
        // GET PROMOTION HISTORY
        // =====================================================

        Task<List<PromotionResponseDto>> GetPromotionHistoryAsync(
            long studentId);


        // =====================================================
        // GET COMPLETE PROMOTION HISTORY
        // =====================================================

        Task<List<CompletePromotionHistoryDto>>
            GetCompletePromotionHistoryAsync(long studentId);


        // =====================================================
        // UPDATE ELIGIBILITY STATUS
        // =====================================================

        Task<bool> UpdateEligibilityStatusAsync(
            long studentId,
            string eligibilityStatus);
    }
}