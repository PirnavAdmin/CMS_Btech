namespace BTech.DTOs
{
    public class StudentProfileDto
    {
        public long UserId { get; set; }

        public string EmployeeUserId { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public long? CollegeId { get; set; }

        public string? CollegeName { get; set; }

        // Future Attendance Module
        public AttendanceSummaryDto AttendanceSummary { get; set; }
            = new AttendanceSummaryDto();
    }
}