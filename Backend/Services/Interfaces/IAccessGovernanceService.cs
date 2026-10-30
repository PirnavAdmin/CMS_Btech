using BTech.DTOs.AdminGovernance;

namespace BTech.Services.Interfaces;

public interface IAccessGovernanceService
{
    Task<List<AccessRoleDto>> GetRolesAsync(string? search, string? category, string? status, long? collegeId = null);
    Task<AccessRoleDto> GetRoleAsync(long roleId, long? collegeId = null);
    Task<AccessRoleDto> CreateRoleAsync(SaveAccessRoleRequest request, long? actorUserId);
    Task<AccessRoleDto> CreateRoleAndPermissionsAsync(SaveAccessRoleRequest request, Dictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null);
    Task<AccessRoleDto> UpdateRoleAsync(long roleId, SaveAccessRoleRequest request, long? actorUserId);
    Task<AccessRoleDto> UpdateRoleAndPermissionsAsync(long roleId, SaveAccessRoleRequest request, Dictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null);
    Task DeleteRoleAsync(long roleId, long? actorUserId);
    Task<Dictionary<string, PermissionActionsDto>> GetRolePermissionsAsync(long roleId, long? collegeId = null);
    Task<Dictionary<string, PermissionActionsDto>> SaveRolePermissionsAsync(long roleId, SaveRolePermissionsRequest request, long? actorUserId, long? collegeId = null);

    Task<List<DesignationDto>> GetDesignationsAsync(long collegeId, string? search, string? category, string? status);
    Task<DesignationDto> GetDesignationAsync(long designationId, long collegeId);
    Task<DesignationDto> CreateDesignationAsync(long collegeId, SaveDesignationRequest request, long? actorUserId);
    Task<DesignationDto> UpdateDesignationAsync(long designationId, long collegeId, SaveDesignationRequest request, long? actorUserId);
    Task DeleteDesignationAsync(long designationId, long collegeId, long? actorUserId);

    Task<List<StaffAccessAssignmentDto>> GetStaffAssignmentsAsync(long collegeId, string? search);
    Task<StaffAccessAssignmentDto> SaveStaffAssignmentAsync(long employeeProfileId, long collegeId, SaveStaffAccessAssignmentRequest request, long? actorUserId);
    Task<AccessGovernanceBootstrapDto> GetBootstrapAsync(long collegeId, string? search, long? permissionCollegeId = null);
}
