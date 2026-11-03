using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs
{
    public sealed class CompleteAccountSetupRequestDto
    {
        [Required]
        [MaxLength(150)]
        public string LoginId { get; set; } = string.Empty;

        [Required]
        [MinLength(32)]
        [MaxLength(200)]
        public string Token { get; set; } = string.Empty;

        [Required]
        [MinLength(12)]
        [MaxLength(72)]
        public string NewPassword { get; set; } = string.Empty;

        [Required]
        [Compare(nameof(NewPassword), ErrorMessage = "New password and confirmation do not match.")]
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
