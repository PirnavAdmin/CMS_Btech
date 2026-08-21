using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace BTech.Services
{
    public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;

        public JwtService(
            IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateToken(
            User user,
            List<string> roles)
        {
            var jwtKey =
                _configuration["Jwt:Key"];

            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException(
                    "JWT key is missing from configuration.");
            }

            var issuer =
                _configuration["Jwt:Issuer"];

            var audience =
                _configuration["Jwt:Audience"];

            var expiryMinutes =
                GetAccessTokenExpiryMinutes();

            var claims = new List<Claim>
            {
                new Claim(
                    JwtRegisteredClaimNames.Sub,
                    user.user_id.ToString()),

                new Claim(
                    ClaimTypes.NameIdentifier,
                    user.user_id.ToString()),

                new Claim(
                    ClaimTypes.Name,
                    user.FullName),

                new Claim(
                    "employeeUserId",
                    user.EmployeeUserId)
            };

            if (!string.IsNullOrWhiteSpace(user.Email))
            {
                claims.Add(
                    new Claim(
                        ClaimTypes.Email,
                        user.Email));
            }

            foreach (var role in roles)
            {
                claims.Add(
                    new Claim(
                        ClaimTypes.Role,
                        role));
            }

            var key =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtKey));

            var credentials =
                new SigningCredentials(
                    key,
                    SecurityAlgorithms.HmacSha256);

            var token =
                new JwtSecurityToken(
                    issuer: issuer,
                    audience: audience,
                    claims: claims,
                    expires:
                        DateTime.UtcNow.AddMinutes(
                            expiryMinutes),
                    signingCredentials:
                        credentials);

            return new JwtSecurityTokenHandler()
                .WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var randomBytes =
                RandomNumberGenerator.GetBytes(64);

            return Convert.ToBase64String(
                randomBytes);
        }

        public string HashRefreshToken(
            string refreshToken)
        {
            using var sha256 =
                SHA256.Create();

            var bytes =
                Encoding.UTF8.GetBytes(
                    refreshToken);

            var hash =
                sha256.ComputeHash(bytes);

            return Convert.ToBase64String(hash);
        }

        public int GetAccessTokenExpiryMinutes()
        {
            return int.TryParse(
                _configuration[
                    "Jwt:ExpiryMinutes"],
                out var minutes)
                    ? minutes
                    : 60;
        }

        public int GetRefreshTokenExpiryDays()
        {
            return int.TryParse(
                _configuration[
                    "Jwt:RefreshTokenExpiryDays"],
                out var days)
                    ? days
                    : 7;
        }
    }
}