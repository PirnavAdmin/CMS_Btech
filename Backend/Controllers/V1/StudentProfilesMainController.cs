using BTech.Data;
using Microsoft.EntityFrameworkCore;
using BTech.DTOs.StudentProfileMain;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/student-profiles")]
    [Authorize]
    public class StudentProfilesMainController : ControllerBase
    {
        private readonly IStudentProfileMainService _service;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<StudentProfilesMainController> _logger;

        public StudentProfilesMainController(
            IStudentProfileMainService service,
            ILogger<StudentProfilesMainController> logger, ApplicationDbContext context)
        {
            _service = service;
            _logger = logger;
            _context = context;
        }

        // ============================================================
        // GET ALL STUDENT PROFILES
        // ============================================================

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] long? departmentId = null,
            [FromQuery] long? courseId = null,
            [FromQuery] long? branchId = null,
            [FromQuery] long? academicYearId = null,
            [FromQuery] int? semester = null,
            [FromQuery] long? sectionId = null,
            [FromQuery] int? status = null)
        {
            try
            {
                var collegeId = await GetCollegeIdAsync();

                _logger.LogInformation(
                    "Getting student profiles. CollegeId: {CollegeId}",
                    collegeId);

                var result = await _service.GetAllAsync(
                    collegeId,
                    search,
                    departmentId,
                    courseId,
                    branchId,
                    academicYearId,
                    semester,
                    sectionId,
                    status);

                return Ok(new
                {
                    success = true,
                    message = "Student profiles retrieved successfully.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving student profiles.");

                throw;
            }
        }


        // ============================================================
        // GET STUDENT PROFILE PREVIEW
        // ============================================================

        [HttpGet("{studentId:long}/preview")]
        public async Task<IActionResult> GetPreview(long studentId)
        {
            try
            {
                if (studentId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid student ID."
                    });
                }

                var collegeId = await GetCollegeIdAsync(studentId);

                _logger.LogInformation(
                    "Getting student profile preview. StudentId: {StudentId}, CollegeId: {CollegeId}",
                    studentId,
                    collegeId);

                var result = await _service.GetPreviewAsync(
                    studentId,
                    collegeId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student profile not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Student profile preview retrieved successfully.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving student profile preview. StudentId: {StudentId}",
                    studentId);

                throw;
            }
        }

        [HttpPatch("{studentId:long}")]
        public async Task<IActionResult> Update(
            long studentId,
            [FromBody] UpdateStudentProfileDto request)
        {
            var result = await _service.UpdateAsync(
                studentId,
                await GetCollegeIdAsync(studentId),
                request,
                GetUserId(),
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                Request.Headers.UserAgent.ToString());

            return result == null
                ? NotFound(new { success = false, message = "Student profile not found." })
                : Ok(new
                {
                    success = true,
                    message = "Student profile updated successfully.",
                    data = result
                });
        }

        private async Task<long> GetCollegeIdAsync(long? studentId = null)
        {
            if (User.IsInRole("SUPER_ADMIN"))
            {
                if (studentId.HasValue)
                {
                    var recordCollege = await _context.Students.AsNoTracking().Where(x=>x.StudentId==studentId && x.DeletedAt==null).Select(x=>(long?)x.CollegeId).FirstOrDefaultAsync();
                    if (recordCollege.HasValue) return recordCollege.Value;
                    throw new BTech.Exceptions.NotFoundException("Student profile not found.");
                }
                return long.TryParse(Request.Query["collegeId"],out var selected) && selected>0 ? selected : 0;
            }
            var value = User.FindFirst("collegeId")?.Value
                ?? User.FindFirst("college_id")?.Value
                ?? User.FindFirst(ClaimTypes.GroupSid)?.Value;
            if (!long.TryParse(value, out var collegeId) || collegeId <= 0)
                throw new UnauthorizedAccessException("College information not found in token.");
            return collegeId;
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
