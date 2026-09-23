using BTech.DTOs.Branch;

namespace BTech.Services.Interfaces
{
    public interface IBranchService
    {
        // =====================================================
        // CREATE
        // =====================================================

        Task<BranchResponseDto>
            AddAsync(
                CreateBranchDto dto,
                long? userId);

        // =====================================================
        // GET ALL
        // =====================================================

        Task<IEnumerable<BranchResponseDto>>
            GetAllAsync();

        // =====================================================
        // GET BY ID
        // =====================================================

        Task<BranchResponseDto?>
            GetByIdAsync(
                long branchId);

        // =====================================================
        // GET BY COURSE
        // EXTRA API
        // =====================================================

        Task<IEnumerable<BranchResponseDto>>
            GetByCourseIdAsync(
                long courseId);

        // =====================================================
        // UPDATE
        // =====================================================

        Task<BranchResponseDto?>
            UpdateAsync(
                long branchId,
                UpdateBranchDto dto,
                long? userId);

        // =====================================================
        // DELETE
        // =====================================================

        Task<bool>
            DeleteAsync(
                long branchId,
                long? userId);
    }
}