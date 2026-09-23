namespace BTech.DTOs.CourseStructure
{
    public class CourseStructureResponseDto
    {
        public long StructureId { get; set; }

        public long CourseId { get; set; }

        public string CourseCode { get; set; } = string.Empty;

        public string CourseName { get; set; } = string.Empty;

        public long? BranchId { get; set; }

        public string? BranchCode { get; set; }

        public string? BranchName { get; set; }

        public int YearNumber { get; set; }

        public int SemesterNumber { get; set; }

        public string? SemesterName { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }
    }
}