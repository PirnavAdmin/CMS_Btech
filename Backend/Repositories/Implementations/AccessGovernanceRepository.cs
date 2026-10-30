using BTech.DTOs.AdminGovernance;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public sealed class AccessGovernanceRepository : IAccessGovernanceRepository
{
    private readonly string _connectionString;
    private readonly ILogger<AccessGovernanceRepository> _logger;

    public AccessGovernanceRepository(IConfiguration configuration, ILogger<AccessGovernanceRepository> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
        _logger = logger;
    }

    private MySqlConnection CreateConnection() => new(_connectionString);

    public async Task<List<AccessRoleDto>> GetRolesAsync(string? search, string? category, byte? status)
    {
        const string sql = """
            SELECT r.role_id AS Id, r.role_name AS Name, r.role_code AS Code,
                   COALESCE(r.category,'') AS Category, COALESCE(r.hierarchy_level,'') AS Level,
                   r.description AS Description,
                   CASE WHEN r.status=1 THEN 'Active' ELSE 'Inactive' END AS Status,
                   COALESCE(r.is_system,0) AS IsSystem,
                   CAST(COUNT(DISTINCT CASE WHEN ur.status=1 AND ur.removed_at IS NULL THEN ur.user_id END) AS SIGNED) AS UserCount
            FROM roles r
            LEFT JOIN user_roles ur ON ur.role_id=r.role_id
            WHERE r.deleted_at IS NULL
              AND (@status IS NULL OR r.status=@status)
              AND (@category IS NULL OR @category='' OR r.category=@category)
              AND (@search IS NULL OR @search='' OR
                   r.role_name LIKE CONCAT('%',@search,'%') OR
                   r.role_code LIKE CONCAT('%',@search,'%') OR
                   COALESCE(r.description,'') LIKE CONCAT('%',@search,'%'))
            GROUP BY r.role_id,r.role_name,r.role_code,r.category,r.hierarchy_level,r.description,r.status,r.is_system
            ORDER BY r.is_system DESC,r.role_name;
            """;
        await using var connection = CreateConnection();
        var rows = (await connection.QueryAsync<AccessRoleDto>(sql, new { search, category, status })).ToList();
        _logger.LogDebug("Loaded {Count} access roles. Category={Category}, Status={Status}", rows.Count, category, status);
        return rows;
    }

    public async Task<AccessRoleDto?> GetRoleAsync(long roleId)
    {
        const string sql = """
            SELECT r.role_id AS Id, r.role_name AS Name, r.role_code AS Code,
                   COALESCE(r.category,'') AS Category, COALESCE(r.hierarchy_level,'') AS Level,
                   r.description AS Description,
                   CASE WHEN r.status=1 THEN 'Active' ELSE 'Inactive' END AS Status,
                   COALESCE(r.is_system,0) AS IsSystem,
                   CAST(COUNT(DISTINCT CASE WHEN ur.status=1 AND ur.removed_at IS NULL THEN ur.user_id END) AS SIGNED) AS UserCount
            FROM roles r
            LEFT JOIN user_roles ur ON ur.role_id=r.role_id
            WHERE r.role_id=@roleId AND r.deleted_at IS NULL
            GROUP BY r.role_id,r.role_name,r.role_code,r.category,r.hierarchy_level,r.description,r.status,r.is_system;
            """;
        await using var connection = CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<AccessRoleDto>(sql, new { roleId });
    }

    public async Task<bool> RoleNameExistsAsync(string roleName, long? excludeRoleId = null)
    {
        const string sql = """
            SELECT EXISTS(
                SELECT 1 FROM roles
                WHERE deleted_at IS NULL
                  AND LOWER(TRIM(role_name))=LOWER(TRIM(@roleName))
                  AND (@excludeRoleId IS NULL OR role_id<>@excludeRoleId)
            );
            """;
        await using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(sql, new { roleName, excludeRoleId });
    }

    public async Task<bool> RoleCodeExistsAsync(string roleCode, long? excludeRoleId = null)
    {
        const string sql = """
            SELECT EXISTS(
                SELECT 1 FROM roles
                WHERE deleted_at IS NULL AND UPPER(role_code)=UPPER(@roleCode)
                  AND (@excludeRoleId IS NULL OR role_id<>@excludeRoleId)
            );
            """;
        await using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(sql, new { roleCode, excludeRoleId });
    }

    public async Task<long> CreateRoleAsync(SaveAccessRoleRequest request, byte status, long? actorUserId)
    {
        const string sql = """
            INSERT INTO roles(role_name,role_code,description,status,category,hierarchy_level,is_system,created_at,created_by)
            VALUES(@Name,@Code,@Description,@status,@Category,@Level,0,CURRENT_TIMESTAMP,@actorUserId);
            SELECT LAST_INSERT_ID();
            """;
        await using var connection = CreateConnection();
        var id = await connection.ExecuteScalarAsync<long>(sql, new
        {
            Name = request.Name.Trim(), Code = request.Code.Trim().ToUpperInvariant(),
            request.Description, request.Category, request.Level, status, actorUserId
        });
        _logger.LogInformation("Access role created. RoleId={RoleId}, Code={Code}, ActorUserId={ActorUserId}", id, request.Code, actorUserId);
        return id;
    }

    public async Task<long> CreateRoleAndPermissionsAsync(SaveAccessRoleRequest request, byte status, IReadOnlyDictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            const string insertRoleSql = """
                INSERT INTO roles(role_name,role_code,description,status,category,hierarchy_level,is_system,created_at,created_by)
                VALUES(@Name,@Code,@Description,@status,@Category,@Level,0,CURRENT_TIMESTAMP,@actorUserId);
                SELECT LAST_INSERT_ID();
                """;
            var roleId = await connection.ExecuteScalarAsync<long>(insertRoleSql, new
            {
                Name=request.Name.Trim(), Code=request.Code.Trim().ToUpperInvariant(), request.Description,
                request.Category, request.Level, status, actorUserId
            }, transaction);
            const string insertPermissionSql = """
                INSERT INTO role_permissions(role_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export,created_at,created_by,updated_at,updated_by)
                VALUES(@roleId,@collegeId,@moduleKey,@View,@Create,@Edit,@Delete,@Export,CURRENT_TIMESTAMP,@actorUserId,CURRENT_TIMESTAMP,@actorUserId);
                """;
            foreach (var item in permissions)
                await connection.ExecuteAsync(insertPermissionSql, new
                {
                    roleId, collegeId, moduleKey=item.Key, item.Value.View, item.Value.Create,
                    item.Value.Edit, item.Value.Delete, item.Value.Export, actorUserId
                }, transaction);
            await transaction.CommitAsync();
            _logger.LogInformation("Role and permission matrix created atomically. RoleId={RoleId}, Code={Code}, ModuleCount={ModuleCount}, ActorUserId={ActorUserId}, CollegeId={CollegeId}", roleId, request.Code, permissions.Count, actorUserId, collegeId);
            return roleId;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> UpdateRoleAsync(long roleId, SaveAccessRoleRequest request, byte status, long? actorUserId)
    {
        const string sql = """
            UPDATE roles
            SET role_name=@Name, role_code=@Code, description=@Description, status=@status,
                category=@Category, hierarchy_level=@Level, updated_at=CURRENT_TIMESTAMP, updated_by=@actorUserId
            WHERE role_id=@roleId AND deleted_at IS NULL;
            """;
        await using var connection = CreateConnection();
        var affected = await connection.ExecuteAsync(sql, new
        {
            roleId, Name = request.Name.Trim(), Code = request.Code.Trim().ToUpperInvariant(),
            request.Description, request.Category, request.Level, status, actorUserId
        });
        _logger.LogInformation("Access role updated. RoleId={RoleId}, ActorUserId={ActorUserId}, Affected={Affected}", roleId, actorUserId, affected);
        return affected > 0;
    }

    public async Task<bool> UpdateRoleAndPermissionsAsync(long roleId, SaveAccessRoleRequest request, byte status, IReadOnlyDictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            const string updateRoleSql = """
                UPDATE roles
                SET role_name=@Name, role_code=@Code, description=@Description, status=@status,
                    category=@Category, hierarchy_level=@Level, updated_at=CURRENT_TIMESTAMP, updated_by=@actorUserId
                WHERE role_id=@roleId AND deleted_at IS NULL;
                """;
            var affected = await connection.ExecuteAsync(updateRoleSql, new
            {
                roleId, Name=request.Name.Trim(), Code=request.Code.Trim().ToUpperInvariant(),
                request.Description, request.Category, request.Level, status, actorUserId
            }, transaction);
            if (affected == 0)
            {
                await transaction.RollbackAsync();
                return false;
            }

            await connection.ExecuteAsync(
                "DELETE FROM role_permissions WHERE role_id=@roleId AND college_id <=> @collegeId;",
                new { roleId, collegeId }, transaction);
            const string insertPermissionSql = """
                INSERT INTO role_permissions(role_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export,created_at,created_by,updated_at,updated_by)
                VALUES(@roleId,@collegeId,@moduleKey,@View,@Create,@Edit,@Delete,@Export,CURRENT_TIMESTAMP,@actorUserId,CURRENT_TIMESTAMP,@actorUserId);
                """;
            foreach (var item in permissions)
            {
                await connection.ExecuteAsync(insertPermissionSql, new
                {
                    roleId, collegeId, moduleKey=item.Key, item.Value.View, item.Value.Create,
                    item.Value.Edit, item.Value.Delete, item.Value.Export, actorUserId
                }, transaction);
            }
            await transaction.CommitAsync();
            _logger.LogInformation("Role and permissions updated atomically. RoleId={RoleId}, ModuleCount={ModuleCount}, ActorUserId={ActorUserId}, CollegeId={CollegeId}", roleId, permissions.Count, actorUserId, collegeId);
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<int> CountActiveRoleAssignmentsAsync(long roleId)
    {
        const string sql = "SELECT COUNT(*) FROM user_roles WHERE role_id=@roleId AND status=1 AND removed_at IS NULL;";
        await using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new { roleId });
    }

    public async Task<bool> SoftDeleteRoleAsync(long roleId, long? actorUserId)
    {
        const string sql = """
            UPDATE roles SET status=0,deleted_at=CURRENT_TIMESTAMP,deleted_by=@actorUserId,
                             updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId
            WHERE role_id=@roleId AND deleted_at IS NULL AND COALESCE(is_system,0)=0;
            """;
        await using var connection = CreateConnection();
        var affected = await connection.ExecuteAsync(sql, new { roleId, actorUserId });
        _logger.LogInformation("Access role soft-delete attempted. RoleId={RoleId}, ActorUserId={ActorUserId}, Affected={Affected}", roleId, actorUserId, affected);
        return affected > 0;
    }

    public async Task<Dictionary<string, PermissionActionsDto>> GetRolePermissionsAsync(long roleId, long? collegeId = null)
    {
        const string sql = """
            SELECT rp.module_key AS ModuleKey, rp.can_view AS CanView, rp.can_create AS CanCreate,
                   rp.can_edit AS CanEdit, rp.can_delete AS CanDelete, rp.can_export AS CanExport
            FROM role_permissions rp
            WHERE rp.role_id=@roleId AND (
                (@collegeId IS NULL AND rp.college_id IS NULL)
                OR rp.college_id=@collegeId
                OR (rp.college_id IS NULL AND @collegeId IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM role_permissions scoped
                    WHERE scoped.role_id=rp.role_id AND scoped.module_key=rp.module_key AND scoped.college_id=@collegeId
                ))
            ) ORDER BY rp.module_key;
            """;
        await using var connection = CreateConnection();
        var rows = await connection.QueryAsync<RolePermissionRow>(sql, new { roleId, collegeId });
        return rows.ToDictionary(
            x => x.ModuleKey,
            x => new PermissionActionsDto { View=x.CanView, Create=x.CanCreate, Edit=x.CanEdit, Delete=x.CanDelete, Export=x.CanExport },
            StringComparer.OrdinalIgnoreCase);
    }

    public async Task ReplaceRolePermissionsAsync(long roleId, IReadOnlyDictionary<string, PermissionActionsDto> permissions, long? actorUserId, long? collegeId = null)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            await connection.ExecuteAsync("DELETE FROM role_permissions WHERE role_id=@roleId AND college_id <=> @collegeId;", new { roleId, collegeId }, transaction);
            const string insert = """
                INSERT INTO role_permissions(role_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export,created_at,created_by,updated_at,updated_by)
                VALUES(@roleId,@collegeId,@moduleKey,@View,@Create,@Edit,@Delete,@Export,CURRENT_TIMESTAMP,@actorUserId,CURRENT_TIMESTAMP,@actorUserId);
                """;
            foreach (var item in permissions)
            {
                await connection.ExecuteAsync(insert, new
                {
                    roleId, collegeId, moduleKey=item.Key, item.Value.View, item.Value.Create, item.Value.Edit,
                    item.Value.Delete, item.Value.Export, actorUserId
                }, transaction);
            }
            await transaction.CommitAsync();
            _logger.LogInformation("Role permissions replaced. RoleId={RoleId}, Modules={ModuleCount}, ActorUserId={ActorUserId}", roleId, permissions.Count, actorUserId);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<DesignationDto>> GetDesignationsAsync(long collegeId, string? search, string? category, byte? status)
    {
        const string sql = """
            SELECT d.designation_id AS Id,d.college_id AS CollegeId,d.title AS Title,d.code AS Code,
                   d.category AS Category,d.hierarchy_level AS Level,d.department_scope AS Department,
                   d.default_role_id AS DefaultRoleId,r.role_name AS DefaultRoleName,
                   CASE WHEN d.status=1 THEN 'Active' ELSE 'Inactive' END AS Status,
                   CAST(COUNT(DISTINCT sap.employee_profile_id) AS SIGNED) AS AssignedStaffCount
            FROM designations d
            LEFT JOIN roles r ON r.role_id=d.default_role_id AND r.deleted_at IS NULL
            LEFT JOIN staff_access_profiles sap ON sap.designation_id=d.designation_id AND sap.status=1
            WHERE d.college_id=@collegeId AND d.deleted_at IS NULL
              AND (@status IS NULL OR d.status=@status)
              AND (@category IS NULL OR @category='' OR d.category=@category)
              AND (@search IS NULL OR @search='' OR d.title LIKE CONCAT('%',@search,'%') OR d.code LIKE CONCAT('%',@search,'%') OR COALESCE(d.department_scope,'') LIKE CONCAT('%',@search,'%'))
            GROUP BY d.designation_id,d.college_id,d.title,d.code,d.category,d.hierarchy_level,d.department_scope,d.default_role_id,r.role_name,d.status
            ORDER BY d.category,d.title;
            """;
        await using var connection = CreateConnection();
        return (await connection.QueryAsync<DesignationDto>(sql, new { collegeId, search, category, status })).ToList();
    }

    public async Task<DesignationDto?> GetDesignationAsync(long designationId, long collegeId)
    {
        const string sql = """
            SELECT d.designation_id AS Id,d.college_id AS CollegeId,d.title AS Title,d.code AS Code,
                   d.category AS Category,d.hierarchy_level AS Level,d.department_scope AS Department,
                   d.default_role_id AS DefaultRoleId,r.role_name AS DefaultRoleName,
                   CASE WHEN d.status=1 THEN 'Active' ELSE 'Inactive' END AS Status,
                   CAST(COUNT(DISTINCT sap.employee_profile_id) AS SIGNED) AS AssignedStaffCount
            FROM designations d
            LEFT JOIN roles r ON r.role_id=d.default_role_id AND r.deleted_at IS NULL
            LEFT JOIN staff_access_profiles sap ON sap.designation_id=d.designation_id AND sap.status=1
            WHERE d.designation_id=@designationId AND d.college_id=@collegeId AND d.deleted_at IS NULL
            GROUP BY d.designation_id,d.college_id,d.title,d.code,d.category,d.hierarchy_level,d.department_scope,d.default_role_id,r.role_name,d.status;
            """;
        await using var connection = CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<DesignationDto>(sql, new { designationId, collegeId });
    }

    public async Task<bool> DesignationCodeExistsAsync(long collegeId, string code, long? excludeDesignationId = null)
    {
        const string sql = """
            SELECT EXISTS(SELECT 1 FROM designations WHERE college_id=@collegeId AND deleted_at IS NULL
                AND UPPER(code)=UPPER(@code) AND (@excludeDesignationId IS NULL OR designation_id<>@excludeDesignationId));
            """;
        await using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<bool>(sql, new { collegeId, code, excludeDesignationId });
    }

    public async Task<long> CreateDesignationAsync(long collegeId, SaveDesignationRequest request, byte status, long? actorUserId)
    {
        const string sql = """
            INSERT INTO designations(college_id,title,code,category,hierarchy_level,department_scope,default_role_id,status,created_at,created_by)
            VALUES(@collegeId,@Title,@Code,@Category,@Level,@Department,@DefaultRoleId,@status,CURRENT_TIMESTAMP,@actorUserId);
            SELECT LAST_INSERT_ID();
            """;
        await using var connection = CreateConnection();
        var id = await connection.ExecuteScalarAsync<long>(sql, new
        {
            collegeId, Title=request.Title.Trim(), Code=request.Code.Trim().ToUpperInvariant(), request.Category,
            Level=request.Level, Department=request.Department, request.DefaultRoleId, status, actorUserId
        });
        _logger.LogInformation("Designation created. DesignationId={DesignationId}, CollegeId={CollegeId}, ActorUserId={ActorUserId}", id, collegeId, actorUserId);
        return id;
    }

    public async Task<bool> UpdateDesignationAsync(long designationId, long collegeId, SaveDesignationRequest request, byte status, long? actorUserId)
    {
        const string sql = """
            UPDATE designations SET title=@Title,code=@Code,category=@Category,hierarchy_level=@Level,
                department_scope=@Department,default_role_id=@DefaultRoleId,status=@status,
                updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId
            WHERE designation_id=@designationId AND college_id=@collegeId AND deleted_at IS NULL;
            """;
        await using var connection = CreateConnection();
        var affected = await connection.ExecuteAsync(sql, new
        {
            designationId, collegeId, Title=request.Title.Trim(), Code=request.Code.Trim().ToUpperInvariant(),
            request.Category, Level=request.Level, Department=request.Department, request.DefaultRoleId, status, actorUserId
        });
        return affected > 0;
    }

    public async Task<int> CountDesignationAssignmentsAsync(long designationId)
    {
        const string sql = "SELECT COUNT(*) FROM staff_access_profiles WHERE designation_id=@designationId AND status=1;";
        await using var connection = CreateConnection();
        return await connection.ExecuteScalarAsync<int>(sql, new { designationId });
    }

    public async Task<bool> SoftDeleteDesignationAsync(long designationId, long collegeId, long? actorUserId)
    {
        const string sql = """
            UPDATE designations SET status=0,deleted_at=CURRENT_TIMESTAMP,deleted_by=@actorUserId,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId
            WHERE designation_id=@designationId AND college_id=@collegeId AND deleted_at IS NULL;
            """;
        await using var connection = CreateConnection();
        return await connection.ExecuteAsync(sql, new { designationId, collegeId, actorUserId }) > 0;
    }

    public async Task<List<StaffAccessAssignmentDto>> GetStaffAssignmentsAsync(long collegeId, string? search)
    {
        const string sql = """
            SELECT ep.employee_profile_id AS EmployeeProfileId,ep.user_id AS UserId,u.employee_user_id AS EmployeeId,
                   u.full_name AS FullName,u.email AS Email,ep.department_id AS DepartmentId,d.department_name AS Department,
                   COALESCE(sap.role_id,ur.role_id) AS RoleId,r.role_name AS RoleName,r.role_code AS RoleCode,
                   sap.designation_id AS DesignationId,COALESCE(des.title,ep.designation) AS Designation,
                   COALESCE(sap.access_scope,'Department-scoped') AS Scope,
                   CASE WHEN sap.employee_profile_id IS NULL THEN 0 ELSE 1 END AS IsExplicitlyAssigned,
                   sap.updated_at AS UpdatedAt
            FROM employee_profiles ep
            JOIN users u ON u.user_id=ep.user_id
            LEFT JOIN departments d ON d.department_id=ep.department_id
            LEFT JOIN staff_access_profiles sap ON sap.employee_profile_id=ep.employee_profile_id AND sap.status=1
            LEFT JOIN user_roles ur ON ur.user_role_id=(
                SELECT MIN(ur2.user_role_id) FROM user_roles ur2
                WHERE ur2.user_id=ep.user_id AND ur2.status=1 AND ur2.removed_at IS NULL
            )
            LEFT JOIN roles r ON r.role_id=COALESCE(sap.role_id,ur.role_id) AND r.deleted_at IS NULL
            LEFT JOIN designations des ON des.designation_id=sap.designation_id AND des.deleted_at IS NULL
            WHERE u.college_id=@collegeId AND ep.deleted_at IS NULL AND ep.status=1
              AND (@search IS NULL OR @search='' OR u.full_name LIKE CONCAT('%',@search,'%') OR u.employee_user_id LIKE CONCAT('%',@search,'%') OR COALESCE(u.email,'') LIKE CONCAT('%',@search,'%') OR COALESCE(d.department_name,'') LIKE CONCAT('%',@search,'%'))
            ORDER BY u.full_name;
            """;
        await using var connection = CreateConnection();
        return (await connection.QueryAsync<StaffAccessAssignmentDto>(sql, new { collegeId, search })).ToList();
    }

    public async Task<StaffAccessAssignmentDto?> SaveStaffAssignmentAsync(long employeeProfileId, long collegeId, SaveStaffAccessAssignmentRequest request, long? actorUserId)
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            const string lookup = """
                SELECT ep.user_id AS UserId, des.title AS DesignationTitle
                FROM employee_profiles ep
                JOIN users u ON u.user_id=ep.user_id AND u.college_id=@collegeId
                JOIN roles r ON r.role_id=@RoleId AND r.status=1 AND r.deleted_at IS NULL
                JOIN designations des ON des.designation_id=@DesignationId AND des.college_id=@collegeId AND des.status=1 AND des.deleted_at IS NULL
                WHERE ep.employee_profile_id=@employeeProfileId AND ep.deleted_at IS NULL AND ep.status=1;
                """;
            var target = await connection.QuerySingleOrDefaultAsync<StaffTargetRow>(lookup, new { employeeProfileId, collegeId, request.RoleId, request.DesignationId }, transaction);
            if (target == null) throw new KeyNotFoundException("Employee, role, or designation was not found or is inactive.");

            var previousRoleId = await connection.ExecuteScalarAsync<long?>(
                "SELECT role_id FROM staff_access_profiles WHERE employee_profile_id=@employeeProfileId AND status=1 FOR UPDATE;",
                new { employeeProfileId }, transaction);
            if (previousRoleId.HasValue && previousRoleId.Value != request.RoleId)
            {
                await connection.ExecuteAsync(
                    "UPDATE user_roles SET status=0,removed_at=CURRENT_TIMESTAMP,removed_by=@actorUserId,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId WHERE user_id=@UserId AND role_id=@previousRoleId AND status=1;",
                    new { target.UserId, previousRoleId, actorUserId }, transaction);
            }

            const string profileSql = """
                INSERT INTO staff_access_profiles(employee_profile_id,role_id,designation_id,access_scope,status,created_at,created_by,updated_at,updated_by)
                VALUES(@employeeProfileId,@RoleId,@DesignationId,@Scope,1,CURRENT_TIMESTAMP,@actorUserId,CURRENT_TIMESTAMP,@actorUserId)
                ON DUPLICATE KEY UPDATE role_id=VALUES(role_id),designation_id=VALUES(designation_id),access_scope=VALUES(access_scope),status=1,updated_at=CURRENT_TIMESTAMP,updated_by=VALUES(updated_by);
                """;
            await connection.ExecuteAsync(profileSql, new { employeeProfileId, request.RoleId, request.DesignationId, Scope=request.Scope, actorUserId }, transaction);

            const string roleSql = """
                INSERT INTO user_roles(user_id,role_id,status,assigned_at,assigned_by,updated_at,updated_by,removed_at,removed_by)
                VALUES(@UserId,@RoleId,1,CURRENT_TIMESTAMP,@actorUserId,CURRENT_TIMESTAMP,@actorUserId,NULL,NULL)
                ON DUPLICATE KEY UPDATE status=1,updated_at=CURRENT_TIMESTAMP,updated_by=VALUES(updated_by),removed_at=NULL,removed_by=NULL;
                """;
            await connection.ExecuteAsync(roleSql, new { target.UserId, request.RoleId, actorUserId }, transaction);

            await connection.ExecuteAsync(
                "UPDATE employee_profiles SET designation=@DesignationTitle,updated_at=CURRENT_TIMESTAMP,updated_by=@actorUserId WHERE employee_profile_id=@employeeProfileId;",
                new { target.DesignationTitle, actorUserId, employeeProfileId }, transaction);

            await transaction.CommitAsync();
            _logger.LogInformation("Staff access assigned. EmployeeProfileId={EmployeeProfileId}, RoleId={RoleId}, DesignationId={DesignationId}, Scope={Scope}, ActorUserId={ActorUserId}", employeeProfileId, request.RoleId, request.DesignationId, request.Scope, actorUserId);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        var rows = await GetStaffAssignmentsAsync(collegeId, null);
        return rows.FirstOrDefault(x => x.EmployeeProfileId == employeeProfileId);
    }

    private sealed class RolePermissionRow
    {
        public string ModuleKey { get; set; } = string.Empty;
        public bool CanView { get; set; }
        public bool CanCreate { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanExport { get; set; }
    }

    private sealed class StaffTargetRow
    {
        public long UserId { get; set; }
        public string DesignationTitle { get; set; } = string.Empty;
    }
}
