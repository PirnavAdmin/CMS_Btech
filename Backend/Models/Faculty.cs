using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("faculty")]
    public class Faculty
    {
        [Key]
        [Column("faculty_id")]
        public long FacultyId { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("employee_profile_id")]
        public long? EmployeeProfileId { get; set; }

        [Column("college_id")]
        public long CollegeId { get; set; }

        [Column("department_id")]
        public long DepartmentId { get; set; }

        [Column("faculty_code")]
        public string FacultyCode { get; set; } = string.Empty;

        [Column("faculty_name")]
        public string FacultyName { get; set; } = string.Empty;

        [Column("designation")]
        public string? Designation { get; set; }

        [Column("qualification")]
        public string? Qualification { get; set; }

        [Column("specialization")]
        public string? Specialization { get; set; }

        [Column("experience_years")]
        public decimal ExperienceYears { get; set; }

        [Column("employment_type")]
        public string? EmploymentType { get; set; }

        [Column("date_of_joining")]
        public DateTime? DateOfJoining { get; set; }

        [Column("official_email")]
        public string? OfficialEmail { get; set; }

        [Column("mobile")]
        public string? Mobile { get; set; }

        [Column("is_hod")]
        public byte IsHod { get; set; }

        [Column("status")]
        public byte Status { get; set; }

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
    }
}