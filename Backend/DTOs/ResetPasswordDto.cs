using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs
{
    public sealed class ResetPasswordDto
    {
        [Required]
        public string Contact { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^[0-9]{6}$", ErrorMessage = "OTP must contain 6 digits.")]
        public string Otp { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string Password { get; set; } = string.Empty;
    }
}
