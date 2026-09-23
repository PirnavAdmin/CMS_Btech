
namespace BTech.DTOs.Faculty
{
    public class FacultyListItemDto
    {
        public long FacultyId { get; set; }

        public long UserId { get; set; }

        public long? EmployeeProfileId { get; set; }

        public long CollegeId { get; set; }

        public long DepartmentId { get; set; }

        public string FacultyCode { get; set; } = string.Empty;

        public string FacultyName { get; set; } = string.Empty;

        public string? Designation { get; set; }

        public string? Qualification { get; set; }

        public string? Specialization { get; set; }

        public decimal ExperienceYears { get; set; }

        public string? EmploymentType { get; set; }

        public DateTime? DateOfJoining { get; set; }

        public string? OfficialEmail { get; set; }

        public string? Mobile { get; set; }

        public byte IsHod { get; set; }

        public byte Status { get; set; }

        public string? EmployeeUserId { get; set; }

        public string? UserFullName { get; set; }

        public string? UserEmail { get; set; }

        public string? UserMobile { get; set; }

        public string? DepartmentCode { get; set; }

        public string? DepartmentName { get; set; }
    }
}