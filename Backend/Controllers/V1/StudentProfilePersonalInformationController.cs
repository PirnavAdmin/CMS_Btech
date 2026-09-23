using System.Security.Claims;
using BTech.DTOs.StudentProfile;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/v1/students/{studentId:long}/profile")]
    public sealed class StudentProfilePersonalInformationController : ControllerBase
    {
        private readonly IStudentPersonalInformationService _personalInformationService;
        private readonly IStudentExamResultsProvider _examResultsProvider;
        private readonly ILogger<StudentProfilePersonalInformationController> _logger;

        public StudentProfilePersonalInformationController(
            IStudentPersonalInformationService personalInformationService,
            IStudentExamResultsProvider examResultsProvider,
            ILogger<StudentProfilePersonalInformationController> logger)
        {
            _personalInformationService = personalInformationService;
            _examResultsProvider = examResultsProvider;
            _logger = logger;
        }

        /// <summary>Returns student personal information for the profile screen.</summary>
        [HttpGet("personal-information")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetPersonalInformation(long studentId)
        {
            try
            {
                var result = await _personalInformationService.GetAsync(studentId);
                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student profile not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Personal information retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>Partially updates student personal information and records an audit row.</summary>
        [HttpPatch("personal-information")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdatePersonalInformation(
            long studentId,
            [FromBody] UpdateStudentPersonalInformationRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid personal information.",
                    errors = ModelState
                });
            }

            var changedBy = GetLoggedInUserId();
            if (!changedBy.HasValue)
                return Unauthorized(new { success = false, message = "Invalid user identity." });

            try
            {
                var result = await _personalInformationService.UpdateAsync(
                    studentId,
                    request,
                    changedBy.Value,
                    HttpContext.Connection.RemoteIpAddress?.ToString(),
                    Request.Headers.UserAgent.ToString());

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student profile not found."
                    });
                }

                _logger.LogInformation(
                    "Student personal information updated. StudentId={StudentId}, ChangedBy={ChangedBy}",
                    studentId,
                    changedBy.Value);

                return Ok(new
                {
                    success = true,
                    message = "Personal information updated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Stable profile/UI integration point for the future Examination/Results module.
        /// </summary>
        [HttpGet("exam-results")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetExamResults(
            long studentId,
            CancellationToken cancellationToken)
        {
            try
            {
                var student = await _personalInformationService.GetAsync(studentId);
                if (student == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student profile not found."
                    });
                }

                var result = await _examResultsProvider.GetByStudentIdAsync(
                    studentId,
                    cancellationToken);

                _logger.LogInformation(
                    "Student exam-results integration endpoint called. StudentId={StudentId}, ModuleAvailable={ModuleAvailable}, ContractVersion={ContractVersion}",
                    studentId,
                    result.IsModuleAvailable,
                    result.ContractVersion);

                return Ok(new
                {
                    success = true,
                    message = result.IsModuleAvailable
                        ? "Exam results retrieved successfully."
                        : "Exam results integration is ready; the Examination/Results module is not available yet.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
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
