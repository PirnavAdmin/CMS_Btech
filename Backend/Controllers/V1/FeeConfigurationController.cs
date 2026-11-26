using BTech.Services;
using BTech.DTOs.Fees;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using System.Data;

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

    // ModulePermissionMiddleware checks live fees can_view/can_create/can_edit
    // before these actions. The catalog is global, so only administrative roles
    // may manage it; College Admin is included when their fee grant permits it.
    private bool IsFeeCatalogAdministrator() =>
        CollegeDataScope.IsSuper(HttpContext) || CollegeDataScope.HasRole(HttpContext, "COLLEGE_ADMIN");

    [HttpGet("fee-categories")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFeeCategories(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null)
    {
        await using var connection = await OpenConnectionAsync();

        if (!await RequiredTableExistsAsync(connection, "fee_categories"))
            return FeeTablesNotInstalled();

        var hasCategoryCol = await RequiredColumnExistsAsync(connection, "fee_categories", "fee_category");
        var cleanSearch = Clean(search);
        var cleanCategory = Clean(category);

        string sql = hasCategoryCol ? """
            SELECT
                fee_category_id AS Id,
                category_code AS Code,
                category_name AS Name,
                fee_category AS FeeCategory,
                description AS Description,
                status AS Status
            FROM fee_categories
            WHERE (@search IS NULL OR @search = ''
                OR category_code LIKE CONCAT('%', @search, '%')
                OR category_name LIKE CONCAT('%', @search, '%'))
              AND (@category IS NULL OR @category = '' OR LOWER(fee_category) = LOWER(@category))
              AND status = 1
            ORDER BY category_name, fee_category_id;
            """ : """
            SELECT
                fee_category_id AS Id,
                category_code AS Code,
                category_name AS Name,
                CASE
                    WHEN LOWER(category_name) LIKE '%hostel%' OR LOWER(category_code) LIKE '%hostel%' OR category_code = 'HF' THEN 'Hostel'
                    WHEN LOWER(category_name) LIKE '%transport%' OR LOWER(category_code) LIKE '%transport%' OR LOWER(category_name) LIKE '%bus%' THEN 'Transport'
                    ELSE 'Academic'
                END AS FeeCategory,
                description AS Description,
                status AS Status
            FROM fee_categories
            WHERE (@search IS NULL OR @search = ''
                OR category_code LIKE CONCAT('%', @search, '%')
                OR category_name LIKE CONCAT('%', @search, '%'))
              AND (@category IS NULL OR @category = '' OR
                   CASE
                       WHEN LOWER(category_name) LIKE '%hostel%' OR LOWER(category_code) LIKE '%hostel%' OR category_code = 'HF' THEN 'Hostel'
                       WHEN LOWER(category_name) LIKE '%transport%' OR LOWER(category_code) LIKE '%transport%' OR LOWER(category_name) LIKE '%bus%' THEN 'Transport'
                       ELSE 'Academic'
                   END = @category)
              AND status = 1
            ORDER BY category_name, fee_category_id;
            """;

        var data = (await connection.QueryAsync<FeeCategoryDto>(
            sql, new { search = cleanSearch, category = cleanCategory })).AsList();

        return Ok(new
        {
            success = true,
            message = "Fee categories retrieved successfully.",
            data,
            count = data.Count
        });
    }

    /// <summary>
    /// Admin management view. Unlike the directory endpoint, this can include inactive categories.
    /// The regular GET /fee-categories remains active-only for existing consumers.
    /// </summary>
    [HttpGet("fee-categories/manage")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetFeeCategoriesForManagement(
        [FromQuery] bool includeInactive = true,
        [FromQuery] string? search = null,
        [FromQuery] string? category = null)
    {
        if (!IsFeeCatalogAdministrator())
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                code = "FEE_CATEGORY_ADMIN_REQUIRED",
                message = "Super Admin or College Admin access is required to manage Fee Types."
            });

        await using var connection = await OpenConnectionAsync();
        if (!await RequiredTableExistsAsync(connection, "fee_categories"))
            return FeeTablesNotInstalled();

        var cleanSearch = Clean(search);

        const string sql = """
            SELECT fee_category_id AS Id,
                   category_code AS Code,
                   category_name AS Name,
                   description AS Description,
                   status AS Status
            FROM fee_categories
            WHERE (@includeInactive = 1 OR status = 1)
              AND (@search IS NULL OR @search = ''
                   OR category_code LIKE CONCAT('%', @search, '%')
                   OR category_name LIKE CONCAT('%', @search, '%'))
            ORDER BY status DESC, category_name, fee_category_id;
            """;

        var data = (await connection.QueryAsync<FeeCategoryDto>(sql, new
        {
            includeInactive,
            search = cleanSearch
        })).AsList();

        return Ok(new
        {
            success = true,
            message = "Fee categories retrieved successfully.",
            data,
            count = data.Count
        });
    }

    /// <summary>Creates a shared Fee Type directly in fee_categories.</summary>
    [HttpPost("fee-categories")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateFeeCategory([FromBody] FeeCategoryWriteRequest? request)
    {
        if (!IsFeeCatalogAdministrator())
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                code = "FEE_CATEGORY_ADMIN_REQUIRED",
                message = "Super Admin or College Admin access is required to create Fee Types."
            });

        var validation = ValidateFeeCategoryRequest(request, isCreating: true);
        if (validation is not null)
            return BadRequest(new { success = false, code = "INVALID_FEE_CATEGORY", message = validation });

        await using var connection = await OpenConnectionAsync();
        if (!await RequiredTableExistsAsync(connection, "fee_categories"))
            return FeeTablesNotInstalled();

        var name = request!.Name!.Trim();
        var category = !string.IsNullOrWhiteSpace(request?.FeeCategory) ? request.FeeCategory.Trim() : "Academic";
        var description = Clean(request.Description);
        var actor = CollegeDataScope.Actor(HttpContext);
        var status = request.Status ?? 1;

        // Auto-generate code if not provided
        var rawCode = Clean(request.Code);
        var baseCode = string.IsNullOrWhiteSpace(rawCode) ? GenerateFeeTypeCode(name) : rawCode.ToUpperInvariant();
        var code = baseCode;

        // Prevent duplicate fee type name
        var duplicateName = await connection.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM fee_categories
                WHERE LOWER(TRIM(category_name)) = LOWER(@Name)
            );
            """, new { Name = name });
        if (duplicateName)
            return Conflict(new { success = false, code = "DUPLICATE_FEE_CATEGORY_NAME", message = "A Fee Type with this name already exists." });

        // If user gave a manual code, check for conflict
        if (!string.IsNullOrWhiteSpace(rawCode))
        {
            var duplicateCode = await connection.ExecuteScalarAsync<bool>("""
                SELECT EXISTS(
                    SELECT 1 FROM fee_categories
                    WHERE LOWER(TRIM(category_code)) = LOWER(@Code)
                );
                """, new { Code = code });
            if (duplicateCode)
                return Conflict(new { success = false, code = "DUPLICATE_FEE_CATEGORY_CODE", message = "A Fee Type with this code already exists." });
        }
        else
        {
            // Auto-generated code collision resolution (append suffix)
            int suffix = 1;
            while (await connection.ExecuteScalarAsync<bool>("""
                SELECT EXISTS(
                    SELECT 1 FROM fee_categories
                    WHERE LOWER(TRIM(category_code)) = LOWER(@Code)
                );
                """, new { Code = code }))
            {
                var suffixStr = $"_{suffix++}";
                code = (baseCode.Length + suffixStr.Length > 50)
                    ? baseCode[..(50 - suffixStr.Length)] + suffixStr
                    : baseCode + suffixStr;
            }
        }

        try
        {
            var hasSpCategoryParam = await connection.ExecuteScalarAsync<bool>("""
                SELECT EXISTS(
                    SELECT 1 FROM information_schema.parameters
                    WHERE specific_name = 'sp_fee_category_create'
                      AND parameter_name = 'p_category'
                      AND specific_schema = DATABASE()
                );
                """);

            FeeCategoryCreateResult saved;
            if (hasSpCategoryParam)
            {
                saved = await connection.QuerySingleAsync<FeeCategoryCreateResult>(
                    "sp_fee_category_create",
                    new { p_code = code, p_name = name, p_category = category, p_description = description, p_actor = actor },
                    commandType: CommandType.StoredProcedure);
            }
            else
            {
                var spExists = await connection.ExecuteScalarAsync<bool>("""
                    SELECT EXISTS(
                        SELECT 1 FROM information_schema.routines
                        WHERE routine_name = 'sp_fee_category_create'
                          AND routine_type = 'PROCEDURE'
                          AND routine_schema = DATABASE()
                    );
                    """);

                if (spExists)
                {
                    saved = await connection.QuerySingleAsync<FeeCategoryCreateResult>(
                        "sp_fee_category_create",
                        new { p_code = code, p_name = name, p_description = description, p_actor = actor },
                        commandType: CommandType.StoredProcedure);
                }
                else
                {
                    var hasCategoryCol = await RequiredColumnExistsAsync(connection, "fee_categories", "fee_category");
                    long id;
                    if (hasCategoryCol)
                    {
                        await connection.ExecuteAsync("""
                            INSERT INTO fee_categories (category_code, category_name, fee_category, description, status, created_by)
                            VALUES (@Code, @Name, @Category, @Description, 1, @Actor);
                            """, new { Code = code, Name = name, Category = category, Description = description, Actor = actor });
                    }
                    else
                    {
                        await connection.ExecuteAsync("""
                            INSERT INTO fee_categories (category_code, category_name, description, status, created_by)
                            VALUES (@Code, @Name, @Description, 1, @Actor);
                            """, new { Code = code, Name = name, Description = description, Actor = actor });
                    }
                    id = await connection.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID();");
                    saved = new FeeCategoryCreateResult
                    {
                        Id = id,
                        Code = code,
                        Name = name,
                        Description = description,
                        Status = 1
                    };
                }
            }

            _logger.LogInformation("Shared fee category created. FeeCategoryId={FeeCategoryId}, ActorId={ActorId}", saved.Id, actor);

            return StatusCode(StatusCodes.Status201Created, new
            {
                success = true,
                message = "Fee Type created successfully.",
                id = saved.Id,
                feeCategoryId = saved.Id,
                data = new
                {
                    id = saved.Id,
                    feeCategoryId = saved.Id,
                    code = saved.Code,
                    categoryCode = saved.Code,
                    name = saved.Name,
                    categoryName = saved.Name,
                    description = saved.Description,
                    status = saved.Status
                }
            });
        }
        catch (MySqlException ex) when (ex.Number == 1062 ||
            (ex.Number == 1644 && ex.Message.Contains("DUPLICATE_FEE_CATEGORY_CODE", StringComparison.Ordinal)))
        {
            return Conflict(new { success = false, code = "DUPLICATE_FEE_CATEGORY_CODE", message = "A Fee Type with this code already exists." });
        }
    }

    /// <summary>Edits catalog fields without changing the category primary key or references.</summary>
    [HttpPut("fee-categories/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateFeeCategory(long id, [FromBody] FeeCategoryWriteRequest request)
    {
        if (!IsFeeCatalogAdministrator())
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                code = "FEE_CATEGORY_ADMIN_REQUIRED",
                message = "Super Admin or College Admin access is required to edit Fee Types."
            });

        if (id <= 0)
            return BadRequest(new { success = false, code = "INVALID_FEE_CATEGORY_ID", message = "A valid Fee Type ID is required." });

        var validation = ValidateFeeCategoryRequest(request, isCreating: false);
        if (validation is not null)
            return BadRequest(new { success = false, code = "INVALID_FEE_CATEGORY", message = validation });

        await using var connection = await OpenConnectionAsync();
        if (!await RequiredTableExistsAsync(connection, "fee_categories"))
            return FeeTablesNotInstalled();

        var existing = await connection.QuerySingleOrDefaultAsync<FeeCategoryDto>("""
            SELECT fee_category_id AS Id,
                   category_code AS Code,
                   category_name AS Name,
                   description AS Description,
                   status AS Status
            FROM fee_categories WHERE fee_category_id = @Id;
            """, new { Id = id });
        if (existing is null)
            return NotFound(new { success = false, code = "FEE_CATEGORY_NOT_FOUND", message = "Fee Type not found." });

        // Preserve existing fee codes during editing
        var code = existing.Code;
        var name = request.Name!.Trim();
        var description = Clean(request.Description);
        var actor = CollegeDataScope.Actor(HttpContext);

        // Prevent duplicate name with another fee type
        var duplicateName = await connection.ExecuteScalarAsync<bool>("""
            SELECT EXISTS(
                SELECT 1 FROM fee_categories
                WHERE LOWER(TRIM(category_name)) = LOWER(@Name)
                  AND fee_category_id <> @Id
            );
            """, new { Name = name, Id = id });
        if (duplicateName)
            return Conflict(new { success = false, code = "DUPLICATE_FEE_CATEGORY_NAME", message = "A different Fee Type already uses this name." });

        try
        {
            await connection.ExecuteAsync("""
                UPDATE fee_categories
                SET category_name = @Name,
                    description = @Description,
                    updated_by = @Actor
                WHERE fee_category_id = @Id;
                """, new { Id = id, Name = name, Description = description, Actor = actor });

            var resultData = new
            {
                id,
                feeCategoryId = id,
                code,
                categoryCode = code,
                name,
                categoryName = name,
                description,
                status = existing.Status
            };

            return Ok(new
            {
                success = true,
                message = "Fee Type updated successfully.",
                id,
                feeCategoryId = id,
                data = resultData
            });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict(new { success = false, code = "DUPLICATE_FEE_CATEGORY_CODE", message = "A Fee Type with this code already exists." });
        }
    }

    /// <summary>Quick status update (activate/deactivate) for a fee category.</summary>
    [HttpPatch("fee-categories/{id:long}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleFeeCategoryStatus(long id, [FromBody] FeeCategoryStatusRequest? request)
    {
        if (!IsFeeCatalogAdministrator())
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                code = "FEE_CATEGORY_ADMIN_REQUIRED",
                message = "Super Admin or College Admin access is required to change Fee Type status."
            });

        if (id <= 0)
            return BadRequest(new { success = false, code = "INVALID_FEE_CATEGORY_ID", message = "A valid Fee Type ID is required." });

        if (request is null || (request.Status != 0 && request.Status != 1))
            return BadRequest(new { success = false, code = "INVALID_STATUS", message = "Status must be 1 (Active) or 0 (Inactive)." });

        await using var connection = await OpenConnectionAsync();
        if (!await RequiredTableExistsAsync(connection, "fee_categories"))
            return FeeTablesNotInstalled();

        var exists = await connection.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM fee_categories WHERE fee_category_id = @Id);", new { Id = id });
        if (!exists)
            return NotFound(new { success = false, code = "FEE_CATEGORY_NOT_FOUND", message = "Fee Type not found." });

        var actor = CollegeDataScope.Actor(HttpContext);
        await connection.ExecuteAsync("""
            UPDATE fee_categories
            SET status = @Status,
                updated_by = @Actor
            WHERE fee_category_id = @Id;
            """, new { Id = id, Status = request.Status, Actor = actor });

        var hasCategoryCol = await RequiredColumnExistsAsync(connection, "fee_categories", "fee_category");
        var saved = await connection.QuerySingleAsync<FeeCategoryDto>(hasCategoryCol ? """
            SELECT fee_category_id AS Id, category_code AS Code, category_name AS Name,
                   fee_category AS FeeCategory, description AS Description, status AS Status
            FROM fee_categories WHERE fee_category_id = @Id;
            """ : """
            SELECT fee_category_id AS Id, category_code AS Code, category_name AS Name,
                   'Academic' AS FeeCategory, description AS Description, status AS Status
            FROM fee_categories WHERE fee_category_id = @Id;
            """, new { Id = id });

        return Ok(new
        {
            success = true,
            message = $"Fee Type {(request.Status == 1 ? "activated" : "deactivated")} successfully.",
            data = saved
        });
    }

    /// <summary>Deletes a fee category if it is not referenced by any fee structure or plan.</summary>
    [HttpDelete("fee-categories/{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteFeeCategory(long id)
    {
        if (!IsFeeCatalogAdministrator())
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                code = "FEE_CATEGORY_ADMIN_REQUIRED",
                message = "Super Admin or College Admin access is required to delete Fee Types."
            });

        if (id <= 0)
            return BadRequest(new { success = false, code = "INVALID_FEE_CATEGORY_ID", message = "A valid Fee Type ID is required." });

        await using var connection = await OpenConnectionAsync();
        if (!await RequiredTableExistsAsync(connection, "fee_categories"))
            return FeeTablesNotInstalled();

        var existing = await connection.QuerySingleOrDefaultAsync<FeeCategoryDto>("""
            SELECT fee_category_id AS Id, category_code AS Code, category_name AS Name
            FROM fee_categories WHERE fee_category_id = @Id;
            """, new { Id = id });

        if (existing is null)
            return NotFound(new { success = false, code = "FEE_CATEGORY_NOT_FOUND", message = "Fee Type not found." });

        // Check if referenced in fee_structures
        if (await RequiredTableExistsAsync(connection, "fee_structures"))
        {
            var isReferencedInStructures = await connection.ExecuteScalarAsync<bool>("""
                SELECT EXISTS(SELECT 1 FROM fee_structures WHERE fee_category_id = @Id);
                """, new { Id = id });
            if (isReferencedInStructures)
                return Conflict(new
                {
                    success = false,
                    code = "FEE_CATEGORY_IN_USE",
                    message = $"Cannot delete \"{existing.Name}\" because it is used in one or more fee structures. You can edit its details instead."
                });
        }

        // Check if referenced in academic_fee_plans
        if (await RequiredTableExistsAsync(connection, "academic_fee_plans"))
        {
            var isReferencedInPlans = await connection.ExecuteScalarAsync<bool>("""
                SELECT EXISTS(SELECT 1 FROM academic_fee_plans WHERE fee_category_id = @Id);
                """, new { Id = id });
            if (isReferencedInPlans)
                return Conflict(new
                {
                    success = false,
                    code = "FEE_CATEGORY_IN_USE",
                    message = $"Cannot delete \"{existing.Name}\" because it is used in academic fee plans."
                });
        }

        await connection.ExecuteAsync("DELETE FROM fee_categories WHERE fee_category_id = @Id;", new { Id = id });

        _logger.LogInformation("Fee category deleted. FeeCategoryId={FeeCategoryId}, ActorId={ActorId}", id, CollegeDataScope.Actor(HttpContext));

        return Ok(new
        {
            success = true,
            message = $"Fee Type \"{existing.Name}\" deleted successfully."
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
            WHERE (@collegeScope IS NULL OR fs.college_id=@collegeScope)
              AND (@feeCategoryId IS NULL OR fs.fee_category_id = @feeCategoryId)
              AND (@academicYearId IS NULL OR fs.academic_year_id = @academicYearId)
              AND (@courseId IS NULL OR fs.course_id = @courseId)
              AND (@branchId IS NULL OR fs.branch_id = @branchId)
              AND (@semesterId IS NULL OR fs.semester_id = @semesterId)
              AND (@search IS NULL OR @search = ''
                   OR fs.structure_code LIKE CONCAT('%', @search, '%')
                   OR fs.structure_name LIKE CONCAT('%', @search, '%')
                   OR fs.structure_group_code LIKE CONCAT('%', @search, '%'))
              AND fs.status = 1
              AND NOT EXISTS(SELECT 1 FROM academic_fee_plans ap WHERE ap.fee_structure_id=fs.fee_structure_id)
            ORDER BY fs.fee_structure_id DESC;
            """;

        var data = (await connection.QueryAsync<FeeStructureDto>(sql, new
        {
            collegeScope=CollegeDataScope.Resolve(HttpContext),
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

        if (!request.DueDate.HasValue || request.DueDate.Value.Year < 1000)
            return BadRequest(new { success = false, message = "dueDate is required to create the student's fee installment." });

        await using var connection = await OpenConnectionAsync();

        if (!await RequiredTablesExistAsync(connection, "students", "fee_structures", "fee_assignments", "student_fees", "backend_contract_audit"))
            return FeeTablesNotInstalled();

        await BTech.Services.Fees.FeePlanLegacyGuard.EnsureLegacyStructureAsync(connection, request.FeeStructureId);
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

            var actor=CollegeDataScope.Actor(HttpContext);
            await connection.ExecuteAsync("UPDATE fee_assignments SET created_by=@actor,updated_by=@actor WHERE fee_assignment_id=@assignmentId",new{actor,assignmentId},transaction);
            var dueDate=request.DueDate.Value.Date;
            var studentFeeId=await connection.ExecuteScalarAsync<long>("""
                INSERT INTO student_fees(fee_code,fee_assignment_id,installment_number,amount,due_date,status,remarks,created_by)
                VALUES(@code,@assignmentId,1,@assignedAmount,@dueDate,'ACTIVE',@Remarks,@actor);
                SELECT LAST_INSERT_ID();
                """,new{code=$"SF-{assignmentId}-1",assignmentId,assignedAmount,dueDate,request.Remarks,actor},transaction);
            await connection.ExecuteAsync("""
                INSERT INTO backend_contract_audit(college_id,resource,record_id,action,actor_id,correlation_id)
                VALUES(@college,'fee-assignment',@assignmentId,'ASSIGNED',@actor,@trace)
                """,new{college=student.CollegeId,assignmentId,actor,trace=HttpContext.TraceIdentifier},transaction);

            await transaction.CommitAsync();

            return StatusCode(StatusCodes.Status201Created, new
            {
                success = true,
                message = "Fee structure assigned to student successfully.",
                data = new
                {
                    assignmentId,
                    studentFeeId,
                    assignmentCode,
                    studentId,
                    feeStructureId = request.FeeStructureId,
                    assignedAmount,
                    assignedOn,
                    dueDate,
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

    private static async Task<bool> RequiredColumnExistsAsync(MySqlConnection connection, string tableName, string columnName)
    {
        const string sql = """
            SELECT EXISTS(
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = @tableName AND column_name = @columnName
            );
            """;
        return await connection.ExecuteScalarAsync<bool>(sql, new { tableName, columnName });
    }

    private static readonly Dictionary<string, string> StandardFeeCodeMap = new(StringComparer.OrdinalIgnoreCase)
    {
        { "Tuition Fee", "TF" },
        { "Admission Fee", "ADM" },
        { "Examination Fee", "EXAM" },
        { "Library Fee", "LIB" },
        { "Laboratory Fee", "LAB" },
        { "Hostel Fee", "HOSTEL" },
        { "Transport Fee", "TRF" },
        { "Mess Fee", "MESS" },
        { "Caution Deposit", "CD" },
        { "ID Card Fee", "IDC" },
        { "Placement Fee", "PLACE" },
        { "Sports Fee", "SPORTS" },
        { "Registration Fee", "REG" },
        { "Development Fee", "DEV" }
    };

    private static string GenerateFeeTypeCode(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "FEE_TYPE";
        var trimmed = name.Trim();
        if (StandardFeeCodeMap.TryGetValue(trimmed, out var standardCode))
            return standardCode;

        var cleaned = System.Text.RegularExpressions.Regex.Replace(trimmed.ToUpperInvariant(), @"[^A-Z0-9]+", "_").Trim('_');
        if (string.IsNullOrEmpty(cleaned)) cleaned = "FEE_TYPE";
        if (cleaned.Length > 40) cleaned = cleaned[..40].TrimEnd('_');
        return cleaned;
    }

    private static string? ValidateFeeCategoryRequest(FeeCategoryWriteRequest? request, bool isCreating = true)
    {
        if (request is null) return "A Fee Type object is required.";
        if (string.IsNullOrWhiteSpace(request.Name)) return "Fee Type Name is required.";
        if (request.Name.Trim().Length > 150) return "Fee Type Name cannot exceed 150 characters.";
        if (!string.IsNullOrWhiteSpace(request.Code) && request.Code.Trim().Length > 50)
            return "Fee Type Code cannot exceed 50 characters.";
        if (request.Description?.Trim().Length > 500) return "Description cannot exceed 500 characters.";
        return null;
    }

    public sealed class FeeCategoryWriteRequest
    {
        public string? Code { get; init; }
        public string? Name { get; init; }
        public string? FeeCategory { get; init; }
        public string? Description { get; init; }
        public int? Status { get; init; }
    }

    public sealed class FeeCategoryStatusRequest
    {
        public int Status { get; init; }
    }

    private sealed class FeeCategoryCreateResult
    {
        public long Id { get; init; }
        public string Code { get; init; } = string.Empty;
        public string Name { get; init; } = string.Empty;
        public string FeeCategory { get; init; } = "Academic";
        public string? Description { get; init; }
        public int Status { get; init; }
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
