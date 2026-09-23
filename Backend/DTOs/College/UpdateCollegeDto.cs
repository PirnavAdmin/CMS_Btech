using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BTech.DTOs.College
{
    public class UpdateCollegeDto : IValidatableObject
    {
        [StringLength(50)]
        public string? CollegeCode { get; set; }

        [StringLength(50)]
        public string? Code { get; set; }

        [StringLength(200)]
        public string? CollegeName { get; set; }

        [StringLength(200)]
        public string? Name { get; set; }

        [StringLength(50)]
        public string? CollegeType { get; set; }

        [StringLength(50)]
        public string? Type { get; set; }

        [StringLength(200)]
        public string? UniversityName { get; set; }

        [StringLength(200)]
        public string? University { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? Email { get; set; }

        [Phone]
        [StringLength(20)]
        public string? Mobile { get; set; }

        [StringLength(20)]
        public string? Contact { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(200)]
        public string? Principal { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? PrincipalEmail { get; set; }

        [RegularExpression(@"^\d{10}$",
            ErrorMessage = "Principal contact must contain exactly 10 digits.")]
        [StringLength(10)]
        public string? PrincipalContact { get; set; }

        [RegularExpression(@"^\d{10}$",
            ErrorMessage = "Alternate contact number must contain exactly 10 digits.")]
        [StringLength(10)]
        public string? AlternateContactNumber { get; set; }

        [RegularExpression(
            @"^(Accredited|Not Accredited|Under Review|Expired)$",
            ErrorMessage =
                "Accreditation status must be Accredited, Not Accredited, Under Review, or Expired.")]
        [StringLength(30)]
        public string? AccreditationStatus { get; set; }

        [StringLength(80)]
        public string? AccreditationBody { get; set; }

        [StringLength(20)]
        public string? AccreditationGrade { get; set; }

        [StringLength(50)]
        public string? AccreditationNumber { get; set; }

        public DateOnly? ValidFrom { get; set; }

        public DateOnly? ValidUntil { get; set; }

        [StringLength(255)]
        public string? AddressLine1 { get; set; }

        [StringLength(255)]
        public string? Address { get; set; }

        [StringLength(255)]
        public string? AddressLine2 { get; set; }

        [StringLength(100)]
        public string? City { get; set; }

        [StringLength(150)]
        public string? Area { get; set; }

        [StringLength(100)]
        public string? District { get; set; }

        [StringLength(100)]
        public string? State { get; set; }

        [StringLength(100)]
        public string? Country { get; set; }

        [StringLength(10)]
        public string? Pincode { get; set; }

        [Url]
        [StringLength(255)]
        public string? Website { get; set; }

        public long? AcademicYearId { get; set; }

        [StringLength(100)]
        public string? Timezone { get; set; }

        [StringLength(10)]
        public string? CurrencyCode { get; set; }

        [StringLength(500)]
        public string? LogoPath { get; set; }

        public string? Logo { get; set; }
        // Retained as a backward-compatible alias for older clients.
        public string? Accreditation { get; set; }

        [JsonIgnore]
        public string? EffectiveCollegeCode =>
            (CollegeCode ?? Code)?.Trim().ToUpperInvariant();

        [JsonIgnore]
        public string EffectiveCollegeName =>
            (CollegeName ?? Name ?? string.Empty).Trim();

        [JsonIgnore]
        public string? EffectiveCollegeType =>
            (CollegeType ?? Type)?.Trim();

        [JsonIgnore]
        public string? EffectiveUniversityName =>
            (UniversityName ?? University)?.Trim();

        [JsonIgnore]
        public string? EffectiveMobile =>
            (Mobile ?? Contact)?.Trim();

        [JsonIgnore]
        public string? EffectiveAddressLine1 =>
            (AddressLine1 ?? Address)?.Trim();

        [JsonIgnore]
        public string? EffectiveLogoPath
        {
            get
            {
                if (!string.IsNullOrWhiteSpace(LogoPath))
                    return LogoPath.Trim();

                if (string.IsNullOrWhiteSpace(Logo) ||
                    Logo.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ||
                    Logo.Length > 500)
                    return null;

                return Logo.Trim();
            }
        }

        public IEnumerable<ValidationResult> Validate(
            ValidationContext validationContext)
        {
            if (string.IsNullOrWhiteSpace(EffectiveCollegeName))
                yield return new ValidationResult(
                    "College name is required.",
                    new[] { nameof(CollegeName) });

            if (ValidFrom.HasValue &&
                ValidUntil.HasValue &&
                ValidUntil.Value < ValidFrom.Value)
            {
                yield return new ValidationResult(
                    "Valid until must be on or after valid from.",
                    new[] { nameof(ValidUntil), nameof(ValidFrom) });
            }
        }
    }
}
