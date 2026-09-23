namespace BTech.DTOs.Sections
{
    public class SectionResponseDto
    {
        public long SectionId { get; set; }

        public long CollegeId { get; set; }
        public string? CollegeName { get; set; }

        public long AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }

        public long DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        public long CourseId { get; set; }
        public string? CourseName { get; set; }

        public long BranchId { get; set; }
        public string? BranchName { get; set; }

        public long SemesterId { get; set; }
        public string? SemesterName { get; set; }

        public string SectionCode { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;

        public int Capacity { get; set; }

        public int CurrentStrength { get; set; }

        public int AvailableSeats { get; set; }

        public long? FacultyAdvisorEmployeeProfileId { get; set; }
        public string? FacultyAdvisorName { get; set; }

        public string? Room { get; set; }

        public string? Shift { get; set; }

        public string? SectionType { get; set; }

        public bool Status { get; set; }

        public bool IsArchived { get; set; }
    }
}