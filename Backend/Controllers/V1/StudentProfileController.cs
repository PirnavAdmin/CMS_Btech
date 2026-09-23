using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StudentProfileController : ControllerBase
    {
        private readonly IStudentProfileService _studentProfileService;

        public StudentProfileController(
            IStudentProfileService studentProfileService)
        {
            _studentProfileService = studentProfileService;
        }

        // ============================================
        // GET MY PROFILE
        // ============================================

        [HttpGet("my-profile")]
        public async Task<IActionResult> GetMyProfile()
        {
            try
            {
                // Get logged-in user ID from JWT
                var userIdClaim =
                    User.FindFirst(ClaimTypes.NameIdentifier);

                if (userIdClaim == null)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "User ID not found in token."
                    });
                }

                if (!long.TryParse(
                    userIdClaim.Value,
                    out long userId))
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Invalid user ID."
                    });
                }

                // Get profile
                var profile =
                    await _studentProfileService
                        .GetStudentProfileAsync(userId);

                if (profile == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student profile not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Student profile retrieved successfully.",
                    data = profile
                });
            }
            catch (Exception) { throw; }
        }
    }
}