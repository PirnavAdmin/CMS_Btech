using BTech.DTOs.Electives;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Authorize]
    [Route("api/v1/elective-allocations")]
    public class ElectiveAllocationController : ControllerBase
    {
        private readonly IElectiveAllocationService _service;
        private readonly ILogger<ElectiveAllocationController> _logger;

        public ElectiveAllocationController(
            IElectiveAllocationService service,
            ILogger<ElectiveAllocationController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // ============================================================
        // GET: api/v1/elective-allocations
        // ============================================================
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] ElectiveAllocationListRequestDto request)
        {
            try
            {
                // Existing JWT claim name in this project is "collegeId".
                var collegeIdClaim = User.FindFirst("collegeId")?.Value;

                if (!long.TryParse(collegeIdClaim, out var collegeId) ||
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
                _logger.LogWarning(
                    ex,
                    "Invalid request while retrieving elective allocations.");

                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving elective allocations.");

                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = "An error occurred while retrieving elective allocations."
                    });
            }
        }

        // ============================================================
        // POST: api/v1/elective-allocations/{selectionId}
        // ============================================================
        [HttpPost("{selectionId:long}")]
        public async Task<IActionResult> Create(
            long selectionId,
            [FromBody] ElectiveAllocationCreateDto request)
        {
            try
            {
                // Existing JWT claim name in this project is "collegeId".
                var collegeIdClaim = User.FindFirst("collegeId")?.Value;

                if (!long.TryParse(collegeIdClaim, out var collegeId) ||
                    collegeId <= 0)
                {
                    return Unauthorized(new
                    {
                        message = "College information not found in token."
                    });
                }

                // Existing JWT user ID claim.
                var userIdClaim =
                    User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!long.TryParse(userIdClaim, out var allocatedBy) ||
                    allocatedBy <= 0)
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

                var result = await _service.CreateAsync(
                    collegeId,
                    selectionId,
                    request,
                    allocatedBy);

                if (result == null)
                {
                    return BadRequest(new
                    {
                        message =
                            "Elective allocation could not be created. " +
                            "The selection may not exist, may not be approved, " +
                            "or may already be allocated."
                    });
                }

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Invalid request while creating elective allocation " +
                    "for selection {SelectionId}.",
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
                    "Error creating elective allocation " +
                    "for selection {SelectionId}.",
                    selectionId);

                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message =
                            "An error occurred while creating the elective allocation."
                    });
            }
        }
    }
}