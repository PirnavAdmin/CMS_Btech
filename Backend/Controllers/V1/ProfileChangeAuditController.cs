using System.Security.Claims;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/profile")]
    [Authorize]
    public class ProfileChangeAuditController : ControllerBase
    {
        private readonly IProfileChangeAuditService _auditService;
        private readonly ILogger<ProfileChangeAuditController> _logger;

        public ProfileChangeAuditController(
            IProfileChangeAuditService auditService,
            ILogger<ProfileChangeAuditController> logger)
        {
            _auditService = auditService;
            _logger = logger;
        }

        [HttpGet("change-history")]
        public async Task<IActionResult> GetMyChangeHistory()
        {
            var userId = GetLoggedInUserId();
            if (!userId.HasValue)
            {
                _logger.LogWarning("Profile change-history request rejected because user id claim is invalid.");
                return Unauthorized(new { success = false, message = "Invalid user identity." });
            }

            _logger.LogInformation(
                "Profile change-history requested. UserId={UserId}",
                userId.Value);

            var history = await _auditService.GetByUserIdAsync(userId.Value);

            return Ok(new
            {
                success = true,
                message = "Profile change history retrieved successfully.",
                data = history
            });
        }

        private long? GetLoggedInUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && long.TryParse(claim.Value, out var userId)
                ? userId
                : null;
        }
    }
}
