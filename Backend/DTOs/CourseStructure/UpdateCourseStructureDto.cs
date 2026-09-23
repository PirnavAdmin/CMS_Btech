namespace BTech.DTOs.CourseStructure
{
    public class UpdateCourseStructureDto
    {
        public long CourseId { get; set; }

        public long? BranchId { get; set; }

        public int YearNumber { get; set; }

        public int SemesterNumber { get; set; }

        public string? SemesterName { get; set; }

        public byte Status { get; set; } = 1;
    }
}