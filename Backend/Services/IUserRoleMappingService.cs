using UserRoleManagement.API.DTOs;

namespace UserRoleManagement.API.Services
{
    public interface IUserRoleMappingService
    {
        Task CreateUserRoleMappingAsync(UserRoleMappingDto dto);

        Task<List<UserRoleMappingDto>> GetUserRoleMappingsAsync();

        Task<UserRoleMappingDto?> GetUserRoleMappingByIdAsync(long id);

        Task UpdateUserRoleMappingAsync(
            long id,
            UserRoleMappingDto dto);

        Task DeleteUserRoleMappingAsync(long id);
    }
}