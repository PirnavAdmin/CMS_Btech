using BTech.DTOs.Faculty;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/faculty-profile")]
    [Authorize]
    public class FacultyProfileController : ControllerBase
    {
        private readonly IFacultyProfileService _service;

        public FacultyProfileController(
            IFacultyProfileService service)
        {
            _service = service;
        }

        // GET: api/v1/faculty-profile/2
        [HttpGet("{facultyId:long}")]
        public async Task<IActionResult> GetFacultyProfile(
            long facultyId)
        {
            var profile =
                await _service.GetFacultyProfileAsync(facultyId);

            if (profile == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Faculty profile not found."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Faculty profile retrieved successfully.",
                data = profile
            });
        }

        // PUT: api/v1/faculty-profile/2
        [HttpPut("{facultyId:long}")]
        public async Task<IActionResult> UpdateFacultyProfile(
            long facultyId,
            [FromBody] FacultyProfileUpdateDto request)
        {
            try
            {
                var updatedBy =
                    User.FindFirst("userId")?.Value;

                await _service.UpdateFacultyProfileAsync(
                    facultyId,
                    request,
                    updatedBy);

                return Ok(new
                {
                    success = true,
                    message = "Faculty profile updated successfully."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}