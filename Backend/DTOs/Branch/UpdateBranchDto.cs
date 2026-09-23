using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Branch
{
    public class UpdateBranchDto
    {
        [Required]
        public long CourseId { get; set; }

        [Required]
        [MaxLength(50)]
        public string BranchCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string BranchName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? ShortName { get; set; }

        [MaxLength(150)]
        public string? Specialization { get; set; }

        public long? DepartmentId { get; set; }

        [MaxLength(50)]
        public string? BranchType { get; set; }

        public int? Duration { get; set; }

        public int? TotalSemesters { get; set; }

        public int? IntakeCapacity { get; set; }

        public long? StartingAcademicYearId { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        public byte Status { get; set; } = 1;
    }
}