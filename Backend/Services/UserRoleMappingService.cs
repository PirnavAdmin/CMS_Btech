using BTech.Data;
using BTech.Models;
using Microsoft.EntityFrameworkCore;
using UserRoleManagement.API.DTOs;

namespace UserRoleManagement.API.Services
{
    public class UserRoleMappingService : IUserRoleMappingService
    {
        private readonly ApplicationDbContext _context;

        public UserRoleMappingService(
            ApplicationDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // POST - Create User Role Mapping
        // =====================================================

        public async Task CreateUserRoleMappingAsync(
            UserRoleMappingDto dto)
        {
            var userExists = await _context.Users
                .AnyAsync(x =>
                    x.user_id == dto.UserId &&
                    x.Status == 1 &&
                    x.DeletedAt == null);

            if (!userExists)
            {
                throw new Exception(
                    "User not found or inactive");
            }

            var roleExists = await _context.Roles
                .AnyAsync(x =>
                    x.Role_id == dto.RoleId &&
                    x.Status == 1 &&
                    x.DeletedAt == null);

            if (!roleExists)
            {
                throw new Exception(
                    "Role not found or inactive");
            }

            var existingMapping = await _context.UserRoles
                .FirstOrDefaultAsync(x =>
                    x.UserId == dto.UserId &&
                    x.RoleId == dto.RoleId);

            if (existingMapping != null)
            {
                if (existingMapping.Status == 1)
                {
                    throw new Exception(
                        "User already has this role");
                }

                // Reactivate an existing removed mapping.
                existingMapping.Status = 1;
                existingMapping.AssignedAt = DateTime.UtcNow;
                existingMapping.AssignedBy = dto.AssignedBy;
                existingMapping.UpdatedAt = DateTime.UtcNow;
                existingMapping.UpdatedBy = dto.AssignedBy;
                existingMapping.RemovedAt = null;
                existingMapping.RemovedBy = null;

                await _context.SaveChangesAsync();
                return;
            }

            var mapping = new UserRole
            {
                UserId = dto.UserId,
                RoleId = dto.RoleId,
                Status = dto.Status == 0
                    ? (byte)1
                    : dto.Status,
                AssignedAt = DateTime.UtcNow,
                AssignedBy = dto.AssignedBy
            };

            _context.UserRoles.Add(mapping);

            await _context.SaveChangesAsync();
        }

        // =====================================================
        // GET ALL
        // =====================================================

        public async Task<List<UserRoleMappingDto>>
            GetUserRoleMappingsAsync()
        {
            return await _context.UserRoles
                .AsNoTracking()
                .OrderBy(x => x.user_role_id)
                .Select(x => new UserRoleMappingDto
                {
                    UserRoleId = x.user_role_id,
                    UserId = x.UserId,
                    RoleId = x.RoleId,
                    Status = x.Status,
                    AssignedAt = x.AssignedAt,
                    AssignedBy = x.AssignedBy,
                    UpdatedAt = x.UpdatedAt,
                    UpdatedBy = x.UpdatedBy,
                    RemovedAt = x.RemovedAt,
                    RemovedBy = x.RemovedBy
                })
                .ToListAsync();
        }

        // =====================================================
        // GET BY ID
        // =====================================================

        public async Task<UserRoleMappingDto?>
            GetUserRoleMappingByIdAsync(long id)
        {
            return await _context.UserRoles
                .AsNoTracking()
                .Where(x => x.user_role_id == id)
                .Select(x => new UserRoleMappingDto
                {
                    UserRoleId = x.user_role_id,
                    UserId = x.UserId,
                    RoleId = x.RoleId,
                    Status = x.Status,
                    AssignedAt = x.AssignedAt,
                    AssignedBy = x.AssignedBy,
                    UpdatedAt = x.UpdatedAt,
                    UpdatedBy = x.UpdatedBy,
                    RemovedAt = x.RemovedAt,
                    RemovedBy = x.RemovedBy
                })
                .FirstOrDefaultAsync();
        }

        // =====================================================
        // PUT - Update User Role Mapping
        // =====================================================

        public async Task UpdateUserRoleMappingAsync(
            long id,
            UserRoleMappingDto dto)
        {
            var mapping = await _context.UserRoles
                .FirstOrDefaultAsync(x =>
                    x.user_role_id == id);

            if (mapping == null)
            {
                throw new Exception(
                    "User role mapping not found");
            }

            var userExists = await _context.Users
                .AnyAsync(x =>
                    x.user_id == dto.UserId &&
                    x.Status == 1 &&
                    x.DeletedAt == null);

            if (!userExists)
            {
                throw new Exception(
                    "User not found or inactive");
            }

            var roleExists = await _context.Roles
                .AnyAsync(x =>
                    x.Role_id == dto.RoleId &&
                    x.Status == 1 &&
                    x.DeletedAt == null);

            if (!roleExists)
            {
                throw new Exception(
                    "Role not found or inactive");
            }

            var duplicateExists = await _context.UserRoles
                .AnyAsync(x =>
                    x.user_role_id != id &&
                    x.UserId == dto.UserId &&
                    x.RoleId == dto.RoleId);

            if (duplicateExists)
            {
                throw new Exception(
                    "User already has this role");
            }

            mapping.UserId = dto.UserId;
            mapping.RoleId = dto.RoleId;
            mapping.Status = dto.Status;
            mapping.UpdatedBy = dto.UpdatedBy;
            mapping.UpdatedAt = DateTime.UtcNow;

            if (dto.Status == 1)
            {
                mapping.RemovedAt = null;
                mapping.RemovedBy = null;
            }

            await _context.SaveChangesAsync();
        }

        // =====================================================
        // DELETE - Soft Remove User Role Mapping
        // =====================================================

        public async Task DeleteUserRoleMappingAsync(long id)
        {
            var mapping = await _context.UserRoles
                .FirstOrDefaultAsync(x =>
                    x.user_role_id == id);

            if (mapping == null)
            {
                throw new Exception(
                    "User role mapping not found");
            }

            mapping.Status = 0;
            mapping.RemovedAt = DateTime.UtcNow;
            mapping.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }
}