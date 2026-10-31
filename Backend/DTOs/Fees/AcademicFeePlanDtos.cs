using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BTech.DTOs.Fees;

public class AcademicFeePlanRequest
{
    public long CollegeId { get; set; }
    [Required, StringLength(80)] public string Code { get; set; } = "";
    [Required, StringLength(150)] public string Name { get; set; } = "";
    public long AcademicYearId { get; set; }
    public long CourseId { get; set; }
    public long BranchId { get; set; }
    public long SemesterId { get; set; }
    public long FeeCategoryId { get; set; }
    [Required, StringLength(50)] public string Batch { get; set; } = "";
    [StringLength(100)] public string? Quota { get; set; }
    [StringLength(100)] public string? StudentCategory { get; set; }
    public string Cycle { get; set; } = "SEMESTER";
    public string PaymentMode { get; set; } = "FULL_PAYMENT";
    public string CurrencyCode { get; set; } = "INR";
    public DateTime EffectiveFrom { get; set; }
    public DateTime EffectiveTo { get; set; }
    public DateTime? DueDate { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal TotalAmount { get; set; }
    public List<AcademicFeeComponent> Components { get; set; } = new();
    public List<AcademicFeeInstallment> Installments { get; set; } = new();
    // New versions receive a new fee_structure_id. Never accept a client-generated id.
    public long? PreviousFeeStructureId { get; set; }
    public int? ExpectedRevision { get; set; }
}

public sealed class AcademicFeeComponent
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal Amount { get; set; }
}

public sealed class AcademicFeeInstallment
{
    public int Number { get; set; }
    public DateTime DueDate { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public decimal Amount { get; set; }
}

public sealed class AcademicFeePlanDto : AcademicFeePlanRequest
{
    public long FeeStructureId { get; set; }
    public int Version { get; set; }
    public int Revision { get; set; }
    public string Status { get; set; } = "DRAFT";
    public long CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    [JsonIgnore] public string ComponentsJson { get; set; } = "[]";
    [JsonIgnore] public string InstallmentsJson { get; set; } = "[]";
}

public sealed class FeePlanTransitionRequest
{
    public int ExpectedRevision { get; set; }
    [StringLength(500)] public string? Reason { get; set; }
}

public class AdmissionFeePlanQuery
{
    public long CollegeId { get; set; }
    public long AcademicYearId { get; set; }
    public long CourseId { get; set; }
    public long BranchId { get; set; }
    public long SemesterId { get; set; }
    public string Batch { get; set; } = "";
    public string? Quota { get; set; }
    public string? StudentCategory { get; set; }
}

public sealed class AdmissionFeePlanSnapshot
{
    public long AdmissionId { get; set; }
    public long FeeStructureId { get; set; }
    public int Version { get; set; }
    public DateTime AssignedAt { get; set; }
    public long AssignedBy { get; set; }
    public AcademicFeePlanDto Plan { get; set; } = new();
}
