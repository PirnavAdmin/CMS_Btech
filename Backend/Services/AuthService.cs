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
        private readonly BTech.UserAccess.UserAccessService _access;
        private readonly IUserRepository _userRepository;
        private readonly IEmployeeProfileRepository _employeeProfileRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly ILoginAuditRepository _loginAuditRepository;
        private readonly IJwtService _jwtService;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IOtpVerificationRepository _otpVerificationRepository;
        private readonly IEmailService _emailService;

        public AuthService(
            BTech.UserAccess.UserAccessService access,
            IUserRepository userRepository,
            IEmployeeProfileRepository employeeProfileRepository,
            IUserRoleRepository userRoleRepository,
            ILoginAuditRepository loginAuditRepository,
            IRefreshTokenRepository refreshTokenRepository,
            IJwtService jwtService,
            IOtpVerificationRepository otpVerificationRepository,
            IEmailService emailService)
        {
            _access = access;
            _userRepository = userRepository;
            _employeeProfileRepository = employeeProfileRepository;
            _userRoleRepository = userRoleRepository;
            _loginAuditRepository = loginAuditRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _jwtService = jwtService;
            _otpVerificationRepository = otpVerificationRepository;
            _emailService = emailService;
        }

        public async Task<(bool Success, string Message, LoginResponseDto? Data)>
            LoginAsync(
                LoginRequestDto request,
                string? ipAddress,
                string? userAgent)
        {
            var identifier = request.LoginId.Trim();

            User? user;
            try
            {
                user = await _userRepository.FindByLoginIdentifierAsync(identifier);
            }
            catch (InvalidOperationException ex) when (ex.Message == "AMBIGUOUS_LOGIN_IDENTIFIER")
            {
                await CreateAuditAsync(null, identifier, "FAILED", "Ambiguous login identifier", ipAddress, userAgent);
                return (false, "Invalid login credentials.", null);
            }

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
            bool passwordValid;
            try
            {
                passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            }
            catch (BCrypt.Net.SaltParseException)
            {
                // Legacy/demo hashes are malformed; fail closed without exposing hash details.
                passwordValid = false;
            }

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

            if (roles.Any(r => r.Equals("STUDENT", StringComparison.OrdinalIgnoreCase)) && !user.college_id.HasValue)
            {
                await CreateAuditAsync(user.user_id, identifier, "FAILED", "Missing college mapping", ipAddress, userAgent);
                return (false, "Student account is not fully configured. Contact the college administrator.", null);
            }

            // Recompute from saved employee data rather than trusting a stale
            // completion cache. Student onboarding keeps its existing behavior.
            if (EmployeeProfileCompletion.AppliesTo(roles))
            {
                var employeeProfile = await _employeeProfileRepository.GetByUserIdAsync(user.user_id);
                user.ProfileCompleted = employeeProfile is { Status: 1 } &&
                    EmployeeProfileCompletion.IsComplete(
                        user.FullName, user.Email, user.Mobile, employeeProfile.HouseNumber, roles);
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
                CollegeId = user.college_id,
                EmployeeUserId = user.InternalIdentifier ? string.Empty : user.EmployeeUserId,
                ProfileCompleted = user.ProfileCompleted,
                AcademicYearRestricted = user.AcademicYearRestricted,
                AssignedAcademicYearIds = await _access.AssignedYears(user.user_id),
                FullName = user.FullName,
                Email = user.Email,
                Mobile = user.Mobile,
                Roles = roles.Select(role => role.Equals("STUDENT", StringComparison.OrdinalIgnoreCase) ? "Student" : role).ToList(),
                MustChangePassword = user.MustChangePassword,

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

            // First-login temporary credentials cannot be renewed into a new session.
            if (user.MustChangePassword)
            {
                return (false, "Password change is required before refreshing tokens.", null);
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
            const string purpose = "PASSWORD_RESET";
            const string responseMessage = "If an account matches the provided email, a verification code will be emailed.";
            var identifier = request.Identifier.Trim();

            User? user;
            try
            {
                user = await _userRepository.FindByLoginIdentifierAsync(identifier);
            }
            catch (InvalidOperationException ex) when (ex.Message == "AMBIGUOUS_LOGIN_IDENTIFIER")
            {
                user = null;
            }

            var response = new ForgotPasswordResponseDto { Success = true, Message = responseMessage };
            if (user == null || !string.Equals(user.Email?.Trim(), identifier, StringComparison.OrdinalIgnoreCase))
            {
                await CreateAuditAsync(null, identifier, "FAILED",
                    "Forgot password requested for non-existent user", ipAddress, userAgent);
                return (true, responseMessage, response);
            }

            if (user.Status != 1 || user.DeletedAt != null)
            {
                await CreateAuditAsync(user.user_id, identifier, "FAILED",
                    "Forgot password requested for inactive user", ipAddress, userAgent);
                return (true, responseMessage, response);
            }

            var destination = user.Email!.Trim();
            await _otpVerificationRepository.InvalidatePreviousOtpsAsync(destination, purpose);

            var plainOtp = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            var now = DateTime.UtcNow;
            var otpRecord = new OtpVerification
            {
                UserId = user.user_id,
                Identifier = destination,
                OtpHash = BCrypt.Net.BCrypt.HashPassword(plainOtp),
                OtpType = purpose,
                DeliveryMethod = "EMAIL",
                ExpiresAt = now.AddMinutes(OtpVerification.PasswordResetExpiryMinutes),
                Attempts = 0,
                MaxAttempts = 5,
                Status = 1,
                CreatedAt = now
            };

            await _otpVerificationRepository.CreateOtpAsync(otpRecord);

            try
            {
                await _emailService.SendOtpEmailAsync(destination, plainOtp, purpose);
            }
            catch (Exception)
            {
                await _otpVerificationRepository.InvalidateOtpAsync(otpRecord);
                await CreateAuditAsync(user.user_id, identifier, "FAILED",
                    "Password reset OTP email delivery failed", ipAddress, userAgent);
                return (false, "Unable to send the verification code. Please try again shortly.", null);
            }

            await CreateAuditAsync(user.user_id, identifier, "SUCCESS",
                "Password reset OTP generated", ipAddress, userAgent);
            return (true, responseMessage, response);
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
    }
}