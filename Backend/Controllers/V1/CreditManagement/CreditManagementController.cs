using System.Security.Claims;
using BTech.DTOs.Credits;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1.CreditManagement;

[ApiController]
[Route("api/v1/credits")]
[Authorize]
public sealed class CreditManagementController : ControllerBase
{
    private static readonly HashSet<string> AllowedRegistrationStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "REGISTERED",
            "COMPLETED",
            "FAILED",
            "DROPPED"
        };

    private readonly IConfiguration _configuration;

    public CreditManagementController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private MySqlConnection Connection() =>
        new(_configuration.GetConnectionString("DefaultConnection"));

    // =========================================================
    // DASHBOARD
    // GET /api/v1/credits/dashboard
    // Uses the EXISTING tables:
    //   credit_configurations
    //   student_credit_registrations
    // =========================================================
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(
        [FromQuery] long? academicYearId,
        [FromQuery] long? courseId,
        [FromQuery] long? branchId,
        [FromQuery] long? semesterId)
    {
        var invalid = ValidatePositiveFilters(academicYearId, courseId, branchId, semesterId);
        if (invalid != null)
            return BadRequest(new { success = false, message = invalid });

        const string sql = @"
SELECT
    (SELECT COUNT(*)
     FROM credit_configurations c
     INNER JOIN semesters sem ON sem.semester_id = c.semester_id
     WHERE (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR c.course_id = @courseId)
       AND (@branchId IS NULL OR c.branch_id = @branchId)
       AND (@semesterId IS NULL OR c.semester_id = @semesterId)) AS totalConfigurations,

    (SELECT COUNT(*)
     FROM credit_configurations c
     INNER JOIN semesters sem ON sem.semester_id = c.semester_id
     WHERE c.status = 1
       AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR c.course_id = @courseId)
       AND (@branchId IS NULL OR c.branch_id = @branchId)
       AND (@semesterId IS NULL OR c.semester_id = @semesterId)) AS activeConfigurations,

    (SELECT COUNT(DISTINCT c.subject_id)
     FROM credit_configurations c
     INNER JOIN semesters sem ON sem.semester_id = c.semester_id
     WHERE c.status = 1
       AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR c.course_id = @courseId)
       AND (@branchId IS NULL OR c.branch_id = @branchId)
       AND (@semesterId IS NULL OR c.semester_id = @semesterId)) AS configuredSubjects,

    (SELECT COALESCE(SUM(c.credits), 0)
     FROM credit_configurations c
     INNER JOIN semesters sem ON sem.semester_id = c.semester_id
     WHERE c.status = 1
       AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR c.course_id = @courseId)
       AND (@branchId IS NULL OR c.branch_id = @branchId)
       AND (@semesterId IS NULL OR c.semester_id = @semesterId)) AS totalConfiguredCredits,

    (SELECT COUNT(*)
     FROM student_credit_registrations r
     INNER JOIN students st ON st.student_id = r.student_id
     INNER JOIN semesters sem ON sem.semester_id = r.semester_id
     WHERE r.status = 1
       AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR st.course_id = @courseId)
       AND (@branchId IS NULL OR st.branch_id = @branchId)
       AND (@semesterId IS NULL OR r.semester_id = @semesterId)) AS totalRegistrations,

    (SELECT COUNT(DISTINCT r.student_id)
     FROM student_credit_registrations r
     INNER JOIN students st ON st.student_id = r.student_id
     INNER JOIN semesters sem ON sem.semester_id = r.semester_id
     WHERE r.status = 1
       AND UPPER(r.registration_status) <> 'DROPPED'
       AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR st.course_id = @courseId)
       AND (@branchId IS NULL OR st.branch_id = @branchId)
       AND (@semesterId IS NULL OR r.semester_id = @semesterId)) AS registeredStudents,

    (SELECT COALESCE(SUM(r.registered_credits), 0)
     FROM student_credit_registrations r
     INNER JOIN students st ON st.student_id = r.student_id
     INNER JOIN semesters sem ON sem.semester_id = r.semester_id
     WHERE r.status = 1
       AND UPPER(r.registration_status) <> 'DROPPED'
       AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR st.course_id = @courseId)
       AND (@branchId IS NULL OR st.branch_id = @branchId)
       AND (@semesterId IS NULL OR r.semester_id = @semesterId)) AS registeredCredits,

    (SELECT COALESCE(SUM(r.registered_credits), 0)
     FROM student_credit_registrations r
     INNER JOIN students st ON st.student_id = r.student_id
     INNER JOIN semesters sem ON sem.semester_id = r.semester_id
     WHERE r.status = 1
       AND r.is_completed = 1
       AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR st.course_id = @courseId)
       AND (@branchId IS NULL OR st.branch_id = @branchId)
       AND (@semesterId IS NULL OR r.semester_id = @semesterId)) AS completedCredits,

    (SELECT COUNT(*)
     FROM student_credit_registrations r
     INNER JOIN students st ON st.student_id = r.student_id
     INNER JOIN semesters sem ON sem.semester_id = r.semester_id
     WHERE r.status = 1
       AND UPPER(r.registration_status) = 'FAILED'
       AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
       AND (@courseId IS NULL OR st.course_id = @courseId)
       AND (@branchId IS NULL OR st.branch_id = @branchId)
       AND (@semesterId IS NULL OR r.semester_id = @semesterId)) AS failedRegistrations;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var data = await connection.QuerySingleAsync(sql, new
            {
                academicYearId,
                courseId,
                branchId,
                semesterId
            });

            return Ok(new
            {
                success = true,
                message = "Credit dashboard retrieved successfully.",
                data
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // CONFIGURATION - LIST
    // GET /api/v1/credits/configurations
    // =========================================================
    [HttpGet("configurations")]
    public async Task<IActionResult> GetConfigurations(
        [FromQuery] long? academicYearId,
        [FromQuery] long? courseId,
        [FromQuery] long? branchId,
        [FromQuery] long? semesterId,
        [FromQuery] long? subjectId,
        [FromQuery] byte? status)
    {
        var invalid = ValidatePositiveFilters(
            academicYearId,
            courseId,
            branchId,
            semesterId,
            subjectId);

        if (invalid != null)
            return BadRequest(new { success = false, message = invalid });

        if (status.HasValue && status.Value is not (0 or 1))
            return BadRequest(new { success = false, message = "Status must be 0 or 1." });

        const string sql = @"
SELECT
    c.credit_configuration_id AS creditConfigurationId,
    c.subject_id AS subjectId,
    s.subject_code AS subjectCode,
    s.subject_name AS subjectName,
    c.course_id AS courseId,
    cr.course_code AS courseCode,
    cr.course_name AS courseName,
    c.branch_id AS branchId,
    b.branch_code AS branchCode,
    b.branch_name AS branchName,
    c.semester_id AS semesterId,
    sem.semester_number AS semesterNumber,
    sem.semester_name AS semesterName,
    sem.academic_year_id AS academicYearId,
    c.credits,
    c.minimum_credits AS minimumCredits,
    c.maximum_credits AS maximumCredits,
    c.status,
    c.created_at AS createdAt,
    c.created_by AS createdBy,
    c.updated_at AS updatedAt,
    c.updated_by AS updatedBy
FROM credit_configurations c
INNER JOIN subjects s ON s.subject_id = c.subject_id
INNER JOIN courses cr ON cr.course_id = c.course_id
INNER JOIN branches b ON b.branch_id = c.branch_id
INNER JOIN semesters sem ON sem.semester_id = c.semester_id
WHERE (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
  AND (@courseId IS NULL OR c.course_id = @courseId)
  AND (@branchId IS NULL OR c.branch_id = @branchId)
  AND (@semesterId IS NULL OR c.semester_id = @semesterId)
  AND (@subjectId IS NULL OR c.subject_id = @subjectId)
  AND (@status IS NULL OR c.status = @status)
ORDER BY c.credit_configuration_id DESC;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var data = (await connection.QueryAsync(sql, new
            {
                academicYearId,
                courseId,
                branchId,
                semesterId,
                subjectId,
                status
            })).ToList();

            return Ok(new
            {
                success = true,
                message = "Credit configurations retrieved successfully.",
                data
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // CONFIGURATION - DETAILS
    // GET /api/v1/credits/configurations/{configurationId}
    // =========================================================
    [HttpGet("configurations/{configurationId:long}")]
    public async Task<IActionResult> GetConfigurationById(long configurationId)
    {
        if (configurationId <= 0)
            return BadRequest(new { success = false, message = "Invalid credit configuration ID." });

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var data = await GetConfigurationDetailsAsync(connection, configurationId);

            if (data == null)
                return NotFound(new { success = false, message = "Credit configuration not found." });

            return Ok(new
            {
                success = true,
                message = "Credit configuration retrieved successfully.",
                data
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // CONFIGURATION - CREATE
    // POST /api/v1/credits/configurations
    // =========================================================
    [HttpPost("configurations")]
    public async Task<IActionResult> CreateConfiguration(
        [FromBody] CreditConfigurationRequest request)
    {
        var creditValidation = ValidateCreditRange(request);
        if (creditValidation != null)
            return BadRequest(new { success = false, message = creditValidation });

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            if (!await AcademicContextExistsAsync(
                    connection,
                    request.CourseId,
                    request.BranchId,
                    request.SemesterId))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Course/Branch/Semester combination."
                });
            }

            var subjectExists = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM subjects
                  WHERE subject_id = @SubjectId;",
                new { request.SubjectId });

            if (subjectExists == 0)
                return NotFound(new { success = false, message = "Subject not found." });

            var duplicate = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM credit_configurations
                  WHERE subject_id = @SubjectId
                    AND course_id = @CourseId
                    AND branch_id = @BranchId
                    AND semester_id = @SemesterId;",
                request);

            if (duplicate > 0)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Credit configuration already exists for this subject/course/branch/semester."
                });
            }

            var createdBy = request.CreatedBy ?? GetCurrentUserId();

            await connection.ExecuteAsync(
                @"INSERT INTO credit_configurations
                    (subject_id, course_id, branch_id, semester_id,
                     credits, minimum_credits, maximum_credits,
                     status, created_at, created_by)
                  VALUES
                    (@SubjectId, @CourseId, @BranchId, @SemesterId,
                     @Credits, @MinimumCredits, @MaximumCredits,
                     @Status, CURRENT_TIMESTAMP, @CreatedBy);",
                new
                {
                    request.SubjectId,
                    request.CourseId,
                    request.BranchId,
                    request.SemesterId,
                    request.Credits,
                    request.MinimumCredits,
                    request.MaximumCredits,
                    request.Status,
                    CreatedBy = createdBy
                });

            var configurationId = await connection.ExecuteScalarAsync<long>(
                "SELECT LAST_INSERT_ID();");

            var data = await GetConfigurationDetailsAsync(connection, configurationId);

            return CreatedAtAction(
                nameof(GetConfigurationById),
                new { configurationId },
                new
                {
                    success = true,
                    message = "Credit configuration created successfully.",
                    data
                });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict(new
            {
                success = false,
                message = "Credit configuration already exists."
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // CONFIGURATION - UPDATE
    // PUT /api/v1/credits/configurations/{configurationId}
    // =========================================================
    [HttpPut("configurations/{configurationId:long}")]
    public async Task<IActionResult> UpdateConfiguration(
        long configurationId,
        [FromBody] CreditConfigurationRequest request)
    {
        if (configurationId <= 0)
            return BadRequest(new { success = false, message = "Invalid credit configuration ID." });

        var creditValidation = ValidateCreditRange(request);
        if (creditValidation != null)
            return BadRequest(new { success = false, message = creditValidation });

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var exists = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM credit_configurations
                  WHERE credit_configuration_id = @configurationId;",
                new { configurationId });

            if (exists == 0)
                return NotFound(new { success = false, message = "Credit configuration not found." });

            if (!await AcademicContextExistsAsync(
                    connection,
                    request.CourseId,
                    request.BranchId,
                    request.SemesterId))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Course/Branch/Semester combination."
                });
            }

            var subjectExists = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM subjects
                  WHERE subject_id = @SubjectId;",
                new { request.SubjectId });

            if (subjectExists == 0)
                return NotFound(new { success = false, message = "Subject not found." });

            var duplicate = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM credit_configurations
                  WHERE subject_id = @SubjectId
                    AND course_id = @CourseId
                    AND branch_id = @BranchId
                    AND semester_id = @SemesterId
                    AND credit_configuration_id <> @ConfigurationId;",
                new
                {
                    request.SubjectId,
                    request.CourseId,
                    request.BranchId,
                    request.SemesterId,
                    ConfigurationId = configurationId
                });

            if (duplicate > 0)
            {
                return Conflict(new
                {
                    success = false,
                    message = "Another credit configuration already exists for this subject/course/branch/semester."
                });
            }

            var updatedBy = request.UpdatedBy ?? request.CreatedBy ?? GetCurrentUserId();

            await connection.ExecuteAsync(
                @"UPDATE credit_configurations
                  SET subject_id = @SubjectId,
                      course_id = @CourseId,
                      branch_id = @BranchId,
                      semester_id = @SemesterId,
                      credits = @Credits,
                      minimum_credits = @MinimumCredits,
                      maximum_credits = @MaximumCredits,
                      status = @Status,
                      updated_by = @UpdatedBy,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE credit_configuration_id = @ConfigurationId;",
                new
                {
                    request.SubjectId,
                    request.CourseId,
                    request.BranchId,
                    request.SemesterId,
                    request.Credits,
                    request.MinimumCredits,
                    request.MaximumCredits,
                    request.Status,
                    UpdatedBy = updatedBy,
                    ConfigurationId = configurationId
                });

            var data = await GetConfigurationDetailsAsync(connection, configurationId);

            return Ok(new
            {
                success = true,
                message = "Credit configuration updated successfully.",
                data
            });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict(new
            {
                success = false,
                message = "Another credit configuration already exists."
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // REGISTRATION - LIST
    // GET /api/v1/credits/registrations
    // =========================================================
    [HttpGet("registrations")]
    public async Task<IActionResult> GetRegistrations(
        [FromQuery] long? studentId,
        [FromQuery] long? academicYearId,
        [FromQuery] long? semesterId,
        [FromQuery] string? registrationStatus,
        [FromQuery] byte? status)
    {
        var invalid = ValidatePositiveFilters(studentId, academicYearId, semesterId);
        if (invalid != null)
            return BadRequest(new { success = false, message = invalid });

        if (status.HasValue && status.Value is not (0 or 1))
            return BadRequest(new { success = false, message = "Status must be 0 or 1." });

        string? normalizedStatus = null;
        if (!string.IsNullOrWhiteSpace(registrationStatus))
        {
            normalizedStatus = registrationStatus.Trim().ToUpperInvariant();
            if (!AllowedRegistrationStatuses.Contains(normalizedStatus))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Registration status must be REGISTERED, COMPLETED, FAILED or DROPPED."
                });
            }
        }

        const string sql = @"
SELECT
    r.student_credit_registration_id AS studentCreditRegistrationId,
    r.student_id AS studentId,
    st.student_code AS studentCode,
    st.full_name AS studentName,
    r.subject_id AS subjectId,
    s.subject_code AS subjectCode,
    s.subject_name AS subjectName,
    r.semester_id AS semesterId,
    sem.semester_number AS semesterNumber,
    sem.semester_name AS semesterName,
    sem.academic_year_id AS academicYearId,
    r.registered_credits AS registeredCredits,
    r.registration_status AS registrationStatus,
    r.grade,
    r.grade_points AS gradePoints,
    r.is_completed AS isCompleted,
    r.registration_date AS registrationDate,
    r.status,
    r.created_at AS createdAt,
    r.created_by AS createdBy,
    r.updated_at AS updatedAt,
    r.updated_by AS updatedBy
FROM student_credit_registrations r
INNER JOIN students st ON st.student_id = r.student_id
INNER JOIN subjects s ON s.subject_id = r.subject_id
INNER JOIN semesters sem ON sem.semester_id = r.semester_id
WHERE (@studentId IS NULL OR r.student_id = @studentId)
  AND (@academicYearId IS NULL OR sem.academic_year_id = @academicYearId)
  AND (@semesterId IS NULL OR r.semester_id = @semesterId)
  AND (@registrationStatus IS NULL OR UPPER(r.registration_status) = @registrationStatus)
  AND (@status IS NULL OR r.status = @status)
ORDER BY r.student_credit_registration_id DESC;";

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var data = (await connection.QueryAsync(sql, new
            {
                studentId,
                academicYearId,
                semesterId,
                registrationStatus = normalizedStatus,
                status
            })).ToList();

            return Ok(new
            {
                success = true,
                message = "Student credit registrations retrieved successfully.",
                data
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // REGISTRATION - DETAILS
    // GET /api/v1/credits/registrations/{registrationId}
    // =========================================================
    [HttpGet("registrations/{registrationId:long}")]
    public async Task<IActionResult> GetRegistrationById(long registrationId)
    {
        if (registrationId <= 0)
            return BadRequest(new { success = false, message = "Invalid credit registration ID." });

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var data = await GetRegistrationDetailsAsync(connection, registrationId);

            if (data == null)
                return NotFound(new { success = false, message = "Credit registration not found." });

            return Ok(new
            {
                success = true,
                message = "Student credit registration retrieved successfully.",
                data
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // REGISTRATION - CREATE
    // POST /api/v1/credits/registrations
    // Credits are resolved from existing credit_configurations.
    // =========================================================
    [HttpPost("registrations")]
    public async Task<IActionResult> CreateRegistration(
        [FromBody] CreateCreditRegistrationRequest request)
    {
        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();

            var student = await connection.QueryFirstOrDefaultAsync<StudentContext>(
                @"SELECT
                      student_id AS StudentId,
                      course_id AS CourseId,
                      branch_id AS BranchId,
                      status AS Status
                  FROM students
                  WHERE student_id = @StudentId
                  LIMIT 1;",
                new { request.StudentId },
                transaction);

            if (student == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { success = false, message = "Student not found." });
            }

            if (student.Status != 1)
            {
                await transaction.RollbackAsync();
                return Conflict(new { success = false, message = "Student is inactive." });
            }

            if (!student.CourseId.HasValue || !student.BranchId.HasValue)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    success = false,
                    message = "Student course and branch must be assigned before credit registration."
                });
            }

            var semesterValid = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM semesters
                  WHERE semester_id = @SemesterId
                    AND course_id = @CourseId
                    AND branch_id = @BranchId;",
                new
                {
                    request.SemesterId,
                    CourseId = student.CourseId.Value,
                    BranchId = student.BranchId.Value
                },
                transaction);

            if (semesterValid == 0)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    success = false,
                    message = "Selected semester does not belong to the student's course and branch."
                });
            }

            var configuration = await connection.QueryFirstOrDefaultAsync<RegistrationConfigurationContext>(
                @"SELECT
                      credit_configuration_id AS CreditConfigurationId,
                      subject_id AS SubjectId,
                      course_id AS CourseId,
                      branch_id AS BranchId,
                      semester_id AS SemesterId,
                      credits AS Credits,
                      status AS Status
                  FROM credit_configurations
                  WHERE subject_id = @SubjectId
                    AND course_id = @CourseId
                    AND branch_id = @BranchId
                    AND semester_id = @SemesterId
                    AND status = 1
                  ORDER BY credit_configuration_id DESC
                  LIMIT 1;",
                new
                {
                    request.SubjectId,
                    CourseId = student.CourseId.Value,
                    BranchId = student.BranchId.Value,
                    request.SemesterId
                },
                transaction);

            if (configuration == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new
                {
                    success = false,
                    message = "Active credit configuration not found for this student/subject/semester."
                });
            }

            var duplicate = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM student_credit_registrations
                  WHERE student_id = @StudentId
                    AND subject_id = @SubjectId
                    AND semester_id = @SemesterId;",
                new
                {
                    request.StudentId,
                    request.SubjectId,
                    request.SemesterId
                },
                transaction);

            if (duplicate > 0)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    success = false,
                    message = "Student is already registered for this subject and semester."
                });
            }

            var createdBy = request.CreatedBy ?? GetCurrentUserId();

            await connection.ExecuteAsync(
                @"INSERT INTO student_credit_registrations
                    (student_id, subject_id, semester_id,
                     registered_credits, registration_status,
                     grade, grade_points, is_completed,
                     registration_date, status,
                     created_at, created_by)
                  VALUES
                    (@StudentId, @SubjectId, @SemesterId,
                     @RegisteredCredits, 'REGISTERED',
                     NULL, NULL, 0,
                     CURRENT_TIMESTAMP, 1,
                     CURRENT_TIMESTAMP, @CreatedBy);",
                new
                {
                    request.StudentId,
                    request.SubjectId,
                    request.SemesterId,
                    RegisteredCredits = configuration.Credits,
                    CreatedBy = createdBy
                },
                transaction);

            var registrationId = await connection.ExecuteScalarAsync<long>(
                "SELECT LAST_INSERT_ID();",
                transaction: transaction);

            await RefreshSummaryAsync(
                connection,
                transaction,
                request.StudentId,
                request.SemesterId,
                createdBy);

            await transaction.CommitAsync();

            var data = await GetRegistrationDetailsAsync(connection, registrationId);

            return CreatedAtAction(
                nameof(GetRegistrationById),
                new { registrationId },
                new
                {
                    success = true,
                    message = "Student credit registration created successfully.",
                    data
                });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict(new
            {
                success = false,
                message = "Student is already registered for this subject and semester."
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // REGISTRATION - UPDATE
    // PUT /api/v1/credits/registrations/{registrationId}
    // =========================================================
    [HttpPut("registrations/{registrationId:long}")]
    public async Task<IActionResult> UpdateRegistration(
        long registrationId,
        [FromBody] UpdateCreditRegistrationRequest request)
    {
        if (registrationId <= 0)
            return BadRequest(new { success = false, message = "Invalid credit registration ID." });

        var normalizedStatus = request.RegistrationStatus.Trim().ToUpperInvariant();
        if (!AllowedRegistrationStatuses.Contains(normalizedStatus))
        {
            return BadRequest(new
            {
                success = false,
                message = "Registration status must be REGISTERED, COMPLETED, FAILED or DROPPED."
            });
        }

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var registrationContext = await connection.QueryFirstOrDefaultAsync<RegistrationIdentityContext>(
                @"SELECT
                      student_credit_registration_id AS RegistrationId,
                      student_id AS StudentId,
                      semester_id AS SemesterId
                  FROM student_credit_registrations
                  WHERE student_credit_registration_id = @registrationId
                  LIMIT 1;",
                new { registrationId });

            if (registrationContext == null)
                return NotFound(new { success = false, message = "Credit registration not found." });

            var isCompleted = normalizedStatus == "COMPLETED" || request.IsCompleted;
            var updatedBy = request.UpdatedBy ?? GetCurrentUserId();

            await using var transaction = await connection.BeginTransactionAsync();

            await connection.ExecuteAsync(
                @"UPDATE student_credit_registrations
                  SET registration_status = @RegistrationStatus,
                      grade = @Grade,
                      grade_points = @GradePoints,
                      is_completed = @IsCompleted,
                      status = @Status,
                      updated_at = CURRENT_TIMESTAMP,
                      updated_by = @UpdatedBy
                  WHERE student_credit_registration_id = @RegistrationId;",
                new
                {
                    RegistrationStatus = normalizedStatus,
                    Grade = NormalizeOptionalText(request.Grade),
                    request.GradePoints,
                    IsCompleted = isCompleted ? 1 : 0,
                    request.Status,
                    UpdatedBy = updatedBy,
                    RegistrationId = registrationId
                },
                transaction);

            await RefreshSummaryAsync(
                connection,
                transaction,
                registrationContext.StudentId,
                registrationContext.SemesterId,
                updatedBy);

            await transaction.CommitAsync();

            var data = await GetRegistrationDetailsAsync(connection, registrationId);

            return Ok(new
            {
                success = true,
                message = "Student credit registration updated successfully.",
                data
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // SUMMARY
    // GET /api/v1/credits/summary?studentId=2&semesterId=1
    // Uses the EXISTING student_credit_summary table.
    // =========================================================
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] long studentId,
        [FromQuery] long? semesterId)
    {
        if (studentId <= 0)
            return BadRequest(new { success = false, message = "studentId must be greater than 0." });

        if (semesterId.HasValue && semesterId.Value <= 0)
            return BadRequest(new { success = false, message = "semesterId must be greater than 0." });

        try
        {
            await using var connection = Connection();
            await connection.OpenAsync();

            var studentExists = await connection.ExecuteScalarAsync<int>(
                @"SELECT COUNT(1)
                  FROM students
                  WHERE student_id = @studentId;",
                new { studentId });

            if (studentExists == 0)
                return NotFound(new { success = false, message = "Student not found." });

            if (semesterId.HasValue)
            {
                var summary = await connection.QueryFirstOrDefaultAsync(
                    @"SELECT
                          scs.student_credit_summary_id AS studentCreditSummaryId,
                          scs.student_id AS studentId,
                          st.student_code AS studentCode,
                          st.full_name AS studentName,
                          scs.semester_id AS semesterId,
                          sem.semester_number AS semesterNumber,
                          sem.semester_name AS semesterName,
                          sem.academic_year_id AS academicYearId,
                          scs.required_credits AS requiredCredits,
                          scs.registered_credits AS registeredCredits,
                          scs.completed_credits AS completedCredits,
                          scs.pending_credits AS pendingCredits,
                          COALESCE((
                              SELECT COUNT(*)
                              FROM student_credit_registrations r
                              WHERE r.student_id = scs.student_id
                                AND r.semester_id = scs.semester_id
                                AND r.status = 1
                                AND UPPER(r.registration_status) <> 'DROPPED'
                          ), 0) AS totalRegisteredSubjects,
                          COALESCE((
                              SELECT COUNT(*)
                              FROM student_credit_registrations r
                              WHERE r.student_id = scs.student_id
                                AND r.semester_id = scs.semester_id
                                AND r.status = 1
                                AND r.is_completed = 1
                          ), 0) AS completedSubjects,
                          COALESCE((
                              SELECT COUNT(*)
                              FROM student_credit_registrations r
                              WHERE r.student_id = scs.student_id
                                AND r.semester_id = scs.semester_id
                                AND r.status = 1
                                AND UPPER(r.registration_status) = 'FAILED'
                          ), 0) AS failedSubjects,
                          ROUND(COALESCE((
                              SELECT AVG(r.grade_points)
                              FROM student_credit_registrations r
                              WHERE r.student_id = scs.student_id
                                AND r.semester_id = scs.semester_id
                                AND r.status = 1
                                AND r.grade_points IS NOT NULL
                          ), 0), 2) AS averageGradePoints,
                          scs.status,
                          scs.created_at AS createdAt,
                          scs.created_by AS createdBy,
                          scs.updated_at AS updatedAt,
                          scs.updated_by AS updatedBy
                      FROM student_credit_summary scs
                      INNER JOIN students st ON st.student_id = scs.student_id
                      INNER JOIN semesters sem ON sem.semester_id = scs.semester_id
                      WHERE scs.student_id = @studentId
                        AND scs.semester_id = @semesterId
                        AND scs.status = 1
                      LIMIT 1;",
                    new { studentId, semesterId });

                if (summary == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Student credit summary not found for the selected semester."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Student credit summary retrieved successfully.",
                    data = summary
                });
            }

            var data = await connection.QuerySingleAsync(
                @"SELECT
                      @studentId AS studentId,
                      COALESCE(SUM(scs.required_credits), 0) AS requiredCredits,
                      COALESCE(SUM(scs.registered_credits), 0) AS registeredCredits,
                      COALESCE(SUM(scs.completed_credits), 0) AS completedCredits,
                      COALESCE(SUM(scs.pending_credits), 0) AS pendingCredits,
                      COUNT(DISTINCT scs.semester_id) AS totalSemesters,
                      COALESCE((
                          SELECT COUNT(*)
                          FROM student_credit_registrations r
                          WHERE r.student_id = @studentId
                            AND r.status = 1
                            AND UPPER(r.registration_status) <> 'DROPPED'
                      ), 0) AS totalRegisteredSubjects,
                      COALESCE((
                          SELECT COUNT(*)
                          FROM student_credit_registrations r
                          WHERE r.student_id = @studentId
                            AND r.status = 1
                            AND r.is_completed = 1
                      ), 0) AS completedSubjects,
                      COALESCE((
                          SELECT COUNT(*)
                          FROM student_credit_registrations r
                          WHERE r.student_id = @studentId
                            AND r.status = 1
                            AND UPPER(r.registration_status) = 'FAILED'
                      ), 0) AS failedSubjects,
                      ROUND(COALESCE((
                          SELECT AVG(r.grade_points)
                          FROM student_credit_registrations r
                          WHERE r.student_id = @studentId
                            AND r.status = 1
                            AND r.grade_points IS NOT NULL
                      ), 0), 2) AS averageGradePoints
                  FROM student_credit_summary scs
                  WHERE scs.student_id = @studentId
                    AND scs.status = 1;",
                new { studentId });

            return Ok(new
            {
                success = true,
                message = "Student credit summary retrieved successfully.",
                data
            });
        }
        catch (MySqlException)
        {
            return CreditDatabaseError();
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================
    private static async Task<dynamic?> GetConfigurationDetailsAsync(
        MySqlConnection connection,
        long configurationId)
    {
        const string sql = @"
SELECT
    c.credit_configuration_id AS creditConfigurationId,
    c.subject_id AS subjectId,
    s.subject_code AS subjectCode,
    s.subject_name AS subjectName,
    c.course_id AS courseId,
    cr.course_code AS courseCode,
    cr.course_name AS courseName,
    c.branch_id AS branchId,
    b.branch_code AS branchCode,
    b.branch_name AS branchName,
    c.semester_id AS semesterId,
    sem.semester_number AS semesterNumber,
    sem.semester_name AS semesterName,
    sem.academic_year_id AS academicYearId,
    c.credits,
    c.minimum_credits AS minimumCredits,
    c.maximum_credits AS maximumCredits,
    c.status,
    c.created_at AS createdAt,
    c.created_by AS createdBy,
    c.updated_at AS updatedAt,
    c.updated_by AS updatedBy
FROM credit_configurations c
INNER JOIN subjects s ON s.subject_id = c.subject_id
INNER JOIN courses cr ON cr.course_id = c.course_id
INNER JOIN branches b ON b.branch_id = c.branch_id
INNER JOIN semesters sem ON sem.semester_id = c.semester_id
WHERE c.credit_configuration_id = @configurationId
LIMIT 1;";

        return await connection.QueryFirstOrDefaultAsync(sql, new { configurationId });
    }

    private static async Task<dynamic?> GetRegistrationDetailsAsync(
        MySqlConnection connection,
        long registrationId)
    {
        const string sql = @"
SELECT
    r.student_credit_registration_id AS studentCreditRegistrationId,
    r.student_id AS studentId,
    st.student_code AS studentCode,
    st.full_name AS studentName,
    r.subject_id AS subjectId,
    s.subject_code AS subjectCode,
    s.subject_name AS subjectName,
    r.semester_id AS semesterId,
    sem.semester_number AS semesterNumber,
    sem.semester_name AS semesterName,
    sem.academic_year_id AS academicYearId,
    r.registered_credits AS registeredCredits,
    r.registration_status AS registrationStatus,
    r.grade,
    r.grade_points AS gradePoints,
    r.is_completed AS isCompleted,
    r.registration_date AS registrationDate,
    r.status,
    r.created_at AS createdAt,
    r.created_by AS createdBy,
    r.updated_at AS updatedAt,
    r.updated_by AS updatedBy
FROM student_credit_registrations r
INNER JOIN students st ON st.student_id = r.student_id
INNER JOIN subjects s ON s.subject_id = r.subject_id
INNER JOIN semesters sem ON sem.semester_id = r.semester_id
WHERE r.student_credit_registration_id = @registrationId
LIMIT 1;";

        return await connection.QueryFirstOrDefaultAsync(sql, new { registrationId });
    }

    private static async Task<bool> AcademicContextExistsAsync(
        MySqlConnection connection,
        long courseId,
        long branchId,
        long semesterId)
    {
        const string sql = @"
SELECT COUNT(1)
FROM semesters sem
INNER JOIN branches b ON b.branch_id = sem.branch_id
WHERE sem.semester_id = @semesterId
  AND sem.course_id = @courseId
  AND sem.branch_id = @branchId
  AND b.course_id = @courseId;";

        var count = await connection.ExecuteScalarAsync<int>(sql, new
        {
            courseId,
            branchId,
            semesterId
        });

        return count > 0;
    }

    private static async Task RefreshSummaryAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        long studentId,
        long semesterId,
        long? changedBy)
    {
        const string contextSql = @"
SELECT
    st.course_id AS CourseId,
    st.branch_id AS BranchId,
    COALESCE((
        SELECT required_credits
        FROM student_credit_summary
        WHERE student_id = @studentId
          AND semester_id = @semesterId
        LIMIT 1
    ), (
        SELECT COALESCE(SUM(cc.credits), 0)
        FROM credit_configurations cc
        WHERE cc.course_id = st.course_id
          AND cc.branch_id = st.branch_id
          AND cc.semester_id = @semesterId
          AND cc.status = 1
    ), 0) AS RequiredCredits
FROM students st
WHERE st.student_id = @studentId
LIMIT 1;";

        var context = await connection.QueryFirstOrDefaultAsync<SummaryRefreshContext>(
            contextSql,
            new { studentId, semesterId },
            transaction);

        if (context == null)
            return;

        const string totalsSql = @"
SELECT
    COALESCE(SUM(CASE
        WHEN status = 1 AND UPPER(registration_status) <> 'DROPPED'
        THEN registered_credits ELSE 0 END), 0) AS RegisteredCredits,
    COALESCE(SUM(CASE
        WHEN status = 1 AND is_completed = 1
        THEN registered_credits ELSE 0 END), 0) AS CompletedCredits
FROM student_credit_registrations
WHERE student_id = @studentId
  AND semester_id = @semesterId;";

        var totals = await connection.QuerySingleAsync<SummaryRegistrationTotals>(
            totalsSql,
            new { studentId, semesterId },
            transaction);

        var pendingCredits = Math.Max(context.RequiredCredits - totals.CompletedCredits, 0m);

        const string upsertSql = @"
INSERT INTO student_credit_summary
(
    student_id,
    semester_id,
    required_credits,
    registered_credits,
    completed_credits,
    pending_credits,
    status,
    created_at,
    created_by,
    updated_at,
    updated_by
)
VALUES
(
    @StudentId,
    @SemesterId,
    @RequiredCredits,
    @RegisteredCredits,
    @CompletedCredits,
    @PendingCredits,
    1,
    CURRENT_TIMESTAMP,
    @ChangedBy,
    CURRENT_TIMESTAMP,
    @ChangedBy
)
ON DUPLICATE KEY UPDATE
    required_credits = @RequiredCredits,
    registered_credits = @RegisteredCredits,
    completed_credits = @CompletedCredits,
    pending_credits = @PendingCredits,
    status = 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = @ChangedBy;";

        await connection.ExecuteAsync(
            upsertSql,
            new
            {
                StudentId = studentId,
                SemesterId = semesterId,
                RequiredCredits = context.RequiredCredits,
                RegisteredCredits = totals.RegisteredCredits,
                CompletedCredits = totals.CompletedCredits,
                PendingCredits = pendingCredits,
                ChangedBy = changedBy
            },
            transaction);
    }

    private static string? ValidateCreditRange(CreditConfigurationRequest request)
    {
        if (request.MaximumCredits.HasValue &&
            request.MaximumCredits.Value < request.MinimumCredits)
        {
            return "MaximumCredits cannot be less than MinimumCredits.";
        }

        if (request.Credits < request.MinimumCredits)
            return "Credits cannot be less than MinimumCredits.";

        if (request.MaximumCredits.HasValue && request.Credits > request.MaximumCredits.Value)
            return "Credits cannot be greater than MaximumCredits.";

        return null;
    }

    private static string? ValidatePositiveFilters(params long?[] values)
    {
        foreach (var value in values)
        {
            if (value.HasValue && value.Value <= 0)
                return "Filter IDs must be greater than 0.";
        }

        return null;
    }

    private long? GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue("user_id")
                    ?? User.FindFirstValue("sub");

        return long.TryParse(value, out var userId) ? userId : null;
    }

    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private ObjectResult CreditDatabaseError() =>
        StatusCode(StatusCodes.Status500InternalServerError, new
        {
            success = false,
            message = "Unable to process the credit request. Verify the existing credit_configurations, student_credit_registrations and student_credit_summary tables and the supplied IDs."
        });

    private sealed class RegistrationIdentityContext
    {
        public long RegistrationId { get; set; }
        public long StudentId { get; set; }
        public long SemesterId { get; set; }
    }

    private sealed class SummaryRefreshContext
    {
        public long? CourseId { get; set; }
        public long? BranchId { get; set; }
        public decimal RequiredCredits { get; set; }
    }

    private sealed class SummaryRegistrationTotals
    {
        public decimal RegisteredCredits { get; set; }
        public decimal CompletedCredits { get; set; }
    }

    private sealed class StudentContext
    {
        public long StudentId { get; set; }
        public long? CourseId { get; set; }
        public long? BranchId { get; set; }
        public byte Status { get; set; }
    }

    private sealed class RegistrationConfigurationContext
    {
        public long CreditConfigurationId { get; set; }
        public long SubjectId { get; set; }
        public long CourseId { get; set; }
        public long BranchId { get; set; }
        public long SemesterId { get; set; }
        public decimal Credits { get; set; }
        public byte Status { get; set; }
    }
}
