using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using BTech.DTOs.College;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using BTech.Services.Invitations;
using BTech.UserAccess;
using MySqlConnector;
using static BTech.Services.Implementations.CollegeService;

namespace BTech.Services.Implementations;

public sealed class SuperAdminCollegeService(
    ICollegeRepository collegeRepository,
    ISuperAdminCollegeRepository onboardingRepository,
    IHttpContextAccessor http,
    AccountInvitationService invitations,
    IEmailService emailSender,
    ILogger<SuperAdminCollegeService> logger) : ISuperAdminCollegeService
{
    public async Task<CollegeOnboardingResult> CreateCollegeAsync(SuperAdminCreateCollegeDto dto)
    {
        var userId = RequireSuperAdmin();
        var traceId = http.HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString("N");
        var collegeEmail = RequireEmail(dto.Email, "College email");
        var adminEmail = RequireEmail(
            NormalizeOptional(dto.AdminEmail) ?? NormalizeOptional(dto.PrincipalEmail) ?? collegeEmail,
            "Administrator email");
        var adminName = NormalizeOptional(dto.AdminName) ?? NormalizeOptional(dto.Principal) ?? "College Administrator";
        if (adminName.Length > 150)
            throw new ArgumentException("The administrator name must be 150 characters or fewer.");
        var codeExists =
            await collegeRepository.ExistsCodeAsync(
                dto.EffectiveCollegeCode);

        if (codeExists)
        {
            throw new InvalidOperationException(
                $"College with code " +
                $"'{dto.EffectiveCollegeCode}' " +
                "already exists.");
        }

        var college =
            new College
            {
                CollegeCode =
                    dto.EffectiveCollegeCode,

                CollegeName =
                    dto.EffectiveCollegeName,

                CollegeType =
                    dto.EffectiveCollegeType,

                UniversityName =
                    dto.EffectiveUniversityName,

                Email =
                    collegeEmail,

                Mobile =
                    dto.EffectiveMobile,

                Phone =
                    dto.Phone,

                Principal =
                    NormalizeOptional(dto.Principal),

                PrincipalEmail =
                    NormalizeOptional(dto.PrincipalEmail),

                PrincipalContact =
                    NormalizeOptional(dto.PrincipalContact),

                AlternateContactNumber =
                    NormalizeOptional(
                        dto.AlternateContactNumber),

                AccreditationStatus =
                    NormalizeOptional(
                        dto.AccreditationStatus),

                AccreditationBody =
                    NormalizeOptional(
                        dto.AccreditationBody),

                AccreditationGrade =
                    NormalizeOptional(
                        dto.AccreditationGrade),

                AccreditationNumber =
                    NormalizeOptional(
                        dto.AccreditationNumber),

                ValidFrom =
                    dto.ValidFrom,

                ValidUntil =
                    dto.ValidUntil,

                AddressLine1 =
                    dto.EffectiveAddressLine1,

                AddressLine2 =
                    dto.AddressLine2,

                City =
                    dto.City,

                Area =
                    NormalizeOptional(dto.Area),

                District =
                    NormalizeOptional(dto.District),

                State =
                    dto.State,

                Country =
                    dto.Country,

                Pincode =
                    dto.Pincode,

                Website =
                    dto.Website,

                AcademicYearId =
                    dto.AcademicYearId,

                Timezone =
                    dto.Timezone,

                CurrencyCode =
                    dto.CurrencyCode,

                LogoPath =
                    dto.EffectiveLogoPath,

                Status =
                    1,

                CreatedAt =
                    DateTime.UtcNow,

                CreatedBy =
                    userId
            };

        invitations.ValidateConfiguration();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(
            Convert.ToHexString(RandomNumberGenerator.GetBytes(32)), 12);
        var internalId = "SYS_" + Guid.NewGuid().ToString("N");
        var placeholderHash = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

        (College College, long AdminUserId) created;
        try
        {
            created = await onboardingRepository.AddWithAdministratorAsync(
                college, adminName, adminEmail, passwordHash, internalId, placeholderHash, traceId);
        }
        catch (MySqlException ex) when (ex.Number == 31001)
        {
            throw new AccessSetupException("An active global COLLEGE_ADMIN role is required to onboard a college.");
        }
        catch (MySqlException ex) when (ex.Number == 31002 ||
            (ex.Number == 1062 && ex.Message.Contains("uq_users_email", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("The administrator email is already assigned to a user. Use a different administrator email.");
        }

        logger.LogInformation("College and administrator created. CollegeId={CollegeId}, AdminUserId={AdminUserId}, CorrelationId={CorrelationId}",
            created.College.CollegeId, created.AdminUserId, traceId);

        var adminEmailStatus = await SendAdminInvitationAsync(created.AdminUserId, traceId);
        var collegeEmailStatus = await SendCollegeWelcomeEmailAsync(created.College.CollegeId, traceId);
        return new(MapToResponseDto(created.College), created.AdminUserId, adminEmailStatus, collegeEmailStatus ?? "not_available");
    }

    public Task<string?> RetryCollegeWelcomeEmailAsync(long collegeId)
    {
        RequireSuperAdmin();
        var traceId = http.HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString("N");
        return SendCollegeWelcomeEmailAsync(collegeId, traceId);
    }

    private long RequireSuperAdmin()
    {
        var scope = CollegeManagementScope.From(http.HttpContext);
        if (!scope.IsSuperAdmin)
            throw new BTech.Exceptions.ForbiddenException("Only Super Admin can onboard colleges or resend their welcome email.");
        return scope.UserId;
    }

    private static string RequireEmail(string? value, string label)
    {
        var email = value?.Trim();
        if (email is null || !MailAddress.TryCreate(email, out var address) ||
            !string.Equals(address.Address, email, StringComparison.Ordinal))
            throw new ArgumentException($"{label} must be a valid email address.");
        return email;
    }

    private async Task<string> SendAdminInvitationAsync(long userId, string traceId)
    {
        try
        {
            await invitations.SendAsync(userId, "College Administrator");
            return "sent";
        }
        catch (AccountInvitationDeliveryException ex)
        {
            return ex.DeliveryStatus;
        }
        catch (Exception ex)
        {
            logger.LogError("Administrator setup email could not start. AdminUserId={AdminUserId}, CorrelationId={CorrelationId}, ErrorType={ErrorType}, MySqlCode={MySqlCode}",
                userId, traceId, ex.GetType().Name, (ex as MySqlException)?.Number);
            return "not_started";
        }
    }

    private async Task<string?> SendCollegeWelcomeEmailAsync(long collegeId, string traceId)
    {
        var lease = Guid.NewGuid().ToString("N");
        try
        {
            var notice = await onboardingRepository.ClaimWelcomeEmailAsync(collegeId, lease);
            if (notice is null)
                return null;

            var (status, email, collegeName) = notice.Value;
            if (status != "claimed")
                return status;

            var sent = false;
            try
            {
                await emailSender.SendEmailAsync(email, "CMS BTech organization created",
                    $"<h2>Welcome to CMS BTech</h2><p>{WebUtility.HtmlEncode(collegeName)} was registered as a college in CMS BTech.</p><p>Your assigned College Administrator can set a password using their separate account setup email.</p>");
                sent = true;
            }
            catch (Exception ex)
            {
                logger.LogError("College welcome email failed. CollegeId={CollegeId}, CorrelationId={CorrelationId}, ErrorType={ErrorType}, ProviderCode={ProviderCode}",
                    collegeId, traceId, ex.GetType().Name, (ex as EmailDeliveryException)?.ProviderCode);
            }

            if (!await onboardingRepository.FinishWelcomeEmailAsync(collegeId, lease, sent))
                throw new InvalidOperationException("The welcome email delivery state could not be recorded.");

            logger.LogInformation("College welcome email attempt recorded. CollegeId={CollegeId}, CorrelationId={CorrelationId}, SmtpAccepted={SmtpAccepted}",
                collegeId, traceId, sent);
            return sent ? "sent" : "failed";
        }
        catch (Exception ex)
        {
            logger.LogError("College welcome email status could not be confirmed. CollegeId={CollegeId}, CorrelationId={CorrelationId}, ErrorType={ErrorType}, MySqlCode={MySqlCode}",
                collegeId, traceId, ex.GetType().Name, (ex as MySqlException)?.Number);
            return "unknown";
        }
    }
}
