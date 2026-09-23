namespace BTech.DTOs.StudentPromotion
{
    public class EligibleStudentRequestDto
    {
        public long AcademicYearId { get; set; }

        public long? CourseId { get; set; }

        public long? BranchId { get; set; }

        public int? Semester { get; set; }

        public string? Search { get; set; }
    }
}
