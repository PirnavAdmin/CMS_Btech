using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("courses")]
    public class Course
    {
        [Key]
        [Column("course_id")]
        public long CourseId { get; set; }

        [Column("college_id")]
        public long CollegeId { get; set; }

        [Column("department_id")]
        public long? DepartmentId { get; set; }

        [Column("course_code")]
        [Required]
        public string CourseCode { get; set; } = string.Empty;

        [Column("course_name")]
        [Required]
        public string CourseName { get; set; } = string.Empty;

        [Column("course_short_name")]
        [MaxLength(50)]
        public string? CourseShortName { get; set; }

        [Column("course_type")]
        [MaxLength(50)]
        public string? CourseType { get; set; }

        [Column("duration_years")]
        public int DurationYears { get; set; }

        [Column("total_semesters")]
        public int TotalSemesters { get; set; }

        [Column("eligibility")]
        [MaxLength(255)]
        public string? Eligibility { get; set; }

        [Column("description")]
        public string? Description { get; set; }

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

        // Branch mapping
        public ICollection<Branch> Branches { get; set; }
            = new List<Branch>();

        [NotMapped]
        public string? CollegeName { get; set; }

        [NotMapped]
        public string? DepartmentName { get; set; }
    }
}
