namespace BTech.DTOs.Department
{
    public class HodCandidateDto
    {
        public long EmployeeProfileId { get; set; }

        public long UserId { get; set; }

        public string EmployeeUserId { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public string? Designation { get; set; }
    }
}