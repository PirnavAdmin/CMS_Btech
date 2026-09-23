using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs
{
    public class DepartmentCreateDto
    {
        [Required]
        public long CollegeId { get; set; }

        [Required]
        [MaxLength(50)]
        public string DepartmentCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string DepartmentName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public long? HodUserId { get; set; }

        public byte Status { get; set; } = 1;
    }
}