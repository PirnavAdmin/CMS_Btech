using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Electives
{
    public class ElectiveApprovalRequestDto
    {
        [Required]
        [RegularExpression(
            "^(APPROVED|REJECTED)$",
            ErrorMessage = "ApprovalStatus must be APPROVED or REJECTED.")]
        public string ApprovalStatus { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Remarks { get; set; }
    }

    public class ElectiveApprovalResponseDto
    {
        public long ApprovalId { get; set; }

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

        public long FacultyId { get; set; }

        public string? FacultyName { get; set; }

        public string ApprovalStatus { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public DateTime? ApprovedAt { get; set; }
    }

    public class ElectiveApprovalListRequestDto
    {
        public long? AcademicYearId { get; set; }

        public long? CourseId { get; set; }

        public long? BranchId { get; set; }

        public long? SemesterId { get; set; }

        public long? ElectiveGroupId { get; set; }

        public string? ApprovalStatus { get; set; }

        public string? Search { get; set; }
    }
}