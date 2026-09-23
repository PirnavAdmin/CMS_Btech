using BTech.DTOs;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using System.Data;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/student-academic-details")]
    public class NumberValidationController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public NumberValidationController(
            IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost("validate-numbers")]
        public async Task<IActionResult> ValidateNumbers(
            [FromBody] NumberValidationRequest request)
        {
            if (request.CollegeId <= 0)
            {
                return BadRequest(new
                {
                    message = "CollegeId is required."
                });
            }

            if (request.AcademicYearId <= 0)
            {
                return BadRequest(new
                {
                    message = "AcademicYearId is required."
                });
            }

            if (string.IsNullOrWhiteSpace(request.RollNumber) &&
                string.IsNullOrWhiteSpace(
                    request.RegistrationNumber) &&
                string.IsNullOrWhiteSpace(
                    request.AdmissionNumber))
            {
                return BadRequest(new
                {
                    message =
                        "At least one number is required."
                });
            }

            var connectionString =
                _configuration.GetConnectionString(
                    "DefaultConnection");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return StatusCode(500, new
                {
                    message =
                        "Database connection string is not configured."
                });
            }

            await using var connection =
                new MySqlConnection(connectionString);

            await connection.OpenAsync();

            var result = new NumberValidationResponse
            {
                IsUnique = true,
                RollNumberAvailable = true,
                RegistrationNumberAvailable = true,
                AdmissionNumberAvailable = true
            };

            /*
             * Roll Number validation
             */
            if (!string.IsNullOrWhiteSpace(
                request.RollNumber))
            {
                const string sql = @"
                    SELECT COUNT(*)
                    FROM student_academic_details sad
                    INNER JOIN students s
                        ON s.student_id = sad.AcademicId
                    WHERE s.college_id = @CollegeId
                      AND s.academic_year_id = @AcademicYearId
                      AND sad.RollNumber = @RollNumber
                      AND (@AcademicId IS NULL
                           OR sad.AcademicId <> @AcademicId);
                ";

                await using var command =
                    new MySqlCommand(sql, connection);

                command.Parameters.AddWithValue(
                    "@CollegeId",
                    request.CollegeId);

                command.Parameters.AddWithValue(
                    "@AcademicYearId",
                    request.AcademicYearId);

                command.Parameters.AddWithValue(
                    "@RollNumber",
                    request.RollNumber.Trim());

                command.Parameters.AddWithValue(
                    "@AcademicId",
                    request.AcademicId.HasValue
                        ? request.AcademicId.Value
                        : DBNull.Value);

                var count =
                    Convert.ToInt64(
                        await command.ExecuteScalarAsync());

                result.RollNumberAvailable =
                    count == 0;
            }

            /*
             * Registration Number validation
             */
            if (!string.IsNullOrWhiteSpace(
                request.RegistrationNumber))
            {
                const string sql = @"
                    SELECT COUNT(*)
                    FROM student_academic_details sad
                    INNER JOIN students s
                        ON s.student_id = sad.AcademicId
                    WHERE s.college_id = @CollegeId
                      AND s.academic_year_id = @AcademicYearId
                      AND sad.RegistrationNumber =
                          @RegistrationNumber
                      AND (@AcademicId IS NULL
                           OR sad.AcademicId <> @AcademicId);
                ";

                await using var command =
                    new MySqlCommand(sql, connection);

                command.Parameters.AddWithValue(
                    "@CollegeId",
                    request.CollegeId);

                command.Parameters.AddWithValue(
                    "@AcademicYearId",
                    request.AcademicYearId);

                command.Parameters.AddWithValue(
                    "@RegistrationNumber",
                    request.RegistrationNumber.Trim());

                command.Parameters.AddWithValue(
                    "@AcademicId",
                    request.AcademicId.HasValue
                        ? request.AcademicId.Value
                        : DBNull.Value);

                var count =
                    Convert.ToInt64(
                        await command.ExecuteScalarAsync());

                result.RegistrationNumberAvailable =
                    count == 0;
            }

            /*
             * Admission Number validation
             */
            if (!string.IsNullOrWhiteSpace(
                request.AdmissionNumber))
            {
                const string sql = @"
                    SELECT COUNT(*)
                    FROM student_academic_details sad
                    INNER JOIN students s
                        ON s.student_id = sad.AcademicId
                    WHERE s.college_id = @CollegeId
                      AND s.academic_year_id = @AcademicYearId
                      AND sad.AdmissionNumber =
                          @AdmissionNumber
                      AND (@AcademicId IS NULL
                           OR sad.AcademicId <> @AcademicId);
                ";

                await using var command =
                    new MySqlCommand(sql, connection);

                command.Parameters.AddWithValue(
                    "@CollegeId",
                    request.CollegeId);

                command.Parameters.AddWithValue(
                    "@AcademicYearId",
                    request.AcademicYearId);

                command.Parameters.AddWithValue(
                    "@AdmissionNumber",
                    request.AdmissionNumber.Trim());

                command.Parameters.AddWithValue(
                    "@AcademicId",
                    request.AcademicId.HasValue
                        ? request.AcademicId.Value
                        : DBNull.Value);

                var count =
                    Convert.ToInt64(
                        await command.ExecuteScalarAsync());

                result.AdmissionNumberAvailable =
                    count == 0;
            }

            result.IsUnique =
                result.RollNumberAvailable &&
                result.RegistrationNumberAvailable &&
                result.AdmissionNumberAvailable;

            if (result.IsUnique)
            {
                result.Message =
                    "Roll Number, Registration Number and Admission Number are unique.";
            }
            else
            {
                var duplicates =
                    new List<string>();

                if (!result.RollNumberAvailable)
                {
                    duplicates.Add("Roll Number");
                }

                if (!result.RegistrationNumberAvailable)
                {
                    duplicates.Add("Registration Number");
                }

                if (!result.AdmissionNumberAvailable)
                {
                    duplicates.Add("Admission Number");
                }

                result.Message =
                    string.Join(", ", duplicates) +
                    " already exists for the selected college and academic year.";
            }

            return Ok(result);
        }
    }
}