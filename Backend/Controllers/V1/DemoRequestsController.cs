using BTech.Data;
using BTech.DTOs.DemoRequest;
using BTech.Models;
using BTech.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/demo-requests")]
    public class DemoRequestsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IEmailService _emailService;

        public DemoRequestsController(
            ApplicationDbContext db,
            IEmailService emailService)
        {
            _db = db;
            _emailService = emailService;
        }

        // =========================================================
        // CREATE DEMO REQUEST
        // POST: api/v1/demo-requests
        // =========================================================

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateDemoRequestDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Please provide valid demo request details."
                    });
                }

                if (!request.AgreeToContact)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message =
                            "You must agree to be contacted about the demo."
                    });
                }

                var email = request.Email
                    .Trim()
                    .ToLower();

                var mobile = request.Mobile.Trim();

                // -------------------------------------------------
                // CHECK PENDING REQUEST
                // -------------------------------------------------

                var existingRequest =
                    await _db.DemoRequests
                    .FirstOrDefaultAsync(x =>
                        !x.IsDeleted &&
                        x.Status == "PENDING" &&
                        (
                            x.Email.ToLower() == email ||
                            x.Mobile == mobile
                        ));

                if (existingRequest != null)
                {
                    return Conflict(new
                    {
                        success = false,
                        message =
                            "A demo request is already pending for this email or mobile number."
                    });
                }

                // -------------------------------------------------
                // CREATE REQUEST
                // -------------------------------------------------

                var demoRequest = new DemoRequest
                {
                    FullName =
                        request.FullName.Trim(),

                    Email =
                        email,

                    Mobile =
                        mobile,

                    InstitutionName =
                        request.InstitutionName.Trim(),

                    Role =
                        request.Role.Trim(),

                    City =
                        string.IsNullOrWhiteSpace(request.City)
                            ? null
                            : request.City.Trim(),

                    State =
                        string.IsNullOrWhiteSpace(request.State)
                            ? null
                            : request.State.Trim(),

                    NumberOfStudents =
                        request.NumberOfStudents,

                    AgreeToContact =
                        request.AgreeToContact,

                    Status =
                        "PENDING",

                    CreatedAt =
                        DateTime.UtcNow,

                    IsActive =
                        true,

                    IsDeleted =
                        false
                };

                _db.DemoRequests.Add(demoRequest);

                await _db.SaveChangesAsync();

                // -------------------------------------------------
                // SEND EMAIL
                // -------------------------------------------------

                try
                {
                    var emailBody = $@"
<html>
<body style='font-family: Arial, sans-serif;'>

<h2>Pirnav Digital Campus</h2>

<p>Dear {demoRequest.FullName},</p>

<p>
Thank you for requesting a personalized demo of
<strong>Pirnav Digital Campus</strong>.
</p>

<p>Your request has been successfully received.</p>

<table>
<tr>
<td><strong>Request ID:</strong></td>
<td>{demoRequest.DemoRequestId}</td>
</tr>

<tr>
<td><strong>Institution:</strong></td>
<td>{demoRequest.InstitutionName}</td>
</tr>

<tr>
<td><strong>Status:</strong></td>
<td>PENDING</td>
</tr>
</table>

<p>
Our team will contact you shortly.
</p>

<p>
Regards,<br/>
<strong>Pirnav Digital Campus</strong>
</p>

</body>
</html>";

                    await _emailService.SendEmailAsync(
                        demoRequest.Email,
                        "Pirnav Digital Campus - Demo Request Received",
                        emailBody);
                }
                catch
                {
                    // Email failure should not undo DB request
                }

                return Ok(new
                {
                    success = true,

                    message =
                        "Demo request submitted successfully.",

                    data = new
                    {
                        requestId =
                            demoRequest.DemoRequestId,

                        status =
                            demoRequest.Status
                    }
                });
            }
            catch (Exception) { throw; }
        }

        // =========================================================
        // GET ALL DEMO REQUESTS
        // GET: api/v1/demo-requests
        // =========================================================

        [Authorize(Roles = "SUPER_ADMIN")]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status = null)
        {
            var query =
                _db.DemoRequests
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x =>
                    x.Status == status.Trim().ToUpper());
            }

            var requests =
                await query
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    requestId = x.DemoRequestId,
                    fullName = x.FullName,
                    email = x.Email,
                    mobile = x.Mobile,
                    institutionName = x.InstitutionName,
                    role = x.Role,
                    city = x.City,
                    state = x.State,
                    numberOfStudents = x.NumberOfStudents,
                    agreeToContact = x.AgreeToContact,
                    status = x.Status,
                    demoDate = x.DemoDate,
                    demoTime = x.DemoTime,
                    remarks = x.Remarks,
                    createdAt = x.CreatedAt,
                    updatedAt = x.UpdatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                message = "Demo requests retrieved successfully.",
                data = requests
            });
        }

        // =========================================================
        // GET DEMO REQUEST BY ID
        // GET: api/v1/demo-requests/{requestId}
        // =========================================================

        [Authorize(Roles = "SUPER_ADMIN")]
        [HttpGet("{requestId:long}")]
        public async Task<IActionResult> GetById(
            long requestId)
        {
            var request =
                await _db.DemoRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.DemoRequestId == requestId &&
                    !x.IsDeleted);

            if (request == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Demo request not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Demo request retrieved successfully.",
                data = request
            });
        }

        // =========================================================
        // GET STATUS
        // GET:
        // api/v1/demo-requests/{requestId}/status
        // =========================================================

        [AllowAnonymous]
        [HttpGet("{requestId:long}/status")]
        public async Task<IActionResult> GetStatus(
            long requestId)
        {
            var request =
                await _db.DemoRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.DemoRequestId == requestId &&
                    !x.IsDeleted);

            if (request == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Demo request not found."
                });
            }

            return Ok(new
            {
                success = true,

                message =
                    "Demo request status retrieved successfully.",

                data = new
                {
                    requestId =
                        request.DemoRequestId,

                    status =
                        request.Status,

                    demoDate =
                        request.DemoDate,

                    demoTime =
                        request.DemoTime,

                    remarks =
                        request.Remarks
                }
            });
        }

        // =========================================================
        // UPDATE STATUS
        // PUT:
        // api/v1/demo-requests/{requestId}/status
        // =========================================================

        [Authorize(Roles = "SUPER_ADMIN")]
        [HttpPut("{requestId:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long requestId,
            [FromBody] UpdateDemoRequestStatusDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Status is required."
                });
            }

            var demoRequest =
                await _db.DemoRequests
                .FirstOrDefaultAsync(x =>
                    x.DemoRequestId == requestId &&
                    !x.IsDeleted);

            if (demoRequest == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Demo request not found."
                });
            }

            var newStatus =
                request.Status.Trim().ToUpper();

            var allowedStatuses = new[]
            {
                "PENDING",
                "CONTACTED",
                "SCHEDULED",
                "COMPLETED",
                "REJECTED"
            };

            if (!allowedStatuses.Contains(newStatus))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Invalid status."
                });
            }

            demoRequest.Status = newStatus;

            demoRequest.Remarks =
                request.Remarks;

            demoRequest.UpdatedAt =
                DateTime.UtcNow;

            demoRequest.ReviewedAt =
                DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                success = true,

                message =
                    "Demo request status updated successfully.",

                data = new
                {
                    requestId =
                        demoRequest.DemoRequestId,

                    status =
                        demoRequest.Status,

                    remarks =
                        demoRequest.Remarks,

                    updatedAt =
                        demoRequest.UpdatedAt
                }
            });
        }

        // =========================================================
        // SCHEDULE DEMO
        // POST:
        // api/v1/demo-requests/{requestId}/schedule
        // =========================================================

        [Authorize(Roles = "SUPER_ADMIN")]
        [HttpPost("{requestId:long}/schedule")]
        public async Task<IActionResult> Schedule(
            long requestId,
            [FromBody] ScheduleDemoRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Demo date and time are required."
                });
            }

            var demoRequest =
                await _db.DemoRequests
                .FirstOrDefaultAsync(x =>
                    x.DemoRequestId == requestId &&
                    !x.IsDeleted);

            if (demoRequest == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Demo request not found."
                });
            }

            demoRequest.DemoDate =
                request.DemoDate;

            demoRequest.DemoTime =
                request.DemoTime;

            demoRequest.Status =
                "SCHEDULED";

            demoRequest.Remarks =
                request.Remarks;

            demoRequest.UpdatedAt =
                DateTime.UtcNow;

            demoRequest.ReviewedAt =
                DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // -------------------------------------------------
            // SEND SCHEDULE EMAIL
            // -------------------------------------------------

            try
            {
                var emailBody = $@"
<html>
<body style='font-family: Arial, sans-serif;'>

<h2>Pirnav Digital Campus</h2>

<p>Dear {demoRequest.FullName},</p>

<p>
Your personalized demo has been scheduled successfully.
</p>

<p>
<strong>Date:</strong>
{demoRequest.DemoDate:dd-MM-yyyy}
</p>

<p>
<strong>Time:</strong>
{demoRequest.DemoTime}
</p>

<p>
<strong>Institution:</strong>
{demoRequest.InstitutionName}
</p>

<p>
Regards,<br/>
<strong>Pirnav Digital Campus</strong>
</p>

</body>
</html>";

                await _emailService.SendEmailAsync(
                    demoRequest.Email,
                    "Pirnav Digital Campus - Demo Scheduled",
                    emailBody);
            }
            catch
            {
                // Do not rollback DB if email fails
            }

            return Ok(new
            {
                success = true,

                message =
                    "Demo scheduled successfully.",

                data = new
                {
                    requestId =
                        demoRequest.DemoRequestId,

                    status =
                        demoRequest.Status,

                    demoDate =
                        demoRequest.DemoDate,

                    demoTime =
                        demoRequest.DemoTime
                }
            });
        }
    }
}