using System.Security.Claims;
using BTech.DTOs.StudentAdmission;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/student-admissions")]
    [Authorize]
    public class StudentAdmissionsController : ControllerBase
    {
        private readonly IStudentAdmissionService _service;
        private readonly ILogger<StudentAdmissionsController> _logger;

        public StudentAdmissionsController(
            IStudentAdmissionService service,
            ILogger<StudentAdmissionsController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // GET /api/v1/student-admissions
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] string? admissionStatus = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] long? courseId = null, [FromQuery] long? departmentId = null,
            [FromQuery] long? branchId = null, [FromQuery] long? semesterId = null,
            [FromQuery] long? academicYearId = null)
        {
            if (pageNumber<1 || pageSize<1 || pageSize>100) return BadRequest(new {success=false,message="PageNumber must be positive; PageSize must be between 1 and 100."});
            var effectivePageSize = Request.Query.ContainsKey("pageNumber") || Request.Query.ContainsKey("pageSize") ? pageSize : 0;
            var result = await _service.GetAllAsync(
                search,
                admissionStatus,
                pageNumber,
                effectivePageSize, courseId, departmentId, branchId, semesterId, academicYearId);

            return Ok(new
            {
                success = true,
                message = "Student admission records retrieved successfully.",
                data = result
            });
        }

        // POST /api/v1/student-admissions
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateStudentAdmissionDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto, GetUserId());
                return StatusCode(201, new
                {
                    success = true,
                    message = "Student admission/registration record created successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message, data = (object?)null });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Student admission create failed.");
                throw;
            }
        }

        // PUT /api/v1/student-admissions/{admissionId}
        [HttpPut("{admissionId:long}")]
        public async Task<IActionResult> Update(
            long admissionId,
            [FromBody] UpdateStudentAdmissionDto dto)
        {
            try
            {
                var result = await _service.UpdateAsync(admissionId, dto, GetUserId());
                if (result == null)
                    return NotFound(new { success = false, message = "Student admission record not found.", data = (object?)null });

                return Ok(new
                {
                    success = true,
                    message = "Student admission/registration record updated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message, data = (object?)null });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Student admission update failed. AdmissionId={AdmissionId}", admissionId);
                throw;
            }
        }

        // GET is included to verify create/update results in Swagger.
        [HttpGet("{admissionId:long}")]
        public async Task<IActionResult> GetById(long admissionId)
        {
            try
            {
                var result = await _service.GetByIdAsync(admissionId);
                if (result == null)
                    return NotFound(new { success = false, message = "Student admission record not found.", data = (object?)null });

                return Ok(new { success = true, message = "Student admission record retrieved successfully.", data = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message, data = (object?)null });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Student admission lookup failed. AdmissionId={AdmissionId}", admissionId);
                throw;
            }
        }

        private long GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null || !long.TryParse(claim.Value, out var userId) || userId <= 0)
                throw new UnauthorizedAccessException("Invalid authenticated user.");
            return userId;
        }
    }
}
