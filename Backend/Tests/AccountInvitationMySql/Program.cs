using BTech.Data;
using BTech.Models;
using BTech.Services;
using BTech.Services.Implementations;
using BTech.Services.Invitations;
using BTech.UserAccess;
using BTech.Middleware;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.FileProviders;
using MySqlConnector;
using System.Net;
using System.Text.RegularExpressions;
using System.Text.Json;

// Real MySQL transactions, fake mail only. NEVER run against production.
var cs=Environment.GetEnvironmentVariable("CMS_INVITATION_TEST_CONNECTION")??throw new Exception("Set CMS_INVITATION_TEST_CONNECTION to a migrated disposable database ending _invitation_test.");
if(!new MySqlConnectionStringBuilder(cs).Database.EndsWith("_invitation_test",StringComparison.Ordinal))throw new Exception("Refusing writes outside a database ending _invitation_test.");
await using var c=new MySqlConnection(cs);await c.OpenAsync();
var actor=await c.ExecuteScalarAsync<long>("SELECT MIN(user_id) FROM users WHERE status=1 AND deleted_at IS NULL");
if(actor<=0)throw new Exception("Import the supplied dump into the disposable schema, apply R3/R6 migrations and retain active roles/accounts.");
var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"ConnectionStrings:DefaultConnection",cs},{"PasswordSetup:BaseUrl","http://localhost:5173"}}).Build();
var clock=new Clock();var mail=new MailCapture();var store=new MySqlAccountInvitationStore(config);
var smtp=Options.Create(new SmtpSettings{Host="smtp.example.invalid",Port=587,Username="test-only",Password=Guid.NewGuid().ToString("N"),FromEmail="sender@example.invalid"});
var http=new HttpContextAccessor{HttpContext=new DefaultHttpContext()};http.HttpContext.TraceIdentifier="invitation-mysql-component-test";
var invitations=new AccountInvitationService(store,mail,config,new Env(),smtp,clock,http,NullLogger<AccountInvitationService>.Instance);
await using var db=new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseMySql(cs,ServerVersion.AutoDetect(cs)).Options);
var setup=new AccountSetupService(db,invitations);
var users=new UserAccessService(config,setup,invitations,NullLogger<UserAccessService>.Instance);
http.HttpContext!.Items[ModulePermissionMiddleware.SuperAdminItem]=true;
http.HttpContext.User=new ClaimsPrincipal(new ClaimsIdentity(new[]{new Claim(ClaimTypes.NameIdentifier,actor.ToString())},"test"));
var controller=new UserAccessController(users){ControllerContext=new ControllerContext{HttpContext=http.HttpContext}};
var created=new List<(long User,long College)>();
const string password="ChosenForIsolatedTest123!";
static void Check(bool value,string message){if(!value)throw new Exception(message);}
OnboardCollegeRequest Request()=>new(){CollegeCode="UT"+Guid.NewGuid().ToString("N"),CollegeName="Invitation integration test",AdminName="Test Admin",AdminEmail="Test+"+Guid.NewGuid().ToString("N")+"@example.invalid"};
try
{
    var request=Request();var result=JsonSerializer.SerializeToElement(await users.Onboard(request,actor,http.HttpContext.TraceIdentifier));
    var id=result.GetProperty("userId").GetInt64();created.Add((id,result.GetProperty("collegeId").GetInt64()));
    Check(mail.To==request.AdminEmail,"Onboarding must send to the exact entered email.");
    Check(await c.ExecuteScalarAsync<string>("SELECT delivery_status FROM user_access_invitations WHERE user_id=@id",new{id})=="sent","Provider-confirmed state.");
    var token=mail.Token;
    var finish=await setup.CompleteSetupAsync(request.AdminEmail,token,password,password);Check(finish.Success,"Initial setup.");
    Check(!(await setup.CompleteSetupAsync(request.AdminEmail,token,password,password)).Success,"Replay rejected.");
    Check(BCrypt.Net.BCrypt.Verify(password,await c.ExecuteScalarAsync<string>("SELECT password_hash FROM users WHERE user_id=@id",new{id})),"Chosen password saved hashed.");
    // Existing active account with completed initial setup gets a regular reset.
    clock.Now+=TimeSpan.FromMinutes(3);
    var resetResult=await controller.Reset(id,new PasswordSetupLinkRequest{UserId=id,CollegeId=created[0].College});
    Check(resetResult is OkObjectResult,"Existing-user reset endpoint succeeds.");
    Check(await c.ExecuteScalarAsync<string>("SELECT purpose FROM user_access_invitations WHERE user_id=@id",new{id})=="reset","Completed account gets reset purpose.");
    // Current email is authoritative; no recipient is accepted from the reset body.
    var updatedEmail="Updated+"+Guid.NewGuid().ToString("N")+"@example.invalid";
    await c.ExecuteAsync("UPDATE users SET email=@updatedEmail WHERE user_id=@id",new{updatedEmail,id});
    clock.Now+=TimeSpan.FromMinutes(3);
    await controller.Reset(id,null,created[0].College);
    Check(mail.To==updatedEmail,"Reset uses current saved email.");
    var countBeforeScopeFailure=mail.Count;
    try{await controller.Reset(id,null,created[0].College+1000000);throw new Exception("Expected scope rejection.");}
    catch(UserAccountRequestException ex){Check(ex.Code=="USER_COLLEGE_SCOPE_MISMATCH","Wrong college has specific error.");}
    Check(mail.Count==countBeforeScopeFailure,"Wrong scope sends no mail.");
    var failed=Request();mail.Fail=true;AccountInvitationDeliveryException failure;
    try{await users.Onboard(failed,actor,http.HttpContext.TraceIdentifier);throw new Exception("Expected send failure.");}
    catch(AccountInvitationDeliveryException ex){failure=ex;created.Add((ex.UserId,ex.CollegeId!.Value));}
    Check(failure.AccountCreated&&!failure.SmtpAccepted,"Partial failure identifies saved account.");
    Check(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM user_access_invitations WHERE user_id=@id AND delivery_status='failed' AND consumed_at IS NOT NULL",new{id=failure.UserId})==1,"Failure invalidates token in real DB.");
    Check(!(await setup.CompleteSetupAsync(failed.AdminEmail,mail.Token,password,password)).Success,"Failed email token rejected.");
    mail.Fail=false;clock.Now+=TimeSpan.FromMinutes(3);
    // Newly invited account is Active and has a random stored password hash,
    // but still needs initial setup. reset-password must select setup purpose.
    var pendingResult=await controller.Reset(failure.UserId,new PasswordSetupLinkRequest{UserId=failure.UserId,CollegeId=failure.CollegeId});
    Check(pendingResult is OkObjectResult,"Pending-user reset endpoint succeeds.");
    Check(await c.ExecuteScalarAsync<string>("SELECT purpose FROM user_access_invitations WHERE user_id=@id",new{id=failure.UserId})=="setup","Pending account gets initial setup purpose.");
    Check(mail.To==failed.AdminEmail,"Resend uses same saved address.");
    var sentCount=mail.Count;
    await c.ExecuteAsync("UPDATE users SET status=0 WHERE user_id=@id",new{id=failure.UserId});
    try{await setup.SendSetupLinkAsync(failure.UserId,"College Administrator");throw new Exception("Expected inactive-account rejection.");}catch(InvalidOperationException){}
    Check(mail.Count==sentCount,"Inactive account receives no email.");
    Console.WriteLine("PASS: real MySQL onboarding transactions, shared setup service, exact recipient, password/replay checks, failed-token invalidation, resend and inactive rejection. Existing/pending reset-password action and college scope are checked. SMTP delivery was mocked; no inbox acceptance is claimed.");
}
finally
{
    foreach(var item in created.AsEnumerable().Reverse())
    {
        await using var tx=await c.BeginTransactionAsync();
        var fixtureParameters=new{id=item.User,college=item.College};
        foreach(var sql in new[]{"DELETE FROM user_access_invitations WHERE user_id=@id","DELETE FROM user_access_audits WHERE target_user_id=@id","DELETE FROM user_module_permissions WHERE user_id=@id","DELETE FROM user_academic_year_access WHERE user_id=@id","DELETE FROM user_access_profiles WHERE user_id=@id","DELETE FROM user_roles WHERE user_id=@id","DELETE FROM college_user_mappings WHERE user_id=@id","DELETE FROM otp_verifications WHERE user_id=@id","DELETE FROM refresh_tokens WHERE user_id=@id","DELETE FROM users WHERE user_id=@id","DELETE FROM college_settings WHERE college_id=@college","DELETE FROM colleges WHERE college_id=@college"})
            await c.ExecuteAsync(sql,fixtureParameters,tx);
        await tx.CommitAsync();
    }
}
sealed class MailCapture:IEmailService
{
    public string To="",Body="";public bool Fail;public int Count;
    public string Token=>Uri.UnescapeDataString(Regex.Match(WebUtility.HtmlDecode(Body),"[?&]token=(ua_[0-9a-f]{64})").Groups[1].Value);
    public Task SendEmailAsync(string to,string subject,string body){To=to;Body=body;Count++;if(Fail)throw new EmailDeliveryException("authenticate","TestError","SMTP_AUTHENTICATE_FAILED",535);return Task.CompletedTask;}
    public Task SendOtpEmailAsync(string a,string b,string d)=>throw new NotSupportedException();
}
sealed class Clock:TimeProvider{public DateTimeOffset Now=DateTimeOffset.UtcNow;public override DateTimeOffset GetUtcNow()=>Now;}
sealed class Env:IHostEnvironment{public string EnvironmentName{get;set;}="Development";public string ApplicationName{get;set;}="Tests";public string ContentRootPath{get;set;}=".";public IFileProvider ContentRootFileProvider{get;set;}=new NullFileProvider();}
