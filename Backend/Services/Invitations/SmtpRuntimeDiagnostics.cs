using BTech.Models;
using BTech.UserAccess;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;

namespace BTech.Services.Invitations;

// Singleton: one bounded AUTH-only check per process every two minutes. Ordinary
// request activity logging remains enabled, but this never writes business data.
public sealed class SmtpRuntimeDiagnostics(IOptions<SmtpSettings> options, IConfiguration config,
    IHostEnvironment environment, TimeProvider clock, ILogger<SmtpRuntimeDiagnostics> logger)
{
    private readonly object gate = new();
    private DateTimeOffset nextAttempt;
    private bool running;
    private readonly DateTimeOffset diagnosticsStartedAt = clock.GetUtcNow();

    public async Task<SmtpDiagnosticResult> CheckAsync(string trace, CancellationToken requestAborted)
    {
        lock (gate)
        {
            var now = clock.GetUtcNow();
            if (running || now < nextAttempt)
                throw new UserAccountRequestException(429, "SMTP_DIAGNOSTIC_RATE_LIMITED",
                    "An SMTP authentication check is running or was recently attempted. Retry after the indicated delay.", 0)
                { RetryAfterSeconds = Math.Max(1, (int)Math.Ceiling((nextAttempt - now).TotalSeconds)) };
            running = true; nextAttempt = now.AddSeconds(120);
        }
        var s = options.Value;
        var result = new SmtpDiagnosticResult {
            Build = BackendBuild.Id, Environment = environment.EnvironmentName, DiagnosticsStartedAt = diagnosticsStartedAt,
            Host = Uri.CheckHostName(s.Host) != UriHostNameType.Unknown ? s.Host : null,
            Port = s.Port, TlsMode = s.SecurityMode is "StartTls" or "SslOnConnect" ? s.SecurityMode : null,
            UsernameConfigured = !string.IsNullOrWhiteSpace(s.Username), PasswordConfigured = !string.IsNullOrWhiteSpace(s.Password),
            UsernameSource = Source("SmtpSettings:Username"), PasswordSource = Source("SmtpSettings:Password"),
            SenderMatchesUsername = string.Equals(s.FromEmail.Trim(), s.Username.Trim(), StringComparison.OrdinalIgnoreCase),
            CheckedAt = clock.GetUtcNow(), CorrelationId = trace
        };
        using var protocol = new SafeSmtpTrace();
        using var client = new SmtpClient(protocol) { Timeout = 30000 };
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(requestAborted);
        timeout.CancelAfter(TimeSpan.FromSeconds(60));
        try
        {
            SmtpConfiguration.Validate(s);
            result.ConfigurationValid = true;
            // Validate the exact same URL/template rules as actual invitations.
            try {
                result.FrontendOrigin = PasswordSetupUrl.Resolve(config, environment);
                _ = AccountInvitationEmail.Build(new(0, null, ""), "", config, environment, result.FrontendOrigin, false, s.FromEmail);
                result.FrontendConfigurationValid = true;
            } catch (AccessSetupException) { result.FrontendConfigurationValid = false; }
            result.Phase = "connect";
            await client.ConnectAsync(s.Host, s.Port, s.SecurityMode == "SslOnConnect" ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls, timeout.Token);
            result.TlsEstablished = client.IsSecure; result.NegotiatedTls = client.SslProtocol.ToString();
            result.AdvertisedMechanisms = client.AuthenticationMechanisms.Select(SafeSmtpTrace.SafeMechanism).Distinct().OrderBy(x => x).ToArray();
            result.Phase = "authenticate"; protocol.BeginPhase();
            await client.AuthenticateAsync(s.Username, s.Password, timeout.Token);
            result.AuthenticationConfirmed = client.IsAuthenticated;
            result.Result = "AUTHENTICATION_CONFIRMED";
            // Authentication alone cannot verify MAIL FROM/RCPT/DATA restrictions.
            try { await client.DisconnectAsync(true, timeout.Token); } catch { result.DisconnectWarning = true; }
        }
        catch (Exception ex)
        {
            protocol.CompleteMetadata();
            result.Result = ex is AccessSetupException ? "SMTP_CONFIGURATION_INVALID" : SafeSmtpTrace.Classify(ex);
            result.ExceptionType = ex.GetType().Name;
            result.CommandStatusCode = ex is SmtpCommandException command ? (int)command.StatusCode : null;
        }
        finally
        {
            protocol.CompleteMetadata();
            result.LastReplyCode = protocol.LastReplyCode; result.LastReplyComplete = protocol.LastReplyComplete;
            result.EnhancedStatusCode = protocol.EnhancedCode; result.ProviderHint = protocol.ProviderHint;
            result.AuthMechanism = protocol.LastAuthMechanism;
            logger.LogInformation("SMTP authentication diagnostic. CorrelationId={CorrelationId}, Build={Build}, Phase={Phase}, Result={Result}, ErrorType={ErrorType}, LastReplyCode={LastReplyCode}, LastReplyComplete={LastReplyComplete}, EnhancedCode={EnhancedCode}, ProviderHint={ProviderHint}, AuthenticationConfirmed={AuthenticationConfirmed}, EmailSent=false",
                trace, result.Build, result.Phase, result.Result, result.ExceptionType, result.LastReplyCode, result.LastReplyComplete, result.EnhancedStatusCode, result.ProviderHint, result.AuthenticationConfirmed);
            lock (gate) running = false;
        }
        return result;
    }
    private string Source(string key) => (config as IConfigurationRoot)?.Providers.Reverse()
        .FirstOrDefault(p => p.TryGet(key, out _))?.GetType().Name ?? "NotConfigured";
}

public sealed class SmtpDiagnosticResult
{
    public string Build { get; set; } = "";
    public string Environment { get; set; } = "";
    public DateTimeOffset DiagnosticsStartedAt { get; set; }
    public DateTimeOffset CheckedAt { get; set; }
    public string CorrelationId { get; set; } = "";
    public string? Host { get; set; }
    public int Port { get; set; }
    public string? TlsMode { get; set; }
    public bool UsernameConfigured { get; set; }
    public bool PasswordConfigured { get; set; }
    public string UsernameSource { get; set; } = "";
    public string PasswordSource { get; set; } = "";
    public bool SenderMatchesUsername { get; set; }
    public bool ConfigurationValid { get; set; }
    public bool FrontendConfigurationValid { get; set; }
    public string? FrontendOrigin { get; set; }
    public bool TlsEstablished { get; set; }
    public string? NegotiatedTls { get; set; }
    public string[] AdvertisedMechanisms { get; set; } = [];
    public string Phase { get; set; } = "configuration";
    public string Result { get; set; } = "NOT_STARTED";
    public string? ExceptionType { get; set; }
    public int? CommandStatusCode { get; set; }
    public int? LastReplyCode { get; set; }
    public bool? LastReplyComplete { get; set; }
    public string? EnhancedStatusCode { get; set; }
    public string? ProviderHint { get; set; }
    public string? AuthMechanism { get; set; }
    public bool AuthenticationConfirmed { get; set; }
    public bool DisconnectWarning { get; set; }
    public bool EmailSent => false;
    public bool InvitationTokenCreated => false;
    public bool AccountChanged => false;
    public bool SmtpAccepted => false;
    public string SenderVerification => "Unverified";
    public string ProviderSendingRestrictions => "Unverified";
    public string InboxDelivery => "Unverified";
}
