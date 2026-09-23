using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IBranchRepository
    {
        // =====================================================
        // CREATE
        // =====================================================

        Task<Branch?> AddAsync(
            Branch entity);

        // =====================================================
        // GET ALL
        // =====================================================

        Task<IEnumerable<Branch>>
            GetAllAsync();

        // =====================================================
        // GET BY ID
        // =====================================================

        Task<Branch?>
            GetByIdAsync(
                long branchId);

        // =====================================================
        // GET BY COURSE ID
        // Uses:
        // sp_get_branches_by_course
        // =====================================================

        Task<IEnumerable<Branch>>
            GetByCourseIdAsync(
                long courseId);

        // =====================================================
        // UPDATE
        // =====================================================

        Task<Branch?>
            UpdateAsync(
                Branch entity);

        // =====================================================
        // DELETE
        // =====================================================

        Task<bool>
            DeleteAsync(
                long branchId,
                long? userId);
    }
}