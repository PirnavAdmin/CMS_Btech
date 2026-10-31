using System.Data.Common;
using System.Text.Json;
using BTech.DTOs.Fees;
using Dapper;

namespace BTech.Repositories.Implementations;

public static class AcademicFeePlanStore
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public const string Select = """
        SELECT fee_structure_id AS FeeStructureId, college_id AS CollegeId, plan_code AS Code, plan_name AS Name,
          academic_year_id AS AcademicYearId, course_id AS CourseId, branch_id AS BranchId, semester_id AS SemesterId,
          fee_category_id AS FeeCategoryId, batch AS Batch, quota AS Quota, student_category AS StudentCategory,
          cycle AS Cycle, payment_mode AS PaymentMode, currency_code AS CurrencyCode, total_amount AS TotalAmount,
          effective_from AS EffectiveFrom, effective_to AS EffectiveTo, due_date AS DueDate,
          version AS Version, revision AS Revision, status AS Status, previous_fee_structure_id AS PreviousFeeStructureId,
          components_json AS ComponentsJson, installments_json AS InstallmentsJson,
          created_by AS CreatedBy, created_at AS CreatedAt, updated_by AS UpdatedBy, updated_at AS UpdatedAt
        FROM academic_fee_plans
        """;
    public static AcademicFeePlanDto Hydrate(AcademicFeePlanDto p)
    {
        p.Components = JsonSerializer.Deserialize<List<AcademicFeeComponent>>(p.ComponentsJson, Json)!;
        p.Installments = JsonSerializer.Deserialize<List<AcademicFeeInstallment>>(p.InstallmentsJson, Json)!;
        return p;
    }
    public static async Task<AcademicFeePlanDto?> GetAsync(DbConnection c, long id, long collegeId,
        DbTransaction? tx = null, bool forUpdate = false)
    {
        var p = await c.QuerySingleOrDefaultAsync<AcademicFeePlanDto>(Select +
            " WHERE fee_structure_id=@id AND college_id=@collegeId" + (forUpdate ? " FOR UPDATE" : ""), new { id, collegeId }, tx);
        return p == null ? null : Hydrate(p);
    }
    public static async Task AuditAsync(DbConnection c, DbTransaction tx, AcademicFeePlanDto p, string action, long actor, string? reason)
    {
        await c.ExecuteAsync("""
            INSERT INTO academic_fee_plan_audit(fee_structure_id,college_id,revision,action,actor_id,reason,snapshot_json)
            VALUES(@FeeStructureId,@CollegeId,@Revision,@action,@actor,@reason,@snapshot)
            """, new { p.FeeStructureId, p.CollegeId, p.Revision, action, actor, reason,
                snapshot = JsonSerializer.Serialize(p, Json) }, tx);
    }
}
