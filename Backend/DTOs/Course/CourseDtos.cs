using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using BTech.DTOs.Common;

namespace BTech.DTOs.Course
{
    public class CreateCourseDto : IValidatableObject
    {
        public long? CollegeId { get; set; }
        public long? DepartmentId { get; set; }

        [StringLength(50)]
        public string? CourseCode { get; set; }

        [StringLength(50)]
        public string? Code { get; set; }

        [StringLength(150)]
        public string? CourseName { get; set; }

        [StringLength(150)]
        public string? Name { get; set; }

        [StringLength(50)]
        public string? CourseShortName { get; set; }

        [StringLength(50)]
        public string? ShortName { get; set; }

        [StringLength(50)]
        public string? CourseType { get; set; }

        [StringLength(50)]
        public string? Type { get; set; }

        public int? DurationYears { get; set; }
        public int? DurationValue { get; set; }
        public int? TotalSemesters { get; set; }
        public int? Semesters { get; set; }

        [StringLength(255)]
        public string? Eligibility { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [JsonIgnore]
        public string EffectiveCode =>
            (CourseCode ?? Code ?? string.Empty).Trim().ToUpperInvariant();

        [JsonIgnore]
        public string EffectiveName =>
            (CourseName ?? Name ?? string.Empty).Trim();

        [JsonIgnore]
        public string? EffectiveShortName =>
            (CourseShortName ?? ShortName)?.Trim();

        [JsonIgnore]
        public string? EffectiveType =>
            (CourseType ?? Type)?.Trim();

        [JsonIgnore]
        public int EffectiveDurationYears =>
            DurationYears ?? DurationValue ?? 0;

        [JsonIgnore]
        public int EffectiveTotalSemesters =>
            TotalSemesters ?? Semesters ?? 0;

        public IEnumerable<ValidationResult> Validate(
            ValidationContext validationContext)
        {
            if (string.IsNullOrWhiteSpace(EffectiveCode))
                yield return new ValidationResult(
                    "Course code is required.",
                    new[] { nameof(CourseCode) });

            if (string.IsNullOrWhiteSpace(EffectiveName))
                yield return new ValidationResult(
                    "Course name is required.",
                    new[] { nameof(CourseName) });

            if (EffectiveDurationYears <= 0)
                yield return new ValidationResult(
                    "Duration years must be greater than zero.",
                    new[] { nameof(DurationYears) });

            if (EffectiveTotalSemesters <= 0)
                yield return new ValidationResult(
                    "Total semesters must be greater than zero.",
                    new[] { nameof(TotalSemesters) });
        }
    }

    public sealed class UpdateCourseDto : CreateCourseDto
    {
    }

    public sealed class UpdateCourseStatusDto
    {
        [System.Text.Json.Serialization.JsonRequired]
        [JsonConverter(typeof(FlexibleStatusConverter))]
        [Range(0, 1)]
        public sbyte Status { get; set; }
    }

    public sealed class CourseResponseDto
    {
        public long CourseId { get; set; }
        public long CollegeId { get; set; }
        public string? CollegeName { get; set; }
        public long? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public string CourseCode { get; set; } = string.Empty;
        public string CourseName { get; set; } = string.Empty;
        public string? CourseShortName { get; set; }
        public string? CourseType { get; set; }
        public int DurationYears { get; set; }
        public int TotalSemesters { get; set; }
        public string? Eligibility { get; set; }
        public string? Description { get; set; }
        public sbyte Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Aliases used by the current Course screen model.
        public long Id => CourseId;
        public string Code => CourseCode;
        public string Name => CourseName;
        public string? ShortName => CourseShortName;
        public string? Type => CourseType;
        public int DurationValue => DurationYears;
        public int Semesters => TotalSemesters;
        public string? Department => DepartmentName;
    }
}
