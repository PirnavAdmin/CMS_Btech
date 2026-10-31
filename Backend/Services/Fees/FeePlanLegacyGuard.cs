using System.Data;
using System.Data.Common;
using Dapper;

namespace BTech.Services.Fees;

public static class FeePlanLegacyGuard
{
    public static async Task EnsureLegacyStructureAsync(DbConnection c, long id)
    {
        if (c.State != ConnectionState.Open) await c.OpenAsync();
        var managed = await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM academic_fee_plans WHERE fee_structure_id=@id", new { id });
        FeePlanRules.Require(managed == 0, "This is a managed academic fee plan. Use /api/v1/academic-fee-plans and the admission fee-plan picker.", 409);
    }
    public static async Task EnsureNoSnapshotAsync(DbConnection c, long admissionId)
    {
        if (c.State != ConnectionState.Open) await c.OpenAsync();
        var assigned = await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admission_fee_plan_snapshots WHERE admission_id=@admissionId", new { admissionId });
        FeePlanRules.Require(assigned == 0, "This admission has an immutable academic fee snapshot. Manual fee edits/resolution cannot overwrite it.", 409);
    }
}
