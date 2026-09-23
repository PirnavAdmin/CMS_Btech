using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Department
{
    public class AddDepartmentDto
    {
        [Required]
        [MaxLength(100)]
        public string DepartmentName { get; set; } = string.Empty;

        [Required]
        [MinLength(2)]
        [MaxLength(50)]
        public string DepartmentCode { get; set; } = string.Empty;

        [Range(1, long.MaxValue)]
        public long CollegeId { get; set; }

        public long? HodUserId { get; set; }

        // ADDED
        public string? Description { get; set; }
    }

    public class EditDepartmentDto
    {
        [Required]
        [MaxLength(100)]
        public string DepartmentName { get; set; } = string.Empty;

        [Required]
        [MinLength(2)]
        [MaxLength(50)]
        public string DepartmentCode { get; set; } = string.Empty;

        [Range(1, long.MaxValue)]
        public long CollegeId { get; set; }

        public long? HodUserId { get; set; }

        // ADDED
        public string? Description { get; set; }
    }

    public class DepartmentStatusDto
    {
        [System.Text.Json.Serialization.JsonRequired]
        [Required]
        public byte Status { get; set; }
    }

    public class DepartmentResponseDto
    {
        public long DepartmentId { get; set; }

        public string DepartmentName { get; set; } = string.Empty;

        public string? DepartmentCode { get; set; }

        public long CollegeId { get; set; }

        public string? CollegeName { get; set; }

        public long? HodUserId { get; set; }

        // ADDED - HOD NAME
        public string? HodName { get; set; }

        // ADDED - DESCRIPTION
        public string? Description { get; set; }

        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}
