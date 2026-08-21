using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories
{
    public class RefreshTokenRepository
        : IRefreshTokenRepository
    {
        private readonly ApplicationDbContext _context;

        public RefreshTokenRepository(
            ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task CreateAsync(
            RefreshToken refreshToken)
        {
            _context.RefreshTokens.Add(refreshToken);

            await _context.SaveChangesAsync();
        }

        public async Task<RefreshToken?> GetByTokenHashAsync(
            string tokenHash)
        {
            return await _context.RefreshTokens
                .FirstOrDefaultAsync(x =>
                    x.TokenHash == tokenHash);
        }

        public async Task RevokeAsync(
            RefreshToken refreshToken,
            string? replacedByTokenHash = null)
        {
            refreshToken.RevokedAt =
                DateTime.UtcNow;

            refreshToken.ReplacedByTokenHash =
                replacedByTokenHash;

            await _context.SaveChangesAsync();
        }
    }
}