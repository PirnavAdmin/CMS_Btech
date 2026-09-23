using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.StudentProfile
{
    public sealed class StudentPersonalInformationResponseDto
    {
        public long StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? ProfilePhoto { get; set; }
        public string? AlternateEmail { get; set; }
        public string? AlternateMobile { get; set; }
        public string? BloodGroup { get; set; }
        public string? Nationality { get; set; }
        public string? Religion { get; set; }
        public string? Category { get; set; }
        public string? Address { get; set; }
        [StringLength(100)]
        public string? HouseNumber { get; set; }
        [StringLength(100)]
        public string? PermanentHouseNumber { get; set; }
        [StringLength(2000)]
        public string? PermanentAddress { get; set; }
        [StringLength(100)]
        public string? PermanentPincode { get; set; }
        [StringLength(100)]
        public string? PermanentCity { get; set; }
        [StringLength(100)]
        public string? PermanentDistrict { get; set; }
        [StringLength(100)]
        public string? PermanentState { get; set; }
        [StringLength(100)]
        public string? PermanentCountry { get; set; }

        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? Pincode { get; set; }
        public string ProfileStatus { get; set; } = "Incomplete";
        public bool IsProfileCompleted { get; set; }
        public bool IsVerified { get; set; }
        public decimal ProfileCompletionPercentage { get; set; }
        public long CollegeId { get; set; }
        public long? CourseId { get; set; }
        public string? CourseName { get; set; }
        public long? BranchId { get; set; }
        public string? BranchName { get; set; }
        public long AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// Partial update contract. A null property is treated as "not supplied".
    /// </summary>
    public sealed class UpdateStudentPersonalInformationRequestDto : IValidatableObject
    {
        [StringLength(150)]
        public string? FullName { get; set; }

        [StringLength(20)]
        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? Email { get; set; }

        [StringLength(20)]
        [RegularExpression(@"^[0-9+() -]*$", ErrorMessage = "Mobile contains invalid characters.")]
        public string? Mobile { get; set; }

        [StringLength(500)]
        public string? ProfilePhoto { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? AlternateEmail { get; set; }

        [StringLength(20)]
        [RegularExpression(@"^[0-9+() -]*$", ErrorMessage = "Alternate mobile contains invalid characters.")]
        public string? AlternateMobile { get; set; }

        [StringLength(10)]
        public string? BloodGroup { get; set; }

        [StringLength(100)]
        public string? Nationality { get; set; }

        [StringLength(100)]
        public string? Religion { get; set; }

        [StringLength(100)]
        public string? Category { get; set; }

        [StringLength(2000)]
        public string? Address { get; set; }
        [StringLength(100)]
        public string? HouseNumber { get; set; }
        [StringLength(100)]
        public string? PermanentHouseNumber { get; set; }
        [StringLength(2000)]
        public string? PermanentAddress { get; set; }
        [StringLength(100)]
        public string? PermanentPincode { get; set; }
        [StringLength(100)]
        public string? PermanentCity { get; set; }
        [StringLength(100)]
        public string? PermanentDistrict { get; set; }
        [StringLength(100)]
        public string? PermanentState { get; set; }
        [StringLength(100)]
        public string? PermanentCountry { get; set; }


        [StringLength(100)]
        public string? City { get; set; }

        [StringLength(100)]
        public string? District { get; set; }

        [StringLength(100)]
        public string? State { get; set; }

        [StringLength(100)]
        public string? Country { get; set; }

        [StringLength(10)]
        public string? Pincode { get; set; }

        [StringLength(500)]
        public string? ChangeReason { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (DateOfBirth.HasValue && DateOfBirth.Value.Date > DateTime.UtcNow.Date)
            {
                yield return new ValidationResult(
                    "Date of birth cannot be in the future.",
                    new[] { nameof(DateOfBirth) });
            }
        }
    }
}
