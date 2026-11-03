using BTech.DTOs.Electives;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/elective-approvals")]
    [Authorize]
    public class ElectiveApprovalController : ControllerBase
    {
        private readonly IElectiveApprovalService _service;
        private readonly ILogger<ElectiveApprovalController> _logger;

        public ElectiveApprovalController(
            IElectiveApprovalService service,
            ILogger<ElectiveApprovalController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // ============================================================
        // GET: api/v1/elective-approvals
        // ============================================================
        /// <summary>
        /// Get elective approval records for the logged-in college.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] ElectiveApprovalListRequestDto request)
        {
            try
            {
                var collegeIdValue =
                    User.FindFirst("collegeId")?.Value;

                if (!long.TryParse(collegeIdValue, out var collegeId) ||
                    collegeId <= 0)
                {
                    return Unauthorized(new
                    {
                        message = "College information not found in token."
                    });
                }

                var result = await _service.GetAllAsync(
                    collegeId,
                    request);

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving elective approval records.");

                throw;
            }
        }

        // ============================================================
        // PUT: api/v1/elective-approvals/{selectionId}
        // Existing endpoint - KEEP THIS
        // ============================================================
        /// <summary>
        /// Approve or reject a student's elective selection.
        /// </summary>
        [HttpPut("{selectionId:long}")]
        public async Task<IActionResult> Update(
            long selectionId,
            [FromBody] ElectiveApprovalRequestDto request)
        {
            try
            {
                var collegeIdValue =
                    User.FindFirst("collegeId")?.Value;

                if (!long.TryParse(collegeIdValue, out var collegeId) ||
                    collegeId <= 0)
                {
                    return Unauthorized(new
                    {
                        message = "College information not found in token."
                    });
                }

                var userIdValue =
                    User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!long.TryParse(userIdValue, out var userId) ||
                    userId <= 0)
                {
                    return Unauthorized(new
                    {
                        message = "User information not found in token."
                    });
                }

                if (selectionId <= 0)
                {
                    return BadRequest(new
                    {
                        message = "SelectionId must be greater than zero."
                    });
                }

                if (request == null)
                {
                    return BadRequest(new
                    {
                        message = "Approval request is required."
                    });
                }

                var result = await _service.UpdateAsync(
                    collegeId,
                    selectionId,
                    request,
                    userId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        message = "Elective selection not found."
                    });
                }

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating elective approval for SelectionId {SelectionId}.",
                    selectionId);

                throw;
            }
        }

        // ============================================================
        // PATCH:
        // api/v1/electives/selections/{selectionId}/approval
        //
        // Frontend-compatible endpoint
        // ============================================================
        /// <summary>
        /// Approve or reject a student's elective selection.
        /// Frontend-compatible PATCH endpoint.
        /// </summary>
        [HttpPatch("/api/v1/electives/selections/{selectionId:long}/approval")]
        public async Task<IActionResult> UpdateFromFrontend(
            long selectionId,
            [FromBody] ElectiveApprovalRequestDto request)
        {
            try
            {
                // ----------------------------------------------------
                // Validate SelectionId
                // ----------------------------------------------------
                if (selectionId <= 0)
                {
                    return BadRequest(new
                    {
                        message = "SelectionId must be greater than zero."
                    });
                }

                // ----------------------------------------------------
                // Validate request
                // ----------------------------------------------------
                if (request == null)
                {
                    return BadRequest(new
                    {
                        message = "Approval request is required."
                    });
                }

                // ----------------------------------------------------
                // Get CollegeId from JWT
                // ----------------------------------------------------
                var collegeIdValue =
                    User.FindFirst("collegeId")?.Value;

                if (!long.TryParse(
                        collegeIdValue,
                        out var collegeId) ||
                    collegeId <= 0)
                {
                    return Unauthorized(new
                    {
                        message =
                            "College information not found in token."
                    });
                }

                // ----------------------------------------------------
                // Get UserId from JWT
                // ----------------------------------------------------
                var userIdValue =
                    User.FindFirst(
                        ClaimTypes.NameIdentifier)?.Value;

                if (!long.TryParse(
                        userIdValue,
                        out var userId) ||
                    userId <= 0)
                {
                    return Unauthorized(new
                    {
                        message =
                            "User information not found in token."
                    });
                }

                // ----------------------------------------------------
                // Use existing approval service
                // ----------------------------------------------------
                var result = await _service.UpdateAsync(
                    collegeId,
                    selectionId,
                    request,
                    userId);

                // ----------------------------------------------------
                // Selection not found
                // ----------------------------------------------------
                if (result == null)
                {
                    return NotFound(new
                    {
                        message =
                            "Elective selection not found."
                    });
                }

                // ----------------------------------------------------
                // Success
                // ----------------------------------------------------
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Invalid elective approval request for " +
                    "SelectionId {SelectionId}.",
                    selectionId);

                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating elective approval through " +
                    "frontend-compatible endpoint for " +
                    "SelectionId {SelectionId}.",
                    selectionId);

                throw;
            }
        }
    }
}