namespace BTech.DTOs
{
    public class ProfileResponseDto
    {
        public long UserId { get; set; }

        public string EmployeeUserId { get; set; }
            = string.Empty;

        public string FullName { get; set; }
            = string.Empty;

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public List<string> Roles { get; set; }
            = new();

        public DateTime? LastLoginAt { get; set; }
    }
}