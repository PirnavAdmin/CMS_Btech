using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.CourseSemesterMapping
{
    public class CreateCourseSemesterMappingDto
    {
        [Required]
        [Range(1, long.MaxValue)]
        public long CourseId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long SemesterId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long BranchId { get; set; }

        public long? CreatedBy { get; set; }
    }

    public class UpdateCourseSemesterMappingDto
    {
        [Required]
        [Range(1, long.MaxValue)]
        public long CourseId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long SemesterId { get; set; }

        [Required]
        [Range(1, long.MaxValue)]
        public long BranchId { get; set; }

        public long? UpdatedBy { get; set; }
    }

    public class CourseSemesterMappingStatusDto
    {
        [System.Text.Json.Serialization.JsonRequired]
        [Required]
        public byte Status { get; set; }
    }

    public class CourseSemesterMappingResponseDto
    {
        public long CourseSemesterMappingId { get; set; }

        public long CourseId { get; set; }

        public long SemesterId { get; set; }

        public long BranchId { get; set; }

        public CourseMappingCourseDto? Course { get; set; }

        public CourseMappingBranchDto? Branch { get; set; }

        public CourseMappingSemesterDto? Semester { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}

    public class CourseMappingCourseDto
    {
        public long CourseId { get; set; }
        public string CourseCode { get; set; } = string.Empty;
        public string CourseName { get; set; } = string.Empty;
    }

    public class CourseMappingBranchDto
    {
        public long BranchId { get; set; }
        public long CourseId { get; set; }
        public string BranchCode { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
    }

    public class CourseMappingSemesterDto
    {
        public long SemesterId { get; set; }
        public long CourseId { get; set; }
        public long BranchId { get; set; }
        public int SemesterNumber { get; set; }
        public int YearNumber { get; set; }
        public string SemesterName { get; set; } = string.Empty;
    }
