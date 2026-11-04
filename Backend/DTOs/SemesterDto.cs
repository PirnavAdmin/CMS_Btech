using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using BTech.Serialization;

namespace BTech.DTOs;

public class SemesterDto : IValidatableObject
{
    [Range(0, long.MaxValue)] [JsonConverter(typeof(SemesterIdConverter))] public long CourseId { get; set; }
    [Range(1, long.MaxValue)] [JsonConverter(typeof(SemesterIdConverter))] public long BranchId { get; set; }
    [Range(0, long.MaxValue)] [JsonConverter(typeof(SemesterIdConverter))] public long AcademicYearId { get; set; }
    [Required, StringLength(100)] public string SemesterName { get; set; } = string.Empty;
    [Range(1, int.MaxValue)] [JsonConverter(typeof(SemesterNumberConverter))] public int SemesterNumber { get; set; }
    [Range(0, int.MaxValue)] [JsonConverter(typeof(SemesterNumberConverter))] public int YearNumber { get; set; }
    [JsonConverter(typeof(OptionalSemesterDateConverter))] public DateTime? StartDate { get; set; }
    [JsonConverter(typeof(OptionalSemesterDateConverter))] public DateTime? EndDate { get; set; }
    [JsonConverter(typeof(SemesterStatusConverter))] public byte Status { get; set; } = 1;
    public long? CreatedBy { get; set; } // legacy field; authenticated actor is authoritative

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (StartDate.HasValue && EndDate.HasValue && StartDate > EndDate)
            yield return new ValidationResult("Start date cannot be greater than end date.", [nameof(EndDate)]);
    }
}
