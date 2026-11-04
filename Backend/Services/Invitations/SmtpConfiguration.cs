using BTech.Models;
using BTech.UserAccess;
using System.Net.Mail;

namespace BTech.Services.Invitations;

public static class SmtpConfiguration
{
    public static void Validate(SmtpSettings settings)
    {
        if(string.IsNullOrWhiteSpace(settings.Host) || settings.Port is <1 or >65535 ||
           string.IsNullOrWhiteSpace(settings.Username) || string.IsNullOrWhiteSpace(settings.Password) ||
           string.IsNullOrWhiteSpace(settings.FromEmail))
            throw new AccessSetupException("Configure SmtpSettings__Host, __Port, __Username, __Password and __FromEmail through deployment environment variables or secrets. SMTP credentials must not be committed to source.");
        try
        {
            var sender=new MailAddress(settings.FromEmail);
            if(sender.Address!=settings.FromEmail.Trim()) throw new FormatException();
        }
        catch(FormatException) { throw new AccessSetupException("SmtpSettings__FromEmail must be a valid sender email authorized by your SMTP provider."); }
        if(settings.SecurityMode is not ("StartTls" or "SslOnConnect"))
            throw new AccessSetupException("Set SmtpSettings__SecurityMode to StartTls (usually port 587) or SslOnConnect (usually port 465).");
        if(Uri.CheckHostName(settings.Host)==UriHostNameType.Unknown)
            throw new AccessSetupException("SmtpSettings__Host must contain an SMTP hostname or IP address, without a URL, port, credentials or path.");
        if((settings.Port==465 && settings.SecurityMode!="SslOnConnect") || (settings.Port==587 && settings.SecurityMode!="StartTls"))
            throw new AccessSetupException("SMTP port 465 requires SslOnConnect; submission port 587 requires StartTls. Match your provider's documented endpoint.");
    }
}
