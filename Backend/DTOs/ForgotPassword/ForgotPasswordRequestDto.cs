using System.ComponentModel.DataAnnotations;
using System.Net.Mail;

namespace BTech.DTOs.ForgotPassword
{
    public class ForgotPasswordRequestDto : IValidatableObject
    {
        [Required(ErrorMessage = "Email is required.")]
        public string Identifier { get; set; } = string.Empty;

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var email = Identifier.Trim();
            if (email.Length > 150 ||
                !MailAddress.TryCreate(email, out var address) ||
                !string.Equals(email, address.Address, StringComparison.Ordinal))
            {
                yield return new ValidationResult("Enter a valid email address.", new[] { nameof(Identifier) });
            }
        }
    }
}
