using System.Security.Cryptography;
using BTech.Data;
using BTech.DTOs.Faculty;
using BTech.Models;
using BTech.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;



namespace BTech.Controllers.V1.FacultyManagement;



[ApiController]
[Route("api/v1/faculty")]
[Authorize]
public class FacultyCreateController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;



    public FacultyCreateController(
    ApplicationDbContext context,
    IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }



    // POST: api/v1/faculty
    [HttpPost]
    public async Task<IActionResult> Create(
  [FromBody] FacultyCreateDto request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);



        var officialEmail = request.OfficialEmail.Trim().ToLower();
        var mobile = request.Mobile.Trim();
        var facultyCode = request.FacultyCode.Trim();



        // ---------------------------------------------------------
        // COLLEGE VALIDATION
        // ---------------------------------------------------------



        var college = await _context.Colleges
  .AsNoTracking()
  .FirstOrDefaultAsync(x =>
  x.CollegeId == request.CollegeId);



        if (college == null)
        {
            return BadRequest(new
            {
                success = false,
                message = "College not found."
            });
        }



        // ---------------------------------------------------------
        // DEPARTMENT VALIDATION
        // ---------------------------------------------------------



        var department = await _context.Departments
  .AsNoTracking()
  .FirstOrDefaultAsync(x =>
  x.DepartmentId == request.DepartmentId);



        if (department == null)
        {
            return BadRequest(new
            {
                success = false,
                message = "Department not found."
            });
        }



        // ---------------------------------------------------------
        // FACULTY CODE DUPLICATE CHECK
        // ---------------------------------------------------------



        var existingFacultyCode =
  await _context.Faculties
  .FirstOrDefaultAsync(x =>
  x.FacultyCode == facultyCode);



        if (existingFacultyCode != null)
        {
            return Conflict(new
            {
                success = false,
                message = "Faculty code already exists."
            });
        }



        // ---------------------------------------------------------
        // USER
        // ---------------------------------------------------------



        User? user = null;
        string? temporaryPassword = null;



        // =========================================================
        // CASE 1:
        // userId = 0
        // Create/reuse user automatically using officialEmail
        // =========================================================



        if (request.UserId == 0)
        {
            user = await _context.Users
            .FirstOrDefaultAsync(x =>
            x.DeletedAt == null &&
            (
            (x.Email != null &&
            x.Email.ToLower() == officialEmail)
            ||
            (x.Mobile != null &&
            x.Mobile == mobile)
            ));



            // -----------------------------------------------------
            // Existing user found
            // -----------------------------------------------------



            if (user != null)
            {
                // Check whether this user is already a faculty
                var existingUserFaculty =
  await _context.Faculties
  .FirstOrDefaultAsync(x =>
  x.UserId == user.user_id);



                if (existingUserFaculty != null)
                {
                    return Conflict(new
                    {
                        success = false,
                        message =
                    "This user is already linked to a faculty."
                    });
                }
            }
            else
            {
                // -------------------------------------------------
                // CREATE NEW USER
                // -------------------------------------------------



                var lastUserId =
  await _context.Users
  .OrderByDescending(x => x.user_id)
  .Select(x => (long?)x.user_id)
  .FirstOrDefaultAsync() ?? 0;



                var employeeUserId =
                $"USR{(lastUserId + 1):D8}";



                temporaryPassword =
                GenerateTemporaryPassword();



                user = new User
                {
                    college_id = request.CollegeId,



                    EmployeeUserId =
                employeeUserId,



                    FullName =
                request.FacultyName.Trim(),



                    Email =
                officialEmail,



                    Mobile =
                mobile,



                    PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(
                temporaryPassword),



                    Status = 1,



                    CreatedAt =
                DateTime.UtcNow,



                    CreatedBy =
                GetCurrentUserId()
                };



                _context.Users.Add(user);



                await _context.SaveChangesAsync();
            }
        }
        else
        {
            // =====================================================
            // CASE 2:
            // Existing userId supplied
            // =====================================================



            user = await _context.Users
  .FirstOrDefaultAsync(x =>
  x.user_id == request.UserId &&
  x.DeletedAt == null);



            if (user == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "User not found."
                });
            }



            var existingUserFaculty =
            await _context.Faculties
            .FirstOrDefaultAsync(x =>
            x.UserId == user.user_id);



            if (existingUserFaculty != null)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                "This user is already linked to a faculty."
                });
            }
        }



        // ---------------------------------------------------------
        // CREATE FACULTY
        // ---------------------------------------------------------



        var faculty = new Faculty
        {
            UserId = user.user_id,



            EmployeeProfileId =
  request.EmployeeProfileId > 0
  ? request.EmployeeProfileId
  : null,



            CollegeId =
  request.CollegeId,



            DepartmentId =
  request.DepartmentId,



            FacultyCode =
  facultyCode,



            FacultyName =
  request.FacultyName.Trim(),



            Designation =
  request.Designation,



            Qualification =
  request.Qualification,



            Specialization =
  request.Specialization,



            ExperienceYears =
  request.ExperienceYears,



            EmploymentType =
  request.EmploymentType,



            DateOfJoining =
  request.DateOfJoining,



            // EXACT email entered in Swagger
            OfficialEmail =
  officialEmail,



            Mobile =
  mobile,



            IsHod =
  request.IsHod,



            Status =
  request.Status,



            CreatedAt =
  DateTime.UtcNow,



            CreatedBy =
  GetCurrentUserId()
        };



        _context.Faculties.Add(faculty);



        await _context.SaveChangesAsync();



        // ---------------------------------------------------------
        // WELCOME EMAIL
        // ---------------------------------------------------------



        bool emailSent = false;
        string emailMessage =
        "Welcome email could not be sent.";



        try
        {
            var passwordSection =
            string.IsNullOrWhiteSpace(temporaryPassword)
            ? ""
            : $@"
                    <strong>Temporary Password:</strong>
                    {System.Net.WebUtility.HtmlEncode(
            temporaryPassword)}
                    <br/>";
            var passwordSetupLink = "http://localhost:5173/activate-account";



            var emailBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Faculty Account</title>
</head>



<body style='margin:0; padding:0; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#202124;'>



    <div style='max-width:650px; margin:0 auto; padding:40px 35px; background-color:#ffffff;'>



        <p style='font-size:16px; margin:0 0 25px 0;'>
            Dear <strong>{System.Net.WebUtility.HtmlEncode(faculty.FacultyName)}</strong>,
        </p>



        <p style='font-size:16px; line-height:1.6; margin:0 0 25px 0;'>
            Welcome to Pirnav Engineering College.
            Your faculty account has been created successfully.
        </p>



        <p style='font-size:16px; line-height:1.8; margin:0 0 25px 0;'>
            <strong>Faculty ID:</strong> {faculty.FacultyId}
            <br/>



            <strong>Faculty Code:</strong>
            {System.Net.WebUtility.HtmlEncode(faculty.FacultyCode)}
            <br/>



            <strong>Official Email:</strong>
            {System.Net.WebUtility.HtmlEncode(faculty.OfficialEmail ?? officialEmail)}
            <br/>



            <strong>Designation:</strong>
            {System.Net.WebUtility.HtmlEncode(faculty.Designation ?? "-")}
            <br/>



            <strong>Department:</strong>
            {System.Net.WebUtility.HtmlEncode(department.DepartmentName)}
        </p>



        <p style='font-size:16px; margin:0 0 25px 0;'>
            <strong>Your login password is:</strong>
            {System.Net.WebUtility.HtmlEncode(temporaryPassword)}
        </p>



        <p style='margin:30px 0;'>
            <a href='{passwordSetupLink}'
               style='display:inline-block;
                      background-color:#1976d2;
                      color:#ffffff;
                      text-decoration:none;
                      padding:14px 35px;
                      border-radius:6px;
                      font-size:16px;
                      font-weight:bold;'>
                Change Password
            </a>
        </p>



        <p style='font-size:15px; line-height:1.6; color:#555555; margin:0 0 30px 0;'>
            This password-change link is valid for 24 hours.
            You can use it to set a new password.
        </p>



        <p style='font-size:16px; line-height:1.6; margin:0;'>
            Regards,<br/>
            <strong>Pirnav Engineering College</strong>
        </p>



    </div>



</body>
</html>";



            // IMPORTANT:
            // This is NOT a fixed email.
            // Whatever officialEmail comes from Swagger,
            // that exact email receives the mail.



            await _emailService.SendEmailAsync(
  officialEmail,
  "BTech College - Faculty Account Created",
  emailBody);



            emailSent = true;
            emailMessage =
            "Welcome email sent successfully.";
        }
        catch (Exception ex)
        {
            emailMessage =
            $"Welcome email failed: {ex.Message}";
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



        var random = RandomNumberGenerator.Create();



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
        User.FindFirst("user_id")?.Value
        ?? User.FindFirst("sub")?.Value;



        return long.TryParse(
        value,
        out var id)
        ? id
        : null;
    }
}