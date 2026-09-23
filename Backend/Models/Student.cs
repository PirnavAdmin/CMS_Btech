using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("students")]
    public sealed class Student
    {
        [Key]
        [Column("student_id")]
        public long StudentId { get; set; }

        [Column("admission_id")]
        public long? AdmissionId { get; set; }

        [Column("college_id")]
        public long CollegeId { get; set; }

        [Column("student_code")]
        [MaxLength(50)]
        public string StudentCode { get; set; } = string.Empty;

        [Column("full_name")]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Column("gender")]
        [MaxLength(20)]
        public string? Gender { get; set; }

        [Column("date_of_birth")]
        public DateTime? DateOfBirth { get; set; }

        [Column("email")]
        [MaxLength(150)]
        public string? Email { get; set; }

        [Column("mobile")]
        [MaxLength(20)]
        public string? Mobile { get; set; }

        [Column("blood_group")]
        [MaxLength(10)]
        public string? BloodGroup { get; set; }

        [Column("address")]
        [MaxLength(500)]
        public string? Address { get; set; }

        [Column("course_id")]
        public long? CourseId { get; set; }

        [Column("branch_id")]
        public long? BranchId { get; set; }

        [Column("academic_year_id")]
        public long AcademicYearId { get; set; }

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

        [NotMapped]
        public string? CollegeName { get; set; }

        [NotMapped]
        public string? CourseName { get; set; }

        [NotMapped]
        public string? BranchName { get; set; }

        [NotMapped]
        public string? AcademicYearName { get; set; }
    }

    public sealed class StudentReferenceValidation
    {
        public bool CollegeExists { get; set; }
        public bool AcademicYearExists { get; set; }
        public bool CourseExists { get; set; }
        public bool BranchExists { get; set; }
        public bool CourseBelongsToCollege { get; set; }
        public bool BranchBelongsToCourse { get; set; }
    }
}
