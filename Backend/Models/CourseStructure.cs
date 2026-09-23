using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("course_structures")]
    public class CourseStructure
    {
        [Key]
        [Column("structure_id")]
        public long StructureId { get; set; }

        [Column("course_id")]
        [Required]
        public long CourseId { get; set; }

        [Column("branch_id")]
        public long? BranchId { get; set; }

        [Column("year_number")]
        [Required]
        public int YearNumber { get; set; }

        [Column("semester_number")]
        [Required]
        public int SemesterNumber { get; set; }

        [Column("semester_name")]
        [MaxLength(100)]
        public string? SemesterName { get; set; }

        [Column("status")]
        public byte Status { get; set; } = 1;

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

        // =====================================================
        // Navigation Properties
        // =====================================================

        [ForeignKey(nameof(CourseId))]
        public Course? Course { get; set; }

        [ForeignKey(nameof(BranchId))]
        public Branch? Branch { get; set; }
    }
}