using BTech.DTOs.StudentPromotion;
using BTech.Exceptions;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/promotions")]
    [Authorize]
    public class StudentPromotionController : ControllerBase
    {
        private readonly IStudentPromotionService _service;
        private readonly ILogger<StudentPromotionController> _logger;

        public StudentPromotionController(
            IStudentPromotionService service,
            ILogger<StudentPromotionController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // =====================================================
        // GET ELIGIBLE STUDENTS
        // GET: api/v1/promotions/eligible-students
        // =====================================================

        [HttpGet("eligible-students")]
        public async Task<IActionResult> GetEligibleStudents(
            [FromQuery] long branchId,
            [FromQuery] long academicYearId,
            [FromQuery] int semesterNumber)
        {
            try
            {
                var result =
                    await _service.GetEligibleStudentsAsync(
                        branchId,
                        academicYearId,
                        semesterNumber);

                return Ok(new
                {
                    success = true,
                    message = "Eligible students retrieved successfully.",
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
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving eligible students. BranchId: {BranchId}, AcademicYearId: {AcademicYearId}, Semester: {SemesterNumber}",
                    branchId,
                    academicYearId,
                    semesterNumber);

                throw;
            }
        }

        // =====================================================
        // GET STUDENT ELIGIBILITY
        // GET: api/v1/promotions/student-eligibility/{studentId}
        // =====================================================

        [HttpGet("student-eligibility/{studentId:long}")]
        public async Task<IActionResult> GetStudentEligibility(
            long studentId)
        {
            try
            {
                if (studentId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "A valid student ID is required."
                    });
                }

                var result =
                    await _service.GetStudentEligibilityAsync(
                        studentId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student eligibility not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Student eligibility retrieved successfully.",
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
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving eligibility for student {StudentId}.",
                    studentId);

                throw;
            }
        }

        // =====================================================
        // PROMOTE SINGLE STUDENT
        // POST: api/v1/promotions/promote
        // =====================================================

        [HttpPost("promote")]
        public async Task<IActionResult> PromoteStudent(
            [FromBody] PromoteStudentRequestDto request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Promotion request is required."
                    });
                }

                if (request.StudentId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "A valid student ID is required."
                    });
                }

                var changedBy = GetLoggedInUserId();

                if (!changedBy.HasValue)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Invalid user identity."
                    });
                }

                // The authenticated token is the authoritative audit actor.
                request.CreatedBy = changedBy.Value;

                var result =
                    await _service.PromoteStudentAsync(request);

                if (result == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Student promotion failed."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Student promoted successfully.",
                    data = result
                });
            }
            catch (PromotionValidationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Promotion validation failed.",
                    studentId = ex.StudentId,
                    errors = ex.Errors
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Invalid promotion request for student {StudentId}.",
                    request?.StudentId);

                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Promotion operation failed for student {StudentId}.",
                    request?.StudentId);

                return BadRequest(new
                {
                    success = false,
                    message = ex.Message,
                    detail = ex.InnerException?.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error promoting student {StudentId}.",
                    request?.StudentId);

                throw;
            }
        }

        // =====================================================
        // PROMOTE MULTIPLE STUDENTS
        // POST: api/v1/promotions/promote-bulk
        // =====================================================

        [HttpPost("promote-bulk")]
        [HttpPost("promote-bulk-atomic")]
        public async Task<IActionResult> PromoteStudentsBulk(
            [FromBody] BulkPromoteStudentRequestDto request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Bulk promotion request is required."
                    });
                }

                var changedBy = GetLoggedInUserId();

                if (!changedBy.HasValue)
                {
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Invalid user identity."
                    });
                }

                // Do not trust an audit user ID supplied by the client.
                request.CreatedBy = changedBy.Value;

                var result =
                    await _service.PromoteStudentsBulkAsync(request);

                return Ok(new
                {
                    success = true,
                    message = "Bulk student promotion completed.",
                    data = result
                });
            }
            catch (PromotionValidationException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Bulk promotion validation failed. StudentId={StudentId}",
                    ex.StudentId);

                return BadRequest(new
                {
                    success = false,
                    message = "Bulk promotion validation failed.",
                    studentId = ex.StudentId,
                    errors = ex.Errors
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Bulk promotion validation failed.",
                    errors = new Dictionary<string, string[]>
                    {
                        ["promotion"] = new[] { ex.Message }
                    }
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Bulk promotion validation failed.",
                    errors = new Dictionary<string, string[]>
                    {
                        ["promotion"] = new[] { ex.Message }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error during bulk student promotion.");

                throw;
            }
        }

        // =====================================================
        // GET PROMOTED STUDENTS
        // GET: api/v1/promotions/promoted-students
        // =====================================================

        [HttpGet("promoted-students")]
        public async Task<IActionResult> GetPromotedStudents(
            [FromQuery] long? branchId,
            [FromQuery] long? academicYearId,
            [FromQuery] int? semesterNumber)
        {
            try
            {
                var result =
                    await _service.GetPromotedStudentsAsync(
                        branchId,
                        academicYearId,
                        semesterNumber);

                return Ok(new
                {
                    success = true,
                    message = "Promoted students retrieved successfully.",
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
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving promoted students.");

                throw;
            }
        }

        // =====================================================
        // GET COMPLETE STUDENT PROMOTION HISTORY
        // GET: api/v1/promotions/student/{studentId}/history
        // =====================================================

        [HttpGet("student/{studentId:long}/history")]
        public async Task<IActionResult> GetCompletePromotionHistory(
            long studentId)
        {
            _logger.LogInformation(
                "Complete promotion history API requested. StudentId={StudentId}",
                studentId);

            try
            {
                if (studentId <= 0)
                {
                    _logger.LogWarning(
                        "Invalid StudentId supplied for complete promotion history. StudentId={StudentId}",
                        studentId);

                    return BadRequest(new
                    {
                        success = false,
                        message = "A valid student ID is required."
                    });
                }

                var result = await _service
                    .GetCompletePromotionHistoryAsync(studentId);

                _logger.LogInformation(
                    "Complete promotion history API completed. StudentId={StudentId}, RecordCount={RecordCount}",
                    studentId,
                    result.Count);

                return Ok(new
                {
                    success = true,
                    message = result.Count == 0
                        ? "No promotion history found for the student."
                        : "Complete promotion history retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Validation error while retrieving complete promotion history. StudentId={StudentId}",
                    studentId);

                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(
                    ex,
                    "Operation error while retrieving complete promotion history. StudentId={StudentId}",
                    studentId);

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unhandled error while retrieving complete promotion history. StudentId={StudentId}",
                    studentId);

                throw;
            }
        }


        // =====================================================
        // GET PROMOTION HISTORY
        // GET: api/v1/promotions/history/{studentId}
        // =====================================================

        [HttpGet("history/{studentId:long}")]
        public async Task<IActionResult> GetPromotionHistory(
            long studentId)
        {
            try
            {
                if (studentId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "A valid student ID is required."
                    });
                }

                var result =
                    await _service.GetPromotionHistoryAsync(
                        studentId);

                return Ok(new
                {
                    success = true,
                    message = "Promotion history retrieved successfully.",
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
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving promotion history for student {StudentId}.",
                    studentId);

                throw;
            }
        }

        // =====================================================
        // UPDATE ELIGIBILITY STATUS
        // PUT: api/v1/promotions/eligibility-status/{studentId}
        // =====================================================

        [HttpPut("eligibility-status/{studentId:long}")]
        public async Task<IActionResult> UpdateEligibilityStatus(
            long studentId,
            [FromQuery] string eligibilityStatus)
        {
            try
            {
                if (studentId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "A valid student ID is required."
                    });
                }

                if (string.IsNullOrWhiteSpace(eligibilityStatus))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Eligibility status is required."
                    });
                }

                var result =
                    await _service.UpdateEligibilityStatusAsync(
                        studentId,
                        eligibilityStatus);

                if (!result)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Eligibility status update failed."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Eligibility status updated successfully."
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
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating eligibility status for student {StudentId}.",
                    studentId);

                throw;
            }
        }

        private long? GetLoggedInUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);

            return claim != null && long.TryParse(claim.Value, out var userId)
                ? userId
                : null;
        }
    }
}
