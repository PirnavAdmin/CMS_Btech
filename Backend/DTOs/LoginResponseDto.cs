namespace BTech.DTOs
{
    public class LoginResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;

        public string RefreshToken { get; set; } = string.Empty;

        public int ExpiresIn { get; set; }

        public DateTime AccessTokenExpiresAt { get; set; }

        public long UserId { get; set; }

        public string EmployeeUserId { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public List<string> Roles { get; set; } = new();
    }
}