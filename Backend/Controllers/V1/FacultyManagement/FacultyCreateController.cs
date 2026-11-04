using System.Security.Cryptography;
using BTech.Data;
using BTech.DTOs.Faculty;
using BTech.Helpers;
using BTech.Middleware;
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
    private readonly FacultyAccountResolver _accounts;

    public FacultyCreateController(ApplicationDbContext context, IEmailService emailService,
        IAccountSetupService accountSetupService,
        ILogger<FacultyCreateController> logger, FacultyAccountResolver accounts)
    {
        _context=context;
        _emailService=emailService;
        _accountSetupService=accountSetupService;
        _logger=logger;
        _accounts=accounts;
    }

    [HttpPost("account-lookup")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> LookupAccount([FromBody] FacultyAccountLookupRequest request,
        [FromQuery] long? collegeId, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        try
        {
            var selected = CollegeSelection.Resolve(collegeId, request.CollegeId);
            var scopeError = ResolveCollegeScope(selected, requireAdmin: true, out var authorizedCollege);
            if (scopeError is not null) return scopeError;
            if (!await _context.Colleges.AsNoTracking().AnyAsync(c => c.CollegeId == authorizedCollege
                && c.Status == 1 && c.DeletedAt == null, ct))
                return BadRequest(new { success=false, code="COLLEGE_UNAVAILABLE", message="Active college not found." });
            var result = await _accounts.LookupAsync(authorizedCollege, request.Email, request.Mobile, ct);
            _logger.LogInformation("Faculty account lookup. ActorId={ActorId}, CollegeId={CollegeId}, MatchCode={MatchCode}, CandidateCount={Count}",
                GetCurrentUserId(), authorizedCollege, result.MatchCode, result.Items.Count);
            return Ok(new { success=true, data=result });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success=false, code="INVALID_COLLEGE_SCOPE", message=ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] FacultyCreateDto request, [FromQuery] long? collegeId)
    {
        try
        {
            var selected=CollegeSelection.Resolve(collegeId, request.CollegeId == 0 ? null : request.CollegeId);
            var scopeError=ResolveCollegeScope(selected, requireAdmin: request.UserId > 0, out var authorizedCollege);
            if (scopeError is not null) return scopeError;
            request.CollegeId=authorizedCollege;
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
            var matches=await _accounts.FindContactsAsync(request.OfficialEmail,request.Mobile,HttpContext.RequestAborted);
            if (request.UserId > 0)
            {
                var selected=await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.user_id == request.UserId
                    && u.college_id == request.CollegeId && u.DeletedAt == null);
                if (selected is not null)
                {
                    var conflict=await _context.Faculties.AsNoTracking().FirstOrDefaultAsync(f => f.UserId == selected.user_id);
                    if (conflict is not null) return LinkConflict(conflict,request.UserId,request.CollegeId,"concurrent-create");
                }
            }
            else if (matches.Any) return ContactConflict(matches);
            if (await _context.Faculties.AsNoTracking().AnyAsync(f => f.FacultyCode == request.FacultyCode.Trim()))
                return Conflict(new { success=false, code="FACULTY_CODE_EXISTS", message="Faculty code already exists. Use another code." });
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
            return BadRequest(new { success=false, message="Valid userId, department, faculty code, faculty name and mobile are required. Use userId 0 only for a new account, or explicitly select an existing account using account-lookup." });
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
        await using var transaction=await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
        User? user;
        var resolution=request.UserId > 0 ? "explicit-selection" : "new-account";
        if (request.UserId == 0)
        {
            var matches=await _accounts.FindContactsAsync(officialEmail,mobile,HttpContext.RequestAborted);
            if (matches.Any) return ContactConflict(matches);
            user=null;
        }
        else
        {
            // Serialize linking with contact edits, deactivation and college reassignment.
            // Materialize before LINQ to avoid composing SQL after FOR UPDATE.
            user=(await _context.Users.FromSqlInterpolated($"SELECT * FROM users WHERE user_id={request.UserId} AND college_id={request.CollegeId} FOR UPDATE")
                .AsNoTracking().ToListAsync(HttpContext.RequestAborted)).SingleOrDefault();
            if (user is null || user.DeletedAt.HasValue)
                return IdentityConflict("USER_ACCOUNT_UNAVAILABLE", "The selected account is unavailable in the active college. Look up an account in this college.");
        }
        if (user is not null)
        {
            // Keep the database's established global uq_faculty_user_id contract.
            var existing=await _context.Faculties.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == user.user_id);
            if (existing is not null) return LinkConflict(existing,request.UserId,request.CollegeId,resolution);
            if (user.Status != 1)
                return IdentityConflict("USER_INACTIVE", "The selected account is inactive. Reactivate it through account management before linking.");
            if (string.IsNullOrWhiteSpace(user.Email) || string.IsNullOrWhiteSpace(user.Mobile))
                return IdentityConflict("USER_CONTACTS_INCOMPLETE", "The selected account must have both email and mobile saved before linking. Faculty creation cannot add or correct account contacts. Select another eligible account or resolve its contacts separately.");
            if (!FacultyAccountResolver.ContactsMatch(user,officialEmail,mobile))
                return IdentityConflict("USER_CONTACT_MISMATCH", "Submit the selected account's canonical email and mobile from account-lookup. Faculty creation cannot change account contacts.");
            officialEmail=user.Email!;
            mobile=user.Mobile!;
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

          mobile = faculty.Mobile,

          accountResolution = resolution,

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
            nextAction="Use the existing faculty record, or select another eligible account." });
    }

    private IActionResult ContactConflict(FacultyAccountResolver.ContactMatches matches) =>
        IdentityConflict(matches.Code, FacultyAccountResolver.ConflictMessage(matches.Code));

    private IActionResult IdentityConflict(string code, string message)
    {
        _logger.LogWarning("Faculty identity conflict. Code={Code}, CollegeId={CollegeId}", code,
            HttpContext.Items[ModulePermissionMiddleware.CurrentCollegeItem]);
        return Conflict(new { success=false, code, message,
            correlationId=HttpContext.TraceIdentifier,
            nextAction="POST /api/v1/faculty/account-lookup, explicitly select an eligible account, and resubmit its userId and canonical contacts." });
    }

    private IActionResult? ResolveCollegeScope(long? selected, bool requireAdmin, out long collegeId)
    {
        collegeId=0;
        // Only consume the live middleware snapshot; JWT roles/college claims alone are insufficient.
        if (User.Identity?.IsAuthenticated != true
            || HttpContext.Items[ModulePermissionMiddleware.SuperAdminItem] is not bool superAdmin
            || HttpContext.Items[ModulePermissionMiddleware.ActiveRolesItem] is not HashSet<string> roles)
            return StatusCode(403, new { success=false, code="FACULTY_SCOPE_REQUIRED", message="A verified college scope is required." });
        if (!superAdmin && (roles.Contains("STUDENT") || (requireAdmin && !roles.Contains("COLLEGE_ADMIN"))))
            return StatusCode(403, new { success=false, code="FACULTY_ACCOUNT_RESOLUTION_FORBIDDEN", message="College Admin access is required to look up or link existing accounts." });
        if (superAdmin)
        {
            if (selected is null or <= 0)
                return BadRequest(new { success=false, code="COLLEGE_REQUIRED", message="Select a college for this operation." });
            collegeId=selected.Value;
            return null;
        }
        if (CollegeRequestScope.GetCollegeId(HttpContext) is not long activeCollege || activeCollege <= 0)
            return StatusCode(403, new { success=false, code="FACULTY_SCOPE_REQUIRED", message="An active college assignment is required." });
        if (selected.HasValue && selected != activeCollege)
            return StatusCode(403, new { success=false, code="COLLEGE_SCOPE_MISMATCH", message="Select the active college. Cross-college access is not permitted." });
        collegeId=activeCollege;
        return null;
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
