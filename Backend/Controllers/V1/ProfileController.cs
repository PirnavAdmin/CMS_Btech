using BTech.DTOs.Profile;
using BTech.DTOs.StudentProfile;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers
{
    [ApiController]
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;
        private readonly ILogger<ProfileController> _logger;
        private readonly IStudentPersonalInformationService _studentPersonalInformationService;

        public ProfileController(
            IProfileService profileService,
            IStudentPersonalInformationService studentPersonalInformationService,
            ILogger<ProfileController> logger)
        {
            _profileService = profileService;
            _studentPersonalInformationService = studentPersonalInformationService;
            _logger = logger;
        }

        // =========================================================
        // CURRENT USER PROFILE API
        // GET /api/v1/profile
        // =========================================================

        [Authorize]
        [HttpGet("~/api/v1/profile")]
        public async Task<IActionResult> GetMyProfile()
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

            _logger.LogInformation("Profile requested. UserId={UserId}", userId.Value);

            var profile = await _profileService.GetProfileAsync(userId.Value);

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

        // =========================================================
        // CURRENT USER PROFILE UPDATE
        // PATCH /api/v1/profile
        // =========================================================

        [Authorize]
        [HttpPatch("~/api/v1/profile")]
        public async Task<IActionResult> UpdateMyProfile(
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

            _logger.LogInformation(
                "Profile update requested. UserId={UserId}, ChangedBy={ChangedBy}",
                userId.Value,
                userId.Value);

            var currentProfile = await _profileService.GetProfileAsync(userId.Value);
            if (currentProfile?.StudentId is > 0 &&
                currentProfile.Roles.Any(role =>
                    string.Equals(role, "STUDENT", StringComparison.OrdinalIgnoreCase)))
            {
                await _studentPersonalInformationService.UpdateAsync(
                    currentProfile.StudentId.Value,
                    new UpdateStudentPersonalInformationRequestDto
                    {
                        FullName = request.FullName,
                        Email = request.Email,
                        Mobile = request.Mobile,
                        DateOfBirth = request.DateOfBirth,
                        Gender = request.Gender,
                        Address = request.Address,
                        HouseNumber = request.HouseNumber,
                        PermanentHouseNumber = request.PermanentHouseNumber,
                        PermanentAddress = request.PermanentAddress,
                        PermanentCity = request.PermanentCity,
                        PermanentDistrict = request.PermanentDistrict,
                        PermanentState = request.PermanentState,
                        PermanentCountry = request.PermanentCountry,
                        PermanentPincode = request.PermanentPincode,

                        Pincode = request.Pincode,
                        City = request.City,
                        District = request.District,
                        State = request.State,
                        ChangeReason = "Updated from the My Profile screen."
                    },
                    userId.Value,
                    HttpContext.Connection.RemoteIpAddress?.ToString(),
                    Request.Headers.UserAgent.ToString());

                var updatedStudentProfile =
                    await _profileService.GetProfileAsync(userId.Value);

                _logger.LogInformation(
                    "Student My Profile update completed. UserId={UserId}, StudentId={StudentId}",
                    userId.Value,
                    currentProfile.StudentId.Value);

                return Ok(new
                {
                    success = true,
                    message = "Profile updated successfully.",
                    data = updatedStudentProfile
                });
            }

            var result = await _profileService.UpdateProfileAsync(
                userId.Value,
                request,
                userId.Value);

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

        // =========================================================
        // LEGACY / STUDENT PROFILE API
        // GET /api/profile/{studentId}
        // =========================================================

        [HttpGet("~/api/profile/{studentId:long}")]
        public async Task<IActionResult> GetProfile(long studentId)
        {
            var result = await _profileService.GetProfileAsync(studentId);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        // =========================================================
        // LEGACY / STUDENT PROFILE UPDATE
        // PUT /api/profile/{studentId}
        // =========================================================

        [HttpPut("~/api/profile/{studentId:long}")]
        public async Task<IActionResult> UpdateProfile(
            long studentId,
            [FromBody] UpdateProfileRequestDto request)
        {
            var changedBy = GetLoggedInUserId() ?? studentId;

            _logger.LogInformation(
                "Legacy profile update requested. UserId={UserId}, ChangedBy={ChangedBy}",
                studentId,
                changedBy);

            var result = await _profileService.UpdateProfileAsync(
                studentId,
                request,
                changedBy);

            if (!result.Success)
                return BadRequest(result.Message);

            return Ok(result);
        }

        // =========================================================
        // LEGACY FEE SUMMARY API
        // GET /api/profile/{studentId}/fee-summary
        // =========================================================

        [HttpGet("~/api/profile/{studentId:long}/fee-summary")]
        public async Task<IActionResult> GetFeeSummary(long studentId)
        {
            var result = await _profileService.GetFeeSummaryAsync(studentId);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        private long? GetLoggedInUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
                return null;

            return long.TryParse(userIdClaim.Value, out var userId)
                ? userId
                : null;
        }
    }
}
