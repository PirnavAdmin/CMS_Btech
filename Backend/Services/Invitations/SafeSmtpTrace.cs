using System.Text;
using System.Text.RegularExpressions;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using System.Net.Sockets;

namespace BTech.Services.Invitations;

// Never persist a protocol transcript: AUTH payloads, addresses and DATA are secret.
// Only fixed labels and numeric reply metadata leave this bounded parser.
public sealed class SafeSmtpTrace : IProtocolLogger
{
    public IAuthenticationSecretDetector? AuthenticationSecretDetector { get; set; }
    private readonly StringBuilder pending = new();
    private bool truncated;
    private static readonly HashSet<string> Mechanisms = new(StringComparer.Ordinal) {
        "PLAIN", "LOGIN", "CRAM-MD5", "DIGEST-MD5", "NTLM", "GSSAPI", "XOAUTH2", "OAUTHBEARER",
        "SCRAM-SHA-1", "SCRAM-SHA-1-PLUS", "SCRAM-SHA-256", "SCRAM-SHA-256-PLUS", "SCRAM-SHA-512", "SCRAM-SHA-512-PLUS"
    };
    public int? LastReplyCode { get; private set; }
    public string? EnhancedCode { get; private set; }
    public bool? LastReplyComplete { get; private set; }
    public string? LastAuthMechanism { get; private set; }
    public string? ProviderHint { get; private set; }
    public static string SafeMechanism(string value) => Mechanisms.Contains(value) ? value : "OTHER";
    public void BeginPhase()
    {
        pending.Clear(); truncated = false;
        LastReplyCode = null; EnhancedCode = null; LastReplyComplete = null; ProviderHint = null;
    }
    public void LogConnect(Uri uri) { }
    public void LogClient(byte[] buffer, int offset, int count)
    {
        var prefix = Encoding.ASCII.GetString(buffer, offset, Math.Min(count, 32));
        if (!prefix.StartsWith("AUTH ", StringComparison.Ordinal)) return;
        var name = prefix[5..].Split([' ', '\r', '\n'], StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (name is not null) LastAuthMechanism = SafeMechanism(name);
    }
    public void LogServer(byte[] buffer, int offset, int count)
    {
        for (var i = offset; i < offset + count; i++)
        {
            var ch = (char)buffer[i];
            if (ch == '\n') { Observe(pending.ToString(), !truncated); pending.Clear(); truncated = false; }
            else if (pending.Length < 1024) pending.Append(ch);
            else truncated = true;
        }
    }
    public void CompleteMetadata()
    {
        if (pending.Length > 0) { Observe(pending.ToString(), false); pending.Clear(); }
    }
    private void Observe(string line, bool complete)
    {
        if (line.Length < 4 || !line.Take(3).All(char.IsAsciiDigit) || line[3] is not (' ' or '-')) return;
        var code = int.Parse(line[..3], System.Globalization.CultureInfo.InvariantCulture);
        if (code is < 200 or > 599) return;
        LastReplyCode = code; LastReplyComplete = complete;
        var enhanced = Regex.Match(line[4..], @"^([245]\.\d{1,3}\.\d{1,3})(?:\s|$)");
        EnhancedCode = enhanced.Success ? enhanced.Groups[1].Value : null;
        ProviderHint = EnhancedCode == "5.7.9" || line.Contains("application-specific password", StringComparison.OrdinalIgnoreCase) ? "APP_PASSWORD_REQUIRED"
            : line.Contains("too many", StringComparison.OrdinalIgnoreCase) ? "RATE_LIMITED"
            : line.Contains("browser", StringComparison.OrdinalIgnoreCase) ? "INTERACTIVE_SIGN_IN_REQUIRED"
            : line.Contains("policy", StringComparison.OrdinalIgnoreCase) ? "PROVIDER_POLICY"
            : code == 535 ? "AUTHENTICATION_REJECTED" : null;
    }
    public static string Classify(Exception ex) => ex switch {
        SmtpProtocolException when ex.Message.Contains("unexpectedly disconnected", StringComparison.OrdinalIgnoreCase) => "SMTP_SERVER_DISCONNECTED",
        SmtpProtocolException when ex.Message.StartsWith("Unable to parse status code", StringComparison.Ordinal) => "SMTP_MALFORMED_STATUS",
        SmtpProtocolException when ex.Message.StartsWith("Invalid status code", StringComparison.Ordinal) => "SMTP_INVALID_STATUS",
        SmtpProtocolException when ex.Message.StartsWith("The status codes", StringComparison.Ordinal) => "SMTP_MISMATCHED_STATUS",
        SmtpProtocolException => "SMTP_PROTOCOL_ERROR",
        MailKit.Security.AuthenticationException => "SMTP_AUTHENTICATION_REJECTED",
        SslHandshakeException => "SMTP_TLS_HANDSHAKE_FAILED",
        SocketException => "SMTP_NETWORK_FAILURE",
        TimeoutException => "SMTP_TIMEOUT",
        OperationCanceledException => "SMTP_CANCELLED_OR_TIMEOUT",
        IOException => "SMTP_TRANSPORT_FAILURE",
        SmtpCommandException => "SMTP_COMMAND_REJECTED",
        NotSupportedException => "SMTP_AUTH_NOT_SUPPORTED",
        _ => "SMTP_LOCAL_FAILURE"
    };
    public void Dispose() => pending.Clear();
}
