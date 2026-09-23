namespace BTech.DTOs.StudentProfile
{
    public class StudentProfileDto
    {
        public long StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public string? BloodGroup { get; set; }

        public string? Address { get; set; }

        public long? CourseId { get; set; }

        public long? BranchId { get; set; }

        public long AcademicYearId { get; set; }

        // Future Fees Module integration point
        public FeeSummaryDto? FeeSummary { get; set; }
    }

    public class FeeSummaryDto
    {
        public decimal TotalFee { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal Discount { get; set; }

        public decimal Fine { get; set; }

        public decimal DueAmount { get; set; }
    }
}