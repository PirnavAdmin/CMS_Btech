using BTech.DTOs;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using BCrypt.Net;

namespace BTech.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly ILoginAuditRepository _loginAuditRepository;
        private readonly IJwtService _jwtService;
        private readonly IRefreshTokenRepository _refreshTokenRepository;

        public AuthService(
    IUserRepository userRepository,
    IUserRoleRepository userRoleRepository,
    ILoginAuditRepository loginAuditRepository,
    IRefreshTokenRepository refreshTokenRepository,
    IJwtService jwtService)
        {
            _userRepository = userRepository;
            _userRoleRepository = userRoleRepository;
            _loginAuditRepository = loginAuditRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _jwtService = jwtService;
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
            //bool passwordValid = request.Password == user.PasswordHash;

            bool passwordValid = BCrypt.Net.BCrypt.Verify( request.Password, user.PasswordHash );

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

            // Generate JWT
            //var token =
            //    _jwtService.GenerateToken(
            //        user,
            //        roles);

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

                    TokenHash =
                        refreshTokenHash,

                    ExpiresAt =
                        DateTime.UtcNow.AddDays(
                            _jwtService.GetRefreshTokenExpiryDays()),

                    CreatedAt =
                        DateTime.UtcNow,

                    CreatedByIp =
                        ipAddress
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
                    _jwtService.GetAccessTokenExpiryMinutes()
                    * 60,

                AccessTokenExpiresAt =
                    accessTokenExpiresAt,

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
                    roles
            };

            return (
                true,
                "Login successful.",
                response);
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

        public async Task<(
    bool Success,
    string Message,
    RefreshTokenResponseDto? Data)>
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
            if (storedToken.ExpiresAt <=
                DateTime.UtcNow)
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
                    UserId =
                        user.user_id,

                    TokenHash =
                        newRefreshTokenHash,

                    ExpiresAt =
                        DateTime.UtcNow.AddDays(
                            _jwtService
                                .GetRefreshTokenExpiryDays()),

                    CreatedAt =
                        DateTime.UtcNow,

                    CreatedByIp =
                        ipAddress
                };

            await _refreshTokenRepository
                .CreateAsync(
                    newRefreshTokenEntity);

            var expiresAt =
                DateTime.UtcNow.AddMinutes(
                    _jwtService
                        .GetAccessTokenExpiryMinutes());

            return (
                true,
                "Token refreshed successfully.",
                new RefreshTokenResponseDto
                {
                    AccessToken =
                        newAccessToken,

                    RefreshToken =
                        newRefreshToken,

                    ExpiresIn =
                        _jwtService
                            .GetAccessTokenExpiryMinutes()
                        * 60,

                    AccessTokenExpiresAt =
                        expiresAt
                });
        }
    }
}