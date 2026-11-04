using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Net;
using BTech.Models;
using BTech.Services;
using BTech.Services.Invitations;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

static void Check(bool condition,string name) { if(!condition)throw new Exception(name); }
static Fixture New()=>new();
static async Task<AccountInvitationDeliveryException> Failed(Task task)
{
    try { await task; } catch(AccountInvitationDeliveryException ex){return ex;}
    throw new Exception("Expected a clear invitation delivery exception.");
}
var ok=New();
await ok.Service.SendAsync(1,"College Administrator");
Check(ok.Email.To=="Admin+Intended@Example.org","Recipient must exactly match saved onboarding email.");
Check(ok.Store.Expiry-ok.Clock.GetUtcNow().UtcDateTime==TimeSpan.FromHours(24),"24-hour expiry.");
Check(ok.Store.Status=="sent"&&ok.Email.Accepted,"Sent only after SMTP acceptance and activation.");
Check(ok.Email.Body.Contains("localhost:5173/activate-account?"),"Correct frontend origin.");
Check(ok.Email.Subject==AccountInvitationEmail.WelcomeSubject,"Professional welcome subject.");
Check(ok.Email.Body.Contains("Test &lt;Admin&gt;") && ok.Email.Body.Contains("Example College"),"Recipient/college template values HTML encoded.");
Check(!ok.Email.Body.Contains("SYS_"),"Internal identifier must not be in email.");
var token=ok.Email.Token;
Check(ok.Store.Hash!=token&&ok.Store.Hash.Length==64,"Only token hash persisted.");
var first=await ok.Service.CompleteAsync(ok.Email.To!,token,"StrongChosenPassword123!","StrongChosenPassword123!");
var replay=await ok.Service.CompleteAsync(ok.Email.To!,token,"StrongChosenPassword123!","StrongChosenPassword123!");
Check(first.Success&&!replay.Success,"Single-use redemption.");
var fail=New();fail.Email.Fail=true;
var failure=await Failed(fail.Service.SendAsync(1,"College Administrator"));
Check(!failure.SmtpAccepted&&fail.Store.Status=="failed","SMTP rejection recorded as failure.");
Check(!(await fail.Service.CompleteAsync(fail.Store.Account.Email,fail.Email.Token,"StrongChosenPassword123!","StrongChosenPassword123!")).Success,"Failed token must not redeem.");
var resetFail=New();resetFail.Email.Fail=true;
Check((await Failed(resetFail.Service.SendAsync(1,"College Administrator",reset:true))).IsPasswordReset,"Completed-account reset failure retains reset retry purpose.");
var unsaved=New();unsaved.Email.Fail=true;unsaved.Store.FailFailureWrite=true;
await Failed(unsaved.Service.SendAsync(1,"College Administrator"));
Check(unsaved.Store.Status=="sending","Failed persistence leaves only unactivated reservation.");
Check(!(await unsaved.Service.CompleteAsync(unsaved.Store.Account.Email,unsaved.Email.Token,"StrongChosenPassword123!","StrongChosenPassword123!")).Success,"Unactivated token cannot redeem even if failure-state DB write fails.");
var activation=New();activation.Store.FailActivation=true;
var activationError=await Failed(activation.Service.SendAsync(1,"College Administrator"));
Check(activationError.SmtpAccepted&&activation.Store.Status=="failed","Provider accepted but activation failed must not report sent.");
var expires=New();await expires.Service.SendAsync(1,"College Administrator");expires.Clock.Now+=TimeSpan.FromHours(24);
Check(!(await expires.Service.CompleteAsync(expires.Store.Account.Email,expires.Email.Token,"StrongChosenPassword123!","StrongChosenPassword123!")).Success,"Expiry boundary denies redemption.");
var resend=New();await resend.Service.SendAsync(1,"College Administrator");var old=resend.Email.Token;
resend.Clock.Now+=TimeSpan.FromMinutes(3);await resend.Service.SendAsync(1,"College Administrator");
Check(!(await resend.Service.CompleteAsync(resend.Store.Account.Email,old,"StrongChosenPassword123!","StrongChosenPassword123!")).Success,"Resend invalidates previous link.");
Console.WriteLine("PASS: exact recipient, origin, hash-only storage, 24-hour expiry, single-use, failed SMTP invalidation, DB failure safety, activation failure and resend.");

sealed class Fixture
{
    public FakeClock Clock=new();public MemoryStore Store;public CaptureEmail Email=new();public AccountInvitationService Service;
    public Fixture()
    {
        Store=new MemoryStore();
        var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"PasswordSetup:BaseUrl","http://localhost:5173"}}).Build();
        var smtp=Options.Create(new SmtpSettings{Host="smtp.example.invalid",Port=587,Username="test-only",Password=Guid.NewGuid().ToString("N"),FromEmail="sender@example.invalid",SecurityMode="StartTls"});
        var http=new HttpContextAccessor{HttpContext=new DefaultHttpContext()};http.HttpContext.TraceIdentifier="invitation-test-correlation";
        Service=new AccountInvitationService(Store,Email,config,new TestEnvironment(),smtp,Clock,http,NullLogger<AccountInvitationService>.Instance);
    }
}
sealed class CaptureEmail:IEmailService
{
    public string? To;public string Body="",Subject="";public bool Fail,Accepted;
    public string Token=>Uri.UnescapeDataString(Regex.Match(WebUtility.HtmlDecode(Body),"[?&]token=(ua_[0-9a-f]{64})").Groups[1].Value);
    public Task SendEmailAsync(string recipient,string subject,string body)
    {To=recipient;Subject=subject;Body=body;if(Fail)throw new EmailDeliveryException("authenticate","TestProviderFailure","SMTP_AUTHENTICATE_FAILED",535);Accepted=true;return Task.CompletedTask;}
    public Task SendOtpEmailAsync(string recipient,string otp,string purpose)=>throw new NotSupportedException();
}
sealed class MemoryStore:IAccountInvitationStore
{
    public InvitationAccount Account=new(1,2,"Admin+Intended@Example.org","Test <Admin>","Example College","College Admin");public string Hash="",Status="";public DateTime Expiry;public bool Consumed,FailFailureWrite,FailActivation;
    public Task<InvitationAccount> ReserveAsync(long id,string hash,string purpose,DateTime now,DateTime expires,long? actor,string trace)
    {Hash=hash;Status="sending";Consumed=false;Expiry=expires;return Task.FromResult(Account);}
    public Task<bool> FinishDeliveryAsync(InvitationAccount a,string hash,bool accepted,string? error,DateTime now,long? actor,string trace)
    {
        if(!accepted&&FailFailureWrite)throw new Exception("simulated failure write");
        if(accepted&&FailActivation)throw new Exception("simulated activation write failure");
        if(hash!=Hash||Consumed)return Task.FromResult(false);
        Status=accepted?"sent":"failed";if(!accepted){Consumed=true;Expiry=now;}return Task.FromResult(true);
    }
    public Task<(bool Success,string Message)> RedeemAsync(string email,string hash,string password,DateTime now,string trace)
    {var valid=email==Account.Email&&hash==Hash&&Status=="sent"&&!Consumed&&Expiry>now;if(valid)Consumed=true;return Task.FromResult((valid,valid?"ok":"invalid"));}
}
sealed class FakeClock:TimeProvider {public DateTimeOffset Now=new(2026,11,2,12,0,0,TimeSpan.Zero);public override DateTimeOffset GetUtcNow()=>Now;}
sealed class TestEnvironment:IHostEnvironment
{public string EnvironmentName{get;set;}="Development";public string ApplicationName{get;set;}="Tests";public string ContentRootPath{get;set;}=".";public IFileProvider ContentRootFileProvider{get;set;}=new NullFileProvider();}
