using BTech.DTOs.StudentAcademicInformation;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/student-academic-information")]
    [Authorize]
    public sealed class StudentAcademicInformationController : ControllerBase
    {
        private readonly IStudentAcademicInformationService _service;

        public StudentAcademicInformationController(IStudentAcademicInformationService service)
        {
            _service = service;
        }

        // GET /api/v1/student-academic-information/{academicId}
        [HttpGet("{academicId:int}")]
        public async Task<IActionResult> GetById(int academicId)
        {
            try
            {
                var result = await _service.GetByIdAsync(academicId);

                return result == null
                    ? NotFound(new
                    {
                        success = false,
                        message = "Student academic information not found.",
                        data = (object?)null
                    })
                    : Ok(new
                    {
                        success = true,
                        message = "Student academic information retrieved successfully.",
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
        }

        // PUT /api/v1/student-academic-information/{academicId}
        [HttpPut("{academicId:int}")]
        public async Task<IActionResult> Update(
            int academicId,
            [FromBody] UpdateStudentAcademicInformationDto dto)
        {
            try
            {
                var result = await _service.UpdateAsync(academicId, dto);

                return result == null
                    ? NotFound(new
                    {
                        success = false,
                        message = "Student academic information not found.",
                        data = (object?)null
                    })
                    : Ok(new
                    {
                        success = true,
                        message = "Student academic information updated successfully.",
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
        }
    }
}
