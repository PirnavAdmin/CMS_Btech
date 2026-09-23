namespace BTech.DTOs.StudentProfileMain
{
    public class StudentProfileListDto
    {
        public long StudentId { get; set; }
        public string? StudentCode { get; set; }
        public string? StudentName { get; set; }
        public string? ProfilePhoto { get; set; }
        public decimal ProfileCompletionPercentage { get; set; }

        public string? RegistrationNumber { get; set; }
        public string? AdmissionNumber { get; set; }

        public long? CourseId { get; set; }
        public string? Course { get; set; }

        public long? BranchId { get; set; }
        public string? Branch { get; set; }

        public long? DepartmentId { get; set; }
        public string? Department { get; set; }

        public long? AcademicYearId { get; set; }
        public string? AcademicYear { get; set; }

        public int? Semester { get; set; }

        public long? SectionId { get; set; }
        public string? Section { get; set; }

        public string? Mobile { get; set; }
        public string? Email { get; set; }

        public string? Status { get; set; }
    }
}
