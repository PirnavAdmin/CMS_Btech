using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories.Implementations;

public class RoleRepository : IRoleRepository
{
    private readonly ApplicationDbContext _context;
    public RoleRepository(ApplicationDbContext context) => _context = context;
    public Task<List<Role>> GetAllAsync() => _context.Roles.AsNoTracking().OrderBy(x => x.RoleName).ToListAsync();
    public Task<Role?> GetByIdAsync(long id) => _context.Roles.FirstOrDefaultAsync(x => x.Role_id == id);
    public async Task<long> CreateAsync(string name, string code, string? description, long? by)
    {
        var role = new Role { RoleName = name, RoleCode = code, Description = description, Status = 1, CreatedAt = DateTime.UtcNow, CreatedBy = by };
        _context.Roles.Add(role); await _context.SaveChangesAsync(); return role.Role_id;
    }
    public async Task<bool> UpdateAsync(long id, string name, string code, string? description, long? by)
    {
        var role = await GetByIdAsync(id); if (role == null) return false;
        role.RoleName = name; role.RoleCode = code; role.Description = description; role.UpdatedAt = DateTime.UtcNow; role.UpdatedBy = by;
        await _context.SaveChangesAsync(); return true;
    }
    public async Task<bool> DeactivateAsync(long id, long? by)
    {
        var role = await GetByIdAsync(id); if (role == null) return false;
        role.Status = 0; role.UpdatedAt = DateTime.UtcNow; role.UpdatedBy = by; await _context.SaveChangesAsync(); return true;
    }
}
