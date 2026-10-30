using BTech.Data;
using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services
{
    public class ChangePasswordService : IChangePasswordService
    {
        private readonly ApplicationDbContext _context;

        public ChangePasswordService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(
            long userId,
            ChangePasswordRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
                return (false, "Current password and new password are required.");

            if (!string.Equals(request.NewPassword, request.ConfirmNewPassword, StringComparison.Ordinal))
                return (false, "New password and confirm password do not match.");

            if (request.NewPassword.Length < 12)
                return (false, "New password must be at least 12 characters long.");

            await using var transaction = await _context.Database.BeginTransactionAsync();
            var user = await _context.Users.SingleOrDefaultAsync(u =>
                u.user_id == userId && u.DeletedAt == null);
            if (user == null || user.Status != 1)
                return (false, "User account is inactive or not found.");

            bool currentPasswordValid;
            try
            {
                currentPasswordValid = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash);
            }
            catch (BCrypt.Net.SaltParseException)
            {
                currentPasswordValid = false;
            }
            if (!currentPasswordValid)
                return (false, "Current password is incorrect.");

            if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
                return (false, "New password must be different from current password.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
            user.MustChangePassword = false;
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = userId;

            var now = DateTime.UtcNow;
            var activeTokens = await _context.RefreshTokens
                .Where(t => t.UserId == userId && t.RevokedAt == null)
                .ToListAsync();
            foreach (var token in activeTokens)
                token.RevokedAt = now;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return (true, "Password changed successfully. All refresh sessions were revoked; log in again.");
        }
    }
}
