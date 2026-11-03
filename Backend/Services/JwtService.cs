using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Linq;

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

            // -------------------------------------------------
            // Validate College ID
            // -------------------------------------------------

            // RoleRepository returns role_code values (for example SUPER_ADMIN),
            // while older code checked only the display spelling "SuperAdmin".
            // Normalize punctuation/case so supported Super Admin spellings match.
            // This does not grant privileges to any other role.
            bool isSuperAdmin = roles.Any(role => CanonicalRoleCode.Normalize(role) == "SUPER_ADMIN");

            // Every role except SuperAdmin must have college_id
            if (!isSuperAdmin && !user.college_id.HasValue)
            {
                throw new InvalidOperationException(
                    "College ID is required for this user role.");
            }

            // -------------------------------------------------
            // Basic Claims
            // -------------------------------------------------

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
            user.EmployeeUserId),

        new Claim(
            "mustChangePassword",
            user.MustChangePassword ? "true" : "false")
    };

            // -------------------------------------------------
            // Email
            // -------------------------------------------------

            if (!string.IsNullOrWhiteSpace(user.Email))
            {
                claims.Add(
                    new Claim(
                        ClaimTypes.Email,
                        user.Email));
            }

            // -------------------------------------------------
            // College ID
            // -------------------------------------------------
            // SuperAdmin can manage multiple colleges,
            // therefore SuperAdmin does NOT get a fixed collegeId.
            //
            // Every other role MUST have collegeId.
            // -------------------------------------------------

            if (!isSuperAdmin)
            {
                claims.Add(
                    new Claim(
                        "collegeId",
                        user.college_id!.Value.ToString()));
            }

            // -------------------------------------------------
            // Roles
            // -------------------------------------------------

            foreach (var role in roles.Where(r => !string.IsNullOrWhiteSpace(r))
                                         .Distinct(StringComparer.OrdinalIgnoreCase))
            {
                // Preserve the database role code/name for compatibility.
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            // Emit the canonical code as well as legacy spellings for consumers.
            foreach (var code in roles.Select(CanonicalRoleCode.Normalize).Where(code => code.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (!roles.Any(role => string.Equals(role, code, StringComparison.OrdinalIgnoreCase)))
                    claims.Add(new Claim(ClaimTypes.Role, code));
            }

            // Add a canonical role claim for ASP.NET [Authorize(Roles = "SuperAdmin")]
            // policies when the database supplies SUPER_ADMIN or "Super Admin".
            // This is emitted only when the role repository actually returned
            // an active Super Admin role for this user.
            if (isSuperAdmin &&
                !roles.Any(r => string.Equals(
                    r,
                    "SuperAdmin",
                    StringComparison.OrdinalIgnoreCase)))
            {
                claims.Add(new Claim(ClaimTypes.Role, "SuperAdmin"));
            }

            // -------------------------------------------------
            // Create JWT
            // -------------------------------------------------

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