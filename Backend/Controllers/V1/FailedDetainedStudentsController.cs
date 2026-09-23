using BTech.DTOs.StudentPromotion;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using System.Data;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/student-promotions")]
    [Authorize]
    public class FailedDetainedStudentsController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<FailedDetainedStudentsController> _logger;

        public FailedDetainedStudentsController(
            IConfiguration configuration,
            ILogger<FailedDetainedStudentsController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        // =====================================================
        // GET FAILED STUDENTS
        // GET: /api/v1/student-promotions/failed
        // =====================================================

        [HttpGet("failed")]
        public async Task<IActionResult> GetFailedStudents(
            [FromQuery] FailedDetainedStudentRequestDto request)
        {
            return await GetStudentsByOutcomeAsync(
                request,
                "FAILED");
        }

        // =====================================================
        // GET DETAINED STUDENTS
        // GET: /api/v1/student-promotions/detained
        // =====================================================

        [HttpGet("detained")]
        public async Task<IActionResult> GetDetainedStudents(
            [FromQuery] FailedDetainedStudentRequestDto request)
        {
            return await GetStudentsByOutcomeAsync(
                request,
                "DETAINED");
        }

        // =====================================================
        // COMMON METHOD
        // =====================================================

        private async Task<IActionResult> GetStudentsByOutcomeAsync(
            FailedDetainedStudentRequestDto request,
            string outcome)
        {
            // -------------------------------------------------
            // Get college from logged-in user's JWT
            // -------------------------------------------------

            var collegeClaim =
                User.FindFirst("collegeId");

            if (collegeClaim == null ||
                !long.TryParse(
                    collegeClaim.Value,
                    out var collegeId))
            {
                return Unauthorized(new
                {
                    success = false,
                    message =
                        "College information not found in token."
                });
            }

            // -------------------------------------------------
            // Validate academic year
            // -------------------------------------------------

            if (request.AcademicYearId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Academic year is required."
                });
            }

            // -------------------------------------------------
            // Validate optional filters
            // -------------------------------------------------

            if (request.CourseId.HasValue &&
                request.CourseId.Value <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Invalid course."
                });
            }

            if (request.BranchId.HasValue &&
                request.BranchId.Value <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Invalid branch."
                });
            }

            if (request.Semester.HasValue &&
                request.Semester.Value <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "Invalid semester."
                });
            }

            _logger.LogInformation(
                "{Outcome} students requested. " +
                "CollegeId={CollegeId}, " +
                "AcademicYearId={AcademicYearId}",
                outcome,
                collegeId,
                request.AcademicYearId);

            // -------------------------------------------------
            // Database connection
            // -------------------------------------------------

            var connectionString =
                _configuration.GetConnectionString(
                    "DefaultConnection");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        success = false,
                        message =
                            "Database connection is not configured."
                    });
            }

            await using var connection =
                new MySqlConnection(connectionString);

            await connection.OpenAsync();

            // -------------------------------------------------
            // Stored procedure parameters
            // -------------------------------------------------

            var parameters = new
            {
                p_college_id = collegeId,

                p_academic_year_id =
                    request.AcademicYearId,

                p_course_id =
                    request.CourseId,

                p_branch_id =
                    request.BranchId,

                p_semester =
                    request.Semester,

                p_search =
                    string.IsNullOrWhiteSpace(request.Search)
                        ? null
                        : request.Search.Trim(),

                p_outcome = outcome
            };

            // -------------------------------------------------
            // Execute stored procedure
            // -------------------------------------------------

            var students =
                await connection.QueryAsync<
                    FailedDetainedStudentDto>(
                        "sp_student_promotion_get_failed_detained",
                        parameters,
                        commandType:
                            CommandType.StoredProcedure);

            return Ok(new
            {
                success = true,
                outcome = outcome,
                count = students.Count(),
                data = students
            });
        }
    }
}