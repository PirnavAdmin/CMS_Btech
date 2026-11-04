using BTech.Data;
using BTech.DTOs.Faculty;
using BTech.Models;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services;

/// <summary>Exact contact discovery never authorizes linking; creation revalidates a selected user.</summary>
public sealed class FacultyAccountResolver(ApplicationDbContext context)
{
    public sealed record ContactMatches(long? EmailUserId, long? MobileUserId)
    {
        public bool Any => EmailUserId.HasValue || MobileUserId.HasValue;
        public string Code => (EmailUserId, MobileUserId) switch
        {
            (null, null) => "CONTACTS_AVAILABLE",
            (not null, null) => "USER_EMAIL_MATCH",
            (null, not null) => "USER_MOBILE_MATCH",
            _ when EmailUserId != MobileUserId => "USER_CONTACTS_DIFFERENT_ACCOUNTS",
            _ => "USER_SELECTION_REQUIRED"
        };
    }

    public async Task<ContactMatches> FindContactsAsync(string? email, string? mobile, CancellationToken ct)
    {
        // Include inactive/deleted/global/other-college accounts: uniqueness is global.
        // Only IDs are read here; canonical details are separately filtered by college.
        long? emailId = null, mobileId = null;
        if (!string.IsNullOrWhiteSpace(email))
            emailId = await context.Users.AsNoTracking().Where(u => u.Email == email.Trim().ToLowerInvariant())
                .Select(u => (long?)u.user_id).SingleOrDefaultAsync(ct);
        if (!string.IsNullOrWhiteSpace(mobile))
            mobileId = await context.Users.AsNoTracking().Where(u => u.Mobile == mobile.Trim())
                .Select(u => (long?)u.user_id).SingleOrDefaultAsync(ct);
        return new(emailId, mobileId);
    }

    public async Task<FacultyAccountLookupResponse> LookupAsync(long collegeId, string? email, string? mobile, CancellationToken ct)
    {
        var matches = await FindContactsAsync(email, mobile, ct);
        var ids = new[] { matches.EmailUserId, matches.MobileUserId }.OfType<long>().Distinct().ToArray();
        var users = await context.Users.AsNoTracking().Where(u => ids.Contains(u.user_id)
                && u.college_id == collegeId && u.DeletedAt == null)
            .OrderBy(u => u.user_id)
            .Select(u => new { u.user_id, u.FullName, u.Email, u.Mobile, u.Status,
                Linked = context.Faculties.Any(f => f.UserId == u.user_id) }).ToListAsync(ct);
        var items = users.Select(u => new FacultyAccountCandidate(u.user_id, collegeId,
            u.FullName, u.Email, u.Mobile,
            matches.EmailUserId == u.user_id && matches.MobileUserId == u.user_id ? "email-and-mobile"
                : matches.EmailUserId == u.user_id ? "email-only" : "mobile-only",
            u.Status == 1 && !u.Linked && !string.IsNullOrWhiteSpace(u.Email) && !string.IsNullOrWhiteSpace(u.Mobile),
            u.Status != 1 ? "USER_INACTIVE" : u.Linked ? "FACULTY_USER_ALREADY_LINKED"
                : string.IsNullOrWhiteSpace(u.Email) || string.IsNullOrWhiteSpace(u.Mobile) ? "USER_CONTACTS_INCOMPLETE" : null)).ToArray();
        return new(matches.Code, !matches.Any && !string.IsNullOrWhiteSpace(email)
            && !string.IsNullOrWhiteSpace(mobile), ids.Length != items.Length || items.Any(i => !i.Selectable), items);
    }

    public static bool ContactsMatch(User user, string email, string mobile) =>
        string.Equals(user.Email?.Trim(), email.Trim(), StringComparison.OrdinalIgnoreCase)
        && string.Equals(user.Mobile?.Trim(), mobile.Trim(), StringComparison.Ordinal);

    public static string ConflictMessage(string code) => code switch
    {
        "USER_EMAIL_MATCH" => "The email is already used by an account, but the mobile does not match. Look up the account, explicitly select it and use its canonical contacts, or provide two unused contacts.",
        "USER_MOBILE_MATCH" => "The mobile is already used by an account, but the email does not match. Look up the account, explicitly select it and use its canonical contacts, or provide two unused contacts.",
        "USER_CONTACTS_DIFFERENT_ACCOUNTS" => "The email and mobile belong to different accounts. Look up and explicitly select the intended account, then submit both of its canonical contacts. Accounts cannot be merged through faculty creation.",
        _ => "An account already uses both contacts. Look it up and explicitly select its userId before creating the faculty record."
    };
}
