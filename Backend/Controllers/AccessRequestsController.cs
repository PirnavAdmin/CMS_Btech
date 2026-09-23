using BCrypt.Net;
using BTech.Data;
using BTech.DTOs.AccessRequest;
using BTech.Models;
using BTech.Services;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using System.Security.Claims;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/access-requests")]
    public class AccessRequestsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IEmailService _emailService;

        public AccessRequestsController(
            ApplicationDbContext db,
            IEmailService emailService)
        {
            _db = db;
            _emailService = emailService;
        }

        // =========================================================
        // CREATE REGISTRATION REQUEST
        // POST: api/v1/access-requests
        // =========================================================

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateRegistrationRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Please provide valid registration details."
                });
            }

            if (!request.AgreeToTerms)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "You must agree to the Terms & Conditions."
                });
            }

            // Password validation
            if (!System.Text.RegularExpressions.Regex.IsMatch(
                    request.Password,
                    @"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\r\n]{8,}$"))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number and one symbol."
                });
            }

            if (request.Password != request.ConfirmPassword)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Password and confirm password do not match."
                });
            }

            var email = request.Email.Trim().ToLower();
            var mobile = request.Mobile.Trim();

            // -----------------------------------------------------
            // CHECK EXISTING USER
            // -----------------------------------------------------

            var existingUser = await _db.Users
                .FirstOrDefaultAsync(x =>
                    (x.Email != null &&
                     x.Email.ToLower() == email) ||
                    (x.Mobile != null &&
                     x.Mobile == mobile));

            if (existingUser != null)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "An account already exists with this email or mobile number."
                });
            }

            // -----------------------------------------------------
            // CHECK PENDING REQUEST
            // -----------------------------------------------------

            var existingRequest =
                await _db.RegistrationRequests
                .FirstOrDefaultAsync(x =>
                    x.Status == "PENDING" &&
                    (x.Email.ToLower() == email ||
                     x.Mobile == mobile));

            if (existingRequest != null)
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        "A registration request is already pending."
                });
            }

            // -----------------------------------------------------
            // HASH PASSWORD
            // -----------------------------------------------------

            var passwordHash =
                BCrypt.Net.BCrypt.HashPassword(request.Password);

            // -----------------------------------------------------
            // CREATE REQUEST
            // -----------------------------------------------------

            var registrationRequest =
                new RegistrationRequest
                {
                    FullName = request.FullName.Trim(),

                    Email = email,

                    Mobile = mobile,

                    PasswordHash = passwordHash,

                    Status = "PENDING",

                    CreatedAt = DateTime.UtcNow
                };

            _db.RegistrationRequests.Add(registrationRequest);

            await _db.SaveChangesAsync();

            // =====================================================
            // SEND ACCESS REQUEST SUBMITTED EMAIL
            // =====================================================

            try
            {
                var emailBody = $@"
<html>
<body style='font-family: Arial, sans-serif;'>

<h2>BTech College</h2>

<p>Dear {registrationRequest.FullName},</p>

<p>
Your access request has been successfully submitted.
</p>

<p>
<strong>Request ID:</strong>
{registrationRequest.RegistrationRequestId}
<br/>

<strong>Status:</strong>
PENDING
</p>

<p>
Our administration team will review your request.
</p>

<p>
Regards,<br/>
<strong>BTech College</strong>
</p>

</body>
</html>";

                await _emailService.SendEmailAsync(
                    registrationRequest.Email,
                    "BTech College - Access Request Submitted",
                    emailBody);
            }
            catch (Exception ex)
            {
                // Email failure should NOT cancel the request.

                Console.WriteLine(
                    $"Request submitted email failed: {ex.Message}");
            }

            return Ok(new
            {
                success = true,

                message =
                    "Registration request submitted successfully.",

                data = new
                {
                    requestId =
                        registrationRequest.RegistrationRequestId,

                    status =
                        registrationRequest.Status
                }
            });
        }

        // =========================================================
        // CHECK REQUEST STATUS
        // GET: api/v1/access-requests/{requestId}/status
        // =========================================================

        [AllowAnonymous]
        [HttpGet("{requestId:long}/status")]
        public async Task<IActionResult> GetStatus(
            long requestId)
        {
            var request =
                await _db.RegistrationRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.RegistrationRequestId == requestId);

            if (request == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Registration request not found."
                });
            }

            return Ok(new
            {
                success = true,

                data = new
                {
                    requestId =
                        request.RegistrationRequestId,

                    status =
                        request.Status,

                    approvedUserId =
                        request.ApprovedUserId
                }
            });
        }

        // =========================================================
        // SUPER ADMIN - GET PENDING REQUESTS
        // GET: api/v1/access-requests/pending
        // =========================================================

        [Authorize(Roles = "SUPER_ADMIN")]
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingRequests()
        {
            var requests =
                await _db.RegistrationRequests
                .AsNoTracking()
                .Where(x => x.Status == "PENDING")
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    requestId =
                        x.RegistrationRequestId,

                    fullName =
                        x.FullName,

                    email =
                        x.Email,

                    mobile =
                        x.Mobile,

                    status =
                        x.Status,

                    createdAt =
                        x.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = requests
            });
        }

        // =========================================================
        // SUPER ADMIN - APPROVE
        // POST:
        // api/v1/access-requests/{requestId}/approve
        // =========================================================

        [Authorize(Roles = "SUPER_ADMIN")]
        [HttpPost("{requestId:long}/approve")]
        public async Task<IActionResult> Approve(
            long requestId,
            [FromBody] ApproveRegistrationRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "College and role are required."
                });
            }

            // -----------------------------------------------------
            // GET REGISTRATION REQUEST
            // -----------------------------------------------------

            var registration =
                await _db.RegistrationRequests
                .FirstOrDefaultAsync(x =>
                    x.RegistrationRequestId == requestId);

            if (registration == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Registration request not found."
                });
            }

            if (registration.Status != "PENDING")
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        $"Request is already {registration.Status}."
                });
            }

            // -----------------------------------------------------
            // CHECK COLLEGE
            // -----------------------------------------------------

            var college =
                await _db.Colleges
                .FirstOrDefaultAsync(x =>
                    x.CollegeId == request.CollegeId &&
                    x.Status == 1);

            if (college == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid or inactive college."
                });
            }

            // -----------------------------------------------------
            // CHECK ROLE
            // -----------------------------------------------------

            var role =
                await _db.Roles
                .FirstOrDefaultAsync(x =>
                    x.RoleCode == request.RoleCode &&
                    x.Status == 1);

            if (role == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid or inactive role."
                });
            }

            // -----------------------------------------------------
            // CHECK DUPLICATE USER
            // -----------------------------------------------------

            var duplicateUser =
                await _db.Users
                .FirstOrDefaultAsync(x =>
                    x.Email == registration.Email ||
                    x.Mobile == registration.Mobile);

            if (duplicateUser != null)
            {
                return Conflict(new
                {
                    success = false,
                    message = "User already exists."
                });
            }

            // -----------------------------------------------------
            // GENERATE EMPLOYEE USER ID
            // -----------------------------------------------------

            var lastUserId =
                await _db.Users
                .OrderByDescending(x => x.user_id)
                .Select(x => (long?)x.user_id)
                .FirstOrDefaultAsync() ?? 0;

            var employeeUserId =
                $"USR{(lastUserId + 1):D8}";

            // -----------------------------------------------------
            // CURRENT SUPER ADMIN
            // -----------------------------------------------------

            var claim =
                User.FindFirstValue(
                    ClaimTypes.NameIdentifier);

            long? superAdminId = null;

            if (long.TryParse(claim, out var parsedId))
            {
                superAdminId = parsedId;
            }

            // -----------------------------------------------------
            // CREATE USER
            // -----------------------------------------------------

            var user =
                new User
                {
                    college_id =
                        request.CollegeId,

                    EmployeeUserId =
                        employeeUserId,

                    FullName =
                        registration.FullName,

                    Email =
                        registration.Email,

                    Mobile =
                        registration.Mobile,

                    PasswordHash =
                        registration.PasswordHash,

                    Status = 1,

                    CreatedAt =
                        DateTime.UtcNow,

                    CreatedBy =
                        superAdminId
                };

            _db.Users.Add(user);

            await _db.SaveChangesAsync();

            // -----------------------------------------------------
            // ASSIGN ROLE
            // -----------------------------------------------------

            var userRole =
                new UserRole
                {
                    UserId =
                        user.user_id,

                    RoleId =
                        role.Role_id,

                    Status = 1,

                    AssignedAt =
                        DateTime.UtcNow,

                    AssignedBy =
                        superAdminId
                };

            _db.UserRoles.Add(userRole);

            // -----------------------------------------------------
            // UPDATE REGISTRATION REQUEST
            // -----------------------------------------------------

            registration.Status =
                "APPROVED";

            registration.ReviewedAt =
                DateTime.UtcNow;

            registration.ReviewedBy =
                superAdminId;

            registration.ApprovedUserId =
                user.user_id;

            // -----------------------------------------------------
            // SAVE ROLE + APPROVAL STATUS
            // -----------------------------------------------------

            await _db.SaveChangesAsync();

            // =====================================================
            // SEND ACCESS REQUEST APPROVED EMAIL
            // =====================================================

            try
            {
                var emailBody = $@"
<html>
<body style='font-family: Arial, sans-serif;'>

<h2>BTech College</h2>

<p>
Dear {registration.FullName},
</p>

<p>
Your access request has been
<strong>approved</strong>.
</p>

<p>

<strong>Request ID:</strong>
{registration.RegistrationRequestId}
<br/>

<strong>Employee User ID:</strong>
{user.EmployeeUserId}
<br/>

<strong>College:</strong>
{college.CollegeName}
<br/>

<strong>Role:</strong>
{role.RoleCode}
<br/>

<strong>Status:</strong>
APPROVED

</p>

<p>
You can now use your assigned credentials
to access the system.
</p>

<p>
Regards,<br/>
<strong>BTech College</strong>
</p>

</body>
</html>";

                await _emailService.SendEmailAsync(
                    registration.Email,
                    "BTech College - Access Request Approved",
                    emailBody);
            }
            catch (Exception ex)
            {
                // Email failure should NOT cancel approval.

                Console.WriteLine(
                    $"Access approval email failed: {ex.Message}");
            }

            return Ok(new
            {
                success = true,

                message =
                    "Registration request approved successfully.",

                data = new
                {
                    requestId =
                        registration.RegistrationRequestId,

                    userId =
                        user.user_id,

                    employeeUserId =
                        user.EmployeeUserId,

                    status =
                        registration.Status
                }
            });
        }

        // =========================================================
        // SUPER ADMIN - REJECT
        // POST:
        // api/v1/access-requests/{requestId}/reject
        // =========================================================

        [Authorize(Roles = "SUPER_ADMIN")]
        [HttpPost("{requestId:long}/reject")]
        public async Task<IActionResult> Reject(
            long requestId)
        {
            var registration =
                await _db.RegistrationRequests
                .FirstOrDefaultAsync(x =>
                    x.RegistrationRequestId == requestId);

            if (registration == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Registration request not found."
                });
            }

            if (registration.Status != "PENDING")
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        $"Request is already {registration.Status}."
                });
            }

            // -----------------------------------------------------
            // CURRENT SUPER ADMIN
            // -----------------------------------------------------

            var claim =
                User.FindFirstValue(
                    ClaimTypes.NameIdentifier);

            long? superAdminId = null;

            if (long.TryParse(claim, out var parsedId))
            {
                superAdminId = parsedId;
            }

            // -----------------------------------------------------
            // UPDATE REQUEST
            // -----------------------------------------------------

            registration.Status =
                "REJECTED";

            registration.ReviewedAt =
                DateTime.UtcNow;

            registration.ReviewedBy =
                superAdminId;

            await _db.SaveChangesAsync();

            // =====================================================
            // SEND ACCESS REQUEST REJECTED EMAIL
            // =====================================================

            try
            {
                var emailBody = $@"
<html>
<body style='font-family: Arial, sans-serif;'>

<h2>BTech College</h2>

<p>
Dear {registration.FullName},
</p>

<p>
We regret to inform you that your access request
has been <strong>rejected</strong>.
</p>

<p>

<strong>Request ID:</strong>
{registration.RegistrationRequestId}
<br/>

<strong>Status:</strong>
REJECTED

</p>

<p>
Please contact the college administration
for more information.
</p>

<p>
Regards,<br/>
<strong>BTech College</strong>
</p>

</body>
</html>";

                await _emailService.SendEmailAsync(
                    registration.Email,
                    "BTech College - Access Request Rejected",
                    emailBody);
            }
            catch (Exception ex)
            {
                // Email failure should NOT cancel rejection.

                Console.WriteLine(
                    $"Access rejection email failed: {ex.Message}");
            }

            return Ok(new
            {
                success = true,

                message =
                    "Registration request rejected successfully."
            });
        }
    }
}