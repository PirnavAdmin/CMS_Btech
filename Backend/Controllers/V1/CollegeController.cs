using Microsoft.AspNetCore.Mvc;
using UserRoleManagement.API.DTOs;
using UserRoleManagement.API.Services;

namespace UserRoleManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CollegeController : ControllerBase
    {
        private readonly ICollegeService _collegeService;

        public CollegeController(ICollegeService collegeService)
        {
            _collegeService = collegeService;
        }

        [HttpPost("logo")]
        public async Task<IActionResult> UploadLogo(
            [FromForm] CollegeLogoUploadDto dto)
        {
            try
            {
                var fileName =
                    await _collegeService.UploadCollegeLogoAsync(
                        dto.CollegeId,
                        dto.Logo);

                return Ok(new
                {
                    message = "College logo uploaded successfully",
                    fileName = fileName
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        [HttpGet("logo/{collegeId}")]
        public async Task<IActionResult> GetCollegeLogo(
            long collegeId)
        {
            try
            {
                var result =
                    await _collegeService.GetCollegeLogoAsync(
                        collegeId);

                return File(
                    result.FileBytes,
                    result.ContentType);
            }
            catch (Exception ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
        }
    }
}