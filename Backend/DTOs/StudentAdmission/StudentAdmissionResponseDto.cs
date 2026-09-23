using System.Text.Json;

namespace BTech.DTOs.StudentAdmission
{
    public class StudentAdmissionResponseDto
    {
        public long AdmissionId { get; set; }
        public long? StudentId { get; set; }
        public string? RegistrationNumber => RegistrationNo;
        public string? Mobile => MobileNumber;
        public string? Photo => StudentPhoto;
        public JsonElement? CurrentAddress => FormField("currentAddress");
        public JsonElement? PermanentAddress => FormField("permanentAddress");
        public string? AlternateEmail => FormField("alternateEmail")?.ToString();
        public string? AlternateMobile => FormField("alternateMobile")?.ToString();
        public string? MiddleName => FormField("middleName")?.ToString();
        private JsonElement? FormField(string name) => FormData is { ValueKind: JsonValueKind.Object } root
            && root.TryGetProperty(name, out var value) ? value : null;
        private JsonElement? FormNestedField(string parent, string name) => FormData is { ValueKind: JsonValueKind.Object } root
            && root.TryGetProperty(parent, out var p) && p.ValueKind == JsonValueKind.Object
            && p.TryGetProperty(name, out var value) ? value : null;

        public string? RegistrationNo { get; set; }

        public DateTime? RegistrationDate { get; set; }

        public string? ApplicationNo { get; set; }

        public DateTime? ApplicationDate { get; set; }

        public string? AdmissionNo { get; set; }

        public DateTime? AdmissionDate { get; set; }

        public string? AdmissionType { get; set; }

        public string? AdmissionQuota { get; set; }
        public string? Quota => AdmissionQuota;
        public string? QuotaOther => FormField("quotaOther")?.ToString() ?? FormNestedField("academic", "quotaOther")?.ToString();
        public string? EntryType { get; set; }
        public string? Regulation { get; set; }
        public string? Batch { get; set; }

        public string? Medium { get; set; }

        public string? ScholarshipStatus { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string? LastName { get; set; }

        public string Gender { get; set; } = string.Empty;

        public DateTime DateOfBirth { get; set; }

        public string? BloodGroup { get; set; }

        public string? StudentPhoto { get; set; }

        public string? Email { get; set; }

        public string? StudentEmail { get; set; }

        public string? MobileNumber { get; set; }

        public string? AadhaarNumber { get; set; }

        public string? Nationality { get; set; }

        public string? Religion { get; set; }

        public string? Category { get; set; }

        public string? FatherName { get; set; }

        public string? MotherName { get; set; }

        public string? GuardianName { get; set; }

        public string? Occupation { get; set; }

        public decimal? AnnualIncome { get; set; }

        public string? MotherEmail { get; set; }

        public string? GuardianMobile { get; set; }

        public string? GuardianEmail { get; set; }

        public string? Address { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? Pincode { get; set; }

        public long? BoardId { get; set; }

        public long? AcademicYearId { get; set; }

        public long? AcademicLevelId { get; set; }

        public long? GroupId { get; set; }

        public long? SectionId { get; set; }

        public long? CollegeId { get; set; }
        public string? CollegeName { get; set; }
        public long? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public long? CourseId { get; set; }
        public string? CourseName { get; set; }
        public long? BranchId { get; set; }
        public string? BranchName { get; set; }
        public string? AcademicYearName { get; set; }
        public long? SemesterId { get; set; }
        public int? SemesterNumber { get; set; }
        public string? SemesterName { get; set; }
        public string? SectionName { get; set; }

        public string? SecondLanguage { get; set; }

        public string? PreviousSchool { get; set; }

        public string? PreviousBoard { get; set; }

        public string? PreviousYear { get; set; }

        public decimal? PreviousPercentage { get; set; }

        public string? PreviousHallTicket { get; set; }

        public string? BirthCertificate { get; set; }

        public string? TransferCertificate { get; set; }

        public string? StudyCertificate { get; set; }

        public string? AadhaarDocument { get; set; }

        public string? CommunityCertificate { get; set; }

        public string? IncomeCertificate { get; set; }

        public string? PassportPhoto { get; set; }

        public string? MarksMemo { get; set; }

        public string? CasteCertificate { get; set; }

        public string? TenthCertificate { get; set; }

        public string? Status { get; set; }

        public string? AdmissionStatus { get; set; }

        public bool IsVerified { get; set; }
        public bool IsApproved { get; set; }
        public bool IsRejected { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? RejectedAt { get; set; }
        public DateTime? AdmittedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public DateTime? WithdrawnAt { get; set; }
        public long? ReviewedBy { get; set; }
        public long? ApprovedBy { get; set; }
        public long? RejectedBy { get; set; }
        public long? CancelledBy { get; set; }
        public string? RejectionReason { get; set; }
        public string? CancellationReason { get; set; }
        public string? WithdrawalReason { get; set; }
        public bool DocumentsVerified { get; set; }
        public long? DocumentsVerifiedBy { get; set; }
        public DateTime? DocumentsVerifiedAt { get; set; }

        public bool InterviewRequired { get; set; }
        public DateTime? InterviewDate { get; set; }
        public string? InterviewStatus { get; set; }
        public string? InterviewRemarks { get; set; }

        public DateTime? OfferDate { get; set; }
        public DateTime? OfferExpiryDate { get; set; }
        public DateTime? OfferAcceptedAt { get; set; }

        public decimal AdmissionFeeAmount { get; set; }
        public bool AdmissionFeePaid { get; set; }
        public DateTime? AdmissionFeePaidAt { get; set; }
        public int? WaitlistNumber { get; set; }
        public DateTime? WaitlistedAt { get; set; }

        public string? Remarks { get; set; }

        public bool IsActive { get; set; }

        public long? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public long? UpdatedBy { get; set; }
        public DateTime UpdatedAt { get; set; }

        public JsonElement? FormData { get; set; }
    }

    public sealed class StudentAdmissionPagedResponseDto
    {
        public IReadOnlyList<StudentAdmissionResponseDto> Items { get; set; }
            = Array.Empty<StudentAdmissionResponseDto>();
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public long TotalRecords { get; set; }
        public int TotalPages { get; set; }
    }
}
