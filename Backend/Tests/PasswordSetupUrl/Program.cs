using BTech.Services;
using BTech.UserAccess;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.FileProviders;

static IConfiguration Config(string? primary = null, string? fallback = null) =>
    new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["PasswordSetup:BaseUrl"] = primary,
        ["Frontend:BaseUrl"] = fallback
    }).Build();
static void Equal(string expected, string actual)
{
    if (actual != expected) throw new Exception($"Expected {expected}, got {actual}");
}
static void Reject(IConfiguration config, string environment)
{
    try { PasswordSetupUrl.Resolve(config, new TestEnvironment(environment)); }
    catch (AccessSetupException) { return; }
    throw new Exception("Expected invalid origin to be rejected.");
}
var dev = new TestEnvironment(Environments.Development);
var production = new TestEnvironment(Environments.Production);
Equal("http://localhost:5173", PasswordSetupUrl.Resolve(Config(), dev));
Equal("http://localhost:5173", PasswordSetupUrl.Resolve(Config(" http://localhost:5173/ "), dev));
Equal("https://frontend.example.org", PasswordSetupUrl.Resolve(Config("https://frontend.example.org/"), production));
Equal("https://frontend.example.org", PasswordSetupUrl.Resolve(Config(null, "https://frontend.example.org"), production));
Equal("https://primary.example.org", PasswordSetupUrl.Resolve(Config("https://primary.example.org", "https://fallback.example.org"), production));
Reject(Config(), Environments.Production);
Reject(Config("http://localhost:5173"), Environments.Production);
Reject(Config("https://localhost:5173"), Environments.Production);
Reject(Config("http://frontend.example.org"), Environments.Development);
Reject(Config("https://frontend.example.org/path"), Environments.Production);
Reject(Config("https://frontend.example.org?token=bad"), Environments.Production);
Reject(Config("https://user:secret@frontend.example.org"), Environments.Production);
Equal("http://localhost:5173/activate-account?loginId=admin%2Btest%40example.org&token=test%20token%2B",
    PasswordSetupUrl.BuildLink("http://localhost:5173", "admin+test@example.org", "test token+"));
var previous = Environment.GetEnvironmentVariable("UA_TEST_PasswordSetup__BaseUrl");
try
{
    Environment.SetEnvironmentVariable("UA_TEST_PasswordSetup__BaseUrl", "https://env.example.org");
    var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["PasswordSetup:BaseUrl"] = "https://file.example.org" }).AddEnvironmentVariables("UA_TEST_").Build();
    Equal("https://env.example.org", PasswordSetupUrl.Resolve(config, production));
}
finally { Environment.SetEnvironmentVariable("UA_TEST_PasswordSetup__BaseUrl", previous); }
Console.WriteLine("PASS: URL defaults, normalization, environment override, production validation and link encoding.");

sealed class TestEnvironment(string name) : IHostEnvironment
{
    public string EnvironmentName { get; set; } = name;
    public string ApplicationName { get; set; } = "PasswordSetupUrlTests";
    public string ContentRootPath { get; set; } = ".";
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
