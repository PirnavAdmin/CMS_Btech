using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Integration
{
    public sealed class StudentDocumentUploadDto
    {
        [Required, StringLength(100)]
        public string DocumentType { get; set; } = string.Empty;

        [Required]
        public IFormFile? File { get; set; }
    }

    public sealed class StudentDocumentDetailDto
    {
        public long DocumentId { get; set; }
        public long StudentId { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string? FilePath { get; set; }
        public string? ContentType { get; set; }
        public long? FileSize { get; set; }
        public DateTime UploadedDate { get; set; }
        public string? DownloadUrl { get; set; }
    }

    public sealed class StudentDocumentDownloadDto
    {
        public Stream Content { get; set; } = Stream.Null;
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/octet-stream";
    }

    public sealed class AdmissionSubmissionDto
    {
        public long AdmissionId { get; set; }
        public string AdmissionStatus { get; set; } = string.Empty;
        public DateTime? SubmittedAt { get; set; }
    }

    public sealed class AdmissionFeeStructureRequestDto
    {
        [Range(0, double.MaxValue)] public decimal TuitionFee { get; set; }
        [Range(0, double.MaxValue)] public decimal AdmissionFee { get; set; }
        [Range(0, double.MaxValue)] public decimal HostelFee { get; set; }
        [Range(0, double.MaxValue)] public decimal TransportationFee { get; set; }
        [Range(0, double.MaxValue)] public decimal ScholarshipAmount { get; set; }
        [StringLength(50)] public string? PaymentPlan { get; set; }
        [StringLength(50)] public string? PaymentStatus { get; set; }
    }

    public sealed class AdmissionFeeComponentDto
    {
        public string ComponentCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public sealed class AdmissionFeeStructureDetailDto
    {
        public long AdmissionId { get; set; }
        public long? FeeStructureId { get; set; }
        public long? AcademicYearId { get; set; }
        public long? CourseId { get; set; }
        public long? DepartmentId { get; set; }
        public long? BranchId { get; set; }
        public long? SemesterId { get; set; }
        public string? AdmissionType { get; set; }
        public string? Quota { get; set; }
        public string? StudentCategory { get; set; }
        public DateTime? EffectiveDate { get; set; }
        public bool AcademicContextValid { get; set; }
        public string Source { get; set; } = string.Empty;
        public decimal TuitionFee { get; set; }
        public decimal AdmissionFee { get; set; }
        public decimal HostelFee { get; set; }
        public decimal TransportationFee { get; set; }
        public decimal ScholarshipAmount { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal TotalFee { get; set; }
        public decimal BalanceAmount { get; set; }
        public string PaymentPlan { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
        public List<AdmissionFeeComponentDto> FeeComponents { get; set; } = new();
    }

    public sealed class AdmissionFeeSummaryDto
    {
        public long AdmissionId { get; set; }
        public decimal TuitionFee { get; set; }
        public decimal AdmissionFee { get; set; }
        public decimal HostelFee { get; set; }
        public decimal TransportationFee { get; set; }
        public decimal ScholarshipAmount { get; set; }
        public decimal FirstYearTotal { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal BalanceAmount { get; set; }
        public string PaymentPlan { get; set; } = string.Empty;
        public string PaymentStatus { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
    }

    public sealed class PreviousEducationRecordDto
    {
        [StringLength(30)] public string QualificationLevel { get; set; } = string.Empty;
        [StringLength(100)] public string? Qualification { get; set; }
        [StringLength(150)] public string? BoardOrUniversity { get; set; }
        [StringLength(255)] public string? Institution { get; set; }
        [StringLength(50)] public string? RollNumber { get; set; }
        [StringLength(20)] public string? PassingYear { get; set; }
        [StringLength(100)] public string? Stream { get; set; }
        [Range(0, 100)] public decimal? Score { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public sealed class PreviousEducationUpdateDto
    {
        public PreviousEducationRecordDto? Tenth { get; set; }
        public PreviousEducationRecordDto? Intermediate { get; set; }
        public List<PreviousEducationRecordDto> Records { get; set; } = new();
    }

    public sealed class PromotionDashboardDto
    {
        public long TotalStudents { get; set; }
        public long PendingReview { get; set; }
        public long Eligible { get; set; }
        public long Promoted { get; set; }
        public long Rejected { get; set; }
        public long Failed { get; set; }
        public long Detained { get; set; }
        public long Backlogs { get; set; }
        public long PrerequisiteIssues { get; set; }
    }

    public sealed class PromotionDirectoryItemDto
    {
        public long StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? AdmissionNumber { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? DepartmentName { get; set; }
        public long? CourseId { get; set; }
        public string? CourseName { get; set; }
        public long? BranchId { get; set; }
        public string? BranchName { get; set; }
        public long AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public int? CurrentSemester { get; set; }
        public string? CurrentSemesterName { get; set; }
        public int? TargetSemester { get; set; }
        public string? TargetSemesterName { get; set; }
        public string? SectionName { get; set; }
        public decimal? CreditsEarned { get; set; }
        public decimal? Sgpa { get; set; }
        public decimal? Cgpa { get; set; }
        public int? FailedSubjectCount { get; set; }
        public int? PrerequisiteIssueCount { get; set; }
        public bool ResultsAvailable { get; set; }
        public string ExamIntegrationStatus { get; set; } = "PENDING_MODULE";
        public string PromotionStatus { get; set; } = "PENDING";
        public string EligibilityStatus { get; set; } = "PENDING_RESULTS";
    }

    public sealed class PromotionHistoryDirectoryItemDto
    {
        public long PromotionId { get; set; }
        public long StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string? RollNumber { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? AdmissionNumber { get; set; }
        public string? FromAcademicYearName { get; set; }
        public string? ToAcademicYearName { get; set; }
        public string? FromCourseName { get; set; }
        public string? ToCourseName { get; set; }
        public string? FromBranchName { get; set; }
        public string? ToBranchName { get; set; }
        public int? FromSemester { get; set; }
        public int? ToSemester { get; set; }
        public string PromotionStatus { get; set; } = string.Empty;
        public string? PromotionEligibility { get; set; }
        public decimal? Cgpa { get; set; }
        public decimal? CreditsEarned { get; set; }
        public string? PromotionMode { get; set; }
        public string? PromotedBy { get; set; }
        public DateTime? PromotionDate { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public sealed class IntegrationPageDto<T>
    {
        public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public long TotalRecords { get; set; }
        public int TotalPages { get; set; }
    }
}
