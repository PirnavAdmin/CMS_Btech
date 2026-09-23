using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.DemoRequest
{
    public class CreateDemoRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Mobile { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string InstitutionName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Role { get; set; } = string.Empty;

        public string? City { get; set; }

        public string? State { get; set; }

        public int? NumberOfStudents { get; set; }

        [Required]
        public bool AgreeToContact { get; set; }
    }
}