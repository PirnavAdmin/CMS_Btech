namespace BTech.DTOs.Department
{
    public class HodResponseDto
    {
        public long DepartmentId { get; set; }

        public string DepartmentName { get; set; } = string.Empty;

        public long? HodEmployeeProfileId { get; set; }

        public long? UserId { get; set; }

        public string? EmployeeUserId { get; set; }

        public string? HodName { get; set; }

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public string? Designation { get; set; }
    }
}