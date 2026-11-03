using BTech.Data;
using BTech.DTOs.AdminGovernance;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Repositories.Implementations;

public class RoleRepository : IRoleRepository
{
    private readonly ApplicationDbContext _context;
    private readonly string _connectionString;

    public RoleRepository(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
    }

    public async Task<List<Role>> GetAllAsync()
    {
        var roles = await _context.Roles.AsNoTracking().OrderBy(x => x.RoleName).ToListAsync();
        foreach (var role in roles) role.Permissions = await GetPermissionsAsync(role.Role_id);
        return roles;
    }

    public async Task<Role?> GetByIdAsync(long id)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(x => x.Role_id == id);
        if (role != null) role.Permissions = await GetPermissionsAsync(role.Role_id);
        return role;
    }

    public async Task<long> CreateAsync(string name, string code, string? description, byte status,
        Dictionary<string, PermissionActionsDto>? permissions, long? by)
    {
        var role = new Role
        {
            RoleName = name.Trim(), RoleCode = code.Trim().ToUpperInvariant(), Description = description,
            Status = status, CreatedAt = DateTime.UtcNow, CreatedBy = by
        };
        _context.Roles.Add(role);
        await _context.SaveChangesAsync();
        if (permissions != null) await ReplacePermissionsAsync(role.Role_id, permissions, by);
        return role.Role_id;
    }

    public async Task<bool> UpdateAsync(long id, string name, string code, string? description, byte status,
        Dictionary<string, PermissionActionsDto>? permissions, long? by)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(x => x.Role_id == id);
        if (role == null) return false;
        role.RoleName = name.Trim(); role.RoleCode = code.Trim().ToUpperInvariant();
        role.Description = description; role.Status = status; role.UpdatedAt = DateTime.UtcNow; role.UpdatedBy = by;
        await _context.SaveChangesAsync();
        if (permissions != null) await ReplacePermissionsAsync(id, permissions, by);
        return true;
    }

    public async Task<bool> DeactivateAsync(long id, long? by)
    {
        var role = await _context.Roles.FirstOrDefaultAsync(x => x.Role_id == id);
        if (role == null) return false;
        role.Status = 0; role.UpdatedAt = DateTime.UtcNow; role.UpdatedBy = by;
        await _context.SaveChangesAsync(); return true;
    }

    private async Task<Dictionary<string, PermissionActionsDto>> GetPermissionsAsync(long roleId)
    {
        const string sql = """
            SELECT module_key AS ModuleKey, can_view AS CanView, can_create AS CanCreate,
                   can_edit AS CanEdit, can_delete AS CanDelete, can_export AS CanExport
            FROM role_permissions WHERE role_id=@roleId AND college_id IS NULL ORDER BY module_key;
            """;
        await using var connection = new MySqlConnection(_connectionString);
        var rows = await connection.QueryAsync<PermissionRow>(sql, new { roleId });
        return rows.ToDictionary(x => x.ModuleKey, x => new PermissionActionsDto
        { View=x.CanView==1, Create=x.CanCreate==1, Edit=x.CanEdit==1, Delete=x.CanDelete==1, Export=x.CanExport==1 }, StringComparer.OrdinalIgnoreCase);
    }

    private async Task ReplacePermissionsAsync(long roleId, IReadOnlyDictionary<string, PermissionActionsDto> permissions, long? actorUserId)
    {
        await using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            await connection.ExecuteAsync("DELETE FROM role_permissions WHERE role_id=@roleId AND college_id IS NULL;", new { roleId }, transaction);
            const string insert = """
                INSERT INTO role_permissions(role_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export,created_at,created_by,updated_at,updated_by)
                VALUES(@roleId,NULL,@moduleKey,@View,@Create,@Edit,@Delete,@Export,CURRENT_TIMESTAMP,@actorUserId,CURRENT_TIMESTAMP,@actorUserId);
                """;
            foreach (var item in permissions)
                await connection.ExecuteAsync(insert, new { roleId, moduleKey=item.Key, item.Value.View, item.Value.Create, item.Value.Edit, item.Value.Delete, item.Value.Export, actorUserId }, transaction);
            await transaction.CommitAsync();
        }
        catch { await transaction.RollbackAsync(); throw; }
    }

    private sealed class PermissionRow
    {
        public string ModuleKey { get; set; } = string.Empty;
        public int CanView { get; set; }
        public int CanCreate { get; set; }
        public int CanEdit { get; set; }
        public int CanDelete { get; set; }
        public int CanExport { get; set; }
    }
}
