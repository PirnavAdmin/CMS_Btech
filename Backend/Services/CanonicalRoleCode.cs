namespace BTech.Services;

public static class CanonicalRoleCode
{
    public static string Normalize(string? value)
    {
        var code = (value ?? string.Empty).Trim().Replace('-', '_').Replace(' ', '_').ToUpperInvariant();
        while (code.Contains("__", StringComparison.Ordinal)) code = code.Replace("__", "_", StringComparison.Ordinal);
        return code switch
        {
            "ADMIN" or "COLLEGEADMIN" or "COLLEGE_ADMINISTRATOR" => "COLLEGE_ADMIN",
            "SUPERADMIN" or "SUPER_ADMINISTRATOR" => "SUPER_ADMIN",
            _ => code
        };
    }
}
