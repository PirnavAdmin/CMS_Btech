using System.Text;

namespace BTech.Services;

internal static class AccountSetupPasswordPolicy
{
    public static string? GetError(string password)
    {
        if (password.Length < 8)
            return "Use at least 8 characters for your password.";

        if (Encoding.UTF8.GetByteCount(password) > 72)
            return "Password must not exceed 72 UTF-8 bytes.";

        if (!password.Any(c => c is >= 'A' and <= 'Z') ||
            !password.Any(c => c is >= 'a' and <= 'z') ||
            !password.Any(c => c is >= '0' and <= '9'))
            return "Include at least one uppercase letter, one lowercase letter, and one number.";

        return null;
    }
}
