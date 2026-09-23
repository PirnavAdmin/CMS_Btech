namespace BTech.Models
{
    public class Branch
    {
        public long BranchId { get; set; }

        public long CourseId { get; set; }

        public string BranchCode { get; set; } = string.Empty;

        public string BranchName { get; set; } = string.Empty;

        public string? ShortName { get; set; }

        public string? Specialization { get; set; }

        public long? DepartmentId { get; set; }

        public string? BranchType { get; set; }

        public int? Duration { get; set; }

        public int? TotalSemesters { get; set; }

        public int? IntakeCapacity { get; set; }

        public long? StartingAcademicYearId { get; set; }

        public string? Description { get; set; }

        public byte Status { get; set; } = 1;

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }

        public DateTime? DeletedAt { get; set; }

        public long? DeletedBy { get; set; }

        // Navigation properties

        public Course? Course { get; set; }

        public Department? Department { get; set; }

        public AcademicYear? StartingAcademicYear { get; set; }
    }
}