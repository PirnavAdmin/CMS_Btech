using BTech.Models;

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
            long? createdBy);

        Task<bool> UpdateAsync(
            long roleId,
            string roleName,
            string roleCode,
            string? description,
            long? updatedBy);

        Task<bool> DeactivateAsync(
            long roleId,
            long? updatedBy);
    }
}