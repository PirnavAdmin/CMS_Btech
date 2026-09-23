using System;
using System.Threading.Tasks;
using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<User?> FindByLoginIdentifierAsync(string loginIdentifier)
        {
            loginIdentifier = loginIdentifier.Trim();

            return await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u =>
                    u.DeletedAt == null &&
                    (
                        u.EmployeeUserId == loginIdentifier ||
                        u.Email == loginIdentifier ||
                        u.Mobile == loginIdentifier
                    ));
        }

        public async Task UpdateLastLoginAsync(long userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.user_id == userId);

            if (user == null)
                return;

            user.LastLoginAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<User?> GetByIdAsync(long userId)
        {
            return await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u =>
                    u.user_id == userId &&
                    u.DeletedAt == null);
        }

        public async Task<User?> GetProfileByIdAsync(long userId)
        {
            return await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u =>
                    u.user_id == userId &&
                    u.DeletedAt == null);
        }

        public async Task<bool> UpdateProfileAsync(
            long userId,
            string? fullName,
            string? email,
            string? mobile)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.user_id == userId &&
                    u.DeletedAt == null);

            if (user == null)
            {
                return false;
            }

            // PATCH: Update only fields that were supplied
            if (fullName != null)
            {
                user.FullName = fullName.Trim();
            }

            if (email != null)
            {
                user.Email = email.Trim();
            }

            if (mobile != null)
            {
                user.Mobile = mobile.Trim();
            }

            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<User?> GetByIdentifierForUpdateAsync(string identifier)
        {
            identifier = identifier.Trim();

            return await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.DeletedAt == null &&
                    (
                        u.EmployeeUserId == identifier ||
                        u.Email == identifier ||
                        u.Mobile == identifier
                    ));
        }

        public async Task UpdateAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }
    }
}