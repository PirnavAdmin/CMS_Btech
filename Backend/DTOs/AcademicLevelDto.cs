using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs
{
    public class AcademicLevelDto
    {
        [Range(1, long.MaxValue)]
        public long AcademicYearId { get; set; }

        [Required]
        [StringLength(20, MinimumLength = 2)]
        public string LevelType { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string LevelName { get; set; } = string.Empty;

        [Range(1, 20)]
        public int LevelNumber { get; set; }

        [Range(0, 1)]
        public byte Status { get; set; } = 1;

        public long? CreatedBy { get; set; }
    }
} 
