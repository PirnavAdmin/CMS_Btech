using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/super-admin/college-mappings")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class CollegeUserMappingsController : ControllerBase
    {
        private readonly ICollegeUserMappingService _service;

        public CollegeUserMappingsController(
            ICollegeUserMappingService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                message = "College mappings retrieved successfully.",
                data = result
            });
        }

        [HttpGet("user/{userId:long}")]
        public async Task<IActionResult> GetByUser(
            long userId)
        {
            var result =
                await _service.GetByUserIdAsync(userId);

            return Ok(new
            {
                success = true,
                message =
                    "User college mappings retrieved successfully.",
                data = result
            });
        }

        [HttpPost]
        public async Task<IActionResult> Assign(
            [FromBody] CollegeUserMappingRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid request."
                });
            }

            var assignedByClaim =
                User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!long.TryParse(
                    assignedByClaim,
                    out var assignedBy))
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Invalid logged-in user."
                });
            }

            var result =
                await _service.AssignAsync(
                    request.UserId,
                    request.CollegeSettingId,
                    assignedBy);

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
                message = result.Message
            });
        }

        [HttpDelete("user/{userId:long}/college/{collegeSettingId:long}")]
        public async Task<IActionResult> Remove(
            long userId,
            long collegeSettingId)
        {
            var removedByClaim =
                User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!long.TryParse(
                    removedByClaim,
                    out var removedBy))
            {
                return Unauthorized(new
                {
                    success = false,
                    message = "Invalid logged-in user."
                });
            }

            var result =
                await _service.RemoveAsync(
                    userId,
                    collegeSettingId,
                    removedBy);

            if (!result.Success)
            {
                return NotFound(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }
    }
}