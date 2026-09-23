using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    public class Semester
    {
        public long SemesterId { get; set; }

        public long CourseId { get; set; }

        public long BranchId { get; set; }

        public long AcademicYearId { get; set; }

        public int SemesterNumber { get; set; }

        public int YearNumber { get; set; }

        public string SemesterName { get; set; } = string.Empty;

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public byte Status { get; set; } = 1;

        public byte IsArchived { get; set; } = 0;

        public DateTime CreatedAt { get; set; }

        public long? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }

        public Branch? Branch { get; set; }

        public Course? Course { get; set; }

        public AcademicYear? AcademicYear { get; set; }

        [NotMapped]
        public string? CourseName => Course?.CourseName;

        [NotMapped]
        public string? BranchName => Branch?.BranchName;

        [NotMapped]
        public string? AcademicYearName => AcademicYear?.AcademicYearName;
    }
}
