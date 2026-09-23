using System.Security.Claims;
using BTech.DTOs.AcademicYear;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/academic-years")]
    [Authorize]
    public class AcademicYearController : ControllerBase
    {
        private readonly IAcademicYearService _service;

        public AcademicYearController(
            IAcademicYearService service)
        {
            _service = service;
        }

        // =========================================================
        // ADD ACADEMIC YEAR
        // POST: api/v1/academic-years
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> Add(
            [FromBody] CreateAcademicYearDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result =
                    await _service.AddAsync(
                        dto,
                        GetCurrentUserId());

                return CreatedAtAction(
                    nameof(GetById),
                    new
                    {
                        id = result.AcademicYearId
                    },
                    new
                    {
                        success = true,
                        message =
                            "Academic year added successfully.",
                        data = result
                    });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (MySqlException ex)
                when (ex.Number == 1644 ||
                      ex.Number == 1062)
            {
                return Conflict(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // =========================================================
        // GET ALL ACTIVE ACADEMIC YEARS
        // GET: api/v1/academic-years
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> List()
        {
            var result =
                await _service.GetAllAsync();

            return Ok(new
            {
                success = true,
                message =
                    "Academic years retrieved successfully.",
                data = result
            });
        }


        // =========================================================
        // ACADEMIC YEAR DASHBOARD
        // GET: api/v1/academic-years/dashboard
        // =========================================================

        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard(
            [FromQuery] string? search = null,
            [FromQuery] string filter = "all")
        {
            var result = await _service.GetDashboardAsync(search, filter);

            return Ok(new
            {
                success = true,
                message = "Academic year dashboard retrieved successfully.",
                data = result
            });
        }

        // =========================================================
        // GET ACADEMIC YEAR BY ID
        // GET: api/v1/academic-years/{id}
        // =========================================================

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(
            long id)
        {
            var result =
                await _service.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        $"Academic year with ID {id} not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        // =========================================================
        // UPDATE ACADEMIC YEAR
        // PUT: api/v1/academic-years/{id}
        // =========================================================

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Edit(
            long id,
            [FromBody] UpdateAcademicYearDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result =
                    await _service.EditAsync(
                        id,
                        dto,
                        GetCurrentUserId());

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message =
                            $"Academic year with ID {id} not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Academic year updated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (MySqlException ex)
                when (ex.Number == 1644 ||
                      ex.Number == 1062)
            {
                return Conflict(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }


        // =========================================================
        // GENERATE NEXT ACADEMIC YEAR
        // POST: api/v1/academic-years/generate-next-year
        // =========================================================

        [HttpPost("generate-next-year")]
        public async Task<IActionResult> GenerateNextYear(
            [FromBody] GenerateNextAcademicYearDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _service.GenerateNextYearAsync(
                    dto,
                    GetCurrentUserId());

                return Ok(new
                {
                    success = true,
                    message = dto.ActivateImmediately
                        ? "Next academic year generated and activated successfully."
                        : "Next academic year generated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (MySqlException ex)
                when (ex.Number == 1644 ||
                      ex.Number == 1062)
            {
                return Conflict(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // =========================================================
        // ACTIVATE ACADEMIC YEAR
        // PATCH: api/v1/academic-years/{id}/activate
        // =========================================================

        [HttpPatch("{id:long}/activate")]
        public async Task<IActionResult> Activate(
            long id)
        {
            var updated =
                await _service.ActivateAsync(
                    id,
                    GetCurrentUserId());

            if (!updated)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        $"Academic year with ID {id} not found."
                });
            }

            return Ok(new
            {
                success = true,
                message =
                    "Academic year activated successfully."
            });
        }

        // =========================================================
        // DEACTIVATE ACADEMIC YEAR
        // PATCH: api/v1/academic-years/{id}/deactivate
        // =========================================================

        [HttpPatch("{id:long}/deactivate")]
        public async Task<IActionResult> Deactivate(
            long id)
        {
            var updated =
                await _service.DeactivateAsync(
                    id,
                    GetCurrentUserId());

            if (!updated)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        $"Academic year with ID {id} not found."
                });
            }

            return Ok(new
            {
                success = true,
                message =
                    "Academic year deactivated successfully."
            });
        }

        // =========================================================
        // ARCHIVE ACADEMIC YEAR
        // PATCH: api/v1/academic-years/{id}/archive
        // =========================================================
        //
        // This does NOT delete the academic year.
        //
        // It changes:
        // IsArchived = 1
        // Status     = 0
        //
        // Historical data remains in the database.
        // =========================================================

        [HttpPatch("{id:long}/archive")]
        public async Task<IActionResult> Archive(
            long id)
        {
            try
            {
                var archived =
                    await _service.ArchiveAsync(
                        id,
                        GetCurrentUserId());

                if (!archived)
                {
                    return NotFound(new
                    {
                        success = false,
                        message =
                            $"Academic year with ID {id} not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Academic year archived successfully."
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }

        // =========================================================
        // CURRENT USER ID
        // =========================================================

        private long? GetCurrentUserId()
        {
            var claim =
                User.FindFirstValue(
                    ClaimTypes.NameIdentifier);

            return long.TryParse(
                claim,
                out var userId)
                ? userId
                : null;
        }
    }
}