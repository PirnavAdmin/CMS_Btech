using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Sections
{
    public class UpdateSectionRequestDto
    {
        public string SectionCode { get; set; } = string.Empty;

        public string SectionName { get; set; } = string.Empty;

        public int Capacity { get; set; }

        public long? FacultyAdvisorEmployeeProfileId { get; set; }

        public string? Room { get; set; }

        public string? Shift { get; set; }

        public string? SectionType { get; set; }
    }
}
