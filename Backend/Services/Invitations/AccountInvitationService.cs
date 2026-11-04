using System.Net;
using System.Security.Cryptography;
using System.Text;
using BTech.Models;
using Microsoft.Extensions.Options;

namespace BTech.Services.Invitations;

public sealed class AccountInvitationService(
    IAccountInvitationStore store, IEmailService email, IConfiguration config,
    IHostEnvironment environment, IOptions<SmtpSettings> smtp, TimeProvider clock,
    IHttpContextAccessor http, ILogger<AccountInvitationService> logger)
{
    public void ValidateConfiguration()
    {
        _=PasswordSetupUrl.Resolve(config,environment);
        SmtpConfiguration.Validate(smtp.Value);
        // Validate the complete template configuration before reserving a token.
        _=AccountInvitationEmail.Build(new(0,null,""),"",config,environment,PasswordSetupUrl.Resolve(config,environment),false,smtp.Value.FromEmail);
    }
    private static string Hash(string token)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    public async Task SendAsync(long userId,string accountType,bool reset=false)
    {
        ValidateConfiguration();
        var origin=PasswordSetupUrl.Resolve(config,environment);
        var trace=http.HttpContext?.TraceIdentifier??Guid.NewGuid().ToString("N");
        long? actor=long.TryParse(http.HttpContext?.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,out var id)?id:null;
        var token="ua_"+Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var hash=Hash(token);
        var now=clock.GetUtcNow().UtcDateTime;
        var account=await store.ReserveAsync(userId,hash,reset?"reset":"setup",now,now.AddHours(24),actor,trace);
        var url=PasswordSetupUrl.BuildLink(origin,account.Email,token);
        try
        {
            await email.SendEmailAsync(account.Email,reset?"Pirnav Engineering College – Password Reset":AccountInvitationEmail.WelcomeSubject,
                AccountInvitationEmail.Build(account,url,config,environment,origin,reset,smtp.Value.FromEmail));
        }
        catch(Exception ex)
        {
            var detail=ex as EmailDeliveryException;
            var error=detail?.ProviderCode??"SMTP_UNEXPECTED_ERROR";
            logger.LogError("Setup email failed. CorrelationId={CorrelationId}, UserId={UserId}, SmtpAccepted=false, Phase={Phase}, ProviderCode={ProviderCode}, ProviderStatus={ProviderStatus}, ErrorType={ErrorType}",
                trace,userId,detail?.Phase??"send",error,detail?.ProviderStatusCode,detail?.ErrorType??ex.GetType().Name);
            var saved=await Invalidate(account,hash,error,actor,trace);
            throw new AccountInvitationDeliveryException(account,saved?"failed":"unknown",false,reset);
        }
        try
        {
            if(!await store.FinishDeliveryAsync(account,hash,true,null,clock.GetUtcNow().UtcDateTime,actor,trace))
                throw new InvalidOperationException("The invitation was superseded or the account is no longer eligible.");
        }
        catch(Exception ex)
        {
            logger.LogError("Setup email activation not confirmed. CorrelationId={CorrelationId}, UserId={UserId}, SmtpAccepted=true, ErrorType={ErrorType}",trace,userId,ex.GetType().Name);
            await Invalidate(account,hash,"DELIVERY_ACTIVATION_FAILED",actor,trace);
            throw new AccountInvitationDeliveryException(account,"unknown",true,reset);
        }
        logger.LogInformation("Setup email accepted and invitation activated. CorrelationId={CorrelationId}, UserId={UserId}, SmtpAccepted=true, FrontendOrigin={FrontendOrigin}, ExpiresInHours=24",trace,userId,origin);
    }
    private async Task<bool> Invalidate(InvitationAccount account,string hash,string error,long? actor,string trace)
    {
        try { return await store.FinishDeliveryAsync(account,hash,false,error,clock.GetUtcNow().UtcDateTime,actor,trace); }
        catch(Exception ex)
        {
            // If this write fails, the reservation remains 'sending', which cannot
            // be redeemed. Completion always requires delivery_status='sent'.
            logger.LogError("Invitation failure state could not be saved. CorrelationId={CorrelationId}, UserId={UserId}, ErrorType={ErrorType}. Unactivated tokens are not redeemable.",trace,account.UserId,ex.GetType().Name);
            return false;
        }
    }
    public async Task<(bool Success,string Message)> CompleteAsync(string email,string token,string password,string confirmation)
    {
        if(string.IsNullOrWhiteSpace(email)||!token.StartsWith("ua_",StringComparison.Ordinal)||token.Length!=67||
           !token.AsSpan(3).ToString().All(Uri.IsHexDigit)||password!=confirmation||password.Length<12||Encoding.UTF8.GetByteCount(password)>72)
            return(false,"Use a valid setup link and matching passwords of at least 12 characters and at most 72 UTF-8 bytes.");
        var trace=http.HttpContext?.TraceIdentifier??Guid.NewGuid().ToString("N");
        return await store.RedeemAsync(email.Trim(),Hash(token),password,clock.GetUtcNow().UtcDateTime,trace);
    }
}
