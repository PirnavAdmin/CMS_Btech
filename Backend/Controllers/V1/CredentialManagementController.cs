using BTech.Data;
using BTech.Models;
using BTech.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/credentials")]
    [Authorize(Roles = "SUPER_ADMIN,COLLEGE_ADMIN")]
    public sealed class CredentialManagementController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly ILogger<CredentialManagementController> _logger;

        public CredentialManagementController(
            ApplicationDbContext db,
            IConfiguration configuration,
            IEmailService emailService,
            ILogger<CredentialManagementController> logger)
        {
            _db = db;
            _configuration = configuration;
            _emailService = emailService;
            _logger = logger;
        }

        public sealed class StudentCredentialRequest
        {
            public long StudentId { get; set; }
        }

        public sealed class FacultyCredentialRequest
        {
            public long FacultyId { get; set; }
        }

        public sealed class NonTeachingCredentialRequest
        {
            public long EmployeeProfileId { get; set; }
        }

        [HttpPost("students")]
        public async Task<IActionResult> CreateStudentCredentials([FromBody] StudentCredentialRequest request)
        {
            if (request.StudentId <= 0)
                return BadRequest(new { success = false, message = "A valid studentId is required." });

            var student = await _db.Students.FirstOrDefaultAsync(x =>
                x.StudentId == request.StudentId && x.Status == 1 && x.DeletedAt == null);
            if (student == null)
                return NotFound(new { success = false, message = "Active student not found." });
            if (!HasCollegeAccess(student.CollegeId))
                return Forbid();
            if (string.IsNullOrWhiteSpace(student.Email))
                return BadRequest(new { success = false, message = "Student email is required before credentials can be created." });

            long linkedUserId = await ReadNullableLongAsync(
                "SELECT user_id AS Value FROM students WHERE student_id = @id LIMIT 1", request.StudentId);
            User? user = linkedUserId > 0 ? await _db.Users.FirstOrDefaultAsync(x => x.user_id == linkedUserId) : null;
            if (user == null)
                user = await _db.Users.FirstOrDefaultAsync(x => x.Email == student.Email);

            var result = await CreateOrResetCredentialsAsync(
                user, student.CollegeId, student.FullName, student.Email, student.Mobile,
                $"STU-{student.StudentCode}", "STUDENT", request.StudentId, null);
            if (result.Error != null)
                return Conflict(new { success = false, message = result.Error });

            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE students SET user_id = {result.User!.user_id} WHERE student_id = {student.StudentId}");
            return Ok(result.Response);
        }

        [HttpPost("teaching-faculty")]
        public async Task<IActionResult> CreateTeachingFacultyCredentials([FromBody] FacultyCredentialRequest request)
        {
            if (request.FacultyId <= 0)
                return BadRequest(new { success = false, message = "A valid facultyId is required." });

            var faculty = await _db.Faculties.FirstOrDefaultAsync(x =>
                x.FacultyId == request.FacultyId && x.Status == 1 && x.DeletedAt == null);
            if (faculty == null)
                return NotFound(new { success = false, message = "Active teaching faculty record not found." });
            if (!HasCollegeAccess(faculty.CollegeId))
                return Forbid();
            if (string.IsNullOrWhiteSpace(faculty.OfficialEmail))
                return BadRequest(new { success = false, message = "Faculty official email is required before credentials can be created." });

            var user = await _db.Users.FirstOrDefaultAsync(x => x.user_id == faculty.UserId);
            if (user == null)
                return NotFound(new { success = false, message = "Faculty user account was not found." });

            var result = await CreateOrResetCredentialsAsync(
                user, faculty.CollegeId, faculty.FacultyName, faculty.OfficialEmail, faculty.Mobile,
                faculty.FacultyCode, "FACULTY", null, faculty.FacultyId);
            if (result.Error != null)
                return Conflict(new { success = false, message = result.Error });

            return Ok(result.Response);
        }

        [HttpPost("non-teaching-staff")]
        public async Task<IActionResult> CreateNonTeachingStaffCredentials([FromBody] NonTeachingCredentialRequest request)
        {
            if (request.EmployeeProfileId <= 0)
                return BadRequest(new { success = false, message = "A valid employeeProfileId is required." });

            var profile = await ReadEmployeeProfileAsync(request.EmployeeProfileId);
            if (profile == null || profile.Value.Status != 1)
                return NotFound(new { success = false, message = "Active employee profile not found." });

            var facultyRole = await _db.Roles.FirstOrDefaultAsync(x => x.RoleCode == "FACULTY" && x.Status == 1 && x.DeletedAt == null);
            var userHasFacultyRole = facultyRole != null && await _db.UserRoles.AnyAsync(x =>
                x.UserId == profile.Value.UserId && x.RoleId == facultyRole.Role_id && x.Status == 1 && x.RemovedAt == null);
            if (userHasFacultyRole)
                return BadRequest(new { success = false, message = "This employee has the teaching FACULTY role. Use the teaching-faculty credential endpoint." });

            var user = await _db.Users.FirstOrDefaultAsync(x => x.user_id == profile.Value.UserId);
            if (user == null)
                return NotFound(new { success = false, message = "Employee user account was not found." });
            if (!HasCollegeAccess(user.college_id))
                return Forbid();
            if (string.IsNullOrWhiteSpace(user.Email))
                return BadRequest(new { success = false, message = "Employee email is required before credentials can be created." });

            var result = await CreateOrResetCredentialsAsync(
                user, user.college_id, user.FullName, user.Email, user.Mobile,
                user.EmployeeUserId, "NON_TEACHING", null, null);
            if (result.Error != null)
                return Conflict(new { success = false, message = result.Error });

            return Ok(result.Response);
        }

        private async Task<(User? User, object? Response, string? Error)> CreateOrResetCredentialsAsync(
            User? user, long? collegeId, string fullName, string email, string? mobile,
            string loginId, string roleCode, long? studentId, long? facultyId)
        {
            var defaultPassword = _configuration["CredentialSettings:DefaultPassword"];
            if (string.IsNullOrWhiteSpace(defaultPassword) || defaultPassword.Length < 10)
                return (null, null, "CredentialSettings:DefaultPassword must be configured with at least 10 characters.");

            var role = await _db.Roles.FirstOrDefaultAsync(x => x.RoleCode == roleCode && x.Status == 1 && x.DeletedAt == null);
            if (role == null)
                return (null, null, $"Required role '{roleCode}' was not found. Apply the credential SQL changes first.");

            var now = DateTime.UtcNow;
            if (user != null && collegeId.HasValue && user.college_id.HasValue && user.college_id.Value != collegeId.Value)
                return (null, null, "The linked user account belongs to a different college.");
            if (user == null)
            {
                var emailExists = await _db.Users.AnyAsync(x => x.Email == email && x.DeletedAt == null);
                if (emailExists)
                    return (null, null, "An account with this email already exists but is not linked to this record. Please resolve the existing account link first.");

                user = new User
                {
                    college_id = collegeId,
                    EmployeeUserId = await MakeUniqueLoginIdAsync(loginId),
                    FullName = fullName,
                    Email = email,
                    Mobile = mobile,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword),
                    MustChangePassword = true,
                    Status = 1,
                    CreatedAt = now,
                    CreatedBy = GetActorUserId()
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();
            }
            else
            {
                var emailOwnedByAnotherUser = await _db.Users.AnyAsync(x =>
                    x.user_id != user.user_id && x.Email == email && x.DeletedAt == null);
                if (emailOwnedByAnotherUser)
                    return (null, null, "This email address is already assigned to another user account.");

                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(defaultPassword);
                user.MustChangePassword = true;
                user.UpdatedAt = now;
                user.UpdatedBy = GetActorUserId();
                user.Email = email;
                if (string.IsNullOrWhiteSpace(user.Mobile)) user.Mobile = mobile;
                await _db.SaveChangesAsync();
            }

            var alreadyAssigned = await _db.UserRoles.AnyAsync(x =>
                x.UserId == user.user_id && x.RoleId == role.Role_id && x.Status == 1 && x.RemovedAt == null);
            if (!alreadyAssigned)
            {
                _db.UserRoles.Add(new UserRole
                {
                    UserId = user.user_id,
                    RoleId = role.Role_id,
                    Status = 1,
                    AssignedAt = now,
                    AssignedBy = GetActorUserId()
                });
                await _db.SaveChangesAsync();
            }

            var emailSent = true;
            try
            {
                var subject = "BTech College login credentials";
                var body = $"<p>Dear {System.Net.WebUtility.HtmlEncode(fullName)},</p>" +
                    "<p>Your BTech College login credentials have been created.</p>" +
                    $"<p><b>Login ID:</b> {System.Net.WebUtility.HtmlEncode(user.EmployeeUserId)}<br/>" +
                    $"<b>Temporary password:</b> {System.Net.WebUtility.HtmlEncode(defaultPassword)}</p>" +
                    "<p>Sign in to the college portal and change this temporary password immediately. You will be required to change it before continuing.</p>" +
                    "<p>If you did not expect this message, contact your college administrator.</p><p>Regards,<br/>BTech College</p>";
                await _emailService.SendEmailAsync(email, subject, body);
            }
            catch (Exception ex)
            {
                emailSent = false;
                _logger.LogError(ex, "Credential email could not be sent for user {UserId}.", user.user_id);
            }

            return (user, new
            {
                success = true,
                message = emailSent
                    ? "Credentials created and login instructions emailed successfully."
                    : "Credentials created, but the email could not be sent. Check SMTP configuration and retry email delivery.",
                data = new
                {
                    userId = user.user_id,
                    loginId = user.EmployeeUserId,
                    email = user.Email,
                    role = roleCode,
                    mustChangePassword = true,
                    emailSent
                }
            }, null);
        }

        private async Task<string> MakeUniqueLoginIdAsync(string requested)
        {
            var safe = new string(requested.Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_').ToArray());
            if (safe.Length > 50) safe = safe[..50];
            if (string.IsNullOrWhiteSpace(safe)) safe = "CMS-USER";
            var candidate = safe;
            var suffix = 1;
            while (await _db.Users.AnyAsync(x => x.EmployeeUserId == candidate))
            {
                var tail = $"-{suffix++}";
                candidate = safe[..Math.Min(safe.Length, 50 - tail.Length)] + tail;
            }
            return candidate;
        }

        private bool HasCollegeAccess(long? targetCollegeId)
        {
            var isSuperAdmin = User.IsInRole("SUPER_ADMIN") || User.IsInRole("SuperAdmin");
            if (isSuperAdmin) return true;
            var claimValue = User.FindFirst("collegeId")?.Value;
            return targetCollegeId.HasValue && long.TryParse(claimValue, out var callerCollegeId)
                && callerCollegeId == targetCollegeId.Value;
        }

        private long? GetActorUserId()
        {
            var value = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return long.TryParse(value, out var id) ? id : null;
        }

        private async Task<long> ReadNullableLongAsync(string sql, long id)
        {
            var connection = _db.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose) await connection.OpenAsync();
            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = sql;
                var parameter = command.CreateParameter();
                parameter.ParameterName = "@id";
                parameter.Value = id;
                command.Parameters.Add(parameter);
                var value = await command.ExecuteScalarAsync();
                return value == null || value == DBNull.Value ? 0 : Convert.ToInt64(value);
            }
            finally
            {
                if (shouldClose) await connection.CloseAsync();
            }
        }

        private async Task<(long UserId, string? Designation, byte Status)?> ReadEmployeeProfileAsync(long employeeProfileId)
        {
            var connection = _db.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose) await connection.OpenAsync();
            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "SELECT user_id, designation, status FROM employee_profiles WHERE employee_profile_id = @id AND deleted_at IS NULL LIMIT 1";
                var parameter = command.CreateParameter();
                parameter.ParameterName = "@id";
                parameter.Value = employeeProfileId;
                command.Parameters.Add(parameter);
                await using var reader = await command.ExecuteReaderAsync();
                if (!await reader.ReadAsync()) return null;
                return (reader.GetInt64(0), reader.IsDBNull(1) ? null : reader.GetString(1), Convert.ToByte(reader.GetValue(2)));
            }
            finally
            {
                if (shouldClose) await connection.CloseAsync();
            }
        }
    }
}
