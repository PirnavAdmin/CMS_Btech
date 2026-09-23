namespace BTech.DTOs.Faculty
{
    public class FacultyWorkloadResponseDto
    {
        public long FacultyId { get; set; }

        public string FacultyCode { get; set; }
            = string.Empty;

        public string FacultyName { get; set; }
            = string.Empty;

        public int TotalSubjects { get; set; }

        public int TotalSections { get; set; }

        public int TotalPeriodsPerWeek { get; set; }

        public decimal TotalHoursPerWeek { get; set; }

        public int ActiveAllocations { get; set; }
    }
}
