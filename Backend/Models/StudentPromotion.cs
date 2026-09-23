using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("student_promotions")]
    public class StudentPromotion
    {
        [Key]
        [Column("promotion_id")]
        public long PromotionId { get; set; }

        [Column("student_id")]
        public long StudentId { get; set; }

        [Column("from_branch_id")]
        public long BranchId { get; set; }

        [Column("from_academic_year_id")]
        public long AcademicYearId { get; set; }

        [Column("to_academic_year_id")]
        public long ToAcademicYearId { get; set; }

        [Column("from_course_id")]
        public long? FromCourseId { get; set; }

        [Column("to_course_id")]
        public long? ToCourseId { get; set; }

        [Column("to_branch_id")]
        public long? ToBranchId { get; set; }

        [Column("from_semester")]
        public int CurrentSemester { get; set; }

        [Column("from_semester_id")]
        public long? FromSemesterId { get; set; }

        [Column("to_semester")]
        public int NextSemester { get; set; }

        [Column("to_semester_id")]
        public long? ToSemesterId { get; set; }

        [Column("promotion_eligibility")]
        [MaxLength(30)]
        public string EligibilityStatus { get; set; } = "ELIGIBLE";

        [Column("promotion_status")]
        [MaxLength(30)]
        public string PromotionStatus { get; set; } = "PENDING";

        [Column("decision")]
        [MaxLength(30)]
        public string? Decision { get; set; }

        [Column("promotion_type")]
        [MaxLength(30)]
        public string? PromotionType { get; set; }

        [Column("promotion_date")]
        public DateTime? PromotionDate { get; set; }

        [Column("effective_date")]
        public DateTime? EffectiveDate { get; set; }

        [Column("remarks")]
        [MaxLength(500)]
        public string? Remarks { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

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

        // Navigation
        public Student? Student { get; set; }
        public Branch? Branch { get; set; }
        public AcademicYear? AcademicYear { get; set; }
    }
}
