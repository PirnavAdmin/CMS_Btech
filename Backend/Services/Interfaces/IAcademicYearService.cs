using BTech.DTOs.AcademicYear;

namespace BTech.Services.Interfaces
{
    public interface IAcademicYearService
    {
        Task<AcademicYearResponseDto> AddAsync(
            CreateAcademicYearDto dto,
            long? userId);

        Task<IEnumerable<AcademicYearResponseDto>> GetAllAsync();

        Task<AcademicYearDashboardDto> GetDashboardAsync(
            string? search,
            string? filter);

        Task<AcademicYearResponseDto> GenerateNextYearAsync(
            GenerateNextAcademicYearDto dto,
            long? userId);

        Task<AcademicYearResponseDto?> GetByIdAsync(
            long academicYearId);

        Task<AcademicYearResponseDto?> EditAsync(
            long academicYearId,
            UpdateAcademicYearDto dto,
            long? userId);

        Task<bool> ActivateAsync(
            long academicYearId,
            long? userId);

        Task<bool> DeactivateAsync(
            long academicYearId,
            long? userId);

        // NEW: Archive Academic Year
        Task<bool> ArchiveAsync(
            long academicYearId,
            long? userId);
    }
}