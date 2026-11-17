using BTech.Models;

namespace BTech.Repositories.Interfaces;

public interface ISuperAdminCollegeRepository
{
    Task<(College College, long AdminUserId)> AddWithAdministratorAsync(
        College college, string adminName, string adminEmail, string passwordHash,
        string internalId, string invitationPlaceholderHash, string traceId);

    Task<(string Status, string Email, string CollegeName)?> ClaimWelcomeEmailAsync(
        long collegeId, string lease);

    Task<bool> FinishWelcomeEmailAsync(long collegeId, string lease, bool sent);
}
