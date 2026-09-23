using BTech.DTOs;

namespace BTech.Services.Interfaces
{
    public interface ICollegeSettingsService
    {
        Task<List<CollegeSettingDto>> GetAllAsync();

        Task<CollegeSettingDto?> GetByIdAsync(long id);

        Task<CollegeSettingDto?> GetByCollegeIdAsync(
            long collegeId);

        Task<CollegeSettingDto> CreateAsync(
            CollegeSettingRequestDto request);

        Task<CollegeSettingDto?> UpdateAsync(
            long id,
            CollegeSettingRequestDto request);
    }
}