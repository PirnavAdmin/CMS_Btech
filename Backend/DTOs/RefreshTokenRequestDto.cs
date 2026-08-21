using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs
{
    public class RefreshTokenRequestDto
    {
        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }
}