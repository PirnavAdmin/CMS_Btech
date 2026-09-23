namespace BTech.DTOs.AcademicYear
{
    public class AcademicYearDashboardDto
    {
        public AcademicYearResponseDto? ActiveAcademicYear { get; set; }
        public int TotalAcademicYears { get; set; }
        public int ActiveYears { get; set; }
        public int UpcomingYears { get; set; }
        public int ArchivedYears { get; set; }
        public IEnumerable<AcademicYearResponseDto> AcademicYears { get; set; } = Enumerable.Empty<AcademicYearResponseDto>();
    }
}
