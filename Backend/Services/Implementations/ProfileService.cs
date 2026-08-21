using BTech.DTOs;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using System.Net.Mail;

namespace BTech.Services
{
    public class ProfileService : IProfileService
    {
        private readonly IUserRepository _userRepository;
        private readonly IUserRoleRepository _userRoleRepository;

        public ProfileService(
            IUserRepository userRepository,
            IUserRoleRepository userRoleRepository)
        {
            _userRepository = userRepository;
            _userRoleRepository = userRoleRepository;
        }

        // GET PROFILE
        public async Task<ProfileResponseDto?> GetProfileAsync(
            long userId)
        {
            var user =
                await _userRepository
                    .GetProfileByIdAsync(userId);

            if (user == null)
            {
                return null;
            }

            var roles =
                await _userRoleRepository
                    .GetRoleCodesByUserIdAsync(userId);

            return new ProfileResponseDto
            {
                UserId = user.user_id,

                EmployeeUserId =
                    user.EmployeeUserId,

                FullName =
                    user.FullName,

                Email =
                    user.Email,

                Mobile =
                    user.Mobile,

                Roles =
                    roles,

                LastLoginAt =
                    user.LastLoginAt
            };
        }

        // PATCH PROFILE
        public async Task<(
    bool Success,
    string Message,
    ProfileResponseDto? Data)>
    UpdateProfileAsync(
        long userId,
        UpdateProfileRequestDto request)
        {
            var user =
                await _userRepository
                    .GetProfileByIdAsync(userId);

            if (user == null)
            {
                return (
                    false,
                    "User profile not found.",
                    null);
            }

            string? fullName = null;
            string? email = null;
            string? mobile = null;

            // FullName
            if (request.FullName != null)
            {
                fullName = request.FullName.Trim();

                if (string.IsNullOrWhiteSpace(fullName))
                {
                    return (
                        false,
                        "Full name cannot be empty.",
                        null);
                }
            }

            // Email
            if (request.Email != null)
            {
                email = request.Email.Trim();

                if (string.IsNullOrWhiteSpace(email))
                {
                    return (
                        false,
                        "Email cannot be empty.",
                        null);
                }

                try
                {
                    var mailAddress =
                        new MailAddress(email);

                    if (!mailAddress.Address.Equals(
                            email,
                            StringComparison.OrdinalIgnoreCase))
                    {
                        return (
                            false,
                            "Invalid email address.",
                            null);
                    }
                }
                catch (FormatException)
                {
                    return (
                        false,
                        "Invalid email address.",
                        null);
                }
            }

            // Mobile
            if (request.Mobile != null)
            {
                mobile = request.Mobile.Trim();

                if (string.IsNullOrWhiteSpace(mobile))
                {
                    return (
                        false,
                        "Mobile number cannot be empty.",
                        null);
                }
            }

            // At least one field
            if (fullName == null &&
                email == null &&
                mobile == null)
            {
                return (
                    false,
                    "At least one profile field is required to update.",
                    null);
            }

            // PATCH UPDATE
            var updated =
                await _userRepository
                    .UpdateProfileAsync(
                        userId,
                        fullName,
                        email,
                        mobile);

            if (!updated)
            {
                return (
                    false,
                    "Profile update failed.",
                    null);
            }

            var updatedProfile =
                await GetProfileAsync(userId);

            return (
                true,
                "Profile updated successfully.",
                updatedProfile);
        }
    }
}