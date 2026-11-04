using BTech.Models;
using BTech.Services.Invitations;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Net.Sockets;

namespace BTech.Services;

public sealed class EmailService(IOptions<SmtpSettings> options, ILogger<EmailService> logger,
    IHttpContextAccessor http) : IEmailService
{
    public Task SendOtpEmailAsync(string recipientEmail,string otp,string purpose) =>
        SendAsync(recipientEmail,"BTech College - OTP Verification",
            "Your OTP for "+purpose+" is "+otp+". It expires in 5 minutes. Do not share this code.",false);

    public Task SendEmailAsync(string recipientEmail,string subject,string body) =>
        SendAsync(recipientEmail,subject,body,true);

    private async Task SendAsync(string recipientEmail,string subject,string body,bool html)
    {
        var settings=options.Value;
        SmtpConfiguration.Validate(settings);
        if(string.IsNullOrWhiteSpace(recipientEmail))throw new ArgumentException("Recipient email is required.");
        var trace=http.HttpContext?.TraceIdentifier??Guid.NewGuid().ToString("N");
        var message=new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName,settings.FromEmail));
        message.To.Add(MailboxAddress.Parse(recipientEmail));
        message.Subject=subject;
        message.Body=new TextPart(html?"html":"plain"){Text=body};
        using var protocol=new SafeSmtpTrace();
        using var client=new SmtpClient(protocol) { Timeout=30000 };
        var phase="connect";
        try
        {
            for(var attempt=1;;attempt++)
            {
                try
                {
                    protocol.BeginPhase();
                    await client.ConnectAsync(settings.Host,settings.Port,
                        settings.SecurityMode=="SslOnConnect"?SecureSocketOptions.SslOnConnect:SecureSocketOptions.StartTls);
                    break;
                }
                catch(Exception ex) when(attempt<3 && ex is SocketException or IOException or TimeoutException)
                {
                    // Only retry connection establishment, before AUTH or DATA.
                    // Retrying an ambiguous send could duplicate a delivered email.
                    logger.LogWarning("SMTP connect retry. CorrelationId={CorrelationId}, Attempt={Attempt}, MaxAttempts=3, ErrorType={ErrorType}",trace,attempt,ex.GetType().Name);
                    await Task.Delay(attempt==1?250:750);
                }
            }
            phase="authenticate";
            protocol.BeginPhase();
            await client.AuthenticateAsync(settings.Username,settings.Password);
            phase="send";
            protocol.BeginPhase();
            await client.SendAsync(message);
        }
        catch(Exception ex)
        {
            var command=ex as SmtpCommandException;
            protocol.CompleteMetadata();
            var safe=new EmailDeliveryException(phase,ex.GetType().Name,
                SafeSmtpTrace.Classify(ex),
                command is null?null:(int)command.StatusCode);
            logger.LogError("SMTP failure. CorrelationId={CorrelationId}, Build={Build}, Phase={Phase}, Host={Host}, Port={Port}, TlsMode={TlsMode}, ErrorType={ErrorType}, FailureCode={FailureCode}, CommandStatus={CommandStatus}, LastReplyCode={LastReplyCode}, LastReplyComplete={LastReplyComplete}, EnhancedCode={EnhancedCode}, ProviderHint={ProviderHint}, AuthMechanism={AuthMechanism}, SmtpAcceptance=Unconfirmed, InboxDelivery=Unverified",
                trace,BackendBuild.Id,safe.Phase,settings.Host,settings.Port,settings.SecurityMode,safe.ErrorType,safe.ProviderCode,safe.ProviderStatusCode,
                protocol.LastReplyCode,protocol.LastReplyComplete,protocol.EnhancedCode,protocol.ProviderHint,protocol.LastAuthMechanism);
            throw safe;
        }
        // A QUIT/disconnect problem after successful SendAsync must not turn an
        // accepted message into a reported rejection or cause duplicate mail.
        logger.LogInformation("SMTP provider accepted message. CorrelationId={CorrelationId}, Host={Host}, Port={Port}, SmtpAccepted=true, InboxDelivery=Unverified",trace,settings.Host,settings.Port);
        try { await client.DisconnectAsync(true); }
        catch(Exception ex)
        {logger.LogWarning("SMTP disconnect failed after message acceptance. CorrelationId={CorrelationId}, ErrorType={ErrorType}",trace,ex.GetType().Name);}
    }
}
