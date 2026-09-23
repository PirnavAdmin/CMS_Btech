using BTech.DTOs.Faculty;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/faculty")]
    [Authorize]
    public class FacultyController : ControllerBase
    {
        private readonly IFacultyService _service;

        public FacultyController(
            IFacultyService service)
        {
            _service = service;
        }

        // =====================================================
        // LIST FACULTIES
        // GET: api/v1/faculty
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] FacultyListRequestDto request)
        {
            try
            {
                var result =
                    await _service.GetFacultyListAsync(request);

                return Ok(new
                {
                    success = true,
                    message =
                        "Faculty list retrieved successfully.",
                    data = result.Data,
                    pagination = new
                    {
                        pageNumber = result.PageNumber,
                        pageSize = result.PageSize,
                        totalRecords = result.TotalRecords,
                        totalPages = result.TotalPages
                    }
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
        }

        // =====================================================
        // SEARCH FACULTIES
        // GET: api/v1/faculty/search
        // =====================================================

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] FacultyListRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Search))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Search value is required."
                });
            }

            try
            {
                var result =
                    await _service.GetFacultyListAsync(request);

                return Ok(new
                {
                    success = true,
                    message =
                        "Faculty search completed successfully.",
                    data = result.Data,
                    pagination = new
                    {
                        pageNumber = result.PageNumber,
                        pageSize = result.PageSize,
                        totalRecords = result.TotalRecords,
                        totalPages = result.TotalPages
                    }
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
        }

        // =====================================================
        // GET COMPLETE FACULTY DETAILS
        // GET: api/v1/faculty/{facultyId}
        // =====================================================

        [HttpGet("{facultyId:long}")]
        public async Task<IActionResult> GetById(
            long facultyId)
        {
            try
            {
                var result =
                    await _service.GetFacultyDetailsAsync(
                        facultyId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Faculty not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Faculty details retrieved successfully.",
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
        }

        // =====================================================
        // GET FACULTY WORKLOAD
        // GET: api/v1/faculty/{facultyId}/workload
        // =====================================================

        [HttpGet("{facultyId:long}/workload")]
        public async Task<IActionResult> GetWorkload(
            long facultyId)
        {
            try
            {
                var result =
                    await _service.GetFacultyWorkloadAsync(
                        facultyId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Faculty not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message =
                        "Faculty workload calculated successfully.",
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
        }

        // =====================================================
        // UPDATE FACULTY
        // PUT: api/v1/faculty/{facultyId}
        // =====================================================

        [HttpPut("{facultyId:long}")]
        public async Task<IActionResult> UpdateFaculty(
            long facultyId,
            [FromBody] FacultyUpdateDto request)
        {
            try
            {
                if (facultyId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid faculty ID."
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

                var result =
                    await _service.UpdateFacultyAsync(
                        facultyId,
                        request,
                        null);

                return Ok(new
                {
                    success = true,
                    message = "Faculty updated successfully.",
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
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
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
            catch (Exception ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        success = false,
                        message = "An unexpected error occurred.",
                        correlationId =
                            HttpContext.TraceIdentifier
                    });
            }
        }
    }
}