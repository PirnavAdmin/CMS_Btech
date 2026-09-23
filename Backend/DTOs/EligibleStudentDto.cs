namespace BTech.DTOs.StudentPromotion
{
    public class EligibleStudentDto
    {
        public long StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string? StudentCode { get; set; }

        public string? RollNumber { get; set; }

        public string? RegistrationNumber { get; set; }

        public long? CourseId { get; set; }

        public string? CourseName { get; set; }

        public long BranchId { get; set; }

        public string? BranchName { get; set; }

        public long AcademicYearId { get; set; }

        public string? AcademicYearName { get; set; }

        public long? SectionId { get; set; }

        public string? SectionName { get; set; }

        public int CurrentSemester { get; set; }

        public int NextSemester { get; set; }

        public string EligibilityStatus { get; set; } = "Eligible";

        public string? PromotionStatus { get; set; }

        public bool ResultsAvailable { get; set; }

        public decimal? Sgpa { get; set; }

        public decimal? Cgpa { get; set; }

        public int? CreditsEarned { get; set; }

        public IReadOnlyList<object> FailedSubjects { get; set; }
            = Array.Empty<object>();

        public IReadOnlyList<string> PrerequisiteIssues { get; set; }
            = Array.Empty<string>();

        // Read-only aliases used by the current Student Promotion screen.
        public string Name => StudentName;
        public string? Course => CourseName;
        public string? Branch => BranchName;
        public string? Section => SectionName;
        public string? AcademicYear => AcademicYearName;
    }
}
