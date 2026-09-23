using BTech.DTOs.CourseStructure;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/course-structures")]
    [Authorize]
    public class CourseStructureController : ControllerBase
    {
        private readonly ICourseStructureService _service;

        public CourseStructureController(
            ICourseStructureService service)
        {
            _service = service;
        }

        // =====================================================
        // GET ALL
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result =
                await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                message =
                    "Course structures retrieved successfully.",
                data = result
            });
        }

        // =====================================================
        // GET BY COURSE
        // =====================================================

        [HttpGet("course/{courseId:long}")]
        public async Task<IActionResult> GetByCourse(
            long courseId)
        {
            var result =
                await _service.GetByCourseIdAsync(
                    courseId);

            return Ok(new
            {
                success = true,
                message =
                    "Course structure retrieved successfully.",
                data = result
            });
        }

        // =====================================================
        // GET BY ID
        // =====================================================

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(
            long id)
        {
            var result =
                await _service.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        "Course structure not found.",
                    data = (object?)null
                });
            }

            return Ok(new
            {
                success = true,
                message =
                    "Course structure retrieved successfully.",
                data = result
            });
        }

        // =====================================================
        // POST
        // =====================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateCourseStructureDto dto)
        {
            try
            {
                var userId =
                    GetUserId();

                var result =
                    await _service.AddAsync(
                        dto,
                        userId);

                return Ok(new
                {
                    success = true,
                    message =
                        "Course structure created successfully.",
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

        // =====================================================
        // PUT
        // =====================================================

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(
            long id,
            [FromBody] UpdateCourseStructureDto dto)
        {
            try
            {
                var userId =
                    GetUserId();

                var result =
                    await _service.UpdateAsync(
                        id,
                        dto,
                        userId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message =
                            "Course structure not found.",
                        data = (object?)null
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Course structure updated successfully.",
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

        // =====================================================
        // DELETE
        // =====================================================

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(
            long id)
        {
            try
            {
                var userId =
                    GetUserId();

                var result =
                    await _service.DeleteAsync(
                        id,
                        userId);

                if (!result)
                {
                    return NotFound(new
                    {
                        success = false,
                        message =
                            "Course structure not found.",
                        data = (object?)null
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Course structure deleted successfully.",
                    data = (object?)null
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

        // =====================================================
        // GET USER ID
        // =====================================================

        private long? GetUserId()
        {
            var claim =
                User.FindFirst(
                    ClaimTypes.NameIdentifier);

            if (claim != null &&
                long.TryParse(
                    claim.Value,
                    out var userId))
            {
                return userId;
            }

            return null;
        }
    }
}