using BTech.DTOs;
namespace BTech.Services.Interfaces
{
    public interface IChangePasswordService
    {
        Task<(bool Success, string Message)> ChangePasswordAsync(
            long userId,
            ChangePasswordRequestDto request);
    }
}