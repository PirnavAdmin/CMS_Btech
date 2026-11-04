using BTech.UserAccess;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace BTech.Services;

/// <summary>Trusted frontend origin used by all password-setup invitation flows.</summary>
public static class PasswordSetupUrl
{
    public static string Resolve(IConfiguration configuration, IHostEnvironment environment)
    {
        var value = configuration["PasswordSetup:BaseUrl"];
        if (string.IsNullOrWhiteSpace(value)) value = configuration["Frontend:BaseUrl"];
        if (string.IsNullOrWhiteSpace(value) && environment.IsDevelopment())
            value = "http://localhost:5173";

        if (!Uri.TryCreate(value?.Trim(), UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp) ||
            !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) ||
            !string.IsNullOrEmpty(uri.Fragment) || uri.AbsolutePath != "/")
            throw MissingOrigin();

        // A deployed invitation must never silently point recipients to localhost.
        if (!environment.IsDevelopment() && (uri.Scheme != Uri.UriSchemeHttps || uri.IsLoopback))
            throw MissingOrigin();
        if (uri.Scheme == Uri.UriSchemeHttp && !uri.IsLoopback)
            throw MissingOrigin();

        return uri.GetLeftPart(UriPartial.Authority);
    }

    public static string BuildLink(string frontendOrigin, string loginId, string token) =>
        frontendOrigin.TrimEnd('/') + "/activate-account?loginId=" +
        Uri.EscapeDataString(loginId) + "&token=" + Uri.EscapeDataString(token);

    private static AccessSetupException MissingOrigin() => new(
        "Configure PasswordSetup:BaseUrl (environment variable PasswordSetup__BaseUrl) with the frontend origin, not the API URL. Use http://localhost:5173 in Development; deployed environments require the actual HTTPS frontend origin.");
}
