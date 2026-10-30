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
        private const int TokenLifetimeHours = 24;

        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AccountSetupService> _logger;

        public AccountSetupService(
            ApplicationDbContext context,
            IEmailService emailService,
            IConfiguration configuration,
            ILogger<AccountSetupService> logger)
        {
            _context = context;
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendSetupLinkAsync(long userId, string accountType)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u =>
                u.user_id == userId && u.DeletedAt == null);

            if (user == null || user.Status != 1)
                throw new InvalidOperationException("Cannot issue setup link for a missing or inactive user.");

            if (!user.MustChangePassword)
                throw new InvalidOperationException("Account setup link is only available for accounts requiring an initial password setup.");

            if (string.IsNullOrWhiteSpace(user.Email))
                throw new InvalidOperationException("The account has no email address. Add a verified email before sending setup instructions.");

            var now = DateTime.UtcNow;
            var previous = await _context.OtpVerifications
                .Where(x => x.UserId == userId &&
                            x.OtpType == SetupTokenType &&
                            x.Status == 1)
                .ToListAsync();

            foreach (var item in previous)
                item.Status = 0;

            var tokenBytes = RandomNumberGenerator.GetBytes(32);
            var token = Convert.ToBase64String(tokenBytes)
                .TrimEnd('=').Replace('+', '-').Replace('/', '_');

            var tokenRecord = new OtpVerification
            {
                UserId = user.user_id,
                Identifier = user.EmployeeUserId,
                OtpHash = BCrypt.Net.BCrypt.HashPassword(token, workFactor: 12),
                OtpType = SetupTokenType,
                DeliveryMethod = "EMAIL",
                ExpiresAt = now.AddHours(TokenLifetimeHours),
                VerifiedAt = null,
                Attempts = 0,
                MaxAttempts = 5,
                Status = 1,
                CreatedAt = now
            };

            _context.OtpVerifications.Add(tokenRecord);
            await _context.SaveChangesAsync();

            var configuredBaseUrl =
                _configuration["PasswordSetup:BaseUrl"] ??
                _configuration["Frontend:BaseUrl"];

            if (string.IsNullOrWhiteSpace(configuredBaseUrl))
            {
                configuredBaseUrl = _configuration
                    .GetSection("Cors:AllowedOrigins")
                    .Get<string[]>()?
                    .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));
            }

            if (string.IsNullOrWhiteSpace(configuredBaseUrl))
                configuredBaseUrl = "http://localhost:5173";

            var setupUrl = configuredBaseUrl.TrimEnd('/') +
                "/activate-account?loginId=" + Uri.EscapeDataString(user.EmployeeUserId) +
                "&token=" + Uri.EscapeDataString(token);

            var safeName = System.Net.WebUtility.HtmlEncode(user.FullName);
            var safeType = System.Net.WebUtility.HtmlEncode(accountType);
            var safeLogin = System.Net.WebUtility.HtmlEncode(user.EmployeeUserId);
            var safeUrl = System.Net.WebUtility.HtmlEncode(setupUrl);

            var body = $@"<!doctype html>
<html><body style='font-family:Arial,sans-serif;color:#202124;line-height:1.6'>
  <p>Dear {safeName},</p>
  <p>Your {safeType} account is ready. Use the following login ID and create your own password.</p>
  <p><strong>Login ID:</strong> {safeLogin}</p>
  <p><a href='{safeUrl}' style='display:inline-block;padding:12px 22px;background:#185abc;color:#fff;text-decoration:none;border-radius:5px'>Set your password</a></p>
  <p>This single-use link expires in {TokenLifetimeHours} hours. After setting your password, sign in with your login ID (or registered email) and the password you created.</p>
  <p>If you were not expecting this message, contact your college administrator. Do not share this link.</p>
  <p>Regards,<br/>BTech College</p>
</body></html>";

            try
            {
                await _emailService.SendEmailAsync(
                    user.Email,
                    $"BTech College - {accountType} password setup",
                    body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Account setup email delivery failed. UserId={UserId}, AccountType={AccountType}",
                    user.user_id, accountType);
                throw;
            }
        }

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

            var normalizedLoginId = loginId.Trim();
            var now = DateTime.UtcNow;

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var user = await _context.Users.SingleOrDefaultAsync(u =>
                u.EmployeeUserId == normalizedLoginId &&
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

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 12);
            user.MustChangePassword = false;
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
