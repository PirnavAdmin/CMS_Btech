using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Faculty
{
    public class FacultyCreateDto
    {
        [Range(0, long.MaxValue)]
        public long UserId { get; set; }

        public long? EmployeeProfileId { get; set; }

        [Required]
        public long CollegeId { get; set; }

        [Required]
        public long DepartmentId { get; set; }

        [Required]
        [StringLength(50)]
        public string FacultyCode { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string FacultyName { get; set; } = string.Empty;

        [StringLength(150)]
        public string? Designation { get; set; }

        [StringLength(200)]
        public string? Qualification { get; set; }

        [StringLength(250)]
        public string? Specialization { get; set; }

        [Range(0, 999.99)]
        public decimal ExperienceYears { get; set; }

        [Required]
        [StringLength(50)]
        public string EmploymentType { get; set; } = "FULL_TIME";

        public DateTime? DateOfJoining { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(150)]
        public string OfficialEmail { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        public string Mobile { get; set; } = string.Empty;

        [Range(0, 1)]
        public byte IsHod { get; set; } = 0;

        [Range(0, 1)]
        public byte Status { get; set; } = 1;
    }
}
