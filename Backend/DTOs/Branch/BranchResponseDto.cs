namespace BTech.DTOs.Branch
{
    public class BranchResponseDto
    {
        public long BranchId { get; set; }

        public long CourseId { get; set; }

        public string CourseCode { get; set; } = string.Empty;

        public string CourseName { get; set; } = string.Empty;

        public string BranchCode { get; set; } = string.Empty;

        public string BranchName { get; set; } = string.Empty;

        public string? ShortName { get; set; }

        public string? Specialization { get; set; }

        public long? DepartmentId { get; set; }

        public string DepartmentName { get; set; } = string.Empty;

        public string? BranchType { get; set; }

        public int? Duration { get; set; }

        public int? TotalSemesters { get; set; }

        public int? IntakeCapacity { get; set; }

        public long? StartingAcademicYearId { get; set; }

        public string? StartingAcademicYear { get; set; }

        public string? Description { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }

        // Aliases used by the current Branch screen model.
        public long Id => BranchId;
        public string Code => BranchCode;
        public string Name => BranchName;
        public int? DurationValue => Duration;
        public int? Semesters => TotalSemesters;
        public int? Intake => IntakeCapacity;
    }
}
