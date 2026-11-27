using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BTech.Controllers;
using BTech.Data;
using BTech.Middleware;
using BTech.Models;
using BTech.Repositories;
using BTech.Repositories.Implementations;
using BTech.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

const string route = "/api/v1/auth/forgot-password";
const string email = "person@example.edu";
const string newPassword = "NewPass123!";
var delivery = new MockEmail();
var auditLog = new ApiLogCapture();
var builder = WebApplication.CreateBuilder();
builder.WebHost.UseUrls("http://127.0.0.1:0");
builder.Logging.ClearProviders();
builder.Logging.AddProvider(auditLog);
builder.Configuration["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=unused";
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseInMemoryDatabase("forgot-password-tests"));
builder.Services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly).AddControllersAsServices();
builder.Services.AddScoped<AuthController>(services =>
{
    var context = services.GetRequiredService<ApplicationDbContext>();
    var auth = new AuthService(null!, new UserRepository(context), null!, null!,
        new LoginAuditRepository(context), null!, null!, new OtpVerificationRepository(context), delivery);
    return new AuthController(null!, auth, null!, null!);
});
builder.Services.AddSingleton<IEmailService>(delivery);
await using var app = builder.Build();
app.UseRouting();
app.UseMiddleware<ApiConsoleLoggingMiddleware>();
app.UseMiddleware<ModulePermissionMiddleware>();
app.MapControllers();
await app.StartAsync();
using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };

async Task<T> Database<T>(Func<ApplicationDbContext, Task<T>> action)
{
    using var scope = app.Services.CreateScope();
    return await action(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>());
}

await Database(async db =>
{
    db.Users.AddRange(
        new User { user_id = 1, EmployeeUserId = "E1", Email = email, Status = 1 },
        new User { user_id = 2, EmployeeUserId = "E2", Email = "inactive@example.edu", Status = 0 });
    return await db.SaveChangesAsync();
});

foreach (var body in new[]
{
    "{}", "{\"email\":\"person@example.edu\"}", "{\"identifier\":null}", "{\"identifier\":\"  \"}",
    "{\"identifier\":\"not-an-email\"}", "{\"identifier\":\"Name <person@example.edu>\"}", "{"
})
{
    using var invalid = await client.PostAsync(route, new StringContent(body, Encoding.UTF8, "application/json"));
    Check(invalid.StatusCode == HttpStatusCode.BadRequest, "Invalid JSON or email must return 400.");
}
Check(delivery.Attempts == 0, "Invalid requests must not send email.");
Check(await Database(db => db.OtpVerifications.CountAsync()) == 0, "Invalid requests must not store OTPs.");

using var unknown = await client.PostAsJsonAsync(route, new { identifier = "unknown@example.edu" });
using var inactive = await client.PostAsJsonAsync(route, new { identifier = "inactive@example.edu" });
var genericBody = await unknown.Content.ReadAsStringAsync();
Check(unknown.IsSuccessStatusCode && inactive.IsSuccessStatusCode &&
    await inactive.Content.ReadAsStringAsync() == genericBody && delivery.Attempts == 0,
    "Unknown and inactive accounts must share a generic response and send nothing.");
Check(await Database(db => db.LoginAudits.CountAsync(audit => audit.LoginStatus == "FAILED")) == 2,
    "Unknown and inactive accounts must still be audited.");

var sendGate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
delivery.PendingAcceptance = sendGate.Task;
var request = client.PostAsJsonAsync(route, new { identifier = $" {email} " });
await delivery.Started.Task.WaitAsync(TimeSpan.FromSeconds(10));
Check(!request.IsCompleted, "The response must wait for email delivery.");
sendGate.SetResult();
using var accepted = await request;
var sentBody = await accepted.Content.ReadAsStringAsync();
var sent = delivery.LastMessage!.Value;
Check(accepted.StatusCode == HttpStatusCode.OK && sentBody == genericBody, "Success must use the same response as an unknown account.");
Check(sent.Recipient == email && sent.Purpose == "PASSWORD_RESET" && sent.Code.Length == 6,
    "The reset code is delivered to the account email.");
Check(!sentBody.Contains(sent.Code, StringComparison.Ordinal), "The response must not include the code.");
var issued = await Database(db => db.OtpVerifications.SingleAsync());
Check(issued.OtpHash != sent.Code && BCrypt.Net.BCrypt.Verify(sent.Code, issued.OtpHash), "Only the BCrypt hash is stored.");
Check(issued.ExpiresAt - issued.CreatedAt == TimeSpan.FromMinutes(10) && issued.Attempts == 0 && issued.MaxAttempts == 5,
    "The reset expiry and attempt limits remain consistent.");
Check(await Database(db => db.LoginAudits.CountAsync(audit => audit.LoginStatus == "SUCCESS")) == 1,
    "Successful issuance must be audited.");

var incorrect = sent.Code == "100000" ? "100001" : "100000";
using var wrong = await client.PostAsJsonAsync("/api/otp/verify", new { email, otpCode = incorrect, purpose = sent.Purpose });
using var missing = await client.PostAsJsonAsync("/api/otp/verify", new { email = "unknown@example.edu", otpCode = incorrect, purpose = sent.Purpose });
Check(wrong.StatusCode == HttpStatusCode.BadRequest && missing.StatusCode == HttpStatusCode.BadRequest &&
    await wrong.Content.ReadAsStringAsync() == await missing.Content.ReadAsStringAsync(), "Failed reset verification does not disclose account state.");
Check(await Database(db => db.OtpVerifications.Select(row => row.Attempts).SingleAsync()) == 1,
    "A wrong code counts toward the attempt limit.");
using var verified = await client.PostAsJsonAsync("/api/otp/verify", new { email, otpCode = sent.Code, purpose = sent.Purpose });
Check(verified.IsSuccessStatusCode, "The emailed BCrypt OTP can be verified anonymously.");
var passwordReset = new { contact = email, otp = sent.Code, password = newPassword };
using var reset = await client.PostAsJsonAsync("/api/otp/reset-password", passwordReset);
Check(reset.IsSuccessStatusCode && BCrypt.Net.BCrypt.Verify(newPassword,
    await Database(db => db.Users.Where(row => row.user_id == 1).Select(row => row.PasswordHash).SingleAsync())),
    "The verified code resets the password.");
using var reused = await client.PostAsJsonAsync("/api/otp/reset-password", passwordReset);
Check(reused.StatusCode == HttpStatusCode.BadRequest, "The reset code can only be used once.");

delivery.Fail = true;
using var rejected = await client.PostAsJsonAsync(route, new { identifier = email });
var failedBody = await rejected.Content.ReadAsStringAsync();
using var failure = JsonDocument.Parse(failedBody);
Check(rejected.StatusCode == HttpStatusCode.ServiceUnavailable && !failure.RootElement.GetProperty("success").GetBoolean(),
    "Rejected email must return a failure response.");
Check(!failedBody.Contains(delivery.LastMessage!.Value.Code, StringComparison.Ordinal), "SMTP details and the code must not leak.");
var rejectedOtp = await Database(db => db.OtpVerifications.OrderByDescending(row => row.OtpVerificationId).FirstAsync());
Check(rejectedOtp.Status == 0 && rejectedOtp.ExpiresAt <= DateTime.UtcNow, "An undelivered OTP must be invalidated.");
Check(await Database(db => db.LoginAudits.AnyAsync(audit => audit.LoginStatus == "FAILED" &&
    audit.FailureReason == "Password reset OTP email delivery failed")), "Delivery failure must be audited without SMTP details.");
Check(auditLog.Messages.Any(message => message.Contains("<OTP request body omitted>", StringComparison.Ordinal)) &&
    auditLog.Messages.Any(message => message.Contains("<OTP response body omitted>", StringComparison.Ordinal)) &&
    auditLog.Messages.All(message => !message.Contains(sent.Code, StringComparison.Ordinal) &&
        !message.Contains(delivery.LastMessage!.Value.Code, StringComparison.Ordinal)),
    "OTP routes log request metadata without logging secret values.");
Console.WriteLine("PASS: forgot-password validation, generic responses, mocked delivery and failure, OTP verification, audit, and password reset.");

static void Check(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

sealed class MockEmail : IEmailService
{
    public bool Fail { get; set; }
    public int Attempts { get; private set; }
    public Task PendingAcceptance { get; set; } = Task.CompletedTask;
    public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public (string Recipient, string Code, string Purpose)? LastMessage { get; private set; }

    public async Task SendOtpEmailAsync(string recipientEmail, string otp, string purpose)
    {
        Attempts++;
        LastMessage = (recipientEmail, otp, purpose);
        Started.TrySetResult();
        await PendingAcceptance;
        if (Fail) throw new InvalidOperationException($"Simulated mail-provider error containing {otp}.");
    }

    public Task SendEmailAsync(string recipientEmail, string subject, string body) => throw new NotSupportedException();
}

sealed class ApiLogCapture : ILoggerProvider
{
    public ConcurrentQueue<string> Messages { get; } = new();
    public ILogger CreateLogger(string categoryName) => new CaptureLogger(
        categoryName == typeof(ApiConsoleLoggingMiddleware).FullName ? Messages : null);
    public void Dispose() { }

    private sealed class CaptureLogger(ConcurrentQueue<string>? messages) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => messages is not null;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => messages?.Enqueue(formatter(state, exception));
    }
}
