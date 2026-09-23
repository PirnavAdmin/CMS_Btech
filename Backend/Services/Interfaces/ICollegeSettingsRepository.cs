using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface ICollegeSettingsRepository
    {
        Task<List<CollegeSetting>> GetAllAsync();

        Task<CollegeSetting?> GetByIdAsync(long id);

        Task<CollegeSetting?> GetByCollegeIdAsync(long collegeId);

        Task<CollegeSetting> CreateAsync(
            CollegeSetting setting);

        Task<CollegeSetting> UpdateAsync(
            CollegeSetting setting);

        Task<bool> DeactivateAsync(
            long collegeSettingId,
            long? updatedBy);
    }
}