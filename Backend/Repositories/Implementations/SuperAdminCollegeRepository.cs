using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using static BTech.Repositories.Implementations.CollegeRepository;

namespace BTech.Repositories.Implementations;

public sealed class SuperAdminCollegeRepository(
    ApplicationDbContext context, CollegeRepository collegeRepository) : ISuperAdminCollegeRepository
{
    public async Task<(College College, long AdminUserId)> AddWithAdministratorAsync(
        College college, string adminName, string adminEmail, string passwordHash,
        string internalId, string invitationPlaceholderHash, string traceId)
    {
        await using var transaction = await context.Database.BeginTransactionAsync();
        var created = await collegeRepository.ExecuteSingleAsync(
            "sp_College_Create", CollegeParameters(college, false))
            ?? throw new InvalidOperationException("College could not be created.");

        long adminUserId = 0;
        await collegeRepository.WithCommandAsync("sp_college_onboard_administrator", async command =>
        {
            AddParameter(command, "p_college_id", created.CollegeId);
            AddParameter(command, "p_actor_id", college.CreatedBy);
            AddParameter(command, "p_admin_name", adminName);
            AddParameter(command, "p_admin_email", adminEmail);
            AddParameter(command, "p_password_hash", passwordHash);
            AddParameter(command, "p_internal_id", internalId);
            AddParameter(command, "p_invitation_hash", invitationPlaceholderHash);
            AddParameter(command, "p_trace_id", traceId);
            adminUserId = Convert.ToInt64(await command.ExecuteScalarAsync());
        });
        if (adminUserId <= 0)
            throw new InvalidOperationException("College administrator could not be created.");

        await transaction.CommitAsync();
        return (created, adminUserId);
    }

    public async Task<(string Status, string Email, string CollegeName)?> ClaimWelcomeEmailAsync(
        long collegeId, string lease)
    {
        (string Status, string Email, string CollegeName)? notice = null;
        await collegeRepository.WithCommandAsync("sp_college_welcome_email_claim", async command =>
        {
            AddParameter(command, "p_college_id", collegeId);
            AddParameter(command, "p_lease", lease);
            await using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
                notice = (reader.GetString(0), reader.GetString(1), reader.GetString(2));
        });
        return notice;
    }

    public async Task<bool> FinishWelcomeEmailAsync(long collegeId, string lease, bool sent)
    {
        var updated = false;
        await collegeRepository.WithCommandAsync("sp_college_welcome_email_finish", async command =>
        {
            AddParameter(command, "p_college_id", collegeId);
            AddParameter(command, "p_lease", lease);
            AddParameter(command, "p_sent", sent);
            updated = Convert.ToInt32(await command.ExecuteScalarAsync()) == 1;
        });
        return updated;
    }
}
