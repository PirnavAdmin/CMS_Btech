using System.Security.Cryptography;
using System.Text;
using BTech.Data;
using BTech.Models;
using BTech.Services;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services.Implementations
{
    public sealed class AccountSetupService : IAccountSetupService
    {
        private const string SetupTokenType = "ACCOUNT_SETUP";
        private readonly ApplicationDbContext _context;
        private readonly BTech.Services.Invitations.AccountInvitationService _invitations;

        public AccountSetupService(ApplicationDbContext context,
            BTech.Services.Invitations.AccountInvitationService invitations)
        {
            _context = context;
            _invitations = invitations;
        }

        public Task SendSetupLinkAsync(long userId, string accountType) =>
            _invitations.SendAsync(userId, accountType);

        public Task SendPasswordResetLinkAsync(long userId, string accountType) =>
            _invitations.SendAsync(userId, accountType, reset: true);

        public async Task<(bool Success, string Message)> CompleteSetupAsync(
            string loginId,
            string token,
            string newPassword,
            string confirmNewPassword)
        {
            if (string.IsNullOrWhiteSpace(loginId) ||
                string.IsNullOrWhiteSpace(token) ||
                string.IsNullOrWhiteSpace(newPassword))
                return (false, "Login ID, setup token and new password are required.");

            if (!string.Equals(newPassword, confirmNewPassword, StringComparison.Ordinal))
                return (false, "New password and confirmation do not match.");

            if (newPassword.Length < 12)
                return (false, "Password must be at least 12 characters long.");

            if (Encoding.UTF8.GetByteCount(newPassword) > 72)
                return (false, "Password must not exceed 72 UTF-8 bytes.");

            if (token.StartsWith("ua_", StringComparison.Ordinal))
                return await _invitations.CompleteAsync(loginId, token, newPassword, confirmNewPassword);

            // Compatibility for previously issued legacy ACCOUNT_SETUP OTP links.
            var normalizedLoginId = loginId.Trim();
            var now = DateTime.UtcNow;

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var user = await _context.Users.SingleOrDefaultAsync(u =>
                ((!u.InternalIdentifier && u.EmployeeUserId == normalizedLoginId) || u.Email == normalizedLoginId) &&
                u.DeletedAt == null);

            if (user == null || user.Status != 1)
                return (false, "Setup link is invalid or expired.");

            if (!user.MustChangePassword)
                return (false, "This account has already completed password setup. Use the regular login or forgot-password flow.");

            var candidates = await _context.OtpVerifications
                .Where(x => x.UserId == user.user_id &&
                            x.Identifier == normalizedLoginId &&
                            x.OtpType == SetupTokenType &&
                            x.Status == 1 &&
                            x.VerifiedAt == null &&
                            x.ExpiresAt > now &&
                            x.Attempts < x.MaxAttempts)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            OtpVerification? matched = null;
            foreach (var candidate in candidates)
            {
                bool tokenMatches;
                try
                {
                    tokenMatches = BCrypt.Net.BCrypt.Verify(token, candidate.OtpHash);
                }
                catch (BCrypt.Net.SaltParseException)
                {
                    tokenMatches = false;
                }

                if (tokenMatches)
                {
                    matched = candidate;
                    break;
                }

                candidate.Attempts++;
                if (candidate.Attempts >= candidate.MaxAttempts)
                    candidate.Status = 0;
            }

            if (matched == null)
            {
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return (false, "Setup link is invalid or expired.");
            }

            var consumed = await _context.Database.ExecuteSqlInterpolatedAsync($"UPDATE otp_verifications SET status=0,verified_at={now} WHERE otp_verification_id={matched.OtpVerificationId} AND status=1 AND verified_at IS NULL AND expires_at>{now}");
            if (consumed != 1)
                return (false, "Setup link has already been used or expired.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 12);
            user.MustChangePassword = false;
            user.AccessVersion++;
            user.UpdatedAt = now;
            user.UpdatedBy = user.user_id;

            matched.VerifiedAt = now;
            matched.Status = 0;

            var otherTokens = await _context.OtpVerifications
                .Where(x => x.UserId == user.user_id &&
                            x.OtpType == SetupTokenType &&
                            x.Status == 1 &&
                            x.OtpVerificationId != matched.OtpVerificationId)
                .ToListAsync();

            foreach (var other in otherTokens)
                other.Status = 0;

            var activeRefreshTokens = await _context.RefreshTokens
                .Where(x => x.UserId == user.user_id && x.RevokedAt == null)
                .ToListAsync();

            foreach (var refreshToken in activeRefreshTokens)
                refreshToken.RevokedAt = now;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, "Password set successfully. You can now sign in with your new password.");
        }
    }
}
