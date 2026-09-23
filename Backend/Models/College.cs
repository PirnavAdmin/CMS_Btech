using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("colleges")]
    public class College
    {
        [Key]
        [Column("college_id")]
        public long CollegeId { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("college_code")]
        public string CollegeCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        [Column("college_name")]
        public string CollegeName { get; set; } = string.Empty;

        [MaxLength(50)]
        [Column("college_type")]
        public string? CollegeType { get; set; }

        [MaxLength(200)]
        [Column("university_name")]
        public string? UniversityName { get; set; }

        [MaxLength(150)]
        [Column("email")]
        public string? Email { get; set; }

        [MaxLength(20)]
        [Column("mobile")]
        public string? Mobile { get; set; }

        [MaxLength(20)]
        [Column("phone")]
        public string? Phone { get; set; }

        [MaxLength(200)]
        [Column("principal")]
        public string? Principal { get; set; }

        [MaxLength(150)]
        [Column("principal_email")]
        public string? PrincipalEmail { get; set; }

        [MaxLength(10)]
        [Column("principal_contact")]
        public string? PrincipalContact { get; set; }

        [MaxLength(10)]
        [Column("alternate_contact_number")]
        public string? AlternateContactNumber { get; set; }

        [MaxLength(30)]
        [Column("accreditation_status")]
        public string? AccreditationStatus { get; set; }

        [MaxLength(80)]
        [Column("accreditation_body")]
        public string? AccreditationBody { get; set; }

        [MaxLength(20)]
        [Column("accreditation_grade")]
        public string? AccreditationGrade { get; set; }

        [MaxLength(50)]
        [Column("accreditation_number")]
        public string? AccreditationNumber { get; set; }

        [Column("valid_from", TypeName = "date")]
        public DateOnly? ValidFrom { get; set; }

        [Column("valid_until", TypeName = "date")]
        public DateOnly? ValidUntil { get; set; }

        [MaxLength(255)]
        [Column("address_line1")]
        public string? AddressLine1 { get; set; }

        [MaxLength(255)]
        [Column("address_line2")]
        public string? AddressLine2 { get; set; }

        [MaxLength(100)]
        [Column("city")]
        public string? City { get; set; }

        [MaxLength(150)]
        [Column("area")]
        public string? Area { get; set; }

        [MaxLength(100)]
        [Column("district")]
        public string? District { get; set; }

        [MaxLength(100)]
        [Column("state")]
        public string? State { get; set; }

        [MaxLength(100)]
        [Column("country")]
        public string? Country { get; set; }

        [MaxLength(10)]
        [Column("pincode")]
        public string? Pincode { get; set; }

        [MaxLength(255)]
        [Column("website")]
        public string? Website { get; set; }

        [Column("academic_year_id")]
        public long? AcademicYearId { get; set; }

        [MaxLength(100)]
        [Column("timezone")]
        public string Timezone { get; set; } = "Asia/Kolkata";

        [MaxLength(10)]
        [Column("currency_code")]
        public string CurrencyCode { get; set; } = "INR";

        [MaxLength(500)]
        [Column("logo_path")]
        public string? LogoPath { get; set; }

        [Column("status")]
        public sbyte Status { get; set; } = 1;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("created_by")]
        public long? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public long? UpdatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        public long? DeletedBy { get; set; }
    }
}
