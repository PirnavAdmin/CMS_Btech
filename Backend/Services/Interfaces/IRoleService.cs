using BTech.DTOs;
using BTech.Models;

namespace BTech.Services.Interfaces
{
    public interface IRoleService
    {
        Task<List<Role>> GetAllAsync();

        Task<Role?> GetByIdAsync(long roleId);

        Task<(bool Success, string Message, Role? Data)> CreateAsync(
            RoleRequest request,
            long? createdBy);

        Task<(bool Success, string Message)> UpdateAsync(
            long roleId,
            RoleRequest request,
            long? updatedBy);

        Task<(bool Success, string Message)> DeactivateAsync(
            long roleId,
            long? updatedBy);
    }
}