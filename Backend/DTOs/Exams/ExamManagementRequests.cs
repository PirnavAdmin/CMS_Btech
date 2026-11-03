using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BTech.DTOs.Exams;

public sealed class ExamTypeSearchRequest
{
    [Range(1, long.MaxValue)] public long? CollegeId { get; set; }
    [StringLength(150)] public string? Search { get; set; }
    public bool? Status { get; set; }
}

public sealed class ExamTypeWriteRequest
{
    [Range(1, long.MaxValue)] public long CollegeId { get; set; }
    [Required, StringLength(50)] public string Code { get; set; } = string.Empty;
    [Required, StringLength(120)] public string Name { get; set; } = string.Empty;
    [StringLength(500)] public string? Description { get; set; }
    [Range(1, 1440)] public int? DefaultDurationMinutes { get; set; }
    public bool? Status { get; set; }

    [JsonIgnore] public string NormalizedCode => Code.Trim().ToUpperInvariant().Replace(' ', '_');
    [JsonIgnore] public string NormalizedName => Name.Trim();
    [JsonIgnore] public string? NormalizedDescription => string.IsNullOrWhiteSpace(Description) ? null : Description.Trim();
}

public sealed class ExamSearchRequest
{
    [Range(1, long.MaxValue)] public long? CollegeId { get; set; }
    [Range(1, long.MaxValue)] public long? AcademicYearId { get; set; }
    [Range(1, long.MaxValue)] public long? CourseId { get; set; }
    [Range(1, long.MaxValue)] public long? BranchId { get; set; }
    [Range(1, long.MaxValue)] public long? SemesterId { get; set; }
    [Range(1, long.MaxValue)] public long? ExamTypeId { get; set; }
    [StringLength(150)] public string? Search { get; set; }
    public bool? Status { get; set; }
    [Range(1, int.MaxValue)] public int? Page { get; set; }
    [Range(1, 500)] public int? PageSize { get; set; }
}

public sealed class ExamWriteRequest
{
    [Range(1, long.MaxValue)] public long CollegeId { get; set; }
    [Range(1, long.MaxValue)] public long AcademicYearId { get; set; }
    [Range(1, long.MaxValue)] public long CourseId { get; set; }
    [Range(1, long.MaxValue)] public long BranchId { get; set; }
    [Range(1, long.MaxValue)] public long SemesterId { get; set; }
    [Range(1, long.MaxValue)] public long ExamTypeId { get; set; }
    [Required, StringLength(50)] public string ExamCode { get; set; } = string.Empty;
    [Required, StringLength(150)] public string ExamName { get; set; } = string.Empty;
    [StringLength(500)] public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool? Status { get; set; }

    [JsonIgnore] public string NormalizedCode => ExamCode.Trim().ToUpperInvariant().Replace(' ', '_');
    [JsonIgnore] public string NormalizedName => ExamName.Trim();
    [JsonIgnore] public string? NormalizedDescription => string.IsNullOrWhiteSpace(Description) ? null : Description.Trim();
}

public sealed class ExamScheduleWriteRequest
{
    [Range(1, long.MaxValue)] public long SubjectId { get; set; }
    [Range(1, long.MaxValue)] public long? SectionId { get; set; }
    [Range(1, long.MaxValue)] public long? ClassroomId { get; set; }
    public DateTime ExamDate { get; set; }

    [Required, RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$",
        ErrorMessage = "StartTime must be HH:mm or HH:mm:ss.")]
    public string StartTime { get; set; } = string.Empty;

    [Required, RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$",
        ErrorMessage = "EndTime must be HH:mm or HH:mm:ss.")]
    public string EndTime { get; set; } = string.Empty;

    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$",
        ErrorMessage = "ReportingTime must be HH:mm or HH:mm:ss.")]
    public string? ReportingTime { get; set; }

    [StringLength(1000)] public string? Instructions { get; set; }
    public bool? Status { get; set; }

    [JsonIgnore] public string? NormalizedInstructions => string.IsNullOrWhiteSpace(Instructions) ? null : Instructions.Trim();
}

public sealed class ExamRuleWriteRequest
{
    [Required, StringLength(50)] public string RuleCode { get; set; } = string.Empty;
    [Required, StringLength(150)] public string RuleName { get; set; } = string.Empty;
    [StringLength(50)] public string? RuleCategory { get; set; }
    [Required, StringLength(500)] public string RuleValue { get; set; } = string.Empty;
    [StringLength(1000)] public string? Description { get; set; }
    public bool? Status { get; set; }

    [JsonIgnore] public string NormalizedCode => RuleCode.Trim().ToUpperInvariant().Replace(' ', '_');
    [JsonIgnore] public string NormalizedName => RuleName.Trim();
    [JsonIgnore] public string? NormalizedCategory => string.IsNullOrWhiteSpace(RuleCategory) ? null : RuleCategory.Trim().ToUpperInvariant();
    [JsonIgnore] public string NormalizedValue => RuleValue.Trim();
    [JsonIgnore] public string? NormalizedDescription => string.IsNullOrWhiteSpace(Description) ? null : Description.Trim();
}
