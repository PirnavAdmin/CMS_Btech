namespace BTech.DTOs
{
    public class SemesterDto
    {
        public long CourseId { get; set; }

        public long BranchId { get; set; }

        public long AcademicYearId { get; set; }

        public string SemesterName { get; set; } = string.Empty;

        public int SemesterNumber { get; set; }

        public int YearNumber { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public byte Status { get; set; } = 1;

        public long? CreatedBy { get; set; }
    }
}
