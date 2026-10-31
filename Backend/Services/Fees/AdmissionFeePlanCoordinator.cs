using System.Data;
using System.Text.Json;
using System.Text.Json.Nodes;
using BTech.Data;
using BTech.DTOs.Fees;
using BTech.DTOs.StudentAdmission;
using BTech.Repositories.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using MySqlConnector;

namespace BTech.Services.Fees;

/// <summary>Shares the admission repositories' connection and transaction.</summary>
public sealed class AdmissionFeePlanCoordinator(ApplicationDbContext db, FeePlanAccess access)
{
    private MySqlConnection Connection => (MySqlConnection)db.Database.GetDbConnection();
    private MySqlTransaction? Transaction => (MySqlTransaction?)db.Database.CurrentTransaction?.GetDbTransaction();
    private async Task OpenAsync() { if (Connection.State != ConnectionState.Open) await Connection.OpenAsync(); }

    public async Task<string?> PrepareAsync(CreateStudentAdmissionDto dto, long? admissionId)
    {
        await OpenAsync();
        var existing = admissionId.HasValue ? await RowAsync(admissionId.Value, true) : null;
        if (admissionId.HasValue && existing == null) throw new FeePlanException(404, "Student admission not found.");
        if (existing != null)
        {
            dto.CollegeId ??= existing.CollegeId;
            dto.AcademicYearId ??= existing.AcademicYearId;
            dto.CourseId ??= existing.CourseId;
            dto.BranchId ??= existing.BranchId;
            dto.SemesterId ??= existing.SemesterId;
            dto.Batch = FeePlanRules.Clean(dto.Batch) ?? existing.Batch;
            dto.AdmissionQuota ??= existing.Quota;
            dto.StudentCategory ??= existing.StudentCategory;
            await access.AuthorizeAsync(Connection, existing.CollegeId, "student_admissions", "edit", transaction: Transaction);
        }
        FeePlanRules.Require(dto.CollegeId is > 0, "collegeId is required when saving an admission.");
        await access.AuthorizeAsync(Connection, dto.CollegeId!.Value, "student_admissions", admissionId.HasValue ? "edit" : "create", transaction: Transaction);
        // An update cannot move an admission between colleges, including for a Super Admin.
        FeePlanRules.Require(existing == null || existing.CollegeId == dto.CollegeId, "An existing admission cannot be moved to another college.", 403);
        dto.FeeStructureId = ReadSelectedId(dto);
        if (dto.FeeStructureId.HasValue)
        {
            var q = Scope(dto);
            FeePlanRules.ValidateScope(q);
            await AcademicFeePlanService.ValidateAcademicScopeAsync(Connection, Transaction!, q, null);
        }
        return existing?.AdmissionStatus;
    }

    public async Task<AdmissionFeePlanSnapshot?> AssignAsync(long admissionId, CreateStudentAdmissionDto dto, long actor, string? previousStatus)
    {
        var row = await RowAsync(admissionId, true) ?? throw new FeePlanException(404, "Student admission not found.");
        // Keep category distinct from social/caste Category, and normalize the academic college.
        await Connection.ExecuteAsync("UPDATE studentadmissions SET AcademicStudentCategory=@category WHERE AdmissionId=@admissionId",
            new { admissionId, category = FeePlanRules.Clean(dto.StudentCategory) }, Transaction);
        row.StudentCategory = FeePlanRules.Clean(dto.StudentCategory);
        var old = await ReadAsync(admissionId);
        var selected = dto.FeeStructureId ?? old?.FeeStructureId;
        if (!selected.HasValue) return null; // Preserve legacy admissions without a selected shared plan.
        AcademicFeePlanDto plan;
        if (old != null && old.FeeStructureId == selected)
        {
            // Repeated saves keep the original snapshot, even if the source is now archived.
            plan = old.Plan;
            FeePlanRules.Require(FeePlanRules.Matches(plan, row), "Academic scope no longer matches the assigned fee snapshot. Select a matching plan explicitly.", 409);
            await SetCanonicalFormAsync(admissionId, dto, old, actor);
            return old;
        }
        FeePlanRules.Require(previousStatus == null || previousStatus is "Draft" or "Registered",
            "A selected fee plan can only be replaced while the existing admission is Draft or Registered.", 409);
        FeePlanRules.Require(dto.FeePlanChangeReason?.Length is not > 500, "feePlanChangeReason must be at most 500 characters.");
        FeePlanRules.Require(old == null || FeePlanRules.Clean(dto.FeePlanChangeReason) != null,
            "feePlanChangeReason is required when replacing an assigned fee plan.");
        plan = await AcademicFeePlanStore.GetAsync(Connection, selected.Value, row.CollegeId, Transaction, true)
            ?? throw new FeePlanException(404, "Selected fee plan does not exist in the admission college.");
        FeePlanRules.Require(FeePlanRules.Available(plan, row, DateTime.UtcNow),
            "Selected fee plan must be published, currently effective, and match the admission's college, academic year, course, branch, semester, batch, quota and student category.");
        FeePlanRules.Require(!dto.FeePlanVersion.HasValue || dto.FeePlanVersion == plan.Version,
            "Selected plan version is stale. Reload the admission fee picker.", 409);
        var snapshot = new AdmissionFeePlanSnapshot { AdmissionId = admissionId, FeeStructureId = plan.FeeStructureId,
            Version = plan.Version, Plan = plan, AssignedBy = actor, AssignedAt = DateTime.UtcNow };
        var json = JsonSerializer.Serialize(snapshot, AcademicFeePlanStore.Json);
        await Connection.ExecuteAsync("""
            INSERT INTO admission_fee_plan_snapshots(admission_id,college_id,fee_structure_id,plan_version,snapshot_json,assigned_by)
            VALUES(@admissionId,@CollegeId,@FeeStructureId,@Version,@json,@actor)
            ON DUPLICATE KEY UPDATE fee_structure_id=VALUES(fee_structure_id),plan_version=VALUES(plan_version),
              snapshot_json=VALUES(snapshot_json),assigned_by=VALUES(assigned_by),assigned_at=UTC_TIMESTAMP();
            INSERT INTO admission_fee_plan_audit(admission_id,college_id,fee_structure_id,plan_version,snapshot_json,actor_id,reason)
            VALUES(@admissionId,@CollegeId,@FeeStructureId,@Version,@json,@actor,@reason);
            """, new { admissionId, row.CollegeId, plan.FeeStructureId, plan.Version, json, actor, reason = dto.FeePlanChangeReason }, Transaction);
        await SetCanonicalFormAsync(admissionId, dto, snapshot, actor);
        return snapshot;
    }

    private async Task SetCanonicalFormAsync(long admissionId, CreateStudentAdmissionDto dto, AdmissionFeePlanSnapshot snapshot, long actor)
    {
        var root = dto.FormData is { ValueKind: JsonValueKind.Object } form ? JsonNode.Parse(form.GetRawText())!.AsObject() : new JsonObject();
        var p = snapshot.Plan;
        // All shared academic fee values come from the server snapshot. Ignore client totals/components.
        root["fees"] = JsonSerializer.SerializeToNode(new { feeStructureId = p.FeeStructureId, structureId = p.FeeStructureId,
            version = p.Version, totalFee = p.TotalAmount, components = p.Components, installments = p.Installments,
            paymentPlan = p.PaymentMode, currencyCode = p.CurrencyCode, dueDate = p.DueDate }, AcademicFeePlanStore.Json);
        dto.FormData = JsonSerializer.SerializeToElement(root, AcademicFeePlanStore.Json);
        dto.AdmissionFeeAmount = p.Components.Where(x => x.Code.Equals("ADMISSION_FEE", StringComparison.OrdinalIgnoreCase)).Sum(x => x.Amount);
        await Connection.ExecuteAsync("""
            UPDATE studentadmissions SET AdmissionFeeAmount=@amount WHERE AdmissionId=@admissionId;
            INSERT INTO student_admission_form_data(admission_id,form_data,created_by,updated_by)
            VALUES(@admissionId,@form,@actor,@actor)
            ON DUPLICATE KEY UPDATE form_data=VALUES(form_data),updated_by=@actor,updated_at=UTC_TIMESTAMP()
            """, new { admissionId, amount = dto.AdmissionFeeAmount, form = dto.FormData.Value.GetRawText(), actor }, Transaction);
    }

    public async Task<AdmissionFeePlanSnapshot?> ReadAsync(long admissionId)
    {
        await OpenAsync();
        var json = await Connection.ExecuteScalarAsync<string>("SELECT snapshot_json FROM admission_fee_plan_snapshots WHERE admission_id=@admissionId",
            new { admissionId }, Transaction);
        return json == null ? null : JsonSerializer.Deserialize<AdmissionFeePlanSnapshot>(json, AcademicFeePlanStore.Json);
    }
    public async Task<AdmissionFeePlanSnapshot?> GetAuthorizedAsync(long admissionId)
    {
        await OpenAsync();
        var row = await RowAsync(admissionId) ?? throw new FeePlanException(404, "Student admission not found.");
        await access.AuthorizeAsync(Connection, row.CollegeId, "student_admissions", "view", transaction: Transaction);
        return await ReadAsync(admissionId);
    }
    public async Task ValidateExistingScopeAsync(long admissionId)
    {
        var snapshot = await ReadAsync(admissionId);
        if (snapshot == null) return;
        var row = await RowAsync(admissionId) ?? throw new FeePlanException(404, "Student admission not found.");
        FeePlanRules.Require(FeePlanRules.Matches(snapshot.Plan, row), "Academic changes conflict with the assigned fee snapshot. Update the draft admission with an explicit matching fee plan.", 409);
    }
    public async Task AuthorizeExistingAsync(long admissionId, string action)
    {
        await OpenAsync();
        var row = await RowAsync(admissionId, Transaction != null) ?? throw new FeePlanException(404, "Student admission not found.");
        await access.AuthorizeAsync(Connection, row.CollegeId, "student_admissions", action, transaction: Transaction);
    }
    private Task<AdmissionRow?> RowAsync(long admissionId, bool locked = false) => Connection.QuerySingleOrDefaultAsync<AdmissionRow>("""
        SELECT AcademicCollegeId AS CollegeId,AcademicYearId AS AcademicYearId,AcademicCourseId AS CourseId,
          AcademicBranchId AS BranchId,AcademicSemesterId AS SemesterId,Batch,AdmissionQuota AS Quota,
          AcademicStudentCategory AS StudentCategory,AdmissionStatus
        FROM studentadmissions WHERE AdmissionId=@admissionId AND IsDeleted=0
        """ + (locked ? " FOR UPDATE" : ""), new { admissionId }, Transaction);
    private sealed class AdmissionRow : AdmissionFeePlanQuery { public string AdmissionStatus { get; set; } = ""; }
    private static AdmissionFeePlanQuery Scope(CreateStudentAdmissionDto dto) => new()
    { CollegeId = dto.CollegeId ?? 0, AcademicYearId = dto.AcademicYearId ?? 0, CourseId = dto.CourseId ?? 0,
      BranchId = dto.BranchId ?? 0, SemesterId = dto.SemesterId ?? 0, Batch = dto.Batch ?? "", Quota = dto.AdmissionQuota,
      StudentCategory = dto.StudentCategory };

    public static long? ReadSelectedId(CreateStudentAdmissionDto dto)
    {
        var selected = dto.FeeStructureId;
        FeePlanRules.Require(!selected.HasValue || selected > 0, "feeStructureId must be a positive server-generated integer.");
        var roots = new List<JsonElement>();
        if (dto.FormData.HasValue) roots.Add(dto.FormData.Value);
        if (dto.ScreenFields?.TryGetValue("fees", out var fees) == true)
            roots.Add(JsonSerializer.SerializeToElement(new { fees }));
        foreach (var root in roots)
        {
            if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty("fees", out var f) || f.ValueKind != JsonValueKind.Object) continue;
            foreach (var key in new[] { "feeStructureId", "structureId" })
            {
                if (!f.TryGetProperty(key, out var value) || value.ValueKind == JsonValueKind.Null || string.IsNullOrWhiteSpace(value.ToString())) continue;
                FeePlanRules.Require(long.TryParse(value.ToString(), out var id) && id > 0,
                    "Browser-local fee plan IDs are not backend IDs. Select a published plan from /api/v1/student-admissions/fee-plans.");
                FeePlanRules.Require(!selected.HasValue || selected == id, "Conflicting feeStructureId values in the admission payload.");
                selected = id;
            }
        }
        return selected;
    }
}
