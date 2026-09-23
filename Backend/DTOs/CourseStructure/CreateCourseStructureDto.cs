using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.CourseStructure
{
    public class CreateCourseStructureDto
    {
        [Required]
        public long CourseId { get; set; }

        public long? BranchId { get; set; }

        [Required]
        public int YearNumber { get; set; }

        [Required]
        public int SemesterNumber { get; set; }

        public string? SemesterName { get; set; }
    }
}