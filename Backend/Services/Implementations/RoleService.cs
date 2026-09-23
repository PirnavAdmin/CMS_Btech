using BTech.DTOs;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class RoleService : IRoleService
    {
        private readonly IRoleRepository _roleRepository;

        public RoleService(IRoleRepository roleRepository)
        {
            _roleRepository = roleRepository;
        }

        // =========================================================
        // GET ALL
        // =========================================================

        public async Task<List<Role>> GetAllAsync()
        {
            return await _roleRepository.GetAllAsync();
        }

        // =========================================================
        // GET BY ID
        // =========================================================

        public async Task<Role?> GetByIdAsync(long roleId)
        {
            return await _roleRepository.GetByIdAsync(roleId);
        }

        // =========================================================
        // CREATE
        // =========================================================

        public async Task<(bool Success, string Message, Role? Data)>
            CreateAsync(
                RoleRequest request,
                long? createdBy)
        {
            if (string.IsNullOrWhiteSpace(request.RoleName))
            {
                return (
                    false,
                    "Role name is required.",
                    null);
            }

            if (string.IsNullOrWhiteSpace(request.RoleCode))
            {
                return (
                    false,
                    "Role code is required.",
                    null);
            }

            var roleName =
                request.RoleName.Trim();

            var roleCode =
                request.RoleCode.Trim().ToUpper();

            // Check duplicate role name
            var roles =
                await _roleRepository.GetAllAsync();

            if (roles.Any(r =>
                r.RoleName.Equals(
                    roleName,
                    StringComparison.OrdinalIgnoreCase)))
            {
                return (
                    false,
                    "Role name already exists.",
                    null);
            }

            // Check duplicate role code
            if (roles.Any(r =>
                r.RoleCode.Equals(
                    roleCode,
                    StringComparison.OrdinalIgnoreCase)))
            {
                return (
                    false,
                    "Role code already exists.",
                    null);
            }

            var roleId =
                await _roleRepository.CreateAsync(
                    roleName,
                    roleCode,
                    request.Description,
                    createdBy);

            var createdRole =
                await _roleRepository.GetByIdAsync(roleId);

            return (
                true,
                "Role created successfully.",
                createdRole);
        }

        // =========================================================
        // UPDATE
        // =========================================================

        public async Task<(bool Success, string Message)>
            UpdateAsync(
                long roleId,
                RoleRequest request,
                long? updatedBy)
        {
            if (string.IsNullOrWhiteSpace(request.RoleName))
            {
                return (
                    false,
                    "Role name is required.");
            }

            if (string.IsNullOrWhiteSpace(request.RoleCode))
            {
                return (
                    false,
                    "Role code is required.");
            }

            var existingRole =
                await _roleRepository.GetByIdAsync(roleId);

            if (existingRole == null)
            {
                return (
                    false,
                    "Role not found.");
            }

            var roles =
                await _roleRepository.GetAllAsync();

            var roleName =
                request.RoleName.Trim();

            var roleCode =
                request.RoleCode.Trim().ToUpper();

            // Duplicate name
            if (roles.Any(r =>
                r.Role_id != roleId &&
                r.RoleName.Equals(
                    roleName,
                    StringComparison.OrdinalIgnoreCase)))
            {
                return (
                    false,
                    "Another role with this name already exists.");
            }

            // Duplicate code
            if (roles.Any(r =>
                r.Role_id != roleId &&
                r.RoleCode.Equals(
                    roleCode,
                    StringComparison.OrdinalIgnoreCase)))
            {
                return (
                    false,
                    "Another role with this code already exists.");
            }

            var updated =
                await _roleRepository.UpdateAsync(
                    roleId,
                    roleName,
                    roleCode,
                    request.Description,
                    updatedBy);

            if (!updated)
            {
                return (
                    false,
                    "Role could not be updated.");
            }

            return (
                true,
                "Role updated successfully.");
        }

        // =========================================================
        // DEACTIVATE
        // =========================================================

        public async Task<(bool Success, string Message)>
            DeactivateAsync(
                long roleId,
                long? updatedBy)
        {
            var existingRole =
                await _roleRepository.GetByIdAsync(roleId);

            if (existingRole == null)
            {
                return (
                    false,
                    "Role not found.");
            }

            var result =
                await _roleRepository.DeactivateAsync(
                    roleId,
                    updatedBy);

            if (!result)
            {
                return (
                    false,
                    "Role could not be deactivated.");
            }

            return (
                true,
                "Role deactivated successfully.");
        }
    }
}
