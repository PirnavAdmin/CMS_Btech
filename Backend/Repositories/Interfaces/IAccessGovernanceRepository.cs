using BTech.DTOs.AdminGovernance;

namespace BTech.Repositories.Interfaces;

public interface IAccessGovernanceRepository
{
    Task<List<AccessRoleDto>> GetRolesAsync(string? search, string? category, byte? status);
    Task<AccessRoleDto?> GetRoleAsync(long roleId);
    Task<bool> RoleNameExistsAsync(string roleName, long? excludeRoleId = null);
    Task<bool> RoleCodeExistsAsync(string roleCode, long? excludeRoleId = null);
    Task<long> CreateRoleAsync(SaveAccessRoleRequest request, byte status, long? actorUserId);
    Task<long> CreateRoleAndPermissionsAsync(SaveAccessRoleRequest request, byte status, IReadOnlyDictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null);
    Task<bool> UpdateRoleAsync(long roleId, SaveAccessRoleRequest request, byte status, long? actorUserId);
    Task<bool> UpdateRoleAndPermissionsAsync(long roleId, SaveAccessRoleRequest request, byte status, IReadOnlyDictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null);
    Task<int> CountActiveRoleAssignmentsAsync(long roleId);
    Task<bool> SoftDeleteRoleAsync(long roleId, long? actorUserId);
    Task<Dictionary<string, PermissionActionsDto>> GetRolePermissionsAsync(long roleId, long? collegeId = null);
    Task ReplaceRolePermissionsAsync(long roleId, IReadOnlyDictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null);

    Task<List<DesignationDto>> GetDesignationsAsync(long collegeId, string? search, string? category, byte? status);
    Task<DesignationDto?> GetDesignationAsync(long designationId, long collegeId);
    Task<bool> DesignationCodeExistsAsync(long collegeId, string code, long? excludeDesignationId = null);
    Task<long> CreateDesignationAsync(long collegeId, SaveDesignationRequest request, byte status, long? actorUserId);
    Task<bool> UpdateDesignationAsync(long designationId, long collegeId, SaveDesignationRequest request, byte status, long? actorUserId);
    Task<int> CountDesignationAssignmentsAsync(long designationId);
    Task<bool> SoftDeleteDesignationAsync(long designationId, long collegeId, long? actorUserId);

    Task<List<StaffAccessAssignmentDto>> GetStaffAssignmentsAsync(long collegeId, string? search);
    Task<StaffAccessAssignmentDto?> SaveStaffAssignmentAsync(long employeeProfileId, long collegeId, SaveStaffAccessAssignmentRequest request, long? actorUserId);
}
