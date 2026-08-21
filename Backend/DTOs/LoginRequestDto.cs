using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs
{
    public class LoginRequestDto
    {
        [Required]
        public string LoginId { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}