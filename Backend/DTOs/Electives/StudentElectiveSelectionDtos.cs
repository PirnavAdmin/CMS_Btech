using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Electives
{
    public class CreateStudentElectiveSelectionDto
    {
        [Required]
        [Range(1, long.MaxValue)]
        public long ElectiveGroupId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long SubjectId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long AcademicYearId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long SemesterId { get; set; }

        [StringLength(500)]
        public string? Remarks { get; set; }
    }

    public class StudentElectiveSelectionResponseDto
    {
        public long SelectionId { get; set; }

        public long StudentId { get; set; }

        public string? StudentCode { get; set; }

        public string? StudentName { get; set; }

        public long ElectiveGroupId { get; set; }

        public string? GroupCode { get; set; }

        public string? GroupName { get; set; }

        public long SubjectId { get; set; }

        public string? SubjectCode { get; set; }

        public string? SubjectName { get; set; }

        public decimal? Credits { get; set; }

        public long AcademicYearId { get; set; }

        public string? AcademicYearName { get; set; }

        public long SemesterId { get; set; }

        public string? SemesterName { get; set; }

        public string SelectionStatus { get; set; } = string.Empty;

        public DateTime? SelectedAt { get; set; }

        public string? Remarks { get; set; }
    }

    public class AvailableElectiveSubjectDto
    {
        public long SubjectId { get; set; }

        public string? SubjectCode { get; set; }

        public string? SubjectName { get; set; }

        public decimal? Credits { get; set; }

        public bool Selected { get; set; }

        public string? SelectionStatus { get; set; }
    }

    public class AvailableElectiveGroupDto
    {
        public long ElectiveGroupId { get; set; }

        public string? GroupCode { get; set; }

        public string? GroupName { get; set; }

        public string? Description { get; set; }

        public int MinSelections { get; set; }

        public int MaxSelections { get; set; }

        public List<AvailableElectiveSubjectDto> Subjects { get; set; } = new();
    }
}