using BTech.DTOs.College;

namespace BTech.Services.Interfaces
{
    public interface ICollegeService
    {
        Task<IEnumerable<CollegeResponseDto>>
            GetAllCollegesAsync(
                string? search = null,
                sbyte? status = null);

        Task<PagedResponseDto<CollegeResponseDto>>
            SearchCollegesAsync(
                CollegeSearchFilterDto filter);

        Task<CollegeResponseDto?>
            GetCollegeByIdAsync(
                long collegeId);

        Task<CollegeResponseDto>
            CreateCollegeAsync(
                CreateCollegeDto dto,
                long? userId = null);

        Task<CollegeResponseDto?>
            UpdateCollegeAsync(
                long collegeId,
                UpdateCollegeDto dto,
                long? userId = null);

        Task<CollegeResponseDto?>
            UpdateCollegeStatusAsync(
                long collegeId,
                UpdateCollegeStatusDto dto,
                long? userId = null);

        // New soft-delete method
        Task<bool> DeleteCollegeAsync(
            long collegeId,
            long? userId = null);
    }
}