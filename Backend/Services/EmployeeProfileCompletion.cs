using System.ComponentModel.DataAnnotations;
using System.Net.Mail;
using System.Text.RegularExpressions;

namespace BTech.Services;

/// <summary>Shared completion rule for employee My Profile and authentication.</summary>
public static class EmployeeProfileCompletion
{
    // Accept a ten-digit Indian mobile, optionally prefixed by +91, 91 or 0.
    private static readonly Regex IndianMobile = new(
        @"\A(?:\+91|91|0)?[6-9][0-9]{9}\z",
        RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));

    public static bool AppliesTo(IEnumerable<string> roles) =>
        !roles.Any(role => CanonicalRoleCode.Normalize(role) == "STUDENT");

    public static bool IsComplete(string? fullName, string? email, string? mobile, string? houseNumber) =>
        !string.IsNullOrWhiteSpace(fullName) &&
        IsValidEmail(email) &&
        mobile != null && IndianMobile.IsMatch(mobile.Trim()) &&
        !string.IsNullOrWhiteSpace(houseNumber);

    private static bool IsValidEmail(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var email = value.Trim();
        return new EmailAddressAttribute().IsValid(email) &&
            MailAddress.TryCreate(email, out var address) &&
            address.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
    }
}
