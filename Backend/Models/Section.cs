namespace BTech.Models
{
    public class Section
    {
        public long SectionId { get; set; }

        public long CollegeId { get; set; }
        public long AcademicYearId { get; set; }

        public long DepartmentId { get; set; }
        public long CourseId { get; set; }
        public long BranchId { get; set; }
        public long SemesterId { get; set; }

        public string SectionCode { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;

        public long? FacultyAdvisorEmployeeProfileId { get; set; }

        public string? Room { get; set; }

        public string? Shift { get; set; }

        public string? SectionType { get; set; }

        public int Capacity { get; set; }

        public bool Status { get; set; }
        public bool IsArchived { get; set; }

        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }
}