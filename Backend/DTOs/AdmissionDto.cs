namespace BTech.DTOs
{
    public class AdmissionDto
    {
        public long AdmissionId { get; set; }

        public string? RegistrationNo { get; set; }

        public DateTime? RegistrationDate { get; set; }

        public string? ApplicationNo { get; set; }

        public DateTime? ApplicationDate { get; set; }

        public string? AdmissionNo { get; set; }

        public DateTime? AdmissionDate { get; set; }

        public string? AdmissionType { get; set; }

        public string? AdmissionQuota { get; set; }

        public string? Medium { get; set; }

        public string? ScholarshipStatus { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string? LastName { get; set; }

        public string Gender { get; set; } = string.Empty;

        public DateTime DateOfBirth { get; set; }

        public string? Email { get; set; }

        public string? StudentEmail { get; set; }

        public string? MobileNumber { get; set; }

        public string? AadhaarNumber { get; set; }

        public string? Nationality { get; set; }

        public string? Category { get; set; }

        public string? FatherName { get; set; }

        public string? MotherName { get; set; }

        public string? GuardianName { get; set; }

        public string? Address { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? Pincode { get; set; }

        // Academic
        public long? BoardId { get; set; }

        public long? AcademicYearId { get; set; }

        public long? AcademicLevelId { get; set; }

        public long? GroupId { get; set; }

        public long? SectionId { get; set; }

        // Admission status
        public string? Status { get; set; }

        public string AdmissionStatus { get; set; } = "Draft";

        public bool IsVerified { get; set; }

        public bool IsApproved { get; set; }

        public bool IsRejected { get; set; }

        // Review
        public DateTime? SubmittedAt { get; set; }

        public DateTime? ReviewedAt { get; set; }

        public long? ReviewedBy { get; set; }

        // Approval
        public DateTime? ApprovedAt { get; set; }

        public long? ApprovedBy { get; set; }

        // Rejection
        public DateTime? RejectedAt { get; set; }

        public long? RejectedBy { get; set; }

        public string? RejectionReason { get; set; }

        // Documents
        public bool DocumentsVerified { get; set; }

        public long? DocumentsVerifiedBy { get; set; }

        public DateTime? DocumentsVerifiedAt { get; set; }

        // Remarks
        public string? Remarks { get; set; }

        // Audit
        public bool IsActive { get; set; }

        public bool IsDeleted { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Status history
        public List<AdmissionStatusHistoryDto> StatusHistory { get; set; } = [];
    }
}