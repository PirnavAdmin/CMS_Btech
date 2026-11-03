namespace BTech.DTOs.FacultyManagement
{
    public class ShortageCalculationRequestDto
    {
        public long FacultyId { get; set; }

        public long AcademicYearId { get; set; }

        public long CourseId { get; set; }

        public long BranchId { get; set; }

        public long SemesterId { get; set; }

        public long SectionId { get; set; }

        public decimal RequiredPercentage { get; set; }
    }
}