using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.ForgotPassword
{
    public class ForgotPasswordRequestDto
    {
        [Required(ErrorMessage = "Identifier (Email or Employee ID) is required.")]
        public string Identifier { get; set; } = string.Empty;
    }
}
