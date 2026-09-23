using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("academic_levels")]
    public class AcademicLevel
    {
        [Key]
        [Column("academic_level_id")]
        public long AcademicLevelId { get; set; }

        [Required]
        [Column("academic_year_id")]
        public long AcademicYearId { get; set; }

        [Required]
        [Column("level_type")]
        [MaxLength(20)]
        public string LevelType { get; set; } = string.Empty;

        [Required]
        [Column("level_name")]
        [MaxLength(100)]
        public string LevelName { get; set; } = string.Empty;

        [Required]
        [Column("level_number")]
        public int LevelNumber { get; set; }

        [Column("status")]
        public byte Status { get; set; } = 1;

        [Column("created_at")]
         
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("created_by")]
        public long? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public long? UpdatedBy { get; set; }
    }
}