using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Repositories;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
namespace BTech.Services


{
    public class ChangePasswordService : IChangePasswordService
    {
        private readonly IUserRepository _userRepository;

        public ChangePasswordService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(
            long userId,
            ChangePasswordRequestDto request)
        {
            if (request.NewPassword != request.ConfirmNewPassword)
            {
                return (
                    false,
                    "New password and confirm password do not match.");
            }

            var user = await _userRepository.GetByIdAsync(userId);

            if (user == null ||
                user.Status != 1 ||
                user.DeletedAt != null)
            {
                return (
                    false,
                    "User account is inactive or not found.");
            }

            if (!BCrypt.Net.BCrypt.Verify(
                    request.CurrentPassword,
                    user.PasswordHash))
            {
                return (
                    false,
                    "Current password is incorrect.");
            }

            if (BCrypt.Net.BCrypt.Verify(
                    request.NewPassword,
                    user.PasswordHash))
            {
                return (
                    false,
                    "New password must be different from current password.");
            }

            user.PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = userId;

            await _userRepository.UpdateAsync(user);

            return (
                true,
                "Password changed successfully.");
        }
    }
}