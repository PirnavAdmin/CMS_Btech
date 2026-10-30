namespace BTech.DTOs.AdminGovernance;

public sealed class PermissionActionsDto
{
    public bool View { get; set; }
    public bool Create { get; set; }
    public bool Edit { get; set; }
    public bool Delete { get; set; }
    public bool Export { get; set; }
}

public sealed class AccessRoleDto
{
    public long Id { get; set; }
    public long RoleId => Id;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "Active";
    public bool IsSystem { get; set; }
    public int UserCount { get; set; }
    public Dictionary<string, PermissionActionsDto> Permissions { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class SaveAccessRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
}

public sealed class SaveRolePermissionsRequest
{
    public Dictionary<string, PermissionActionsDto> Permissions { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class DesignationDto
{
    public long Id { get; set; }
    public long DesignationId => Id;
    public long CollegeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string? Department { get; set; }
    public long? DefaultRoleId { get; set; }
    public string? DefaultRole => DefaultRoleId?.ToString();
    public string? DefaultRoleName { get; set; }
    public string Status { get; set; } = "Active";
    public int AssignedStaffCount { get; set; }
}

public sealed class SaveDesignationRequest
{
    public long? CollegeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string? Department { get; set; }
    public long? DefaultRoleId { get; set; }
    public string Status { get; set; } = string.Empty;
}

public sealed class StaffAccessAssignmentDto
{
    public long EmployeeProfileId { get; set; }
    public long UserId { get; set; }
    public string EmployeeId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public long? DepartmentId { get; set; }
    public string? Department { get; set; }
    public long? RoleId { get; set; }
    public string? RoleName { get; set; }
    public string? RoleCode { get; set; }
    public long? DesignationId { get; set; }
    public string? Designation { get; set; }
    public string Scope { get; set; } = "Department-scoped";
    public bool IsExplicitlyAssigned { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class SaveStaffAccessAssignmentRequest
{
    public long RoleId { get; set; }
    public long DesignationId { get; set; }
    public string Scope { get; set; } = "Department-scoped";
}

public sealed class AccessGovernanceBootstrapDto
{
    public List<AccessRoleDto> Roles { get; set; } = [];
    public List<DesignationDto> Designations { get; set; } = [];
    public List<StaffAccessAssignmentDto> StaffAssignments { get; set; } = [];
}
