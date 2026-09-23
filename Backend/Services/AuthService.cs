using BCrypt.Net;
using BTech.DTOs;
using BTech.DTOs.ForgotPassword;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using System;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace BTech.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly ILoginAuditRepository _loginAuditRepository;
        private readonly IJwtService _jwtService;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IOtpVerificationRepository _otpVerificationRepository;

        public AuthService(
            IUserRepository userRepository,
            IUserRoleRepository userRoleRepository,
            ILoginAuditRepository loginAuditRepository,
            IRefreshTokenRepository refreshTokenRepository,
            IJwtService jwtService,
            IOtpVerificationRepository otpVerificationRepository)
        {
            _userRepository = userRepository;
            _userRoleRepository = userRoleRepository;
            _loginAuditRepository = loginAuditRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _jwtService = jwtService;
            _otpVerificationRepository = otpVerificationRepository;
        }

        public async Task<(bool Success, string Message, LoginResponseDto? Data)>
            LoginAsync(
                LoginRequestDto request,
                string? ipAddress,
                string? userAgent)
        {
            var identifier = request.LoginId.Trim();

            var user =
                await _userRepository
                    .FindByLoginIdentifierAsync(identifier);

            // User not found
            if (user == null)
            {
                await CreateAuditAsync(
                    null,
                    identifier,
                    "FAILED",
                    "User not found",
                    ipAddress,
                    userAgent);

                return (
                    false,
                    "Invalid login credentials.",
                    null);
            }

            // User inactive
            if (user.Status != 1 || user.DeletedAt != null)
            {
                await CreateAuditAsync(
                    user.user_id,
                    identifier,
                    "FAILED",
                    "User account is inactive.",
                    ipAddress,
                    userAgent);

                return (
                    false,
                    "User account is inactive.",
                    null);
            }

            // Password verification
            bool passwordValid = BCrypt.Net.BCrypt.Verify(
                request.Password,
                user.PasswordHash);

            if (!passwordValid)
            {
                await CreateAuditAsync(
                    user.user_id,
                    identifier,
                    "FAILED",
                    "Invalid password",
                    ipAddress,
                    userAgent);

                return (
                    false,
                    "Invalid login credentials.",
                    null);
            }

            // Get user roles
            var roles =
                await _userRoleRepository
                    .GetRoleCodesByUserIdAsync(user.user_id);

            if (roles.Count == 0)
            {
                await CreateAuditAsync(
                    user.user_id,
                    identifier,
                    "FAILED",
                    "No active role assigned.",
                    ipAddress,
                    userAgent);

                return (
                    false,
                    "User does not have an active role.",
                    null);
            }

            // Generate JWT Tokens
            var accessToken =
                _jwtService.GenerateToken(
                    user,
                    roles);

            var refreshToken =
                _jwtService.GenerateRefreshToken();

            var refreshTokenHash =
                _jwtService.HashRefreshToken(
                    refreshToken);

            var refreshTokenEntity =
                new RefreshToken
                {
                    UserId = user.user_id,
                    TokenHash = refreshTokenHash,
                    ExpiresAt =
                        DateTime.UtcNow.AddDays(
                            _jwtService.GetRefreshTokenExpiryDays()),
                    CreatedAt = DateTime.UtcNow,
                    CreatedByIp = ipAddress
                };

            await _refreshTokenRepository
                .CreateAsync(refreshTokenEntity);

            // Update last login
            await _userRepository
                .UpdateLastLoginAsync(user.user_id);

            // Login audit
            await CreateAuditAsync(
                user.user_id,
                identifier,
                "SUCCESS",
                null,
                ipAddress,
                userAgent);

            var accessTokenExpiresAt =
                DateTime.UtcNow.AddMinutes(
                    _jwtService.GetAccessTokenExpiryMinutes());

            var response = new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresIn =
                    _jwtService.GetAccessTokenExpiryMinutes() * 60,
                AccessTokenExpiresAt = accessTokenExpiresAt,
                UserId = user.user_id,
                EmployeeUserId = user.EmployeeUserId,
                FullName = user.FullName,
                Email = user.Email,
                Mobile = user.Mobile,
                Roles = roles,

                // ADDED - REMEMBER ME
                RememberMe = request.RememberMe
            };

            return (
                true,
                "Login successful.",
                response);
        }

        public async Task<(bool Success, string Message, RefreshTokenResponseDto? Data)>
            RefreshTokenAsync(
                string refreshToken,
                string? ipAddress)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                return (
                    false,
                    "Refresh token is required.",
                    null);
            }

            var tokenHash =
                _jwtService.HashRefreshToken(
                    refreshToken);

            var storedToken =
                await _refreshTokenRepository
                    .GetByTokenHashAsync(tokenHash);

            if (storedToken == null)
            {
                return (
                    false,
                    "Invalid refresh token.",
                    null);
            }

            // Already revoked
            if (storedToken.RevokedAt != null)
            {
                return (
                    false,
                    "Refresh token has been revoked.",
                    null);
            }

            // Expired
            if (storedToken.ExpiresAt <= DateTime.UtcNow)
            {
                return (
                    false,
                    "Refresh token has expired.",
                    null);
            }

            // Get user
            var user =
                await _userRepository
                    .GetByIdAsync(
                        storedToken.UserId);

            if (user == null ||
                user.Status != 1 ||
                user.DeletedAt != null)
            {
                return (
                    false,
                    "User account is inactive.",
                    null);
            }

            // Get current roles
            var roles =
                await _userRoleRepository
                    .GetRoleCodesByUserIdAsync(
                        user.user_id);

            if (roles.Count == 0)
            {
                return (
                    false,
                    "User does not have an active role.",
                    null);
            }

            // Generate NEW access token
            var newAccessToken =
                _jwtService.GenerateToken(
                    user,
                    roles);

            // Generate NEW refresh token
            var newRefreshToken =
                _jwtService.GenerateRefreshToken();

            var newRefreshTokenHash =
                _jwtService.HashRefreshToken(
                    newRefreshToken);

            // Revoke old refresh token
            await _refreshTokenRepository
                .RevokeAsync(
                    storedToken,
                    newRefreshTokenHash);

            // Store new refresh token
            var newRefreshTokenEntity =
                new RefreshToken
                {
                    UserId = user.user_id,
                    TokenHash = newRefreshTokenHash,
                    ExpiresAt =
                        DateTime.UtcNow.AddDays(
                            _jwtService.GetRefreshTokenExpiryDays()),
                    CreatedAt = DateTime.UtcNow,
                    CreatedByIp = ipAddress
                };

            await _refreshTokenRepository
                .CreateAsync(newRefreshTokenEntity);

            var expiresAt =
                DateTime.UtcNow.AddMinutes(
                    _jwtService.GetAccessTokenExpiryMinutes());

            return (
                true,
                "Token refreshed successfully.",
                new RefreshTokenResponseDto
                {
                    AccessToken = newAccessToken,
                    RefreshToken = newRefreshToken,
                    ExpiresIn =
                        _jwtService.GetAccessTokenExpiryMinutes() * 60,
                    AccessTokenExpiresAt = expiresAt
                });
        }

        public async Task<(bool Success, string Message, ForgotPasswordResponseDto? Data)>
            ForgotPasswordAsync(
                ForgotPasswordRequestDto request,
                string? ipAddress,
                string? userAgent)
        {
            var identifier = request.Identifier.Trim();

            var user = await _userRepository
                .FindByLoginIdentifierAsync(identifier);

            // Return generic message for non-existent users to avoid account enumeration
            if (user == null)
            {
                await CreateAuditAsync(
                    null,
                    identifier,
                    "FAILED",
                    "Forgot password requested for non-existent user",
                    ipAddress,
                    userAgent);

                return (
                    true,
                    "If an account matches the provided identifier, an OTP has been sent.",
                    new ForgotPasswordResponseDto
                    {
                        Success = true,
                        Message = "If an account matches the provided identifier, an OTP has been sent."
                    });
            }

            // Inactive / Deleted user check
            if (user.Status != 1 || user.DeletedAt != null)
            {
                await CreateAuditAsync(
                    user.user_id,
                    identifier,
                    "FAILED",
                    "Forgot password requested for inactive user",
                    ipAddress,
                    userAgent);

                return (
                    false,
                    "User account is inactive. Please contact administration.",
                    null);
            }

            var destination =
                !string.IsNullOrWhiteSpace(user.Email)
                    ? user.Email
                    : user.Mobile ?? identifier;

            var deliveryMethod =
                !string.IsNullOrWhiteSpace(user.Email)
                    ? "EMAIL"
                    : "SMS";

            // Invalidate any active previous OTPs
            await _otpVerificationRepository
                .InvalidatePreviousOtpsAsync(
                    destination,
                    "PASSWORD_RESET");

            // Generate secure 6-digit numeric OTP
            string plainOtp =
                RandomNumberGenerator
                    .GetInt32(100000, 1000000)
                    .ToString();

            string otpHash =
                BCrypt.Net.BCrypt.HashPassword(
                    plainOtp);

            var otpRecord = new OtpVerification
            {
                UserId = user.user_id,
                Identifier = destination,
                OtpHash = otpHash,
                OtpType = "PASSWORD_RESET",
                DeliveryMethod = deliveryMethod,
                ExpiresAt =
                    DateTime.UtcNow.AddMinutes(10),
                Attempts = 0,
                MaxAttempts = 5,
                Status = 1,
                CreatedAt = DateTime.UtcNow
            };

            await _otpVerificationRepository
                .CreateOtpAsync(otpRecord);

            // Audit the request
            await CreateAuditAsync(
                user.user_id,
                identifier,
                "SUCCESS",
                "Password reset OTP generated",
                ipAddress,
                userAgent);

            // Mask destination for security
            string maskedDestination =
                MaskIdentifier(destination);

            return (
                true,
                "Password reset OTP has been sent.",
                new ForgotPasswordResponseDto
                {
                    Success = true,
                    Message =
                        "Password reset OTP has been sent successfully.",
                    DeliveryDestination =
                        maskedDestination
                });
        }

        private async Task CreateAuditAsync(
            long? userId,
            string identifier,
            string status,
            string? failureReason,
            string? ipAddress,
            string? userAgent)
        {
            var audit = new LoginAudit
            {
                UserId = userId,
                LoginIdentifier = identifier,
                EventType = "LOGIN",
                LoginStatus = status,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                FailureReason = failureReason,
                LoginAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            await _loginAuditRepository
                .CreateAsync(audit);
        }

        private static string MaskIdentifier(
            string identifier)
        {
            if (string.IsNullOrWhiteSpace(identifier))
                return "configured contact";

            if (identifier.Contains('@'))
            {
                var parts =
                    identifier.Split('@');

                var name = parts[0];
                var domain = parts[1];

                if (name.Length <= 2)
                    return $"{name[0]}*@{domain}";

                return
                    $"{name[0]}" +
                    $"{new string('*', name.Length - 2)}" +
                    $"{name[^1]}@{domain}";
            }

            if (identifier.Length >= 6)
            {
                return
                    $"{identifier[..2]}******" +
                    $"{identifier[^2..]}";
            }

            return "****";
        }
    }
}