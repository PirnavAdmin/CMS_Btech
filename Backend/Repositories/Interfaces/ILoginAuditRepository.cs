using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface ILoginAuditRepository
    {
        Task CreateAsync(LoginAudit audit);
    }
}