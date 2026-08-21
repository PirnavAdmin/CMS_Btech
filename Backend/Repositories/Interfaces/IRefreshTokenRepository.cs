using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IRefreshTokenRepository
    {
        Task CreateAsync(RefreshToken refreshToken);

        Task<RefreshToken?> GetByTokenHashAsync(
            string tokenHash);

        Task RevokeAsync(
            RefreshToken refreshToken,
            string? replacedByTokenHash = null);
    }
}