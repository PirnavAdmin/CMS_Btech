using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Faculty
{
    public class FacultyCreateDto
    {
        [Required]
        public long UserId { get; set; }

        public long? EmployeeProfileId { get; set; }

        [Required]
        public long CollegeId { get; set; }

        [Required]
        public long DepartmentId { get; set; }

        [Required]
        public string FacultyCode { get; set; } = string.Empty;

        [Required]
        public string FacultyName { get; set; } = string.Empty;

        public string? Designation { get; set; }

        public string? Qualification { get; set; }

        public string? Specialization { get; set; }

        public decimal ExperienceYears { get; set; }

        [Required]
        public string EmploymentType { get; set; } = "FULL_TIME";

        public DateTime? DateOfJoining { get; set; }

        [Required]
        [EmailAddress]
        public string OfficialEmail { get; set; } = string.Empty;

        [Required]
        public string Mobile { get; set; } = string.Empty;

        public byte IsHod { get; set; } = 0;

        public byte Status { get; set; } = 1;
    }
}