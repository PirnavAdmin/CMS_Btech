using BTech.DTOs.Department;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/departments")]
    [Authorize]
    public class DepartmentHodController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;
        private readonly ILogger<DepartmentHodController> _logger;

        public DepartmentHodController(
            IDepartmentService departmentService,
            ILogger<DepartmentHodController> logger)
        {
            _departmentService = departmentService;
            _logger = logger;
        }

        // ============================================================
        // Helper: Get Logged-in User ID from JWT
        // ============================================================

        private long GetUserId()
        {
            var userIdClaim = User.FindFirstValue(
                ClaimTypes.NameIdentifier);

            if (!long.TryParse(userIdClaim, out long userId) ||
                userId <= 0)
            {
                throw new UnauthorizedAccessException(
                    "Invalid authenticated user.");
            }

            return userId;
        }


        // ============================================================
        // 1. GET CURRENT HOD
        // GET: api/v1/departments/{departmentId}/hod
        // ============================================================

        [HttpGet("{departmentId:long}/hod")]
        public async Task<IActionResult> GetHod(
            long departmentId)
        {
            if (departmentId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid department ID."
                });
            }

            _logger.LogInformation(
                "Getting HOD for DepartmentId: {DepartmentId}",
                departmentId);

            var result =
                await _departmentService.GetHodAsync(
                    departmentId);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "No HOD is assigned to this department."
                });
            }

            return Ok(new
            {
                success = true,
                message = "HOD retrieved successfully.",
                data = result
            });
        }


        // ============================================================
        // 2. GET HOD CANDIDATES
        // GET: api/v1/departments/{departmentId}/hod-candidates
        // ============================================================

        [HttpGet("{departmentId:long}/hod-candidates")]
        public async Task<IActionResult> GetHodCandidates(
            long departmentId)
        {
            if (departmentId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid department ID."
                });
            }

            _logger.LogInformation(
                "Getting HOD candidates for DepartmentId: {DepartmentId}",
                departmentId);

            var result =
                await _departmentService
                    .GetHodCandidatesAsync(departmentId);

            return Ok(new
            {
                success = true,
                message = "HOD candidates retrieved successfully.",
                data = result
            });
        }


        // ============================================================
        // 3. ASSIGN HOD
        // PUT: api/v1/departments/{departmentId}/hod
        // ============================================================

        [HttpPut("{departmentId:long}/hod")]
        public async Task<IActionResult> AssignHod(
            long departmentId,
            [FromBody] AssignHodRequestDto request)
        {
            if (departmentId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid department ID."
                });
            }

            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Request body is required."
                });
            }

            if (request.EmployeeProfileId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Valid employee profile ID is required."
                });
            }

            var updatedBy = GetUserId();

            _logger.LogInformation(
                "Assigning HOD. DepartmentId: {DepartmentId}, " +
                "EmployeeProfileId: {EmployeeProfileId}, " +
                "UpdatedBy: {UpdatedBy}",
                departmentId,
                request.EmployeeProfileId,
                updatedBy);

            var result =
                await _departmentService.AssignHodAsync(
                    departmentId,
                    request.EmployeeProfileId,
                    updatedBy);

            return Ok(new
            {
                success = true,
                message = "HOD assigned successfully.",
                data = result
            });
        }


        // ============================================================
        // 4. REMOVE HOD
        // DELETE: api/v1/departments/{departmentId}/hod
        // ============================================================

        [HttpDelete("{departmentId:long}/hod")]
        public async Task<IActionResult> RemoveHod(
            long departmentId)
        {
            if (departmentId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid department ID."
                });
            }

            var updatedBy = GetUserId();

            _logger.LogInformation(
                "Removing HOD. DepartmentId: {DepartmentId}, " +
                "UpdatedBy: {UpdatedBy}",
                departmentId,
                updatedBy);

            await _departmentService.RemoveHodAsync(
                departmentId,
                updatedBy);

            return Ok(new
            {
                success = true,
                message = "HOD removed successfully."
            });
        }
    }
}
