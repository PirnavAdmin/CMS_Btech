using BTech.Data;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories
{
    public class UserRoleRepository : IUserRoleRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRoleRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<string>> GetRoleCodesByUserIdAsync(long userId)
        {
            var roles = await (
                from ur in _context.UserRoles.AsNoTracking()
                join r in _context.Roles.AsNoTracking()
                    on ur.RoleId equals r.Role_id
                where ur.UserId == userId
                      && ur.Status == 1
                      && r.Status == 1
                      && r.DeletedAt == null
                select r.RoleCode
            ).ToListAsync();

            return roles;
        }
    }
}