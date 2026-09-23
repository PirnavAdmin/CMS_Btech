namespace BTech.DTOs.StudentPromotion
{
    public class FailedDetainedStudentRequestDto
    {
        public long AcademicYearId { get; set; }

        public long? CourseId { get; set; }

        public long? BranchId { get; set; }

        public int? Semester { get; set; }

        public string? Search { get; set; }
    }

    public class FailedDetainedStudentDto
    {
        public long PromotionId { get; set; }

        public long StudentId { get; set; }

        public string StudentCode { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public long CollegeId { get; set; }

        public long AcademicYearId { get; set; }

        public string AcademicYearName { get; set; } = string.Empty;

        public long? CourseId { get; set; }

        public string? CourseCode { get; set; }

        public string? CourseName { get; set; }

        public long? BranchId { get; set; }

        public string? BranchCode { get; set; }

        public string? BranchName { get; set; }

        public long? SectionId { get; set; }

        public string? SectionName { get; set; }

        public int? Semester { get; set; }

        public decimal? AttendancePercentage { get; set; }

        public decimal? TotalMarks { get; set; }

        public decimal? ObtainedMarks { get; set; }

        public decimal? MarksPercentage { get; set; }

        public int? PassedSubjects { get; set; }

        public int? FailedSubjects { get; set; }

        public int? BacklogCount { get; set; }

        public string? PromotionEligibility { get; set; }

        public string? PromotionType { get; set; }

        public string? EligibilityRemarks { get; set; }

        public string? Remarks { get; set; }

        public string Outcome { get; set; } = string.Empty;
    }
}