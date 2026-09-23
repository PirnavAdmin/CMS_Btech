using BTech.DTOs.Sections;
using BTech.Services.Implementations;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/sections")]
    [Authorize(
        Roles =
            "SUPER_ADMIN,COLLEGE_ADMIN,PRINCIPAL,HOD")]
    public class SectionsController : ControllerBase
    {
        private readonly ISectionService _service;
        private readonly ILogger<SectionsController> _logger;

        public SectionsController(
            ISectionService service,
            ILogger<SectionsController> logger)
        {
            _service = service;
            _logger = logger;
        }


        private long GetUserId()
        {
            var value =
                User.FindFirstValue(
                    ClaimTypes.NameIdentifier);

            if (!long.TryParse(
                value,
                out var userId) ||
                userId <= 0)
            {
                _logger.LogWarning(
                    "Invalid authenticated user.");

                throw new UnauthorizedAccessException(
                    "Invalid user identity.");
            }

            return userId;
        }


        // =========================================================
        // GET ALL
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            _logger.LogInformation(
                "GET /api/v1/sections called.");

            var result =
                await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                data = result
            });
        }


        // =========================================================
        // GET BY ID
        // =========================================================

        [HttpGet("{sectionId:long}")]
        public async Task<IActionResult> GetById(
            long sectionId)
        {
            _logger.LogInformation(
                "GET section. SectionId={SectionId}",
                sectionId);

            var result =
                await _service.GetByIdAsync(
                    sectionId);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Section not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }


        // =========================================================
        // SEARCH
        // =========================================================

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? search,
            [FromQuery] long? departmentId,
            [FromQuery] long? courseId,
            [FromQuery] long? branchId,
            [FromQuery] long? semesterId,
            [FromQuery] bool? status)
        {
            _logger.LogInformation(
                "Searching sections.");

            var result =
                await _service.SearchAsync(
                    search,
                    departmentId,
                    courseId,
                    branchId,
                    semesterId,
                    status);

            return Ok(new
            {
                success = true,
                data = result
            });
        }


        // =========================================================
        // CREATE
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateSectionRequestDto request)
        {
            var userId = GetUserId();

            _logger.LogInformation(
                "Creating section. " +
                "SectionCode={SectionCode}, UserId={UserId}",
                request.SectionCode,
                userId);

            var sectionId =
                await _service.CreateAsync(
                    request,
                    userId);

            return CreatedAtAction(
                nameof(GetById),
                new { sectionId },
                new
                {
                    success = true,
                    message =
                        "Section created successfully.",
                    sectionId
                });
        }


        // =========================================================
        // UPDATE
        // =========================================================

        [HttpPut("{sectionId:long}")]
        public async Task<IActionResult> Update(
            long sectionId,
            [FromBody] UpdateSectionRequestDto request)
        {
            var userId = GetUserId();

            _logger.LogInformation(
                "Updating section. " +
                "SectionId={SectionId}, UserId={UserId}",
                sectionId,
                userId);

            await _service.UpdateAsync(
                sectionId,
                request,
                userId);

            return Ok(new
            {
                success = true,
                message =
                    "Section updated successfully."
            });
        }


        // =========================================================
        // DELETE / ARCHIVE
        // =========================================================

        [HttpDelete("{sectionId:long}")]
        public async Task<IActionResult> Delete(
            long sectionId)
        {
            var userId = GetUserId();

            _logger.LogInformation(
                "Archiving section. " +
                "SectionId={SectionId}, UserId={UserId}",
                sectionId,
                userId);

            await _service.DeleteAsync(
                sectionId,
                userId);

            return Ok(new
            {
                success = true,
                message =
                    "Section archived successfully."
            });
        }


        // =========================================================
        // STATUS
        // =========================================================

        [HttpPatch("{sectionId:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long sectionId,
            [FromBody] UpdateStatusRequestDto request)
        {
            var userId = GetUserId();

            _logger.LogInformation(
                "Updating section status. " +
                "SectionId={SectionId}, Status={Status}",
                sectionId,
                request.Status);

            await _service.UpdateStatusAsync(
                sectionId,
                request.Status,
                userId);

            return Ok(new
            {
                success = true,
                message =
                    request.Status
                        ? "Section activated successfully."
                        : "Section deactivated successfully."
            });
        }


        // =========================================================
        // VALIDATE CAPACITY
        // =========================================================

        [HttpGet("validate-capacity")]
        [Authorize(
            Roles =
                "SUPER_ADMIN,COLLEGE_ADMIN")]
        public async Task<IActionResult>
            ValidateCapacity(
                [FromQuery] long? sectionId,
                [FromQuery] int capacity)
        {
            _logger.LogInformation(
                "Validating section capacity. " +
                "SectionId={SectionId}, Capacity={Capacity}",
                sectionId,
                capacity);

            var result =
                await _service.ValidateCapacityAsync(
                    sectionId,
                    capacity);

            return Ok(new
            {
                success = true,
                message =
                    "Section capacity is valid.",
                data = result
            });
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            try
            {
                _logger.LogInformation(
                    "GET /api/sections/summary called.");

                var result =
                    await _service.GetSummaryAsync();

                return Ok(new
                {
                    success = true,
                    message = "Section summary retrieved successfully.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error occurred while retrieving section summary.");

                throw;
            }
        }
    }
}