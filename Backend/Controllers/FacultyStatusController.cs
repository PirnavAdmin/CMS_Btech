using BTech.Task_FacultyStatusHistory.DTOs;
using BTech.Task_FacultyStatusHistory.Repositories;
using Microsoft.AspNetCore.Mvc;
using BTech.Data;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Task_FacultyStatusHistory.Controllers
{
    [ApiController]
    [Route("api/v1/faculty")]
    public class FacultyStatusController : ControllerBase
    {
        private readonly IFacultyStatusRepository _repository;
        private readonly ApplicationDbContext _context;
        private readonly IAccountSetupService _accountSetupService;
        private readonly ILogger<FacultyStatusController> _logger;

        public FacultyStatusController(
            IFacultyStatusRepository repository,
            ApplicationDbContext context,
            IAccountSetupService accountSetupService,
            ILogger<FacultyStatusController> logger)
        {
            _repository = repository;
            _context = context;
            _accountSetupService = accountSetupService;
            _logger = logger;
        }

        // PATCH: /api/v1/faculty/{facultyId}/status
        [HttpPatch("{facultyId:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long facultyId,
            [FromBody] UpdateFacultyStatusRequest request)
        {
            if (facultyId <= 0)
            {
                return BadRequest(new
                {
                    message = "Invalid faculty ID."
                });
            }

            if (request == null ||
                string.IsNullOrWhiteSpace(request.Status))
            {
                return BadRequest(new
                {
                    message = "Status is required."
                });
            }

            var changedBy = GetCurrentUserId();
            var wasActive = await _context.Faculties
                .AsNoTracking()
                .AnyAsync(f => f.FacultyId == facultyId &&
                               f.Status == 1 &&
                               f.DeletedAt == null);

            var updated = await _repository.UpdateStatusAsync(
                facultyId,
                request,
                changedBy);

            if (!updated)
            {
                return NotFound(new
                {
                    message = "Faculty not found."
                });
            }

            var setupEmailStatus = "NotRequired";
            if (!wasActive && request.Status.Equals("ACTIVE", StringComparison.OrdinalIgnoreCase))
            {
                var faculty = await _context.Faculties
                    .AsNoTracking()
                    .FirstOrDefaultAsync(f => f.FacultyId == facultyId && f.DeletedAt == null);
                if (faculty != null)
                {
                    var user = await _context.Users
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.user_id == faculty.UserId && u.DeletedAt == null);
                    if (user?.MustChangePassword == true && user.Status == 1)
                    {
                        try
                        {
                            await _accountSetupService.SendSetupLinkAsync(user.user_id, "faculty");
                            setupEmailStatus = "Sent";
                        }
                        catch (Exception ex)
                        {
                            setupEmailStatus = "Failed";
                            _logger.LogWarning(ex,
                                "Faculty activated but setup email failed. FacultyId={FacultyId}, UserId={UserId}",
                                facultyId, faculty.UserId);
                        }
                    }
                }
            }

            return Ok(new
            {
                message = "Faculty status updated successfully.",
                facultyId,
                status = request.Status,
                accountSetupEmailStatus = setupEmailStatus
            });
        }

        // GET: /api/v1/faculty/{facultyId}/status-history
        [HttpGet("{facultyId:long}/status-history")]
        public async Task<IActionResult> GetStatusHistory(
            long facultyId)
        {
            if (facultyId <= 0)
            {
                return BadRequest(new
                {
                    message = "Invalid faculty ID."
                });
            }

            var history =
                await _repository.GetStatusHistoryAsync(facultyId);

            return Ok(new
            {
                facultyId,
                history
            });
        }

        private long? GetCurrentUserId()
        {
            var claim =
                User.FindFirst("user_id")?.Value
                ?? User.FindFirst("sub")?.Value;

            if (long.TryParse(claim, out var userId))
            {
                return userId;
            }

            return null;
        }
    }
}