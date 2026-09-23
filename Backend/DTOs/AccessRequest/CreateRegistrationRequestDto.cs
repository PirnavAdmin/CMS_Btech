using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.AccessRequest
{
    public class CreateRegistrationRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(15)]
        public string Mobile { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required]
        public bool AgreeToTerms { get; set; }
    }
}