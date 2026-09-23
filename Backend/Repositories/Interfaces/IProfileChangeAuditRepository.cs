using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IProfileChangeAuditRepository
    {
        Task<long> CreateAsync(long userId, long changedBy, string changedInformationJson);
        Task<IReadOnlyList<ProfileChangeAudit>> GetByUserIdAsync(long userId);
    }
}
