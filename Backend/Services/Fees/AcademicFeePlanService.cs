using System.Text.Json;
using BTech.DTOs.Fees;
using BTech.Repositories.Implementations;
using Dapper;
using MySqlConnector;

namespace BTech.Services.Fees;

public sealed class AcademicFeePlanService(IConfiguration config, FeePlanAccess access, ILogger<AcademicFeePlanService> logger)
{
    private readonly string _connectionString = config.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection is missing.");
    private async Task<MySqlConnection> OpenAsync()
    {
        var c = new MySqlConnection(_connectionString);
        try { await c.OpenAsync(); return c; } catch { await c.DisposeAsync(); throw; }
    }

    public async Task<IReadOnlyList<AcademicFeePlanDto>> ListAsync(long collegeId, string? status, int page, int pageSize)
    {
        FeePlanRules.Require(page is >= 1 and <= 1000000 && pageSize is >= 1 and <= 100, "page must be 1..1000000; pageSize must be 1..100.");
        status = FeePlanRules.Clean(status)?.ToUpperInvariant();
        FeePlanRules.Require(status == null || FeePlanRules.States.Contains(status), "Invalid fee plan status.");
        await using var c = await OpenAsync();
        await access.AuthorizeAsync(c, collegeId, "fees", "view");
        var rows = await c.QueryAsync<AcademicFeePlanDto>(AcademicFeePlanStore.Select +
            " WHERE college_id=@collegeId AND (@status IS NULL OR status=@status) ORDER BY fee_structure_id DESC LIMIT @pageSize OFFSET @offset",
            new { collegeId, status, pageSize, offset = (page - 1) * pageSize });
        return rows.Select(AcademicFeePlanStore.Hydrate).ToArray();
    }
    public async Task<AcademicFeePlanDto> GetAsync(long id, long collegeId)
    {
        await using var c = await OpenAsync();
        await access.AuthorizeAsync(c, collegeId, "fees", "view");
        return await AcademicFeePlanStore.GetAsync(c, id, collegeId) ?? throw new FeePlanException(404, "Fee plan not found in this college.");
    }
    public async Task<object> HistoryAsync(long id, long collegeId)
    {
        await using var c = await OpenAsync();
        await access.AuthorizeAsync(c, collegeId, "fees", "view");
        FeePlanRules.Require(await AcademicFeePlanStore.GetAsync(c, id, collegeId) != null, "Fee plan not found in this college.", 404);
        var events = await c.QueryAsync("""
            SELECT audit_id AS auditId,revision,action,actor_id AS actorId,reason,created_at AS createdAt,snapshot_json AS snapshotJson
            FROM academic_fee_plan_audit WHERE fee_structure_id=@id AND college_id=@collegeId ORDER BY audit_id
            """, new { id, collegeId });
        return events;
    }

    public async Task<AcademicFeePlanDto> SaveAsync(AcademicFeePlanRequest p, long? id = null)
    {
        FeePlanRules.Validate(p);
        await using var c = await OpenAsync();
        var actor = await access.AuthorizeAsync(c, p.CollegeId, "fees", id.HasValue ? "edit" : "create");
        await using var tx = await c.BeginTransactionAsync();
        // Keep one lock order for plan edits, version creation and publication.
        await c.ExecuteScalarAsync<long>("SELECT college_id FROM colleges WHERE college_id=@CollegeId FOR UPDATE", new { p.CollegeId }, tx);
        await ValidateAcademicScopeAsync(c, tx, FeePlanRules.Scope(p), p.FeeCategoryId);
        var version = 1;
        var revision = 1;
        if (id.HasValue)
        {
            var old = await AcademicFeePlanStore.GetAsync(c, id.Value, p.CollegeId, tx, true)
                ?? throw new FeePlanException(404, "Fee plan not found in this college.");
            FeePlanRules.Require(old.Status == "DRAFT", "Only a DRAFT plan can be edited. Create a new version for a published plan.", 409);
            FeePlanRules.Require(p.ExpectedRevision == old.Revision, "Fee plan changed. Reload it and retry with its current revision.", 409);
            FeePlanRules.Require(FeePlanRules.Same(old.Code, p.Code) && old.PreviousFeeStructureId == p.PreviousFeeStructureId,
                "Plan code and version lineage cannot be changed.");
            version = old.Version; revision = old.Revision + 1;
        }
        else
        {
            if (p.PreviousFeeStructureId.HasValue)
            {
                var previous = await AcademicFeePlanStore.GetAsync(c, p.PreviousFeeStructureId.Value, p.CollegeId, tx, true)
                    ?? throw new FeePlanException(404, "Previous fee plan not found in this college.");
                FeePlanRules.Require(previous.Status is "PUBLISHED" or "ARCHIVED", "New versions must reference a published or archived plan.", 409);
                FeePlanRules.Require(FeePlanRules.Same(previous.Code, p.Code), "New versions must retain the plan code.");
                version = previous.Version + 1;
            }
            id = await c.ExecuteScalarAsync<long>("""
                INSERT INTO fee_structures(structure_code,structure_group_code,structure_name,college_id,academic_year_id,
                  course_id,branch_id,semester_id,fee_category_id,amount,currency_code,effective_from,effective_to,status,created_by)
                VALUES(@internalCode,@groupCode,@Name,@CollegeId,@AcademicYearId,@CourseId,@BranchId,@SemesterId,
                  @FeeCategoryId,@TotalAmount,@CurrencyCode,@EffectiveFrom,@EffectiveTo,0,@actor);
                SELECT LAST_INSERT_ID();
                """, Parameters(p, actor, version, revision, null), tx);
            await c.ExecuteAsync("""
                INSERT INTO academic_fee_plans(fee_structure_id,college_id,plan_code,plan_name,academic_year_id,course_id,
                  branch_id,semester_id,fee_category_id,batch,quota,student_category,cycle,payment_mode,currency_code,total_amount,
                  effective_from,effective_to,due_date,components_json,installments_json,version,revision,status,previous_fee_structure_id,created_by)
                VALUES(@id,@CollegeId,@Code,@Name,@AcademicYearId,@CourseId,@BranchId,@SemesterId,@FeeCategoryId,@Batch,
                  @Quota,@StudentCategory,@Cycle,@PaymentMode,@CurrencyCode,@TotalAmount,@EffectiveFrom,@EffectiveTo,@DueDate,
                  @components,@installments,@version,@revision,'DRAFT',@PreviousFeeStructureId,@actor)
                """, Parameters(p, actor, version, revision, id), tx);
        }
        if (revision > 1)
        {
            await c.ExecuteAsync("""
                UPDATE academic_fee_plans SET plan_name=@Name,academic_year_id=@AcademicYearId,course_id=@CourseId,
                  branch_id=@BranchId,semester_id=@SemesterId,fee_category_id=@FeeCategoryId,batch=@Batch,quota=@Quota,
                  student_category=@StudentCategory,cycle=@Cycle,payment_mode=@PaymentMode,currency_code=@CurrencyCode,
                  total_amount=@TotalAmount,effective_from=@EffectiveFrom,effective_to=@EffectiveTo,due_date=@DueDate,
                  components_json=@components,installments_json=@installments,revision=@revision,updated_by=@actor,updated_at=UTC_TIMESTAMP()
                WHERE fee_structure_id=@id AND college_id=@CollegeId;
                UPDATE fee_structures SET structure_name=@Name,academic_year_id=@AcademicYearId,course_id=@CourseId,branch_id=@BranchId,
                  semester_id=@SemesterId,fee_category_id=@FeeCategoryId,amount=@TotalAmount,currency_code=@CurrencyCode,
                  effective_from=@EffectiveFrom,effective_to=@EffectiveTo,updated_by=@actor WHERE fee_structure_id=@id AND college_id=@CollegeId;
                """, Parameters(p, actor, version, revision, id), tx);
        }
        var saved = (await AcademicFeePlanStore.GetAsync(c, id!.Value, p.CollegeId, tx))!;
        await AcademicFeePlanStore.AuditAsync(c, tx, saved, revision == 1 ? "CREATE_DRAFT" : "UPDATE_DRAFT", actor, null);
        await tx.CommitAsync();
        logger.LogInformation("Academic fee plan saved. FeeStructureId={Id}, CollegeId={College}, Revision={Revision}, Actor={Actor}", id, p.CollegeId, revision, actor);
        return saved;
    }

    private static DynamicParameters Parameters(AcademicFeePlanRequest p, long actor, int version, int revision, long? id)
    {
        var args = new DynamicParameters(new { p.CollegeId, p.Code, p.Name, p.AcademicYearId, p.CourseId,
            p.BranchId, p.SemesterId, p.FeeCategoryId, p.Batch, p.Quota, p.StudentCategory, p.Cycle,
            p.PaymentMode, p.CurrencyCode, p.TotalAmount, p.EffectiveFrom, p.EffectiveTo, p.DueDate, p.PreviousFeeStructureId });
        args.Add("id", id); args.Add("actor", actor); args.Add("version", version); args.Add("revision", revision);
        args.Add("internalCode", "AFP-" + Guid.NewGuid().ToString("N"));
        args.Add("groupCode", "AFP-COLLEGE-" + p.CollegeId);
        args.Add("components", JsonSerializer.Serialize(p.Components, AcademicFeePlanStore.Json));
        args.Add("installments", JsonSerializer.Serialize(p.Installments, AcademicFeePlanStore.Json));
        return args;
    }

    public async Task<AcademicFeePlanDto> TransitionAsync(long id, long collegeId, string target, FeePlanTransitionRequest request)
    {
        await using var c = await OpenAsync();
        var actor = await access.AuthorizeAsync(c, collegeId, "fees", "edit", target is "APPROVED" or "PUBLISHED" or "ARCHIVED" or "DRAFT");
        await using var tx = await c.BeginTransactionAsync();
        await c.ExecuteScalarAsync<long>("SELECT college_id FROM colleges WHERE college_id=@collegeId FOR UPDATE", new { collegeId }, tx);
        var p = await AcademicFeePlanStore.GetAsync(c, id, collegeId, tx, true)
            ?? throw new FeePlanException(404, "Fee plan not found in this college.");
        FeePlanRules.Require(p.Revision == request.ExpectedRevision, "Fee plan changed. Reload it and retry with its current revision.", 409);
        FeePlanRules.Transition(p.Status, target);
        FeePlanRules.Require(target != "DRAFT" || FeePlanRules.Clean(request.Reason) != null, "A reason is required when returning a plan to draft.");
        FeePlanRules.Require(request.Reason?.Length is not > 500, "reason must be at most 500 characters.");
        if (target is "SUBMITTED" or "APPROVED" or "PUBLISHED")
        {
            FeePlanRules.Validate(p);
            await ValidateAcademicScopeAsync(c, tx, FeePlanRules.Scope(p), p.FeeCategoryId);
        }
        if (target == "PUBLISHED")
        {
            FeePlanRules.Require(p.EffectiveTo.Date >= DateTime.UtcNow.Date, "An expired plan cannot be published.", 409);
            var conflict = await c.ExecuteScalarAsync<long?>("""
                SELECT fee_structure_id FROM academic_fee_plans WHERE college_id=@collegeId AND plan_code=@Code
                  AND fee_structure_id<>@id AND status='PUBLISHED' AND effective_from<=@EffectiveTo AND effective_to>=@EffectiveFrom LIMIT 1 FOR UPDATE
                """, new { collegeId, p.Code, id, p.EffectiveFrom, p.EffectiveTo }, tx);
            FeePlanRules.Require(!conflict.HasValue, $"Published version {conflict} overlaps this plan. Archive that version before publishing.", 409);
        }
        p.Status = target; p.Revision++; p.UpdatedBy = actor; p.UpdatedAt = DateTime.UtcNow;
        await c.ExecuteAsync("""
            UPDATE academic_fee_plans SET status=@Status,revision=@Revision,updated_by=@actor,updated_at=UTC_TIMESTAMP()
            WHERE fee_structure_id=@id AND college_id=@collegeId;
            UPDATE fee_structures SET status=@active,updated_by=@actor WHERE fee_structure_id=@id AND college_id=@collegeId;
            """, new { id, collegeId, p.Status, p.Revision, actor, active = target == "PUBLISHED" ? 1 : 0 }, tx);
        await AcademicFeePlanStore.AuditAsync(c, tx, p, target, actor, FeePlanRules.Clean(request.Reason));
        await tx.CommitAsync();
        logger.LogInformation("Academic fee plan transition. FeeStructureId={Id}, CollegeId={College}, Status={Status}, Actor={Actor}", id, collegeId, target, actor);
        return p;
    }

    public async Task<IReadOnlyList<AcademicFeePlanDto>> PickerAsync(AdmissionFeePlanQuery q)
    {
        FeePlanRules.ValidateScope(q);
        await using var c = await OpenAsync();
        await access.AuthorizeAsync(c, q.CollegeId, "student_admissions", "view");
        await using var tx = await c.BeginTransactionAsync();
        await ValidateAcademicScopeAsync(c, tx, q, null);
        var candidates = (await c.QueryAsync<AcademicFeePlanDto>(AcademicFeePlanStore.Select + """
             WHERE college_id=@CollegeId AND academic_year_id=@AcademicYearId AND course_id=@CourseId AND branch_id=@BranchId
               AND semester_id=@SemesterId AND status='PUBLISHED' AND effective_from<=UTC_DATE() AND effective_to>=UTC_DATE()
             ORDER BY fee_structure_id DESC
            """, q, tx)).Select(AcademicFeePlanStore.Hydrate);
        var result = candidates.Where(p => FeePlanRules.Available(p, q, DateTime.UtcNow)).ToArray();
        await tx.CommitAsync();
        return result;
    }

    public static async Task ValidateAcademicScopeAsync(MySqlConnection c, MySqlTransaction tx, AdmissionFeePlanQuery q, long? category)
    {
        var valid = await c.ExecuteScalarAsync<int>("""
            SELECT COUNT(*) FROM colleges col
            JOIN academicyears ay ON ay.college_id=col.college_id AND ay.academic_year_id=@AcademicYearId
            JOIN courses co ON co.college_id=col.college_id AND co.course_id=@CourseId
            JOIN branches b ON b.course_id=co.course_id AND b.branch_id=@BranchId
            JOIN semesters s ON s.course_id=co.course_id AND s.branch_id=b.branch_id AND s.semester_id=@SemesterId AND s.academic_year_id=ay.academic_year_id
            WHERE col.college_id=@CollegeId AND col.status=1 AND col.deleted_at IS NULL
              AND ay.status=1 AND ay.is_archived=0 AND ay.deleted_at IS NULL
              AND co.status=1 AND co.deleted_at IS NULL AND b.status=1 AND b.deleted_at IS NULL AND s.status=1 AND s.is_archived=0
            """, q, tx);
        FeePlanRules.Require(valid == 1, "Academic year, course, branch and semester must form an active academic scope in the selected college.");
        if (category.HasValue)
            FeePlanRules.Require(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM fee_categories WHERE fee_category_id=@category AND status=1", new { category }, tx) == 1,
                "Fee category does not exist or is inactive.");
    }
}
