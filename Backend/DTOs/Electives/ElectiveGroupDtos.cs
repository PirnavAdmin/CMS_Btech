using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Electives
{
    public class CreateElectiveGroupDto
    {
        [Required]
        [StringLength(50)]
        public string GroupCode { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string GroupName { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long CourseId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long BranchId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long SemesterId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long AcademicYearId { get; set; }

        [Range(1, int.MaxValue)]
        public int MinSelections { get; set; } = 1;

        [Range(1, int.MaxValue)]
        public int MaxSelections { get; set; } = 1;
    }

    public class ElectiveGroupResponseDto
    {
        public long ElectiveGroupId { get; set; }

        public long CollegeId { get; set; }

        public string GroupCode { get; set; } = string.Empty;

        public string GroupName { get; set; } = string.Empty;

        public string? Description { get; set; }

        public long CourseId { get; set; }

        public string? CourseName { get; set; }

        public long BranchId { get; set; }

        public string? BranchName { get; set; }

        public long SemesterId { get; set; }

        public string? SemesterName { get; set; }

        public long AcademicYearId { get; set; }

        public string? AcademicYearName { get; set; }

        public int MinSelections { get; set; }

        public int MaxSelections { get; set; }

        public int SubjectCount { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }

    public class ElectiveGroupListRequestDto
    {
        public long? CourseId { get; set; }

        public long? BranchId { get; set; }

        public long? SemesterId { get; set; }

        public long? AcademicYearId { get; set; }

        public byte? Status { get; set; }

        [StringLength(150)]
        public string? Search { get; set; }
    }

    public class AddElectiveGroupSubjectsDto
    {
        [Required]
        [MinLength(1)]
        public List<long> SubjectIds { get; set; } = new();
    }

    public class ElectiveGroupSubjectResponseDto
    {
        public long ElectiveGroupSubjectId { get; set; }

        public long ElectiveGroupId { get; set; }

        public long SubjectId { get; set; }

        public string? SubjectCode { get; set; }

        public string? SubjectName { get; set; }

        public decimal? Credits { get; set; }

        public int DisplayOrder { get; set; }

        public byte Status { get; set; }
    }
}