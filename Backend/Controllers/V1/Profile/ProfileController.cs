using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/profile")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;

        public ProfileController(
            IProfileService profileService)
        {
            _profileService = profileService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetLoggedInUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Invalid user identity."
                });
            }

            var profile =
                await _profileService
                    .GetProfileAsync(userId.Value);

            if (profile == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Profile not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Profile retrieved successfully.",
                data = profile
            });
        }

        [HttpPatch]
        public async Task<IActionResult> UpdateProfile(
            [FromBody] UpdateProfileRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid profile data.",
                    errors = ModelState
                });
            }

            var userId = GetLoggedInUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Invalid user identity."
                });
            }

            var result =
                await _profileService
                    .UpdateProfileAsync(
                        userId.Value,
                        request);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        private long? GetLoggedInUserId()
        {
            var userIdClaim =
                User.FindFirst(
                    ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return null;
            }

            if (long.TryParse(
                    userIdClaim.Value,
                    out var userId))
            {
                return userId;
            }

            return null;
        }
    }
}