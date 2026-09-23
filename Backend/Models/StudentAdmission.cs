using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("studentadmissions")]
    public class StudentAdmission
    {
        // =========================================================
        // PRIMARY KEY
        // =========================================================

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("AdmissionId")]
        public long AdmissionId { get; set; }


        // =========================================================
        // REGISTRATION
        // =========================================================

        [Column("RegistrationNo")]
        [MaxLength(50)]
        public string? RegistrationNo { get; set; }

        [Column("RegistrationDate")]
        public DateTime? RegistrationDate { get; set; }


        // =========================================================
        // APPLICATION
        // =========================================================

        [Column("ApplicationNo")]
        [MaxLength(50)]
        public string? ApplicationNo { get; set; }

        [Column("ApplicationDate")]
        public DateTime? ApplicationDate { get; set; }


        // =========================================================
        // ADMISSION
        // =========================================================

        [Column("AdmissionNo")]
        [MaxLength(50)]
        public string? AdmissionNo { get; set; }

        [Column("AdmissionDate")]
        public DateTime? AdmissionDate { get; set; }

        [Column("AdmissionType")]
        [MaxLength(50)]
        public string? AdmissionType { get; set; }

        [Column("AdmissionQuota")]
        [MaxLength(100)]
        public string? AdmissionQuota { get; set; }

        [Column("Medium")]
        [MaxLength(50)]
        public string? Medium { get; set; }

        [Column("ScholarshipStatus")]
        [MaxLength(50)]
        public string? ScholarshipStatus { get; set; }


        // =========================================================
        // PERSONAL INFORMATION
        // =========================================================

        [Column("FirstName")]
        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Column("LastName")]
        [MaxLength(100)]
        public string? LastName { get; set; }

        [Column("Gender")]
        [Required]
        [MaxLength(20)]
        public string Gender { get; set; } = string.Empty;

        [Column("DateOfBirth")]
        [Required]
        public DateTime DateOfBirth { get; set; }

        [Column("BloodGroup")]
        [MaxLength(10)]
        public string? BloodGroup { get; set; }

        [Column("StudentPhoto")]
        [MaxLength(500)]
        public string? StudentPhoto { get; set; }

        [Column("Email")]
        [MaxLength(150)]
        public string? Email { get; set; }

        [Column("StudentEmail")]
        [MaxLength(150)]
        public string? StudentEmail { get; set; }

        [Column("MobileNumber")]
        [MaxLength(20)]
        public string? MobileNumber { get; set; }

        [Column("AadhaarNumber")]
        [MaxLength(20)]
        public string? AadhaarNumber { get; set; }

        [Column("Nationality")]
        [MaxLength(100)]
        public string? Nationality { get; set; }

        [Column("Religion")]
        [MaxLength(100)]
        public string? Religion { get; set; }

        [Column("Category")]
        [MaxLength(100)]
        public string? Category { get; set; }


        // =========================================================
        // PARENT / GUARDIAN
        // =========================================================

        [Column("FatherName")]
        [MaxLength(150)]
        public string? FatherName { get; set; }

        [Column("MotherName")]
        [MaxLength(150)]
        public string? MotherName { get; set; }

        [Column("GuardianName")]
        [MaxLength(150)]
        public string? GuardianName { get; set; }

        [Column("Occupation")]
        [MaxLength(150)]
        public string? Occupation { get; set; }

        [Column("AnnualIncome", TypeName = "decimal(15,2)")]
      
        public decimal? AnnualIncome { get; set; }
        [Column("MotherEmail")]
        [MaxLength(150)]
        public string? MotherEmail { get; set; }

        [Column("GuardianMobile")]
        [MaxLength(20)]
        public string? GuardianMobile { get; set; }

        [Column("GuardianEmail")]
        [MaxLength(150)]
        public string? GuardianEmail { get; set; }


        // =========================================================
        // ADDRESS
        // =========================================================

        [Column("Address")]
        public string? Address { get; set; }

        [Column("City")]
        [MaxLength(100)]
        public string? City { get; set; }

        [Column("District")]
        [MaxLength(100)]
        public string? District { get; set; }

        [Column("State")]
        [MaxLength(100)]
        public string? State { get; set; }

        [Column("Pincode")]
        [MaxLength(10)]
        public string? Pincode { get; set; }


        // =========================================================
        // ACADEMIC
        // =========================================================

        [Column("BoardId")]
        public long? BoardId { get; set; }

        [Column("AcademicYearId")]
        public long? AcademicYearId { get; set; }

        [Column("AcademicLevelId")]
        public long? AcademicLevelId { get; set; }

        [Column("GroupId")]
        public long? GroupId { get; set; }

        [Column("SectionId")]
        public long? SectionId { get; set; }

        [Column("SecondLanguage")]
        [MaxLength(100)]
        public string? SecondLanguage { get; set; }

        [Column("PreviousSchool")]
        [MaxLength(255)]
        public string? PreviousSchool { get; set; }

        [Column("PreviousBoard")]
        [MaxLength(150)]
        public string? PreviousBoard { get; set; }

        [Column("PreviousYear")]
        [MaxLength(20)]
        public string? PreviousYear { get; set; }

        [Column("PreviousPercentage", TypeName = "decimal(5,2)")]
        public decimal? PreviousPercentage { get; set; }
      

        [Column("PreviousHallTicket")]
        [MaxLength(100)]
        public string? PreviousHallTicket { get; set; }


        // =========================================================
        // DOCUMENTS
        // =========================================================

        [Column("BirthCertificate")]
        [MaxLength(500)]
        public string? BirthCertificate { get; set; }

        [Column("TransferCertificate")]
        [MaxLength(500)]
        public string? TransferCertificate { get; set; }

        [Column("StudyCertificate")]
        [MaxLength(500)]
        public string? StudyCertificate { get; set; }

        [Column("AadhaarDocument")]
        [MaxLength(500)]
        public string? AadhaarDocument { get; set; }

        [Column("CommunityCertificate")]
        [MaxLength(500)]
        public string? CommunityCertificate { get; set; }

        [Column("IncomeCertificate")]
        [MaxLength(500)]
        public string? IncomeCertificate { get; set; }

        [Column("PassportPhoto")]
        [MaxLength(500)]
        public string? PassportPhoto { get; set; }

        [Column("MarksMemo")]
        [MaxLength(500)]
        public string? MarksMemo { get; set; }

        [Column("CasteCertificate")]
        [MaxLength(500)]
        public string? CasteCertificate { get; set; }

        [Column("TenthCertificate")]
        [MaxLength(500)]
        public string? TenthCertificate { get; set; }


        // =========================================================
        // STATUS
        // =========================================================

        [Column("Status")]
        [MaxLength(50)]
        public string? Status { get; set; }

        [Column("AdmissionStatus")]
        [Required]
        [MaxLength(50)]
        public string AdmissionStatus { get; set; } = "Draft";


        // =========================================================
        // STATUS FLAGS
        // =========================================================

        [Column("IsVerified")]
        public bool IsVerified { get; set; }

        [Column("IsApproved")]
        public bool IsApproved { get; set; }

        [Column("IsRejected")]
        public bool IsRejected { get; set; }


        // =========================================================
        // LIFECYCLE DATES
        // =========================================================

        [Column("SubmittedAt")]
        public DateTime? SubmittedAt { get; set; }

        [Column("ReviewedAt")]
        public DateTime? ReviewedAt { get; set; }

        [Column("ApprovedAt")]
        public DateTime? ApprovedAt { get; set; }

        [Column("RejectedAt")]
        public DateTime? RejectedAt { get; set; }

        [Column("AdmittedAt")]
        public DateTime? AdmittedAt { get; set; }

        [Column("CancelledAt")]
        public DateTime? CancelledAt { get; set; }

        [Column("WithdrawnAt")]
        public DateTime? WithdrawnAt { get; set; }


        // =========================================================
        // USERS / AUDIT USERS
        // =========================================================

        [Column("ReviewedBy")]
        public long? ReviewedBy { get; set; }

        [Column("ApprovedBy")]
        public long? ApprovedBy { get; set; }

        [Column("RejectedBy")]
        public long? RejectedBy { get; set; }

        [Column("CancelledBy")]
        public long? CancelledBy { get; set; }


        // =========================================================
        // REASONS
        // =========================================================

        [Column("RejectionReason")]
        [MaxLength(500)]
        public string? RejectionReason { get; set; }

        [Column("CancellationReason")]
        [MaxLength(500)]
        public string? CancellationReason { get; set; }

        [Column("WithdrawalReason")]
        [MaxLength(500)]
        public string? WithdrawalReason { get; set; }


        // =========================================================
        // DOCUMENT VERIFICATION
        // =========================================================

        [Column("DocumentsVerified")]
        public bool DocumentsVerified { get; set; }

        [Column("DocumentsVerifiedBy")]
        public long? DocumentsVerifiedBy { get; set; }

        [Column("DocumentsVerifiedAt")]
        public DateTime? DocumentsVerifiedAt { get; set; }


        // =========================================================
        // INTERVIEW
        // =========================================================

        [Column("InterviewRequired")]
        public bool InterviewRequired { get; set; }

        [Column("InterviewDate")]
        public DateTime? InterviewDate { get; set; }

        [Column("InterviewStatus")]
        [MaxLength(50)]
        public string InterviewStatus { get; set; } = "Not Required";

        [Column("InterviewRemarks")]
        public string? InterviewRemarks { get; set; }


        // =========================================================
        // OFFER
        // =========================================================

        [Column("OfferDate")]
        public DateTime? OfferDate { get; set; }

        [Column("OfferExpiryDate")]
        public DateTime? OfferExpiryDate { get; set; }

        [Column("OfferAcceptedAt")]
        public DateTime? OfferAcceptedAt { get; set; }


        // =========================================================
        // ADMISSION FEE
        // =========================================================

        [Column("AdmissionFeeAmount", TypeName = "decimal(12,2)")]
        public decimal AdmissionFeeAmount { get; set; }

        [Column("AdmissionFeePaid")]
        public bool AdmissionFeePaid { get; set; }

        [Column("AdmissionFeePaidAt")]
        public DateTime? AdmissionFeePaidAt { get; set; }


        // =========================================================
        // WAITLIST
        // =========================================================

        [Column("WaitlistNumber")]
        public int? WaitlistNumber { get; set; }

        [Column("WaitlistedAt")]
        public DateTime? WaitlistedAt { get; set; }


        // =========================================================
        // REMARKS
        // =========================================================

        [Column("Remarks")]
        public string? Remarks { get; set; }


        // =========================================================
        // ACTIVE / DELETE
        // =========================================================

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("IsDeleted")]
        public bool IsDeleted { get; set; } = false;


        // =========================================================
        // CREATED / UPDATED
        // =========================================================

        [Column("CreatedBy")]
        public long? CreatedBy { get; set; }

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }

        [Column("UpdatedBy")]
        public long? UpdatedBy { get; set; }

        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; }


        // =========================================================
        // DELETED
        // =========================================================

        [Column("DeletedBy")]
        public long? DeletedBy { get; set; }

        [Column("DeletedAt")]
        public DateTime? DeletedAt { get; set; }

        [NotMapped]
        public string? FrontendFormDataJson { get; set; }

        [NotMapped] public long? StudentId { get; set; }
        [NotMapped] public long? AdmissionCollegeId { get; set; }
        [NotMapped] public string? AdmissionCollegeName { get; set; }
        [NotMapped] public long? AdmissionDepartmentId { get; set; }
        [NotMapped] public string? AdmissionDepartmentName { get; set; }
        [NotMapped] public long? AdmissionCourseId { get; set; }
        [NotMapped] public string? AdmissionCourseName { get; set; }
        [NotMapped] public long? AdmissionBranchId { get; set; }
        [NotMapped] public string? AdmissionBranchName { get; set; }
        [NotMapped] public string? AcademicYearName { get; set; }
        [NotMapped] public long? SemesterId { get; set; }
        [NotMapped] public int? SemesterNumber { get; set; }
        [NotMapped] public string? SemesterName { get; set; }
        [NotMapped] public string? SectionName { get; set; }
        [NotMapped] public string? EntryType { get; set; }
        [NotMapped] public string? Regulation { get; set; }
        [NotMapped] public string? Batch { get; set; }


        // =========================================================
        // STATUS HISTORY
        // =========================================================

        public virtual ICollection<AdmissionStatusHistory> StatusHistory { get; set; }
            = new List<AdmissionStatusHistory>();
    }
}
