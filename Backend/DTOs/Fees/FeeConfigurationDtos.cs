namespace BTech.DTOs.Fees;

public sealed class FeeCategoryDto
{
    [System.Text.Json.Serialization.JsonPropertyName("id")]
    public long Id { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("feeCategoryId")]
    public long FeeCategoryId => Id;

    [System.Text.Json.Serialization.JsonPropertyName("code")]
    public string Code { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("categoryCode")]
    public string CategoryCode => Code;

    [System.Text.Json.Serialization.JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [System.Text.Json.Serialization.JsonPropertyName("categoryName")]
    public string CategoryName => Name;

    [System.Text.Json.Serialization.JsonPropertyName("feeCategory")]
    public string? FeeCategory { get; init; } = "Academic";

    [System.Text.Json.Serialization.JsonPropertyName("description")]
    public string? Description { get; init; }

    [System.Text.Json.Serialization.JsonPropertyName("status")]
    public int Status { get; init; } = 1;
}

public sealed class FeeStructureDto
{
    public long Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string GroupCode { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public long CollegeId { get; init; }
    public long FeeCategoryId { get; init; }
    public long AcademicYearId { get; init; }
    public long? CourseId { get; init; }
    public long? BranchId { get; init; }
    public long? SemesterId { get; init; }
    public decimal Amount { get; init; }
    public DateTime EffectiveFrom { get; init; }
    public DateTime EffectiveTo { get; init; }
    public int Status { get; init; }
}

public sealed class CreateFeeStructureRequest
{
    public long FeeCategoryId { get; init; }
    public string FeeStructureCode { get; init; } = string.Empty;
    public string FeeStructureName { get; init; } = string.Empty;
    public string? StructureGroupCode { get; init; }
    public long AcademicYearId { get; init; }
    public long CourseId { get; init; }
    public long BranchId { get; init; }
    public long SemesterId { get; init; }
    public decimal Amount { get; init; }

    // These are optional because the database requires the effective period,
    // while the original Task-21 Swagger contract only exposed dueDate.
    public DateTime? EffectiveFrom { get; init; }
    public DateTime? EffectiveTo { get; init; }
    public DateTime? DueDate { get; init; }
}

public sealed class AssignFeeStructureRequest
{
    public long FeeStructureId { get; init; }
    public decimal? AssignedAmount { get; init; }
    public DateTime? AssignedOn { get; init; }

    // Accepted for compatibility with the original Task-21 request shape.
    // dueDate belongs to student_fees in the supplied DB schema, not fee_assignments.
    public DateTime? DueDate { get; init; }
    public string? Remarks { get; init; }
}
