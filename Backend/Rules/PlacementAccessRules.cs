namespace BTech.Rules;

// Roles come from active database assignments, never from unverified request values.
public static class PlacementAccessRules
{
    public static bool IsSuperAdmin(IEnumerable<string> roles) => Normalize(roles).Contains("SUPER_ADMIN");
    public static bool CanManage(IEnumerable<string> roles) => Normalize(roles).Overlaps(new[]
    {
        "SUPER_ADMIN", "COLLEGE_ADMIN", "PRINCIPAL", "HOD", "PLACEMENT_OFFICER", "PLACEMENT_COORDINATOR"
    });
    private static HashSet<string> Normalize(IEnumerable<string> roles) => roles
        .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim())
        .ToHashSet(StringComparer.OrdinalIgnoreCase);
}
