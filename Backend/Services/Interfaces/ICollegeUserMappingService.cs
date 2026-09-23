using BTech.DTOs;

namespace BTech.Services.Interfaces
{
    public interface ICollegeUserMappingService
    {
        Task<IReadOnlyList<CollegeUserMappingDto>> GetAllAsync();

        Task<IReadOnlyList<CollegeUserMappingDto>>
            GetByUserIdAsync(long userId);

        Task<(bool Success, string Message)>
            AssignAsync(
                long userId,
                long collegeSettingId,
                long assignedBy);

        Task<(bool Success, string Message)>
            RemoveAsync(
                long userId,
                long collegeSettingId,
                long removedBy);
    }
}