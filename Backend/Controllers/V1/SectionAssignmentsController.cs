using System.Security.Claims;
using BTech.DTOs.Sections;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/v1/sections")]
    [Authorize]
    public class SectionAssignmentsController : ControllerBase
    {
        private readonly ISectionAssignmentService _service;

        public SectionAssignmentsController(ISectionAssignmentService service)
        {
            _service = service;
        }

        // Frontend compatibility endpoint for the initial allocation grid.
        [HttpGet("~/api/v1/section-assignments")]
        public async Task<IActionResult> GetAllStudentAssignments()
        {
            var result = await _service.GetAllStudentsAsync();
            return Ok(new { success = true, data = result });
        }

        [HttpGet("{sectionId:long}/class-teacher")]
        public async Task<IActionResult> GetClassTeacher(long sectionId)
        {
            var result = await _service.GetClassTeacherAsync(sectionId);
            if (result == null)
                return NotFound(new { success = false, message = "Section not found." });

            return Ok(new { success = true, data = result });
        }

        [HttpGet("{sectionId:long}/class-teacher-candidates")]
        public async Task<IActionResult> GetClassTeacherCandidates(long sectionId)
        {
            var result = await _service.GetClassTeacherCandidatesAsync(sectionId);
            return Ok(new { success = true, data = result });
        }

        [HttpPut("{sectionId:long}/class-teacher")]
        [Authorize(Roles = "SUPER_ADMIN,COLLEGE_ADMIN")]
        public async Task<IActionResult> AssignClassTeacher(long sectionId, [FromBody] AssignClassTeacherRequestDto request)
        {
            var userId = GetUserId();
            var result = await _service.AssignClassTeacherAsync(sectionId, request.EmployeeProfileId, userId);
            return Ok(new
            {
                success = true,
                message = "Class teacher assigned/changed successfully.",
                data = result
            });
        }

        [HttpDelete("{sectionId:long}/class-teacher")]
        [Authorize(Roles = "SUPER_ADMIN,COLLEGE_ADMIN")]
        public async Task<IActionResult> RemoveClassTeacher(long sectionId)
        {
            await _service.RemoveClassTeacherAsync(sectionId, GetUserId());
            return Ok(new { success = true, message = "Class teacher removed successfully." });
        }

        [HttpGet("{sectionId:long}/capacity")]
        public async Task<IActionResult> GetCapacity(long sectionId)
        {
            var result = await _service.GetCapacityAsync(sectionId);
            return Ok(new { success = true, data = result });
        }

        [HttpGet("{sectionId:long}/student-candidates")]
        public async Task<IActionResult> GetStudentCandidates(long sectionId, [FromQuery] string? search = null)
        {
            var result = await _service.GetStudentCandidatesAsync(sectionId, search);
            return Ok(new { success = true, data = result });
        }

        [HttpGet("{sectionId:long}/students")]
        public async Task<IActionResult> GetStudents(long sectionId)
        {
            var result = await _service.GetStudentsAsync(sectionId);
            return Ok(new { success = true, data = result });
        }

        [HttpPost("{sectionId:long}/students/assign")]
        [HttpPost("{sectionId:long}/students")]
        [Authorize(Roles = "SUPER_ADMIN,COLLEGE_ADMIN")]
        public async Task<IActionResult> AssignStudents(long sectionId, [FromBody] AssignStudentsRequestDto request)
        {
            var result = await _service.AssignStudentsAsync(sectionId, request.StudentIds, GetUserId());
            return Ok(new
            {
                success = true,
                message = "Students assigned to section successfully.",
                data = result
            });
        }

        [HttpDelete("{sectionId:long}/students/{studentId:long}")]
        [Authorize(Roles = "SUPER_ADMIN,COLLEGE_ADMIN")]
        public async Task<IActionResult> RemoveStudent(long sectionId, long studentId)
        {
            await _service.RemoveStudentAsync(sectionId, studentId, GetUserId());
            return Ok(new { success = true, message = "Student removed from section successfully." });
        }

        private long GetUserId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(value, out var userId) || userId <= 0)
                throw new UnauthorizedAccessException("Invalid authenticated user.");
            return userId;
        }
    }
}
