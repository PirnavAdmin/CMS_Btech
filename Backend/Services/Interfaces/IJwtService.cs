using BTech.Models;

namespace BTech.Services.Interfaces
{
    public interface IJwtService
    {
        string GenerateToken(
            User user,
            List<string> roles);

        string GenerateRefreshToken();

        string HashRefreshToken(
            string refreshToken);

        int GetAccessTokenExpiryMinutes();

        int GetRefreshTokenExpiryDays();
    }
}