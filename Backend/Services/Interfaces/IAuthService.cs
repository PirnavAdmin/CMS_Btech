using BTech.DTOs;

namespace BTech.Services.Interfaces
{
    public interface IAuthService
    {
        Task<(bool Success,
              string Message,
              LoginResponseDto? Data)>
            LoginAsync(
                LoginRequestDto request,
                string? ipAddress,
                string? userAgent);

        Task<(bool Success,
              string Message,
              RefreshTokenResponseDto? Data)>
            RefreshTokenAsync(
                string refreshToken,
                string? ipAddress);
    }
}