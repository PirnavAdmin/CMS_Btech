using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Electives
{
    public class ElectiveAllocationCreateDto
    {
        [StringLength(500)]
        public string? Remarks { get; set; }
    }

    public class ElectiveAllocationResponseDto
    {
        public long AllocationId { get; set; }
        public long? SelectionId { get; set; }

        public long StudentId { get; set; }
        public string? StudentCode { get; set; }
        public string? StudentName { get; set; }

        public long ElectiveGroupId { get; set; }
        public string? GroupCode { get; set; }
        public string? GroupName { get; set; }

        public long SubjectId { get; set; }
        public string? SubjectCode { get; set; }
        public string? SubjectName { get; set; }

        public long? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }

        public long? SemesterId { get; set; }
        public string? SemesterName { get; set; }

        public string AllocationStatus { get; set; } = string.Empty;

        public DateTime AllocatedAt { get; set; }

        public long? AllocatedBy { get; set; }

        public string? Remarks { get; set; }
    }

    public class ElectiveAllocationListRequestDto
    {
        public long? AcademicYearId { get; set; }

        public long? CourseId { get; set; }

        public long? BranchId { get; set; }

        public long? SemesterId { get; set; }

        public long? ElectiveGroupId { get; set; }

        public string? AllocationStatus { get; set; }

        [StringLength(150)]
        public string? Search { get; set; }
    }
}