using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;

namespace BTech.Repositories
{
    public class LoginAuditRepository : ILoginAuditRepository
    {
        private readonly ApplicationDbContext _context;

        public LoginAuditRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task CreateAsync(LoginAudit audit)
        {
            _context.LoginAudits.Add(audit);

            await _context.SaveChangesAsync();
        }
    }
}