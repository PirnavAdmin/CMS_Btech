using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using BTech.DTOs.Common;

namespace BTech.DTOs.Student
{
    public class CreateStudentDto : IValidatableObject
    {
        [Range(1, long.MaxValue)]
        public long CollegeId { get; set; }

        [Required]
        [StringLength(50)]
        public string StudentCode { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string FullName { get; set; } = string.Empty;

        [StringLength(20)]
        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? Email { get; set; }

        [StringLength(20)]
        [RegularExpression(
            @"^[0-9+() -]*$",
            ErrorMessage = "Mobile contains invalid characters.")]
        public string? Mobile { get; set; }

        [StringLength(10)]
        public string? BloodGroup { get; set; }

        [StringLength(500)]
        public string? Address { get; set; }

        [Range(1, long.MaxValue)]
        public long? CourseId { get; set; }

        [Range(1, long.MaxValue)]
        public long? BranchId { get; set; }

        [Range(1, long.MaxValue)]
        public long AcademicYearId { get; set; }

        [JsonConverter(typeof(FlexibleStatusConverter))]
        [Range(0, 1)]
        public sbyte Status { get; set; } = 1;

        public IEnumerable<ValidationResult> Validate(
            ValidationContext validationContext)
        {
            if (DateOfBirth.HasValue &&
                DateOfBirth.Value.Date > DateTime.UtcNow.Date)
            {
                yield return new ValidationResult(
                    "Date of birth cannot be in the future.",
                    new[] { nameof(DateOfBirth) });
            }

            if (BranchId.HasValue && !CourseId.HasValue)
            {
                yield return new ValidationResult(
                    "CourseId is required when BranchId is supplied.",
                    new[] { nameof(CourseId), nameof(BranchId) });
            }
        }
    }

    public sealed class UpdateStudentDto : CreateStudentDto
    {
    }

    public sealed class UpdateStudentStatusDto
    {
        [JsonRequired]
        [JsonConverter(typeof(FlexibleStatusConverter))]
        [Range(0, 1)]
        public sbyte Status { get; set; }
    }

    public class StudentListFilterDto
    {
        [Range(0, 1)]
        public sbyte? Status { get; set; }

        [Range(1, long.MaxValue)]
        public long? CollegeId { get; set; }

        [Range(1, long.MaxValue)]
        public long? CourseId { get; set; }

        [Range(1, long.MaxValue)]
        public long? BranchId { get; set; }

        [Range(1, long.MaxValue)]
        public long? AcademicYearId { get; set; }

        [Range(1, int.MaxValue)]
        public int PageNumber { get; set; } = 1;

        [Range(1, 100)]
        public int PageSize { get; set; } = 20;
    }

    public sealed class StudentSearchFilterDto : StudentListFilterDto
    {
        [Required]
        [StringLength(150, MinimumLength = 2)]
        public string Query { get; set; } = string.Empty;
    }

    public sealed class StudentResponseDto
    {
        public long StudentId { get; set; }

        public long CollegeId { get; set; }

        public string? CollegeName { get; set; }

        public string StudentCode { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? Email { get; set; }

        public string? Mobile { get; set; }

        public string? BloodGroup { get; set; }

        public string? Address { get; set; }

        public long? CourseId { get; set; }

        public string? CourseName { get; set; }

        public long? BranchId { get; set; }

        public string? BranchName { get; set; }

        public long AcademicYearId { get; set; }

        public string? AcademicYearName { get; set; }

        public sbyte Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        // Student Documents
        public IReadOnlyList<StudentDocumentResponseDto> Documents { get; set; }
            = Array.Empty<StudentDocumentResponseDto>();
    }

    public sealed class StudentPagedResponseDto
    {
        public IReadOnlyList<StudentResponseDto> Items { get; set; }
            = Array.Empty<StudentResponseDto>();

        public int PageNumber { get; set; }

        public int PageSize { get; set; }

        public long TotalRecords { get; set; }

        public int TotalPages { get; set; }
    }
}