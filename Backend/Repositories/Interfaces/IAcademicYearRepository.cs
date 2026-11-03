using BTech.DTOs.AcademicYear;
using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IAcademicYearRepository
    {
        Task<AcademicYear?> AddAsync(
            long collegeId,
            string academicYearName,
            DateTime startDate,
            DateTime endDate,
            long? createdBy);

        Task<IEnumerable<AcademicYear>> GetAllAsync(long collegeId);

        Task<AcademicYearDashboardDto> GetDashboardAsync(
            long collegeId,
            string? search,
            string? filter);

        Task<AcademicYear?> GenerateNextYearAsync(
            long collegeId,
            bool activateImmediately,
            long? createdBy,
        DateTime? firstStartDate = null);

        Task<AcademicYear?> GetByIdAsync(
            long academicYearId,
            long collegeId);

        Task<AcademicYear?> EditAsync(
            long academicYearId,
            long collegeId,
            string academicYearName,
            DateTime startDate,
            DateTime endDate,
            long? updatedBy);

        Task<bool> ActivateAsync(
            long academicYearId,
            long collegeId,
            long? updatedBy);

        Task<bool> DeactivateAsync(
            long academicYearId,
            long collegeId,
            long? updatedBy);

        // Archive preserves historical data and is scoped to one college.
        Task<AcademicYear?> ArchiveAsync(
            long academicYearId,
            long collegeId,
            long? updatedBy);
    }
}
