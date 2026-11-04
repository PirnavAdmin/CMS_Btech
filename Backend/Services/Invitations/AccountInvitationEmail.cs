using System.Net;
using BTech.UserAccess;

namespace BTech.Services.Invitations;

public static class AccountInvitationEmail
{
    public const string WelcomeSubject = "Welcome to Pirnav Engineering College – Account Setup";

    public static string Build(InvitationAccount account, string setupUrl, IConfiguration config, IHostEnvironment environment, string origin, bool reset, string fallbackSupport="")
    {
        var login = config["PasswordSetup:LoginUrl"];
        if(string.IsNullOrWhiteSpace(login) && environment.IsDevelopment()) login=origin+"/login";
        if (string.IsNullOrWhiteSpace(login))
            throw new AccessSetupException("Configure PasswordSetup__LoginUrl with the frontend login page URL.");
        if (!Uri.TryCreate(login,UriKind.Absolute,out var uri) || !string.IsNullOrEmpty(uri.UserInfo) ||
            !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment) ||
            !string.Equals(uri.GetLeftPart(UriPartial.Authority),origin,StringComparison.OrdinalIgnoreCase))
            throw new AccessSetupException("PasswordSetup__LoginUrl must use the configured frontend origin and contain no credentials, query or fragment.");
        var support=config["PasswordSetup:SupportEmail"];
        if(string.IsNullOrWhiteSpace(support)) support=fallbackSupport;
        if(string.IsNullOrWhiteSpace(support) || !System.Net.Mail.MailAddress.TryCreate(support,out var address) || address.Address!=support.Trim())
            throw new AccessSetupException("Configure PasswordSetup__SupportEmail with your support team's email address.");
        static string H(string value)=>WebUtility.HtmlEncode(value);
        var heading=reset?"Password reset requested":"Welcome to Pirnav Engineering College";
        return $"""
            <h2>{heading}</h2>
            <p>Hello {H(string.IsNullOrWhiteSpace(account.FullName)?"Administrator":account.FullName)},</p>
            <p>{(reset?"An authorized administrator requested a password reset for your account.":"Your administrator account is ready. Please create your password and complete your profile.")}</p>
            <p>College: {H(account.CollegeName)}<br>Assigned role: {H(account.RoleName)}<br>Login email: {H(account.Email)}</p>
            <p><a href="{H(setupUrl)}">{(reset?"Reset your password":"Set up your account")}</a></p>
            <p>This secure link expires 24 hours after issue and can be used once. A newer invitation replaces earlier links.</p>
            <p>After saving your password, sign in and complete any required profile fields to access your assigned college modules.</p>
            <p>Application login: <a href="{H(login)}">{H(login)}</a></p>
            <p>Need help or did not expect this invitation? Contact <a href="mailto:{H(support)}">{H(support)}</a>.</p>
            """;
    }
}
