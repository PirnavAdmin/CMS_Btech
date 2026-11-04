using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Faculty;

public sealed class FacultyAccountLookupRequest : IValidatableObject
{
    [Range(1, long.MaxValue)]
    public long? CollegeId { get; set; }

    [EmailAddress, StringLength(150)]
    public string? Email { get; set; }

    [StringLength(15)]
    public string? Mobile { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Email) && string.IsNullOrWhiteSpace(Mobile))
            yield return new ValidationResult("Provide a complete email or mobile number (or both).", [nameof(Email), nameof(Mobile)]);
    }
}

public sealed record FacultyAccountCandidate(long UserId, long CollegeId, string FullName,
    string? Email, string? Mobile, string MatchedBy, bool Selectable, string? UnavailableCode);

public sealed record FacultyAccountLookupResponse(string MatchCode, bool CanCreateNewAccount,
    bool HasUnavailableMatches, IReadOnlyList<FacultyAccountCandidate> Items);
