using BTech.DTOs.Fees;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

/// <summary>
/// Task 21 - Fee category, fee structure and student fee assignment APIs.
/// Only the Task-21 files are self-contained; existing teammate modules are not changed.
/// </summary>
[ApiController]
[Route("api/v1")]
[Authorize(Roles = "SUPER_ADMIN,COLLEGE_ADMIN,PRINCIPAL,HOD")]
public sealed class FeeConfigurationController : ControllerBase
{
    private readonly string _connectionString;
    private readonly ILogger<FeeConfigurationController> _logger;

    public FeeConfigurationController(
        IConfiguration configuration,
        ILogger<FeeConfigurationController> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");
        _logger = logger;
    }

    [HttpGet("fee-categories")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeeCategories([FromQuery] string? search = null)
    {
        await using var connection = await OpenConnectionAsync();

        if (!await RequiredTableExistsAsync(connection, "fee_categories"))
            return FeeTablesNotInstalled();

        const string sql = """
            SELECT
                fee_category_id AS Id,
                category_code AS Code,
                category_name AS Name,
                description AS Description
            FROM fee_categories
            WHERE (@search IS NULL OR @search = ''
                OR category_code LIKE CONCAT('%', @search, '%')
                OR category_name LIKE CONCAT('%', @search, '%'))
              AND status = 1
            ORDER BY category_name, fee_category_id;
            """;

        var data = (await connection.QueryAsync<FeeCategoryDto>(
            sql, new { search = Clean(search) })).AsList();

        return Ok(new
        {
            success = true,
            message = "Fee categories retrieved successfully.",
            data,
            count = data.Count
        });
    }

    [HttpGet("fee-structures")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeeStructures(
        [FromQuery] long? feeCategoryId = null,
        [FromQuery] long? academicYearId = null,
        [FromQuery] long? courseId = null,
        [FromQuery] long? branchId = null,
        [FromQuery] long? semesterId = null,
        [FromQuery] string? search = null)
    {
        await using var connection = await OpenConnectionAsync();

        if (!await RequiredTableExistsAsync(connection, "fee_structures"))
            return FeeTablesNotInstalled();

        const string sql = """
            SELECT
                fs.fee_structure_id AS Id,
                fs.structure_code AS Code,
                fs.structure_group_code AS GroupCode,
                fs.structure_name AS Name,
                fs.college_id AS CollegeId,
                fs.fee_category_id AS FeeCategoryId,
                fs.academic_year_id AS AcademicYearId,
                fs.course_id AS CourseId,
                fs.branch_id AS BranchId,
                fs.semester_id AS SemesterId,
                fs.amount AS Amount,
                fs.effective_from AS EffectiveFrom,
                fs.effective_to AS EffectiveTo,
                fs.status AS Status
            FROM fee_structures fs
            WHERE (@feeCategoryId IS NULL OR fs.fee_category_id = @feeCategoryId)
              AND (@academicYearId IS NULL OR fs.academic_year_id = @academicYearId)
              AND (@courseId IS NULL OR fs.course_id = @courseId)
              AND (@branchId IS NULL OR fs.branch_id = @branchId)
              AND (@semesterId IS NULL OR fs.semester_id = @semesterId)
              AND (@search IS NULL OR @search = ''
                   OR fs.structure_code LIKE CONCAT('%', @search, '%')
                   OR fs.structure_name LIKE CONCAT('%', @search, '%')
                   OR fs.structure_group_code LIKE CONCAT('%', @search, '%'))
              AND fs.status = 1
            ORDER BY fs.fee_structure_id DESC;
            """;

        var data = (await connection.QueryAsync<FeeStructureDto>(sql, new
        {
            feeCategoryId,
            academicYearId,
            courseId,
            branchId,
            semesterId,
            search = Clean(search)
        })).AsList();

        return Ok(new
        {
            success = true,
            message = "Fee structures retrieved successfully.",
            data,
            count = data.Count
        });
    }

    [HttpPost("fee-structures")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateFeeStructure([FromBody] CreateFeeStructureRequest request)
    {
        var validation = ValidateCreateFeeStructureRequest(request);
        if (validation is not null)
            return BadRequest(new { success = false, message = validation });

        await using var connection = await OpenConnectionAsync();

        if (!await RequiredTablesExistAsync(
                connection, "fee_categories", "fee_structures", "academicyears", "courses", "branches", "semesters"))
            return FeeTablesNotInstalled();

        var categoryExists = await connection.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM fee_categories
                WHERE fee_category_id = @FeeCategoryId AND status = 1
            );
            """, new { request.FeeCategoryId });

        if (!categoryExists)
            return NotFound(new { success = false, message = "Fee category not found or inactive." });

        var academicYear = await connection.QuerySingleOrDefaultAsync<AcademicYearRow>("""
            SELECT academic_year_id AS AcademicYearId,
                   start_date AS StartDate,
                   end_date AS EndDate
            FROM academicyears
            WHERE academic_year_id = @AcademicYearId
              AND status = 1
              AND is_archived = 0
              AND deleted_at IS NULL;
            """, new { request.AcademicYearId });

        if (academicYear is null)
            return NotFound(new { success = false, message = "Academic year not found or inactive." });

        var course = await connection.QuerySingleOrDefaultAsync<CourseRow>("""
            SELECT course_id AS CourseId, college_id AS CollegeId
            FROM courses
            WHERE course_id = @CourseId
              AND status = 1
              AND deleted_at IS NULL;
            """, new { request.CourseId });

        if (course is null)
            return NotFound(new { success = false, message = "Course not found or inactive." });

        var branchValid = await connection.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM branches
                WHERE branch_id = @BranchId
                  AND course_id = @CourseId
                  AND status = 1
                  AND deleted_at IS NULL
            );
            """, new { request.BranchId, request.CourseId });

        if (!branchValid)
            return BadRequest(new { success = false, message = "Branch does not belong to the selected course or is inactive." });

        var semesterValid = await connection.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM semesters
                WHERE semester_id = @SemesterId
                  AND course_id = @CourseId
                  AND branch_id = @BranchId
                  AND status = 1
                  AND is_archived = 0
            );
            """, new { request.SemesterId, request.CourseId, request.BranchId });

        if (!semesterValid)
            return BadRequest(new { success = false, message = "Semester does not belong to the selected course and branch." });

        var code = request.FeeStructureCode.Trim();
        var name = request.FeeStructureName.Trim();
        var groupCode = string.IsNullOrWhiteSpace(request.StructureGroupCode)
            ? code
            : request.StructureGroupCode.Trim();

        var duplicate = await connection.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM fee_structures WHERE structure_code = @Code
            );
            """, new { Code = code });

        if (duplicate)
            return Conflict(new { success = false, message = "A fee structure with the same code already exists." });

        var effectiveFrom = (request.EffectiveFrom ?? academicYear.StartDate).Date;
        var effectiveTo = (request.EffectiveTo ?? request.DueDate ?? academicYear.EndDate).Date;

        if (effectiveTo < effectiveFrom)
            return BadRequest(new { success = false, message = "effectiveTo must be on or after effectiveFrom." });

        try
        {
            const string sql = """
                INSERT INTO fee_structures
                (
                    structure_code,
                    structure_group_code,
                    structure_name,
                    college_id,
                    academic_year_id,
                    course_id,
                    branch_id,
                    semester_id,
                    fee_category_id,
                    amount,
                    effective_from,
                    effective_to,
                    status
                )
                VALUES
                (
                    @Code,
                    @GroupCode,
                    @Name,
                    @CollegeId,
                    @AcademicYearId,
                    @CourseId,
                    @BranchId,
                    @SemesterId,
                    @FeeCategoryId,
                    @Amount,
                    @EffectiveFrom,
                    @EffectiveTo,
                    1
                );
                SELECT LAST_INSERT_ID();
                """;

            var id = await connection.ExecuteScalarAsync<long>(sql, new
            {
                Code = code,
                GroupCode = groupCode,
                Name = name,
                course.CollegeId,
                request.AcademicYearId,
                request.CourseId,
                request.BranchId,
                request.SemesterId,
                request.FeeCategoryId,
                request.Amount,
                EffectiveFrom = effectiveFrom,
                EffectiveTo = effectiveTo
            });

            return StatusCode(StatusCodes.Status201Created, new
            {
                success = true,
                message = "Fee structure created successfully.",
                feeStructureId = id,
                data = new
                {
                    feeStructureId = id,
                    feeStructureCode = code,
                    feeStructureName = name,
                    structureGroupCode = groupCode,
                    collegeId = course.CollegeId,
                    academicYearId = request.AcademicYearId,
                    courseId = request.CourseId,
                    branchId = request.BranchId,
                    semesterId = request.SemesterId,
                    feeCategoryId = request.FeeCategoryId,
                    amount = request.Amount,
                    effectiveFrom,
                    effectiveTo
                }
            });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict(new { success = false, message = "A fee structure with the same unique code already exists." });
        }
        catch (MySqlException ex)
        {
            _logger.LogError(ex, "Fee structure creation failed. Code={Code}", code);
            return BadRequest(new
            {
                success = false,
                message = "Fee structure could not be created. Check the selected category, academic year, course, branch and semester values."
            });
        }
    }

    [HttpPost("students/{studentId:long}/fee-structures")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AssignFeeStructure(
        long studentId,
        [FromBody] AssignFeeStructureRequest request)
    {
        if (studentId <= 0)
            return BadRequest(new { success = false, message = "A valid studentId is required." });

        if (request.FeeStructureId <= 0)
            return BadRequest(new { success = false, message = "A valid feeStructureId is required." });

        await using var connection = await OpenConnectionAsync();

        if (!await RequiredTablesExistAsync(connection, "students", "fee_structures", "fee_assignments"))
            return FeeTablesNotInstalled();

        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            var student = await connection.QuerySingleOrDefaultAsync<StudentContext>("""
                SELECT student_id AS StudentId, college_id AS CollegeId
                FROM students
                WHERE student_id = @StudentId
                  AND deleted_at IS NULL
                  AND status = 1
                FOR UPDATE;
                """, new { StudentId = studentId }, transaction);

            if (student is null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { success = false, message = "Active student not found." });
            }

            var structure = await connection.QuerySingleOrDefaultAsync<FeeStructureAssignmentRow>("""
                SELECT fee_structure_id AS FeeStructureId,
                       college_id AS CollegeId,
                       amount AS Amount
                FROM fee_structures
                WHERE fee_structure_id = @FeeStructureId
                  AND status = 1
                FOR UPDATE;
                """, new { request.FeeStructureId }, transaction);

            if (structure is null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { success = false, message = "Active fee structure not found." });
            }

            if (student.CollegeId != structure.CollegeId)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { success = false, message = "Student and fee structure belong to different colleges." });
            }

            var alreadyAssigned = await connection.ExecuteScalarAsync<bool>("""
                SELECT EXISTS(
                    SELECT 1 FROM fee_assignments
                    WHERE student_id = @StudentId
                      AND fee_structure_id = @FeeStructureId
                      AND status = 'ACTIVE'
                );
                """, new { StudentId = studentId, request.FeeStructureId }, transaction);

            if (alreadyAssigned)
            {
                await transaction.RollbackAsync();
                return Conflict(new { success = false, message = "This fee structure is already assigned to the student." });
            }

            var assignedAmount = request.AssignedAmount ?? structure.Amount;
            if (assignedAmount < 0 || assignedAmount > 9999999999.99m || decimal.Round(assignedAmount,2) != assignedAmount)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { success = false, message = "Assigned amount must be between zero and 9999999999.99 with at most two decimal places." });
            }

            var assignedOn = (request.AssignedOn ?? DateTime.UtcNow).Date;
            var assignmentCode = $"FEE-{studentId}-{request.FeeStructureId}-{Guid.NewGuid():N}";

            const string insertSql = """
                INSERT INTO fee_assignments
                (
                    assignment_code,
                    student_id,
                    fee_structure_id,
                    assigned_amount,
                    concession_amount,
                    assigned_on,
                    status,
                    remarks
                )
                VALUES
                (
                    @AssignmentCode,
                    @StudentId,
                    @FeeStructureId,
                    @AssignedAmount,
                    0,
                    @AssignedOn,
                    'ACTIVE',
                    @Remarks
                );
                SELECT LAST_INSERT_ID();
                """;

            var assignmentId = await connection.ExecuteScalarAsync<long>(insertSql, new
            {
                AssignmentCode = assignmentCode,
                StudentId = studentId,
                FeeStructureId = request.FeeStructureId,
                AssignedAmount = assignedAmount,
                AssignedOn = assignedOn,
                request.Remarks
            }, transaction);

            await transaction.CommitAsync();

            return StatusCode(StatusCodes.Status201Created, new
            {
                success = true,
                message = "Fee structure assigned to student successfully.",
                data = new
                {
                    assignmentId,
                    assignmentCode,
                    studentId,
                    feeStructureId = request.FeeStructureId,
                    assignedAmount,
                    assignedOn,
                    dueDate = request.DueDate,
                    request.Remarks
                }
            });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            await transaction.RollbackAsync();
            return Conflict(new { success = false, message = "This fee structure is already assigned to the student or the assignment code already exists." });
        }
        catch (MySqlException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Fee assignment failed. StudentId={StudentId}, FeeStructureId={FeeStructureId}", studentId, request.FeeStructureId);
            return BadRequest(new { success = false, message = "Fee structure assignment could not be created. Check the student and fee structure values." });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task<MySqlConnection> OpenConnectionAsync()
    {
        var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    private static async Task<bool> RequiredTableExistsAsync(MySqlConnection connection, string tableName)
    {
        const string sql = """
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = @tableName
            );
            """;
        return await connection.ExecuteScalarAsync<bool>(sql, new { tableName });
    }

    private static async Task<bool> RequiredTablesExistAsync(MySqlConnection connection, params string[] tableNames)
    {
        foreach (var tableName in tableNames)
        {
            if (!await RequiredTableExistsAsync(connection, tableName))
                return false;
        }
        return true;
    }

    private static IActionResult FeeTablesNotInstalled() => new ObjectResult(new
    {
        success = false,
        message = "Required Fee Configuration tables are not installed in the current database."
    }) { StatusCode = StatusCodes.Status503ServiceUnavailable };

    private static string? ValidateCreateFeeStructureRequest(CreateFeeStructureRequest request)
    {
        if (request.FeeCategoryId <= 0) return "A valid feeCategoryId is required.";
        if (string.IsNullOrWhiteSpace(request.FeeStructureCode)) return "feeStructureCode is required.";
        if (request.FeeStructureCode.Trim().Length > 80) return "feeStructureCode cannot exceed 80 characters.";
        if (string.IsNullOrWhiteSpace(request.FeeStructureName)) return "feeStructureName is required.";
        if (request.FeeStructureName.Trim().Length > 150) return "feeStructureName cannot exceed 150 characters.";
        if (request.StructureGroupCode?.Trim().Length > 80) return "structureGroupCode cannot exceed 80 characters.";
        if (request.Amount < 0 || request.Amount > 9999999999.99m || decimal.Round(request.Amount,2) != request.Amount) return "amount must be between zero and 9999999999.99 with at most two decimal places.";
        if (request.AcademicYearId <= 0) return "A valid academicYearId is required.";
        if (request.CourseId <= 0) return "A valid courseId is required.";
        if (request.BranchId <= 0) return "A valid branchId is required.";
        if (request.SemesterId <= 0) return "A valid semesterId is required.";
        return null;
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed class AcademicYearRow
    {
        public long AcademicYearId { get; init; }
        public DateTime StartDate { get; init; }
        public DateTime EndDate { get; init; }
    }

    private sealed class CourseRow
    {
        public long CourseId { get; init; }
        public long CollegeId { get; init; }
    }

    private sealed class StudentContext
    {
        public long StudentId { get; init; }
        public long CollegeId { get; init; }
    }

    private sealed class FeeStructureAssignmentRow
    {
        public long FeeStructureId { get; init; }
        public long CollegeId { get; init; }
        public decimal Amount { get; init; }
    }
}
