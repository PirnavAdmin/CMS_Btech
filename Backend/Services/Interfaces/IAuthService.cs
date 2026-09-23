using BTech.DTOs;
using BTech.DTOs.ForgotPassword;
using System.Threading.Tasks;

namespace BTech.Services.Interfaces
{
    public interface IAuthService
    {
        Task<(bool Success, string Message, LoginResponseDto? Data)> LoginAsync(
            LoginRequestDto request,
            string? ipAddress,
            string? userAgent);

        Task<(bool Success, string Message, RefreshTokenResponseDto? Data)> RefreshTokenAsync(
            string refreshToken,
            string? ipAddress);

        Task<(bool Success, string Message, ForgotPasswordResponseDto? Data)> ForgotPasswordAsync(
            ForgotPasswordRequestDto request,
            string? ipAddress,
            string? userAgent);
    }
}