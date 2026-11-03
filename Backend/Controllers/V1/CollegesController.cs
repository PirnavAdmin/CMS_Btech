using System.Security.Claims;
using BTech.DTOs.College;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/colleges")]
    [Authorize]
    public sealed class CollegesController
        : ControllerBase
    {
        private readonly ICollegeService _collegeService;

        public CollegesController(
            ICollegeService collegeService)
        {
            _collegeService = collegeService;
        }

        // =====================================================
        // CREATE COLLEGE
        // POST: /api/v1/colleges
        // =====================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateCollegeDto dto)
        {
            try
            {
                var college =
                    await _collegeService
                        .CreateCollegeAsync(
                            dto,
                            GetUserId());

                return CreatedAtAction(
                    nameof(GetById),
                    new
                    {
                        id = college.CollegeId
                    },
                    new
                    {
                        success = true,
                        message =
                            "College created successfully.",
                        data = college
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

        // =====================================================
        // GET ALL COLLEGES
        // GET: /api/v1/colleges
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? search,
            [FromQuery] sbyte? status)
        {
            var colleges =
                await _collegeService
                    .GetAllCollegesAsync(
                        search,
                        status);

            return Ok(new
            {
                success = true,
                message =
                    "Colleges retrieved successfully.",
                data = colleges
            });
        }

        // =====================================================
        // SEARCH COLLEGES
        // GET: /api/v1/colleges/search
        // =====================================================

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] CollegeSearchFilterDto filter)
        {
            var result =
                await _collegeService
                    .SearchCollegesAsync(filter);

            return Ok(new
            {
                success = true,
                message =
                    "College search completed successfully.",
                data = new
                {
                    items =
                        result.Data,

                    pageNumber =
                        result.PageNumber,

                    pageSize =
                        result.PageSize,

                    totalRecords =
                        result.TotalRecords,

                    totalPages =
                        result.TotalPages
                }
            });
        }

        // =====================================================
        // GET COLLEGE BY ID
        // GET: /api/v1/colleges/{id}
        // =====================================================

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(
            long id)
        {
            var college =
                await _collegeService
                    .GetCollegeByIdAsync(id);

            return college == null
                ? NotFound(new
                {
                    success = false,
                    message = "College not found."
                })
                : Ok(new
                {
                    success = true,
                    data = college
                });
        }

        // =====================================================
        // UPDATE COLLEGE
        // PUT/PATCH: /api/v1/colleges/{id}
        // =====================================================

        [HttpPut("{id:long}")]
        [HttpPatch("{id:long}")]
        public async Task<IActionResult> Update(
            long id,
            [FromBody] UpdateCollegeDto dto)
        {
            try
            {
                var college =
                    await _collegeService
                        .UpdateCollegeAsync(
                            id,
                            dto,
                            GetUserId());

                return college == null
                    ? NotFound(new
                    {
                        success = false,
                        message = "College not found."
                    })
                    : Ok(new
                    {
                        success = true,
                        message =
                            "College updated successfully.",
                        data = college
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

        // =====================================================
        // UPDATE COLLEGE STATUS
        // PATCH: /api/v1/colleges/{id}/status
        // =====================================================

        [HttpPatch("{id:long}/status")]
        public async Task<IActionResult> UpdateStatus(
            long id,
            [FromBody] UpdateCollegeStatusDto dto)
        {
            var college =
                await _collegeService
                    .UpdateCollegeStatusAsync(
                        id,
                        dto,
                        GetUserId());

            return college == null
                ? NotFound(new
                {
                    success = false,
                    message = "College not found."
                })
                : Ok(new
                {
                    success = true,
                    message =
                        "College status updated successfully.",
                    data = college
                });
        }

        // =====================================================
        // DELETE COLLEGE
        // DELETE: /api/v1/colleges/{id}
        // =====================================================

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(
            long id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "A valid college ID is required."
                });
            }

            var deleted =
                await _collegeService
                    .DeleteCollegeAsync(
                        id,
                        GetUserId());

            if (!deleted)
            {
                return NotFound(new
                {
                    success = false,
                    message =
                        "College not found or already deleted."
                });
            }

            return Ok(new
            {
                success = true,
                message =
                    "College deleted successfully."
            });
        }

        // =====================================================
        // AUTHENTICATED USER ID
        // =====================================================

        private long? GetUserId()
        {
            var value =
                User.FindFirstValue(
                    ClaimTypes.NameIdentifier);

            return long.TryParse(
                value,
                out var userId)
                ? userId
                : null;
        }
    }
}
