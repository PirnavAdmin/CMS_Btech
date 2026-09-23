namespace BTech.DTOs.Branch
{
    public class CreateBranchDto
    {
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
    }
}