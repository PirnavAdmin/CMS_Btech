using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Sections
{
    public class CreateSectionRequestDto
    {
        public long CollegeId { get; set; }

        public long AcademicYearId { get; set; }

        public long DepartmentId { get; set; }

        public long CourseId { get; set; }

        public long BranchId { get; set; }

        public long SemesterId { get; set; }

        public string SectionCode { get; set; } = string.Empty;

        public string SectionName { get; set; } = string.Empty;

        public int Capacity { get; set; }

        public long? FacultyAdvisorEmployeeProfileId { get; set; }

        public string? Room { get; set; }

        public string? Shift { get; set; }

        public string? SectionType { get; set; }
    }
}