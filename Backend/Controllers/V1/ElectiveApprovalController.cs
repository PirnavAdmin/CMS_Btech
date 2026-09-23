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
    }
}