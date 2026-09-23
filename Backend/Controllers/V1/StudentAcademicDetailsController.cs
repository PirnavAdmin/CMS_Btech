using System.Security.Claims;
using BTech.DTOs.StudentAcademicDetails;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/student-admissions/{admissionId:long}/academic-details")]
    [Authorize]
    public class StudentAcademicDetailsController : ControllerBase
    {
        private readonly IStudentAcademicDetailsService _service;

        public StudentAcademicDetailsController(IStudentAcademicDetailsService service)
        {
            _service = service;
        }

        // GET /api/v1/student-admissions/{admissionId}/academic-details
        [HttpGet]
        public async Task<IActionResult> GetAcademicDetails(long admissionId)
        {
            try
            {
                var result = await _service.GetAsync(admissionId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student admission record not found.",
                        data = (object?)null
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Student academic details retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    data = (object?)null
                });
            }
            catch (Exception) { throw; }
        }

        // PUT /api/v1/student-admissions/{admissionId}/academic-details
        [HttpPut]
        public async Task<IActionResult> UpdateAcademicDetails(
            long admissionId,
            [FromBody] UpdateStudentAcademicDetailsDto dto)
        {
            try
            {
                var result = await _service.UpdateAsync(
                    admissionId,
                    dto,
                    GetUserId());

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student admission record not found.",
                        data = (object?)null
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Student academic details updated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    data = (object?)null
                });
            }
            catch (Exception) { throw; }
        }

        private long? GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && long.TryParse(claim.Value, out var userId)
                ? userId
                : null;
        }
    }
}
