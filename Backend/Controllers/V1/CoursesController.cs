using System.Security.Claims;
using BTech.DTOs.Course;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/courses")]
    [Authorize]
    public sealed class CoursesController : ControllerBase
    {
        private readonly ICourseService _courseService;

        public CoursesController(ICourseService courseService)
        {
            _courseService = courseService;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCourseDto dto)
        {
            try
            {
                var course = await _courseService.AddAsync(dto, GetUserId());
                return CreatedAtAction(
                    nameof(GetById),
                    new { id = course.CourseId },
                    new
                    {
                        success = true,
                        message = "Course created successfully.",
                        data = course
                    });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? search,
            [FromQuery] sbyte? status,
            [FromQuery] long? collegeId,
            [FromQuery] long? departmentId)
        {
            var courses = await _courseService.GetAllAsync(
                search,
                status,
                collegeId,
                departmentId);

            return Ok(new
            {
                success = true,
                message = "Courses retrieved successfully.",
                data = courses
            });
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id)
        {
            try
            {
                var course = await _courseService.GetByIdAsync(id);
                return course == null
                    ? NotFound(new { success = false, message = "Course not found." })
                    : Ok(new { success = true, data = course });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(
            long id,
            [FromBody] UpdateCourseDto dto)
        {
            try
            {
                var course = await _courseService.UpdateAsync(id, dto, GetUserId());
                return course == null
                    ? NotFound(new { success = false, message = "Course not found." })
                    : Ok(new
                    {
                        success = true,
                        message = "Course updated successfully.",
                        data = course
                    });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("{id:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long id,
            [FromBody] UpdateCourseStatusDto dto)
        {
            try
            {
                var course = await _courseService.UpdateStatusAsync(
                    id,
                    dto.Status,
                    GetUserId());

                return course == null
                    ? NotFound(new { success = false, message = "Course not found." })
                    : Ok(new
                    {
                        success = true,
                        message = "Course status updated successfully.",
                        data = course
                    });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        private long? GetUserId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(value, out var userId) ? userId : null;
        }
    }
}
