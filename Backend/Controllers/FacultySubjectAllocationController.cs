using BTech.Task_FacultySubjectAllocation.DTOs;
using BTech.Task_FacultySubjectAllocation.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Task_FacultySubjectAllocation.Controllers;

[ApiController]
[Route("api/v1/faculty-subject-allocations")]
public sealed class FacultySubjectAllocationController : ControllerBase
{
    private readonly FacultySubjectAllocationRepository _repository;
    private readonly ILogger<FacultySubjectAllocationController> _logger;

    public FacultySubjectAllocationController(
        IConfiguration configuration,
        ILogger<FacultySubjectAllocationController> logger)
    {
        _repository =
            new FacultySubjectAllocationRepository(configuration);

        _logger = logger;
    }

    // POST: /api/v1/faculty-subject-allocations
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateFacultySubjectAllocationRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Request body is required."
                });
            }

            var allocationId =
                await _repository.CreateAsync(request);

            return Created(
                $"/api/v1/faculty-subject-allocations/{allocationId}",
                new
                {
                    success = true,
                    message =
                        "Faculty subject allocation created successfully.",
                    allocationId
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
            _logger.LogError(
                ex,
                "Error creating faculty subject allocation.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message =
                        "An unexpected error occurred while creating the faculty subject allocation."
                });
        }
    }

    // PUT: /api/v1/faculty-subject-allocations/{allocationId}
    [HttpPut("{allocationId:long}")]
    public async Task<IActionResult> Update(
        long allocationId,
        [FromBody] UpdateFacultySubjectAllocationRequest request)
    {
        _logger.LogInformation(
            "Faculty subject allocation update requested. AllocationId={AllocationId}, FacultyId={FacultyId}, CourseId={CourseId}, BranchId={BranchId}, SemesterId={SemesterId}, SectionId={SectionId}, SubjectId={SubjectId}, AcademicYearId={AcademicYearId}",
            allocationId,
            request?.FacultyId,
            request?.CourseId,
            request?.BranchId,
            request?.SemesterId,
            request?.SectionId,
            request?.SubjectId,
            request?.AcademicYearId);

        try
        {
            if (request == null)
            {
                _logger.LogWarning(
                    "Faculty subject allocation update rejected because the request body is missing. AllocationId={AllocationId}",
                    allocationId);

                return BadRequest(new
                {
                    success = false,
                    message = "Request body is required."
                });
            }

            var allocation =
                await _repository.UpdateAsync(
                    allocationId,
                    request);

            _logger.LogInformation(
                "Faculty subject allocation updated successfully. AllocationId={AllocationId}, FacultyId={FacultyId}, BranchId={BranchId}, SemesterId={SemesterId}, SectionId={SectionId}, SubjectId={SubjectId}, Status={Status}",
                allocation.AllocationId,
                allocation.FacultyId,
                allocation.BranchId,
                allocation.SemesterId,
                allocation.SectionId,
                allocation.SubjectId,
                allocation.Status);

            return Ok(new
            {
                success = true,
                message =
                    "Faculty subject allocation updated successfully.",
                data = allocation
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(
                ex,
                "Faculty subject allocation update validation failed. AllocationId={AllocationId}",
                allocationId);

            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(
                ex,
                "Faculty subject allocation update resource not found. AllocationId={AllocationId}",
                allocationId);

            return NotFound(new
            {
                success = false,
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(
                ex,
                "Faculty subject allocation update conflict. AllocationId={AllocationId}",
                allocationId);

            return Conflict(new
            {
                success = false,
                message = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unexpected error while updating faculty subject allocation. AllocationId={AllocationId}",
                allocationId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message =
                        "An unexpected error occurred while updating the faculty subject allocation.",
                    correlationId =
                        HttpContext.TraceIdentifier
                });
        }
    }

    // DELETE: /api/v1/faculty-subject-allocations/{allocationId}
    [HttpDelete("{allocationId:long}")]
    public async Task<IActionResult> Delete(long allocationId)
    {
        try
        {
            if (allocationId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid allocation ID."
                });
            }

            await _repository.DeleteAsync(allocationId);

            return Ok(new
            {
                success = true,
                message =
                    "Faculty subject allocation deleted successfully.",
                allocationId
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
            _logger.LogError(
                ex,
                "Error deleting faculty subject allocation. AllocationId={AllocationId}",
                allocationId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message =
                        "An unexpected error occurred while deleting the faculty subject allocation.",
                    correlationId =
                        HttpContext.TraceIdentifier
                });
        }
    }

    // ============================================================
    // STEP 6
    // GET: /api/v1/faculty-subject-allocations
    // GET with filters:
    // ?facultyId=1
    // ?academicYearId=1
    // ?courseId=1
    // ?branchId=1
    // ?semesterId=1
    // ?sectionId=1
    // ?subjectId=1
    // ============================================================
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] FacultySubjectAllocationListRequest request)
    {
        try
        {
            var allocations =
                await _repository.GetListAsync(request);

            return Ok(new
            {
                success = true,
                data = allocations
            });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(
                ex,
                "Faculty subject allocation list validation failed.");

            return BadRequest(new
            {
                success = false,
                message = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error retrieving faculty subject allocations.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new
                {
                    success = false,
                    message =
                        "An unexpected error occurred while retrieving faculty subject allocations.",
                    correlationId =
                        HttpContext.TraceIdentifier
                });
        }
    }
}