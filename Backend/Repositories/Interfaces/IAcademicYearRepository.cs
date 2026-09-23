using BTech.DTOs.AcademicYear;
using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IAcademicYearRepository
    {
        Task<AcademicYear?> AddAsync(
            string academicYearName,
            DateTime startDate,
            DateTime endDate,
            long? createdBy);

        Task<IEnumerable<AcademicYear>> GetAllAsync();

        Task<AcademicYearDashboardDto> GetDashboardAsync(
            string? search,
            string? filter);

        Task<AcademicYear?> GenerateNextYearAsync(
            bool activateImmediately,
            long? createdBy);

        Task<AcademicYear?> GetByIdAsync(
            long academicYearId);

        Task<AcademicYear?> EditAsync(
            long academicYearId,
            string academicYearName,
            DateTime startDate,
            DateTime endDate,
            long? updatedBy);

        Task<bool> ActivateAsync(
            long academicYearId,
            long? updatedBy);

        Task<bool> DeactivateAsync(
            long academicYearId,
            long? updatedBy);

        // NEW: Archive previous academic year
        Task<AcademicYear?> ArchiveAsync(
            long academicYearId,
            long? updatedBy);
    }
}