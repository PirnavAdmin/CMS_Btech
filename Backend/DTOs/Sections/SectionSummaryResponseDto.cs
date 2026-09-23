namespace BTech.DTOs.Sections
{
    public class SectionSummaryResponseDto
    {
        public int TotalSections { get; set; }

        public int ActiveSections { get; set; }

        public int TotalCapacity { get; set; }

        public int UnassignedAdvisors { get; set; }
    }
}