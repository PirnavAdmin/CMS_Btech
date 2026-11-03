using System.Security.Cryptography;
using BTech.Data;
using BTech.DTOs.Faculty;
using BTech.Helpers;
using BTech.Models;
using BTech.Services;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/faculty")]
[Authorize]
public class FacultyCreateController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IAccountSetupService _accountSetupService;
    private readonly ILogger<FacultyCreateController> _logger;
    private readonly IWebHostEnvironment _environment;

    public FacultyCreateController(ApplicationDbContext context, IEmailService emailService,
        IAccountSetupService accountSetupService,
        ILogger<FacultyCreateController> logger, IWebHostEnvironment environment)
    {
        _context=context;
        _emailService=emailService;
        _accountSetupService=accountSetupService;
        _logger=logger;
        _environment=environment;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FacultyCreateDto request, [FromQuery] long? collegeId)
    {
        try
        {
            request.CollegeId=CollegeSelection.Resolve(collegeId, request.CollegeId == 0 ? null : request.CollegeId)
                ?? throw new ArgumentException("CollegeId is required.");
            return await CreateCore(request);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success=false, message=ex.Message });
        }
        catch (DbUpdateException ex) when (ex.InnerException is MySqlException db && db.Number == 1062)
        {
            // The transaction has rolled back before handling a concurrent uniqueness failure.
            _context.ChangeTracker.Clear();
            _logger.LogWarning("Concurrent faculty/user uniqueness conflict. RequestedUserId={UserId}, CollegeId={CollegeId}, CorrelationId={CorrelationId}",
                request.UserId,request.CollegeId,HttpContext.TraceIdentifier);
            var email=request.OfficialEmail.Trim().ToLowerInvariant();
            var resolved=request.UserId > 0 ? request.UserId : await _context.Users
                .Where(u => u.Email == email).Select(u => u.user_id).FirstOrDefaultAsync();
            var conflict=await _context.Faculties.AsNoTracking().FirstOrDefaultAsync(f => f.UserId == resolved);
            if (conflict is not null) return LinkConflict(conflict,request.UserId,request.CollegeId,"concurrent-create");
            return Conflict(new { success=false, code="FACULTY_UNIQUE_CONFLICT",
                message="Faculty code, employee ID, email or mobile already exists. Check the existing account before retrying.",
                correlationId=HttpContext.TraceIdentifier });
        }
    }

    private async Task<IActionResult> CreateCore(FacultyCreateDto request)
    {
        var officialEmail=request.OfficialEmail.Trim().ToLowerInvariant();
        var mobile=request.Mobile.Trim();
        var facultyCode=request.FacultyCode.Trim();
        if (request.UserId < 0 || request.DepartmentId <= 0 || string.IsNullOrWhiteSpace(request.FacultyName)
            || facultyCode.Length == 0 || mobile.Length == 0)
            return BadRequest(new { success=false, message="Valid userId, department, faculty code, faculty name and mobile are required. Use userId 0 to create or resolve an account." });
        _logger.LogInformation("Faculty create requested. RequestedUserId={UserId}, CollegeId={CollegeId}, DepartmentId={DepartmentId}",
            request.UserId,request.CollegeId,request.DepartmentId);

        var college=await _context.Colleges.AsNoTracking().FirstOrDefaultAsync(x =>
            x.CollegeId == request.CollegeId && x.DeletedAt == null && x.Status == 1);
        if (college is null) return BadRequest(new { success=false, message="Active college not found." });
        var department=await _context.Departments.AsNoTracking().FirstOrDefaultAsync(x =>
            x.DepartmentId == request.DepartmentId && x.CollegeId == request.CollegeId && x.DeletedAt == null && x.Status == 1);
        if (department is null) return BadRequest(new { success=false, message="Active department not found in the selected college." });
        if (await _context.Faculties.AnyAsync(x => x.FacultyCode == facultyCode))
            return Conflict(new { success=false, code="FACULTY_CODE_EXISTS", message="Faculty code already exists, including inactive or deleted records." });

        // User and faculty must commit together. Failed linking must not leave an orphan account.
        await using var transaction=await _context.Database.BeginTransactionAsync();
        User? user;
        var resolution=request.UserId > 0 ? "userId" : "email-and-mobile";
        if (request.UserId == 0)
        {
            // Do not silently select the first email OR mobile match. Both supplied contacts
            // must identify the same account before it can be automatically reused.
            var emailUser=await _context.Users.FirstOrDefaultAsync(x => x.Email == officialEmail);
            var mobileUser=await _context.Users.FirstOrDefaultAsync(x => x.Mobile == mobile);
            if (emailUser is not null && mobileUser is not null && emailUser.user_id != mobileUser.user_id)
                return IdentityConflict("The email and mobile belong to different user accounts. Correct the details or select the intended userId.",emailUser.user_id,"different-accounts");
            user=emailUser ?? mobileUser;
            if (user is not null && (emailUser is null || mobileUser is null))
                return IdentityConflict("Only one contact matches an existing account. The backend will not automatically reuse it. Correct the email/mobile or select the intended userId.",user.user_id,emailUser is null ? "mobile-only" : "email-only");
        }
        else
        {
            user=await _context.Users.FirstOrDefaultAsync(x => x.user_id == request.UserId);
            if (user is null) return BadRequest(new { success=false, message="User not found." });
        }
        if (user is not null)
        {
            // Keep the database's established global uq_faculty_user_id contract.
            var existing=await _context.Faculties.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == user.user_id);
            if (existing is not null) return LinkConflict(existing,request.UserId,request.CollegeId,resolution);
            if (user.DeletedAt.HasValue || user.Status != 1)
                return IdentityConflict("The selected user is inactive or deleted. Restore/reactivate the existing account before linking it.",user.user_id,resolution);
            if (user.college_id.HasValue && user.college_id != request.CollegeId)
                return IdentityConflict("The selected user belongs to a different college. Select an account for this college.",user.user_id,resolution);
            if (!string.Equals(user.Email?.Trim(),officialEmail,StringComparison.OrdinalIgnoreCase) || user.Mobile?.Trim() != mobile)
                return IdentityConflict("The submitted email/mobile do not match the selected userId. Verify the selected account.",user.user_id,resolution);
        }
        else
        {
            // Never email a reusable/default password. The random initial secret is
            // not disclosed; the faculty member sets their own password from the email link.
            var initialSecret=Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
            user=new User
            {
                college_id=request.CollegeId,
                EmployeeUserId=$"USR{Guid.NewGuid():N}",
                FullName=request.FacultyName.Trim(),Email=officialEmail,Mobile=mobile,
                PasswordHash=BCrypt.Net.BCrypt.HashPassword(initialSecret, workFactor: 12),
                MustChangePassword=true,
                Status=1,CreatedAt=DateTime.UtcNow,CreatedBy=GetCurrentUserId()
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            resolution="new-account";
        }
        if (request.EmployeeProfileId > 0 && !await _context.EmployeeProfiles.AnyAsync(x =>
            x.EmployeeProfileId == request.EmployeeProfileId && x.UserId == user.user_id && x.DeletedAt == null))
            return BadRequest(new { success=false, message="Employee profile does not belong to the selected user." });
        var faculty=new Faculty
        {
            UserId=user.user_id,EmployeeProfileId=request.EmployeeProfileId > 0 ? request.EmployeeProfileId : null,
            CollegeId=request.CollegeId,DepartmentId=request.DepartmentId,FacultyCode=facultyCode,
            FacultyName=request.FacultyName.Trim(),Designation=request.Designation,Qualification=request.Qualification,
            Specialization=request.Specialization,ExperienceYears=request.ExperienceYears,EmploymentType=request.EmploymentType,
            DateOfJoining=request.DateOfJoining,OfficialEmail=officialEmail,Mobile=mobile,IsHod=request.IsHod,
            Status=request.Status,CreatedAt=DateTime.UtcNow,CreatedBy=GetCurrentUserId()
        };
        _context.Faculties.Add(faculty);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        _logger.LogInformation("Faculty created. FacultyId={FacultyId}, UserId={UserId}, CollegeId={CollegeId}, Resolution={Resolution}",
            faculty.FacultyId,user.user_id,request.CollegeId,resolution);

        bool emailSent = false;
        string emailMessage = "Welcome email could not be sent.";

        try
        {
            if (faculty.Status == 1 && user.MustChangePassword)
            {
                await _accountSetupService.SendSetupLinkAsync(user.user_id, "faculty");
                emailSent = true;
                emailMessage = "Password setup email sent successfully.";
            }
            else if (faculty.Status == 1)
            {
                var safeName = System.Net.WebUtility.HtmlEncode(faculty.FacultyName);
                var safeLogin = System.Net.WebUtility.HtmlEncode(user.EmployeeUserId);
                var body = $@"<!doctype html><html><body style='font-family:Arial,sans-serif;line-height:1.6'>
<p>Dear {safeName},</p>
<p>Your faculty record has been created in BTech College.</p>
<p><strong>Login ID:</strong> {safeLogin}<br/>
<strong>Faculty Code:</strong> {System.Net.WebUtility.HtmlEncode(faculty.FacultyCode)}<br/>
<strong>Official Email:</strong> {System.Net.WebUtility.HtmlEncode(officialEmail)}<br/>
<strong>Department:</strong> {System.Net.WebUtility.HtmlEncode(department.DepartmentName)}</p>
<p>This email is linked to an existing user account. Use your existing password. If you have forgotten it, use the password recovery option on the login page.</p>
<p>Regards,<br/>BTech College</p></body></html>";

                await _emailService.SendEmailAsync(
                    officialEmail,
                    "BTech College - Faculty Account Linked",
                    body);
                emailSent = true;
                emailMessage = "Faculty account notification sent successfully.";
            }
            else
            {
                emailMessage = "Faculty record created as inactive; password setup email will be sent after activation.";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Faculty created, but account setup/notification email failed. FacultyId={FacultyId}",
                faculty.FacultyId);
            emailMessage = "Faculty created, but the email could not be sent.";
        }


        // ---------------------------------------------------------
        // RESPONSE
        // ---------------------------------------------------------

        return StatusCode(
  StatusCodes.Status201Created,
  new
  {
      success = true,

      message =
  "Faculty created successfully.",

      data = new
      {
          facultyId =
  faculty.FacultyId,

          userId =
  user.user_id,

          employeeUserId =
  user.EmployeeUserId,

          facultyCode =
  faculty.FacultyCode,

          facultyName =
  faculty.FacultyName,

          officialEmail =
  faculty.OfficialEmail,

          designation =
  faculty.Designation,

          department =
  department.DepartmentName
      },

      emailSent,

      emailMessage
  });
    }

    // -------------------------------------------------------------
    // GENERATE TEMPORARY PASSWORD
    // -------------------------------------------------------------

    private IActionResult LinkConflict(Faculty faculty, long requestedUserId, long collegeId, string resolution)
    {
        _logger.LogWarning("Faculty user conflict. RequestedUserId={RequestedUserId}, ResolvedUserId={UserId}, FacultyId={FacultyId}, RequestedCollegeId={CollegeId}, ExistingCollegeId={ExistingCollegeId}, Status={Status}, DeletedAt={DeletedAt}, Resolution={Resolution}",
            requestedUserId, faculty.UserId, faculty.FacultyId, collegeId, faculty.CollegeId, faculty.Status, faculty.DeletedAt, resolution);
        var state=faculty.DeletedAt.HasValue ? "deleted" : faculty.Status == 1 ? "active" : "inactive";
        return Conflict(new { success=false, code="FACULTY_USER_ALREADY_LINKED",
            message=$"This user is already linked to a faculty record ({state}). The current system allows one faculty record per user across all colleges. Use the existing record or select a different user.",
            correlationId=HttpContext.TraceIdentifier,
            conflict=_environment.IsDevelopment() ? new { requestedUserId, userId=faculty.UserId,
                facultyId=faculty.FacultyId, requestedCollegeId=collegeId, collegeId=faculty.CollegeId,
                status=faculty.Status, deletedAt=faculty.DeletedAt, matchedBy=resolution } : null });
    }

    private IActionResult IdentityConflict(string message, long userId, string matchedBy)
    {
        _logger.LogWarning("Faculty identity conflict. UserId={UserId}, MatchedBy={MatchedBy}", userId,matchedBy);
        return Conflict(new { success=false, code="USER_IDENTITY_CONFLICT", message,
            correlationId=HttpContext.TraceIdentifier,
            conflict=_environment.IsDevelopment() ? new { userId, matchedBy } : null });
    }

    private static string GenerateTemporaryPassword()
    {
        const string upper =
        "ABCDEFGHJKLMNPQRSTUVWXYZ";

        const string lower =
        "abcdefghijkmnopqrstuvwxyz";

        const string numbers =
        "23456789";

        const string symbols =
        "@#$%&*!";

        using var random = RandomNumberGenerator.Create();

        char GetRandomChar(string chars)
        {
            var bytes = new byte[4];

            random.GetBytes(bytes);

            var index =
            BitConverter.ToUInt32(bytes, 0)
            % (uint)chars.Length;

            return chars[(int)index];
        }

        var password = new char[12];

        password[0] =
        GetRandomChar(upper);

        password[1] =
        GetRandomChar(lower);

        password[2] =
        GetRandomChar(numbers);

        password[3] =
        GetRandomChar(symbols);

        const string all =
        upper + lower + numbers + symbols;

        for (int i = 4; i < password.Length; i++)
        {
            password[i] =
            GetRandomChar(all);
        }

        // Shuffle
        return new string(
  password
  .OrderBy(_ =>
  RandomNumberGenerator
  .GetInt32(int.MaxValue))
  .ToArray());
    }

    private long? GetCurrentUserId()
    {
        var value =
        User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("user_id")?.Value
        ?? User.FindFirst("sub")?.Value;

        return long.TryParse(
        value,
        out var id)
        ? id
        : null;
    }
}