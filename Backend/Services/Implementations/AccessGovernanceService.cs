using BTech.DTOs.AdminGovernance;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class AccessGovernanceService : IAccessGovernanceService
{
    private readonly IAccessGovernanceRepository _repository;
    private readonly ILogger<AccessGovernanceService> _logger;

    private static readonly string[] ModuleKeys =
    [
        "dashboard", "my_profile", "notifications",
        "colleges", "departments", "academic_years", "courses", "branches", "semesters", "sections", "rooms",
        "subjects", "timetable", "credits", "electives", "materials",
        "faculty_directory", "faculty_attendance", "faculty_leaves", "faculty_payroll",
        "student_admissions", "student_profiles", "student_attendance", "student_promotions",
        "examinations", "marks", "results", "fees",
        "library", "meetings_events", "placement",
        "roles_permissions", "academic_settings"
    ];

    private static readonly HashSet<string> SupportedModuleKeys =
        new(ModuleKeys, StringComparer.OrdinalIgnoreCase);

    private static readonly HashSet<string> RoleCategories = new(StringComparer.OrdinalIgnoreCase) { "Academic", "Administrative", "System", "Student" };
    private static readonly HashSet<string> RoleLevels = new(StringComparer.OrdinalIgnoreCase)
    {
        "Level 1 (Highest Privileges)","Level 2 (Executive Leadership)","Level 3 (Department Leadership)",
        "Level 4 (Academic Staff)","Level 4 (Administrative Staff)","Level 5 (End User)"
    };
    private static readonly HashSet<string> DesignationCategories = new(StringComparer.OrdinalIgnoreCase) { "Teaching", "Non-Teaching" };
    private static readonly HashSet<string> DesignationLevels = new(StringComparer.OrdinalIgnoreCase)
    {
        "Band 1 (Executive)","Band 2 (Senior Academic)","Band 3 (Faculty)","Band 4 (Technical Support)",
        "Band 4 (Administrative Support)","Band 5 (Auxiliary Support)"
    };
    private static readonly HashSet<string> Scopes = new(StringComparer.OrdinalIgnoreCase) { "Department-scoped", "College-wide" };

    public AccessGovernanceService(IAccessGovernanceRepository repository, ILogger<AccessGovernanceService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<List<AccessRoleDto>> GetRolesAsync(string? search, string? category, string? status, long? collegeId = null)
    {
        var rows = await _repository.GetRolesAsync(Clean(search), Clean(category), ParseOptionalStatus(status));
        foreach (var row in rows)
            row.Permissions = CompletePermissionMatrix(await _repository.GetRolePermissionsAsync(row.Id, collegeId));
        return rows;
    }

    public async Task<AccessRoleDto> GetRoleAsync(long roleId, long? collegeId = null)
    {
        if (roleId <= 0) throw new ArgumentException("A valid role id is required.");
        var role = await _repository.GetRoleAsync(roleId) ?? throw new KeyNotFoundException("Role not found.");
        role.Permissions = CompletePermissionMatrix(await _repository.GetRolePermissionsAsync(roleId, collegeId));
        return role;
    }

    public async Task<AccessRoleDto> CreateRoleAsync(SaveAccessRoleRequest request, long? actorUserId)
    {
        NormalizeAndValidateRole(request);
        if (await _repository.RoleNameExistsAsync(request.Name))
            throw new InvalidOperationException("Role name already exists.");
        if (await _repository.RoleCodeExistsAsync(request.Code))
            throw new InvalidOperationException("A role with this code already exists.");
        var id = await _repository.CreateRoleAsync(request, ParseRequiredStatus(request.Status), actorUserId);
        _logger.LogInformation("Role profile created. RoleId={RoleId}, Code={Code}, ActorUserId={ActorUserId}", id, request.Code, actorUserId);
        return await GetRoleAsync(id);
    }

    public async Task<AccessRoleDto> CreateRoleAndPermissionsAsync(SaveAccessRoleRequest request, Dictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null)
    {
        NormalizeAndValidateRole(request);
        if (await _repository.RoleNameExistsAsync(request.Name)) throw new InvalidOperationException("Role name already exists.");
        if (await _repository.RoleCodeExistsAsync(request.Code)) throw new InvalidOperationException("A role with this code already exists.");
        var unsupported = permissions.Keys.FirstOrDefault(key => !SupportedModuleKeys.Contains(key));
        if (unsupported != null) throw new ArgumentException($"Unsupported permission module '{unsupported}'.");
        var matrix = CompletePermissionMatrix(permissions);
        foreach (var permission in matrix.Values)
            if (!permission.View) permission.Create = permission.Edit = permission.Delete = permission.Export = false;
        var id = await _repository.CreateRoleAndPermissionsAsync(request, ParseRequiredStatus(request.Status), matrix, actorUserId, collegeId);
        _logger.LogInformation("Role and permissions created. RoleId={RoleId}, Code={Code}, ActorUserId={ActorUserId}", id, request.Code, actorUserId);
        return await GetRoleAsync(id, collegeId);
    }

    public async Task<AccessRoleDto> UpdateRoleAsync(long roleId, SaveAccessRoleRequest request, long? actorUserId)
    {
        var existing = await GetRoleAsync(roleId);
        NormalizeAndValidateRole(request);
        if (existing.IsSystem && !string.Equals(existing.Code, request.Code, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("System role code cannot be changed.");
        // Exclude the current role so saving the same name is valid.
        if (await _repository.RoleNameExistsAsync(request.Name, roleId))
            throw new InvalidOperationException($"Another role with name '{request.Name}' already exists.");
        if (await _repository.RoleCodeExistsAsync(request.Code, roleId))
            throw new InvalidOperationException("A role with this code already exists.");
        if (!await _repository.UpdateRoleAsync(roleId, request, ParseRequiredStatus(request.Status), actorUserId))
            throw new KeyNotFoundException("Role not found.");
        _logger.LogInformation("Role profile updated. RoleId={RoleId}, ActorUserId={ActorUserId}", roleId, actorUserId);
        return await GetRoleAsync(roleId);
    }

    public async Task<AccessRoleDto> UpdateRoleAndPermissionsAsync(long roleId, SaveAccessRoleRequest request, Dictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null)
    {
        var existing = await GetRoleAsync(roleId, collegeId);
        NormalizeAndValidateRole(request);
        if (existing.IsSystem && !string.Equals(existing.Code, request.Code, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("System role code cannot be changed.");
        if (await _repository.RoleNameExistsAsync(request.Name, roleId))
            throw new InvalidOperationException($"Another role with name '{request.Name}' already exists.");
        if (await _repository.RoleCodeExistsAsync(request.Code, roleId))
            throw new InvalidOperationException("A role with this code already exists.");
        var unsupported = permissions.Keys.FirstOrDefault(key => !SupportedModuleKeys.Contains(key));
        if (unsupported != null) throw new ArgumentException($"Unsupported permission module '{unsupported}'.");
        var matrix = CompletePermissionMatrix(permissions);
        foreach (var permission in matrix.Values)
            if (!permission.View) permission.Create = permission.Edit = permission.Delete = permission.Export = false;
        if (!await _repository.UpdateRoleAndPermissionsAsync(roleId, request, ParseRequiredStatus(request.Status), matrix, actorUserId, collegeId))
            throw new KeyNotFoundException("Role not found.");
        return await GetRoleAsync(roleId, collegeId);
    }

    public async Task DeleteRoleAsync(long roleId, long? actorUserId)
    {
        var role = await GetRoleAsync(roleId);
        if (role.IsSystem) throw new InvalidOperationException("System default roles cannot be deleted.");
        var assigned = await _repository.CountActiveRoleAssignmentsAsync(roleId);
        if (assigned > 0) throw new InvalidOperationException($"Role is assigned to {assigned} active user(s). Reassign those users before deleting this role.");
        if (!await _repository.SoftDeleteRoleAsync(roleId, actorUserId)) throw new KeyNotFoundException("Role not found.");
        _logger.LogInformation("Role deleted. RoleId={RoleId}, ActorUserId={ActorUserId}", roleId, actorUserId);
    }

    public async Task<Dictionary<string, PermissionActionsDto>> GetRolePermissionsAsync(long roleId, long? collegeId = null)
    {
        await GetRoleAsync(roleId, collegeId);
        return CompletePermissionMatrix(await _repository.GetRolePermissionsAsync(roleId, collegeId));
    }

    public async Task<Dictionary<string, PermissionActionsDto>> SaveRolePermissionsAsync(long roleId, SaveRolePermissionsRequest request, long? actorUserId, long? collegeId = null)
    {
        await GetRoleAsync(roleId, collegeId);
        var supplied = request.Permissions ?? new Dictionary<string, PermissionActionsDto>();
        var unsupported = supplied.Keys.FirstOrDefault(key => !SupportedModuleKeys.Contains(key));
        if (unsupported != null)
            throw new ArgumentException($"Unsupported permission module '{unsupported}'.");

        var matrix = CompletePermissionMatrix(supplied);
        foreach (var permission in matrix.Values)
        {
            // View is an explicit prerequisite. Dependent actions never grant View.
            if (!permission.View)
            {
                permission.Create = false;
                permission.Edit = false;
                permission.Delete = false;
                permission.Export = false;
            }
        }
        await _repository.ReplaceRolePermissionsAsync(roleId, matrix, actorUserId, collegeId);
        _logger.LogInformation("Role permission matrix saved. RoleId={RoleId}, ActorUserId={ActorUserId}", roleId, actorUserId);
        return matrix;
    }

    public Task<List<DesignationDto>> GetDesignationsAsync(long collegeId, string? search, string? category, string? status)
    {
        EnsureCollege(collegeId);
        return _repository.GetDesignationsAsync(collegeId, Clean(search), Clean(category), ParseOptionalStatus(status));
    }

    public async Task<DesignationDto> GetDesignationAsync(long designationId, long collegeId)
    {
        EnsureCollege(collegeId);
        if (designationId <= 0) throw new ArgumentException("A valid designation id is required.");
        return await _repository.GetDesignationAsync(designationId, collegeId) ?? throw new KeyNotFoundException("Designation not found.");
    }

    public async Task<DesignationDto> CreateDesignationAsync(long collegeId, SaveDesignationRequest request, long? actorUserId)
    {
        EnsureCollege(collegeId);
        await NormalizeAndValidateDesignationAsync(request);
        if (await _repository.DesignationCodeExistsAsync(collegeId, request.Code))
            throw new InvalidOperationException("A designation with this code already exists.");
        var id = await _repository.CreateDesignationAsync(collegeId, request, ParseRequiredStatus(request.Status), actorUserId);
        _logger.LogInformation("Designation created. DesignationId={DesignationId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", id, collegeId, actorUserId);
        return await GetDesignationAsync(id, collegeId);
    }

    public async Task<DesignationDto> UpdateDesignationAsync(long designationId, long collegeId, SaveDesignationRequest request, long? actorUserId)
    {
        await GetDesignationAsync(designationId, collegeId);
        await NormalizeAndValidateDesignationAsync(request);
        if (await _repository.DesignationCodeExistsAsync(collegeId, request.Code, designationId))
            throw new InvalidOperationException("A designation with this code already exists.");
        if (!await _repository.UpdateDesignationAsync(designationId, collegeId, request, ParseRequiredStatus(request.Status), actorUserId))
            throw new KeyNotFoundException("Designation not found.");
        _logger.LogInformation("Designation updated. DesignationId={DesignationId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", designationId, collegeId, actorUserId);
        return await GetDesignationAsync(designationId, collegeId);
    }

    public async Task DeleteDesignationAsync(long designationId, long collegeId, long? actorUserId)
    {
        await GetDesignationAsync(designationId, collegeId);
        var assigned = await _repository.CountDesignationAssignmentsAsync(designationId);
        if (assigned > 0) throw new InvalidOperationException($"Designation is assigned to {assigned} active staff member(s). Reassign them before deleting this designation.");
        if (!await _repository.SoftDeleteDesignationAsync(designationId, collegeId, actorUserId)) throw new KeyNotFoundException("Designation not found.");
        _logger.LogInformation("Designation deleted. DesignationId={DesignationId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", designationId, collegeId, actorUserId);
    }

    public Task<List<StaffAccessAssignmentDto>> GetStaffAssignmentsAsync(long collegeId, string? search)
    {
        EnsureCollege(collegeId);
        return _repository.GetStaffAssignmentsAsync(collegeId, Clean(search));
    }

    public async Task<StaffAccessAssignmentDto> SaveStaffAssignmentAsync(long employeeProfileId, long collegeId, SaveStaffAccessAssignmentRequest request, long? actorUserId)
    {
        EnsureCollege(collegeId);
        if (employeeProfileId <= 0) throw new ArgumentException("A valid employee profile id is required.");
        if (request.RoleId <= 0) throw new ArgumentException("A system role is required.");
        if (request.DesignationId <= 0) throw new ArgumentException("An official designation is required.");
        if (!Scopes.Contains(request.Scope)) throw new ArgumentException("Scope must be Department-scoped or College-wide.");
        request.Scope = Scopes.First(x => x.Equals(request.Scope, StringComparison.OrdinalIgnoreCase));
        return await _repository.SaveStaffAssignmentAsync(employeeProfileId, collegeId, request, actorUserId)
            ?? throw new KeyNotFoundException("Staff member was not found.");
    }

    public async Task<AccessGovernanceBootstrapDto> GetBootstrapAsync(long collegeId, string? search, long? permissionCollegeId = null)
    {
        EnsureCollege(collegeId);
        return new AccessGovernanceBootstrapDto
        {
            Roles = await GetRolesAsync(search, null, null, permissionCollegeId),
            Designations = await GetDesignationsAsync(collegeId, search, null, null),
            StaffAssignments = await GetStaffAssignmentsAsync(collegeId, search)
        };
    }

    private async Task NormalizeAndValidateDesignationAsync(SaveDesignationRequest request)
    {
        request.Title = request.Title?.Trim() ?? string.Empty;
        request.Code = request.Code?.Trim().ToUpperInvariant() ?? string.Empty;
        request.Category = request.Category?.Trim() ?? string.Empty;
        request.Level = request.Level?.Trim() ?? string.Empty;
        request.Department = Clean(request.Department);
        request.Status = request.Status?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(request.Title)) throw new ArgumentException("Designation title is required.");
        if (string.IsNullOrWhiteSpace(request.Code)) throw new ArgumentException("Designation code is required.");
        if (!DesignationCategories.Contains(request.Category)) throw new ArgumentException("Staff category must be Teaching or Non-Teaching.");
        if (!DesignationLevels.Contains(request.Level)) throw new ArgumentException("A valid hierarchy level band is required.");
        ParseRequiredStatus(request.Status);
        if (request.DefaultRoleId.HasValue && request.DefaultRoleId.Value > 0)
            await GetRoleAsync(request.DefaultRoleId.Value);
        else
            request.DefaultRoleId = null;
    }

    private static void NormalizeAndValidateRole(SaveAccessRoleRequest request)
    {
        request.Name = request.Name?.Trim() ?? string.Empty;
        request.Code = request.Code?.Trim().ToUpperInvariant() ?? string.Empty;
        request.Category = request.Category?.Trim() ?? string.Empty;
        request.Level = request.Level?.Trim() ?? string.Empty;
        request.Description = Clean(request.Description);
        request.Status = request.Status?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(request.Name)) throw new ArgumentException("Role name is required.");
        if (string.IsNullOrWhiteSpace(request.Code)) throw new ArgumentException("Role code is required.");
        if (!RoleCategories.Contains(request.Category)) throw new ArgumentException("A valid role category is required.");
        if (!RoleLevels.Contains(request.Level)) throw new ArgumentException("A valid hierarchy level is required.");
        ParseRequiredStatus(request.Status);
    }

    private static Dictionary<string, PermissionActionsDto> CompletePermissionMatrix(IReadOnlyDictionary<string, PermissionActionsDto> source)
    {
        var result = new Dictionary<string, PermissionActionsDto>(StringComparer.OrdinalIgnoreCase);
        foreach (var key in ModuleKeys)
        {
            result[key] = source.TryGetValue(key, out var p)
                ? new PermissionActionsDto { View=p.View, Create=p.Create, Edit=p.Edit, Delete=p.Delete, Export=p.Export }
                : new PermissionActionsDto();
        }
        return result;
    }

    private static byte ParseRequiredStatus(string? status) => status?.Trim().ToUpperInvariant() switch
    {
        "ACTIVE" => 1,
        "INACTIVE" => 0,
        _ => throw new ArgumentException("Status must be Active or Inactive.")
    };

    private static byte? ParseOptionalStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return null;
        return ParseRequiredStatus(status);
    }

    private static void EnsureCollege(long collegeId)
    {
        if (collegeId <= 0) throw new ArgumentException("A valid college id is required.");
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
