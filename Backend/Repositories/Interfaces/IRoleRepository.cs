using BTech.Models;
using BTech.DTOs.AdminGovernance;

namespace BTech.Repositories.Interfaces
{
    public interface IRoleRepository
    {
        Task<List<Role>> GetAllAsync();
        Task<Role?> GetByIdAsync(long roleId);
        Task<long> CreateAsync(
            string roleName,
            string roleCode,
            string? description,
            byte status,
            Dictionary<string, PermissionActionsDto>? permissions,
            long? createdBy);

        Task<bool> UpdateAsync(
            long roleId,
            string roleName,
            string roleCode,
            string? description,
            byte status,
            Dictionary<string, PermissionActionsDto>? permissions,
            long? updatedBy);

        Task<bool> DeactivateAsync(
            long roleId,
            long? updatedBy);
    }
}