using BTech.DTOs.AcademicYear;

namespace BTech.Services.Interfaces
{
    public interface IAcademicYearService
    {
        Task<AcademicYearResponseDto> AddAsync(
            long collegeId,
            CreateAcademicYearDto dto,
            long? userId);

        Task<IEnumerable<AcademicYearResponseDto>> GetAllAsync(
            long collegeId);

        Task<AcademicYearDashboardDto> GetDashboardAsync(
            long collegeId,
            string? search,
            string? filter);

        Task<AcademicYearResponseDto> GenerateNextYearAsync(
            long collegeId,
            GenerateNextAcademicYearDto dto,
            long? userId);

        Task<AcademicYearResponseDto?> GetByIdAsync(
            long academicYearId,
            long collegeId);

        Task<AcademicYearResponseDto?> EditAsync(
            long academicYearId,
            long collegeId,
            UpdateAcademicYearDto dto,
            long? userId);

        Task<bool> ActivateAsync(
            long academicYearId,
            long collegeId,
            long? userId);

        Task<bool> DeactivateAsync(
            long academicYearId,
            long collegeId,
            long? userId);

        Task<bool> ArchiveAsync(
            long academicYearId,
            long collegeId,
            long? userId);
    }
}
