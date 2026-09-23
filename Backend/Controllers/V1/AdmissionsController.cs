using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AdmissionsController : ControllerBase
    {
        private readonly IAdmissionService _admissionService;
        private readonly ILogger<AdmissionsController> _logger;

        public AdmissionsController(
            IAdmissionService admissionService,
            ILogger<AdmissionsController> logger)
        {
            _admissionService = admissionService;
            _logger = logger;
        }

        // =========================================================
        // APPROVE ADMISSION
        // PUT: api/Admissions/{id}/approve
        // =========================================================

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveAdmission(
            long id,
            [FromBody] AdmissionStatusRequestDto request)
        {
            try
            {
                // Get logged-in user ID from JWT
                long? userId = GetUserId();

                // Call service
                var result = await _admissionService
                    .ApproveAdmissionAsync(
                        id,
                        request,
                        userId);

                // Admission not found
                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Admission not found."
                    });
                }

                // Success
                return Ok(new
                {
                    success = true,
                    message = "Admission approved successfully.",
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    correlationId = HttpContext.TraceIdentifier
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    correlationId = HttpContext.TraceIdentifier
                });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex,
                    "Error while approving admission. AdmissionId={AdmissionId}, CorrelationId={CorrelationId}",
                    id, HttpContext.TraceIdentifier);

                return StatusCode(500, new
                {
                    success = false,
                    message = "Database error while approving admission.",
                    correlationId = HttpContext.TraceIdentifier
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Unexpected error while approving admission. AdmissionId={AdmissionId}, CorrelationId={CorrelationId}",
                    id, HttpContext.TraceIdentifier);

                throw;
            }
        }


        // =========================================================
        // REJECT ADMISSION
        // PUT: api/Admissions/{id}/reject
        // =========================================================

        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectAdmission(
            long id,
            [FromBody] AdmissionStatusRequestDto request)
        {
            try
            {
                // Get logged-in user ID from JWT
                long? userId = GetUserId();

                // Call service
                var result = await _admissionService
                    .RejectAdmissionAsync(
                        id,
                        request,
                        userId);

                // Admission not found
                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Admission not found."
                    });
                }

                // Success
                return Ok(new
                {
                    success = true,
                    message = "Admission rejected successfully.",
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    correlationId = HttpContext.TraceIdentifier
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    correlationId = HttpContext.TraceIdentifier
                });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex,
                    "Error while rejecting admission. AdmissionId={AdmissionId}, CorrelationId={CorrelationId}",
                    id, HttpContext.TraceIdentifier);

                return StatusCode(500, new
                {
                    success = false,
                    message = "Database error while rejecting admission.",
                    correlationId = HttpContext.TraceIdentifier
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Unexpected error while rejecting admission. AdmissionId={AdmissionId}, CorrelationId={CorrelationId}",
                    id, HttpContext.TraceIdentifier);

                throw;
            }
        }


        // =========================================================
        // GET ADMISSION STATUS HISTORY
        // GET: api/Admissions/{id}/history
        // =========================================================

        [HttpGet("{id}/history")]
        public async Task<IActionResult> GetStatusHistory(long id)
        {
            try
            {
                var history = await _admissionService.GetStatusHistoryAsync(id);

                return Ok(new
                {
                    success = true,
                    admissionId = id,
                    count = history?.Count ?? 0,
                    data = history ?? new List<AdmissionStatusHistoryDto>()
                });
            }
            catch (Exception) { throw; }
        }
        // =========================================================
        // GET LOGGED-IN USER ID FROM JWT
        // =========================================================

        private long? GetUserId()
        {
            var claim = User.FindFirst(
                ClaimTypes.NameIdentifier);

            if (claim == null)
            {
                return null;
            }

            if (long.TryParse(
                claim.Value,
                out long userId))
            {
                return userId;
            }

            return null;
        }
    }
}