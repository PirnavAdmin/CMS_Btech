using BTech.DTOs;
using BTech.DTOs.AdminGovernance;
using System.Text.Json;
using BTech.Services;
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

            var roleCode = CanonicalRoleCode.Normalize(request.RoleCode);

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
                CanonicalRoleCode.Normalize(r.RoleCode).Equals(
                    roleCode,
                    StringComparison.OrdinalIgnoreCase)))
            {
                return (
                    false,
                    "Role code already exists.",
                    null);
            }

            Dictionary<string, PermissionActionsDto>? permissions;
            try { permissions = ParsePermissions(request.Permissions); }
            catch (ArgumentException ex) { return (false, ex.Message, null); }

            var roleId = await _roleRepository.CreateAsync(
                roleName, roleCode, request.Description, request.Status ? (byte)1 : (byte)0,
                permissions, createdBy);

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

            var roleCode = CanonicalRoleCode.Normalize(request.RoleCode);

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
                CanonicalRoleCode.Normalize(r.RoleCode).Equals(
                    roleCode,
                    StringComparison.OrdinalIgnoreCase)))
            {
                return (
                    false,
                    "Another role with this code already exists.");
            }

            Dictionary<string, PermissionActionsDto>? permissions;
            try { permissions = ParsePermissions(request.Permissions); }
            catch (ArgumentException ex) { return (false, ex.Message); }

            var updated = await _roleRepository.UpdateAsync(
                roleId, roleName, roleCode, request.Description,
                request.Status ? (byte)1 : (byte)0, permissions, updatedBy);

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

        private static readonly HashSet<string> SupportedModules = new(StringComparer.OrdinalIgnoreCase)
        {
            "dashboard","my_profile","notifications","colleges","departments","academic_years","courses","branches","semesters","sections","rooms",
            "subjects","timetable","credits","electives","materials","faculty_directory","faculty_attendance","faculty_leaves","faculty_payroll",
            "student_admissions","student_profiles","student_attendance","student_promotions","examinations","marks","results","fees","library","meetings_events","placement","roles_permissions","academic_settings"
        };

        private static Dictionary<string, PermissionActionsDto>? ParsePermissions(JsonElement? element)
        {
            if (!element.HasValue || element.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;
            try
            {
                var json = element.Value.ValueKind switch
                {
                    JsonValueKind.Object => element.Value.GetRawText(),
                    JsonValueKind.String => element.Value.GetString(),
                    _ => throw new ArgumentException("Permissions must be a JSON object or serialized JSON string.")
                };
                if (string.IsNullOrWhiteSpace(json)) return null;
                using (var document = JsonDocument.Parse(json))
                {
                    if (document.RootElement.ValueKind != JsonValueKind.Object)
                        throw new ArgumentException("Permissions must be a JSON object.");
                    foreach (var module in document.RootElement.EnumerateObject())
                    {
                        if (!SupportedModules.Contains(module.Name)) throw new ArgumentException($"Unsupported permission module '{module.Name}'.");
                        if (module.Value.ValueKind != JsonValueKind.Object) throw new ArgumentException($"Permissions for module '{module.Name}' must be an object.");
                        foreach (var action in module.Value.EnumerateObject())
                        {
                            if (!new[] { "view", "create", "edit", "delete", "export" }.Contains(action.Name, StringComparer.OrdinalIgnoreCase))
                                throw new ArgumentException($"Unsupported permission action '{action.Name}'.");
                            if (action.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                                throw new ArgumentException($"Permission action '{module.Name}.{action.Name}' must be a boolean.");
                        }
                    }
                }
                var parsed = JsonSerializer.Deserialize<Dictionary<string, PermissionActionsDto>>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (parsed == null || parsed.Any(x => string.IsNullOrWhiteSpace(x.Key) || x.Value == null))
                    throw new ArgumentException("Each permission module must contain boolean action values.");
                var unknown = parsed.Keys.FirstOrDefault(k => !SupportedModules.Contains(k));
                if (unknown != null) throw new ArgumentException($"Unsupported permission module '{unknown}'.");
                foreach (var p in parsed.Values)
                    if (!p.View) p.Create = p.Edit = p.Delete = p.Export = false;
                return parsed;
            }
            catch (JsonException)
            {
                throw new ArgumentException("Permissions must be valid JSON with boolean action values.");
            }
        }
    }
}
