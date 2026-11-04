using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using BTech.Controllers.V1.FacultyManagement;
using BTech.Data;
using BTech.Middleware;
using BTech.Services;
using BTech.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MySqlConnector;

// Disposable schema only. HTTP model binding + live RBAC middleware + real MySQL.
// Authentication is a test-only identity header. Mail/setup is captured, never sent.
var cs = Environment.GetEnvironmentVariable("CMS_FACULTY_TEST_CONNECTION")
    ?? throw new Exception("Import the supplied dump into a disposable database ending _faculty_test; set CMS_FACULTY_TEST_CONNECTION.");
if (!new MySqlConnectionStringBuilder(cs).Database.EndsWith("_faculty_test", StringComparison.Ordinal))
    throw new Exception("Refusing to write outside a disposable _faculty_test schema.");
await using var sql = new MySqlConnection(cs);
await sql.OpenAsync();
var tag = Guid.NewGuid().ToString("N")[..10];
var checks = new List<string>();
void Check(bool value, string label) { if (!value) throw new Exception("FAIL: " + label); checks.Add(label); }
async Task<long> College(string name) => await sql.ExecuteScalarAsync<long>("INSERT INTO colleges(college_code,college_name,status) VALUES(@code,@name,1); SELECT LAST_INSERT_ID();", new {code="T"+tag+name,name="Faculty test "+name});
var college = await College("A"); var other = await College("B");
var dept = await sql.ExecuteScalarAsync<long>("INSERT INTO departments(college_id,department_code,department_name,status) VALUES(@college,'TEST','Test department',1); SELECT LAST_INSERT_ID();",new{college});
var seq = 0;
async Task<Account> Account(long? scope, byte status=1, bool deleted=false)
{
    var n=Interlocked.Increment(ref seq); var email=$"r14.{tag}.{n}@example.invalid"; var mobile=(9900000000L+n).ToString();
    var id=await sql.ExecuteScalarAsync<long>("INSERT INTO users(college_id,employee_user_id,full_name,email,mobile,password_hash,status,deleted_at,must_change_password) VALUES(@scope,@login,'Test Account',@email,@mobile,'test-hash-unchanged',@status,@deletedAt,0); SELECT LAST_INSERT_ID();",
        new{scope,login="R14"+tag+n,email,mobile,status,deletedAt=deleted ? DateTime.UtcNow : (DateTime?)null});
    return new(id,email,mobile);
}
async Task<long> Role(string code) => await sql.ExecuteScalarAsync<long>("SELECT role_id FROM roles WHERE role_code=@code AND status=1 AND deleted_at IS NULL AND college_id IS NULL LIMIT 1",new{code});
var admin=await Account(college);var super=await Account(null);var nonAdmin=await Account(college);var student=await Account(college);
var adminRole=await Role("COLLEGE_ADMIN");var superRole=await Role("SUPER_ADMIN");var staffRole=await Role("FACULTY");var studentRole=await Role("STUDENT");
if(new[]{adminRole,superRole,staffRole,studentRole}.Any(x=>x<=0))throw new Exception("Seed canonical active global roles first.");
foreach(var pair in new[]{(admin.Id,adminRole),(super.Id,superRole),(nonAdmin.Id,staffRole),(student.Id,studentRole)})
    await sql.ExecuteAsync("INSERT INTO user_roles(user_id,role_id,status) VALUES(@id,@role,1)",new{id=pair.Item1,role=pair.Item2});
foreach(var role in new[]{adminRole,staffRole})
    await sql.ExecuteAsync("INSERT INTO role_permissions(role_id,college_id,module_key,can_view,can_create) VALUES(@role,@college,'faculty_directory',1,1)",new{role,college});
var a=await Account(college);var b=await Account(college);var cross=await Account(other);var unscoped=await Account(null);
var inactive=await Account(college,0);var deleted=await Account(college,1,true);var missing=await Account(college);
await sql.ExecuteAsync("UPDATE users SET mobile=NULL WHERE user_id=@id",new{id=missing.Id});
var mail=new MailCapture();var setup=new SetupCapture();
var builder=WebApplication.CreateBuilder(new WebApplicationOptions{EnvironmentName="Production"});
builder.Logging.ClearProviders();
builder.Configuration.AddInMemoryCollection(new Dictionary<string,string?>{{"ConnectionStrings:DefaultConnection",cs}});
builder.WebHost.ConfigureKestrel(k=>k.Listen(IPAddress.Loopback,0));
builder.Services.AddDbContext<ApplicationDbContext>(o=>o.UseMySql(cs,new MySqlServerVersion(new Version(8,0,46))));
builder.Services.AddScoped<FacultyAccountResolver>();builder.Services.AddSingleton<IEmailService>(mail);builder.Services.AddSingleton<IAccountSetupService>(setup);
builder.Services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions,TestIdentity>("Test",_=>{});
builder.Services.AddAuthorization();builder.Services.AddControllers().AddApplicationPart(typeof(FacultyCreateController).Assembly);
await using var app=builder.Build();app.UseRouting();app.UseAuthentication();app.UseMiddleware<ModulePermissionMiddleware>();app.UseAuthorization();app.MapControllers();await app.StartAsync();
using var client=new HttpClient{BaseAddress=new Uri(app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single())};
async Task<(int Status,JsonElement Json)> Post(string route,object body,long? actor=null)
{
    using var msg=new HttpRequestMessage(HttpMethod.Post,route){Content=JsonContent.Create(body)};
    if(actor.HasValue)msg.Headers.Add("X-Test-User",actor.ToString());
    using var response=await client.SendAsync(msg);var raw=await response.Content.ReadAsStringAsync();
    if(string.IsNullOrWhiteSpace(raw))return ((int)response.StatusCode,default);
    try{return ((int)response.StatusCode,JsonSerializer.Deserialize<JsonElement>(raw));}
    catch{throw new Exception($"HTTP {(int)response.StatusCode}: {raw[..Math.Min(500,raw.Length)]}");}
}
object Create(Account x,long userId=0,string? email=null,string? mobile=null,long? scope=null,long? department=null,long? profile=null,string? code=null)=>new{
    userId,collegeId=scope??college,departmentId=department??dept,employeeProfileId=profile,facultyCode=code??("F"+Guid.NewGuid().ToString("N")),
    facultyName="Test Faculty",officialEmail=email??x.Email,mobile=mobile??x.Mobile,employmentType="FULL_TIME",status=1};
async Task ExpectConflict(object body,string code,string label)
{
    var r=await Post("/api/v1/faculty",body,admin.Id);Check(r.Status==409&&r.Json.GetProperty("code").GetString()==code,label);
    Check(!r.Json.TryGetProperty("conflict",out _),label+": no account details in conflict");
}
try
{
    Check((await Post("/api/v1/faculty/account-lookup",new{email=a.Email})).Status==401,"anonymous lookup denied");
    Check((await Post("/api/v1/faculty/account-lookup",new{email=a.Email},nonAdmin.Id)).Status==403,"non-admin lookup denied despite faculty create permission");
    Check((await Post("/api/v1/faculty/account-lookup",new{email=a.Email},student.Id)).Status==403,"student lookup denied");
    Check((await Post("/api/v1/faculty/account-lookup",new{},admin.Id)).Status==400,"empty lookup rejected");
    Check((await Post("/api/v1/faculty/account-lookup",new{email="partial"},admin.Id)).Status==400,"partial email rejected");
    var found=await Post("/api/v1/faculty/account-lookup",new{email=a.Email.ToUpperInvariant(),mobile="9999999999"},admin.Id);
    var data=found.Json.GetProperty("data");var candidate=data.GetProperty("items")[0];
    Check(found.Status==200&&data.GetProperty("matchCode").GetString()=="USER_EMAIL_MATCH","email-only lookup status");
    Check(candidate.GetProperty("userId").GetInt64()==a.Id&&candidate.GetProperty("email").GetString()==a.Email&&candidate.GetProperty("mobile").GetString()==a.Mobile,"lookup canonical details");
    Check(candidate.GetProperty("selectable").GetBoolean(),"eligible lookup selectable");
    var split=await Post("/api/v1/faculty/account-lookup",new{email=a.Email,mobile=b.Mobile},admin.Id);
    Check(split.Json.GetProperty("data").GetProperty("items").GetArrayLength()==2,"split contacts show two scoped candidates");
    foreach(var x in new[]{cross,unscoped,deleted})
    {
        var hidden=await Post("/api/v1/faculty/account-lookup",new{email=x.Email,mobile=x.Mobile},admin.Id);
        var d=hidden.Json.GetProperty("data");
        Check(hidden.Status==200&&d.GetProperty("items").GetArrayLength()==0&&!d.GetProperty("canCreateNewAccount").GetBoolean()&&d.GetProperty("hasUnavailableMatches").GetBoolean(),"hidden account not leaked/available: "+x.Id);
        Check(!hidden.Json.ToString().Contains(x.Email),"hidden canonical email not returned: "+x.Id);
    }
    var inactiveLookup=await Post("/api/v1/faculty/account-lookup",new{email=inactive.Email},admin.Id);
    Check(!inactiveLookup.Json.GetProperty("data").GetProperty("items")[0].GetProperty("selectable").GetBoolean(),"inactive candidate disabled");
    await ExpectConflict(Create(a,mobile:"9999999999"),"USER_EMAIL_MATCH","email-only create conflict");
    await ExpectConflict(Create(a,email:"unused@example.invalid"),"USER_MOBILE_MATCH","mobile-only create conflict");
    await ExpectConflict(Create(a,mobile:b.Mobile),"USER_CONTACTS_DIFFERENT_ACCOUNTS","split contacts conflict");
    await ExpectConflict(Create(a),"USER_SELECTION_REQUIRED","both contacts require explicit selection");
    await ExpectConflict(Create(a,a.Id,mobile:b.Mobile),"USER_CONTACT_MISMATCH","explicit selection cannot bypass contact check");
    await ExpectConflict(Create(cross,cross.Id),"USER_ACCOUNT_UNAVAILABLE","cross-college selection denied");
    await ExpectConflict(Create(unscoped,unscoped.Id),"USER_ACCOUNT_UNAVAILABLE","unassigned account selection denied");
    await ExpectConflict(Create(deleted,deleted.Id),"USER_ACCOUNT_UNAVAILABLE","deleted account selection denied");
    await ExpectConflict(Create(inactive,inactive.Id),"USER_INACTIVE","inactive selection denied");
    var incompleteLookup=await Post("/api/v1/faculty/account-lookup",new{email=missing.Email},admin.Id);
    var incompleteItem=incompleteLookup.Json.GetProperty("data").GetProperty("items")[0];
    Check(!incompleteItem.GetProperty("selectable").GetBoolean()&&incompleteItem.GetProperty("unavailableCode").GetString()=="USER_CONTACTS_INCOMPLETE","missing canonical contact disables candidate");
    await ExpectConflict(Create(missing,missing.Id),"USER_CONTACTS_INCOMPLETE","missing canonical contact cannot be replaced during create");
    Check((await Post("/api/v1/faculty",Create(a,a.Id),nonAdmin.Id)).Status==403,"non-admin linking denied");
    Check((await Post("/api/v1/faculty/account-lookup",new{collegeId=other,email=cross.Email},admin.Id)).Status==403,"cross-college body denied");
    Check((await Post("/api/v1/faculty/account-lookup?collegeId="+other,new{email=cross.Email},admin.Id)).Status==403,"cross-college query denied");
    Check((await Post("/api/v1/faculty/account-lookup",new{email=a.Email},super.Id)).Status==400,"super admin must select a college");
    Check((await Post("/api/v1/faculty/account-lookup",new{collegeId=college,email=a.Email},super.Id)).Status==200,"super admin explicit college supported");
    Check((await Post("/api/v1/faculty/account-lookup?collegeId="+college,new{collegeId=other,email=a.Email},super.Id)).Status==400,"query/body college mismatch rejected");
    var selected=await Post("/api/v1/faculty",Create(a,a.Id,email:a.Email.ToUpperInvariant()),admin.Id);
    Check(selected.Status==201&&selected.Json.GetProperty("data").GetProperty("userId").GetInt64()==a.Id,"explicit canonical selection creates faculty");
    Check(selected.Json.GetProperty("data").GetProperty("accountResolution").GetString()=="explicit-selection","selected response resolution");
    Check(await sql.ExecuteScalarAsync<string>("SELECT password_hash FROM users WHERE user_id=@id",new{id=a.Id})=="test-hash-unchanged","existing password preserved");
    Check(await sql.ExecuteScalarAsync<string>("SELECT official_email FROM faculty WHERE user_id=@id",new{id=a.Id})==a.Email,"faculty stores canonical email");
    await ExpectConflict(Create(a,a.Id),"FACULTY_USER_ALREADY_LINKED","duplicate faculty rejected");
    await sql.ExecuteAsync("UPDATE faculty SET status=0,deleted_at=UTC_TIMESTAMP() WHERE user_id=@id",new{id=a.Id});
    await ExpectConflict(Create(a,a.Id),"FACULTY_USER_ALREADY_LINKED","inactive/deleted faculty retains one-user constraint");
    var linkedLookup=await Post("/api/v1/faculty/account-lookup",new{email=a.Email},admin.Id);
    Check(linkedLookup.Json.GetProperty("data").GetProperty("items")[0].GetProperty("unavailableCode").GetString()=="FACULTY_USER_ALREADY_LINKED","linked lookup explains disabled candidate");
    var fresh=new Account(0,$"fresh.{tag}@example.invalid","9888888871");
    var freshLookup=await Post("/api/v1/faculty/account-lookup",new{email=fresh.Email,mobile=fresh.Mobile},admin.Id);
    Check(freshLookup.Json.GetProperty("data").GetProperty("canCreateNewAccount").GetBoolean(),"both unused contacts allow new account");
    var singleLookup=await Post("/api/v1/faculty/account-lookup",new{email=fresh.Email},admin.Id);
    Check(!singleLookup.Json.GetProperty("data").GetProperty("canCreateNewAccount").GetBoolean(),"single unused contact insufficient to declare both unused");
    var freshCreated=await Post("/api/v1/faculty",Create(fresh),admin.Id);
    Check(freshCreated.Status==201&&freshCreated.Json.GetProperty("data").GetProperty("accountResolution").GetString()=="new-account","two unused contacts create new account");
    var freshId=freshCreated.Json.GetProperty("data").GetProperty("userId").GetInt64();
    Check(await sql.ExecuteScalarAsync<long>("SELECT college_id FROM users WHERE user_id=@id",new{id=freshId})==college,"new account college");
    Check(setup.Count==1,"new account setup invoked on mocked service only");
    var invalidFresh=new Account(0,$"rollback.{tag}@example.invalid","9888888872");
    var before=await sql.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM users");
    Check((await Post("/api/v1/faculty",Create(invalidFresh,profile:long.MaxValue),admin.Id)).Status==400,"post-user validation failure rejected");
    Check(await sql.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM users")==before,"failed create rolls back orphan user");
    var race=await Account(college);
    var raced=await Task.WhenAll(Post("/api/v1/faculty",Create(race,race.Id),admin.Id),Post("/api/v1/faculty",Create(race,race.Id),admin.Id));
    Check(raced.Count(r=>r.Status==201)==1&&raced.Count(r=>r.Status==409&&r.Json.GetProperty("code").GetString()=="FACULTY_USER_ALREADY_LINKED")==1,"concurrent explicit link: one created, one linked conflict");
    var newRace=new Account(0,$"race.{tag}@example.invalid","9888888873");
    var newRaced=await Task.WhenAll(Post("/api/v1/faculty",Create(newRace),admin.Id),Post("/api/v1/faculty",Create(newRace),admin.Id));
    Check(newRaced.Count(r=>r.Status==201)==1&&newRaced.Count(r=>r.Status==409&&r.Json.GetProperty("code").GetString()=="USER_SELECTION_REQUIRED")==1,"concurrent new account: one created, actionable contact conflict");
    Check(await sql.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users WHERE email=@email",new{email=newRace.Email})==1,"concurrent contact uniqueness preserved");
    await sql.ExecuteAsync("UPDATE role_permissions SET can_create=0 WHERE role_id=@role AND college_id=@college AND module_key='faculty_directory'",new{role=adminRole,college});
    Check((await Post("/api/v1/faculty/account-lookup",new{email=b.Email},admin.Id)).Status==403,"live permission revoke blocks existing session");
    await sql.ExecuteAsync("UPDATE role_permissions SET can_create=1 WHERE role_id=@role AND college_id=@college AND module_key='faculty_directory'",new{role=adminRole,college});
    await sql.ExecuteAsync("UPDATE user_roles SET status=0 WHERE user_id=@id AND role_id=@role",new{id=admin.Id,role=adminRole});
    Check((await Post("/api/v1/faculty/account-lookup",new{email=b.Email},admin.Id)).Status==403,"inactive admin assignment denied");
    Console.WriteLine($"PASS: {checks.Count} assertions. Real HTTP/model binding, live RBAC and MySQL 8 transactions/unique constraints. Authentication and outbound mail were mocked.");
    foreach(var check in checks)Console.WriteLine("PASS: "+check);
}
finally{await app.StopAsync();}

sealed record Account(long Id,string Email,string Mobile);
sealed class TestIdentity(IOptionsMonitor<AuthenticationSchemeOptions> options,ILoggerFactory logger,UrlEncoder encoder)
    :AuthenticationHandler<AuthenticationSchemeOptions>(options,logger,encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()=>Task.FromResult(
        long.TryParse(Request.Headers["X-Test-User"],out var id)
        ? AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier,id.ToString())],"Test")),"Test"))
        : AuthenticateResult.NoResult());
}
sealed class MailCapture:IEmailService
{
    public Task SendEmailAsync(string to,string subject,string body)=>Task.CompletedTask;
    public Task SendOtpEmailAsync(string to,string otp,string purpose)=>throw new NotSupportedException();
}
sealed class SetupCapture:IAccountSetupService
{
    public int Count;
    public Task SendSetupLinkAsync(long userId,string type){Interlocked.Increment(ref Count);return Task.CompletedTask;}
    public Task SendPasswordResetLinkAsync(long userId,string type)=>throw new NotSupportedException();
    public Task<(bool Success,string Message)> CompleteSetupAsync(string login,string token,string password,string confirm)=>throw new NotSupportedException();
}
