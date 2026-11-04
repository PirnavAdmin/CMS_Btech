using System.Text;
using System.Text.Json;
using BTech.Controllers.V1;
using BTech.Models;
using BTech.Services.Invitations;
using BTech.UserAccess;
using MailKit.Net.Smtp;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

var checks=0;
void Check(bool value,string name){if(!value)throw new Exception(name);checks++;Console.WriteLine("PASS "+name);}
void Observe(SafeSmtpTrace t,string line){var b=Encoding.UTF8.GetBytes(line);t.LogServer(b,0,b.Length);}
using(var t=new SafeSmtpTrace())
{
    Observe(t,"535 5.7.8 Credentials rejected; private-user private-secret\r\n");
    Check(t.LastReplyCode==535 && t.EnhancedCode=="5.7.8" && t.LastReplyComplete==true,"Complete auth rejection captures numeric evidence");
    var json=JsonSerializer.Serialize(t);
    Check(!json.Contains("private-user")&&!json.Contains("private-secret"),"Raw server replies excluded from diagnostics");
    t.BeginPhase();Check(t.LastReplyCode is null&&t.EnhancedCode is null,"Phase reset excludes stale EHLO replies");
    Observe(t,"535 5.7.9 Application-specific password");t.CompleteMetadata();
    Check(t.LastReplyComplete==false && t.ProviderHint=="APP_PASSWORD_REQUIRED","Partial reply is explicitly incomplete");
    t.BeginPhase();Observe(t,"not-a-status with ua_abcdefghijklmnopqrstuvwxyz\r\n");
    Check(t.LastReplyCode is null,"Malformed response contents are never retained");
    var auth=Encoding.ASCII.GetBytes("AUTH PLAIN cHJpdmF0ZS1zZWNyZXQ=\r\n");t.LogClient(auth,0,auth.Length);
    Check(t.LastAuthMechanism=="PLAIN" && !JsonSerializer.Serialize(t).Contains("cHJpdmF0"),"AUTH logs retain mechanism only");
}
Check(SafeSmtpTrace.Classify(new SmtpProtocolException("The SMTP server has unexpectedly disconnected."))=="SMTP_SERVER_DISCONNECTED","Protocol disconnect is distinct from rejected credentials");
Check(SafeSmtpTrace.Classify(new MailKit.Security.AuthenticationException("535 private-secret"))=="SMTP_AUTHENTICATION_REJECTED","Authentication exception classified without text disclosure");
var now=DateTime.UtcNow;
Check(InvitationPolicy.RetryAfter(now,"failed",now)==60 && InvitationPolicy.RetryAfter(now,"failed",now.AddSeconds(60))==0,"Failed attempts use persisted 60-second cooldown");
Check(InvitationPolicy.RetryAfter(now,"sending",now.AddSeconds(61))==239 && InvitationPolicy.RetryAfter(now,"sending",now.AddSeconds(300))==0,"Sending lease protects cross-instance work for five minutes");
var s=new SmtpSettings{Host="smtp.example.invalid",Port=465,SecurityMode="StartTls",Username="test",Password="isolated-test-secret",FromEmail="sender@example.invalid"};
try{SmtpConfiguration.Validate(s);throw new Exception("Expected TLS mismatch rejection");}catch(AccessSetupException){Check(true,"Port/TLS mismatch rejected before network access");}
var jsonOptions=new JsonSerializerOptions(JsonSerializerDefaults.Web);
var request=JsonSerializer.Deserialize<OnboardCollegeRequest>("""{"adminFullName":"Test Admin","adminEmail":"admin@example.invalid","college":{"CollegeCode":"TEST","CollegeName":"Test College","city":"Hyderabad"}}""",jsonOptions)!;
Check(request.AdminName=="Test Admin"&&request.CollegeCode=="TEST"&&request.City=="Hyderabad","Nested college, PascalCase fields and adminFullName preserve compatibility");
var conflict=JsonSerializer.Deserialize<OnboardCollegeRequest>("""{"collegeCode":"A","adminName":"Test","college":{"collegeCode":"B"}}""",jsonOptions)!;
Check(conflict.Validate(new(conflict)).Any(),"Conflicting flat/nested college identity rejected");
var controller=new SmtpDiagnosticsController(null!){ControllerContext=new ControllerContext{HttpContext=new DefaultHttpContext()}};
Check(await controller.Check(default) is ForbidResult,"Diagnostic rejects unverified caller before SMTP access");
Console.WriteLine($"ALL PASS: {checks} SMTP diagnostics and invitation policy checks.");
