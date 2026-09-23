using BTech.DTOs.Common;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BTech.DTOs.StudentAdmission
{
    public class CreateStudentAdmissionDto
    {
        [System.Text.Json.Serialization.JsonExtensionData]
        public Dictionary<string, JsonElement>? ScreenFields { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? Mobile { get; set; }
        public string? Photo { get; set; }
        public string? RegistrationNo { get; set; }


        [JsonConverter(typeof(AdmissionDateJsonConverter))]
        public DateTime? RegistrationDate { get; set; }

        public string? ApplicationNo { get; set; }

        [JsonConverter(typeof(AdmissionDateJsonConverter))]
        public DateTime? ApplicationDate { get; set; }

        public string? AdmissionNo { get; set; }

        [JsonConverter(typeof(AdmissionDateJsonConverter))]
        public DateTime? AdmissionDate { get; set; }



        //public DateTime? RegistrationDate { get; set; }

        //public string? ApplicationNo { get; set; }

        //public DateTime? ApplicationDate { get; set; }

        //public string? AdmissionNo { get; set; }

        //public DateTime? AdmissionDate { get; set; }

        public string? AdmissionType { get; set; }

        public string? AdmissionQuota { get; set; }

        // Frontend academic contract aliases / mappings.
        public string? Quota { get; set; }
        public string? QuotaOther { get; set; }
        public long? CollegeId { get; set; }
        public long? DepartmentId { get; set; }
        public long? CourseId { get; set; }
        public long? BranchId { get; set; }
        public long? SemesterId { get; set; }
        public string? EntryType { get; set; }
        public string? Regulation { get; set; }
        public string? Batch { get; set; }
        public JsonElement? CurrentAddress { get; set; }
        public JsonElement? PermanentAddress { get; set; }

        public string? Medium { get; set; }

        public string? ScholarshipStatus { get; set; }

        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        public string? LastName { get; set; }

        [MaxLength(10)]
        public string Gender { get; set; } = string.Empty;

        public DateTime DateOfBirth { get; set; }

        public string? BloodGroup { get; set; }

        public string? StudentPhoto { get; set; }

        public string? Email { get; set; }

        public string? StudentEmail { get; set; }

        public string? MobileNumber { get; set; }

        public string? AadhaarNumber { get; set; }

        public string? Nationality { get; set; }

        public string? Religion { get; set; }

        public string? Category { get; set; }

        public string? FatherName { get; set; }

        public string? MotherName { get; set; }

        public string? GuardianName { get; set; }

        public string? Occupation { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(FlexibleNullableDecimalJsonConverter))]
        public decimal? AnnualIncome { get; set; }

        public string? MotherEmail { get; set; }

        public string? GuardianMobile { get; set; }

        public string? GuardianEmail { get; set; }

        public string? Address { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? Pincode { get; set; }

        public long? BoardId { get; set; }

        public long? AcademicYearId { get; set; }

        public long? AcademicLevelId { get; set; }

        public long? GroupId { get; set; }

        public long? SectionId { get; set; }

        public string? SecondLanguage { get; set; }

        public string? PreviousSchool { get; set; }

        public string? PreviousBoard { get; set; }

        public string? PreviousYear { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(FlexibleNullableDecimalJsonConverter))]
        public decimal? PreviousPercentage { get; set; }

        public string? PreviousHallTicket { get; set; }

        public string? BirthCertificate { get; set; }

        public string? TransferCertificate { get; set; }

        public string? StudyCertificate { get; set; }

        public string? AadhaarDocument { get; set; }

        public string? CommunityCertificate { get; set; }

        public string? IncomeCertificate { get; set; }

        public string? PassportPhoto { get; set; }

        public string? MarksMemo { get; set; }

        public string? CasteCertificate { get; set; }

        public string? TenthCertificate { get; set; }

        public string? Status { get; set; }

        public string? AdmissionStatus { get; set; } = "Draft";

        public bool InterviewRequired { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(FlexibleDecimalJsonConverter))]
        public decimal AdmissionFeeAmount { get; set; }

        public string? Remarks { get; set; }

        public bool IsActive { get; set; } = true;

        // Lossless copy of the complete multi-step frontend admission form.
        // Normalized fields above remain queryable; screen-only fields are
        // preserved here and returned by every admission GET response.
        public JsonElement? FormData { get; set; }

    }

    public class UpdateStudentAdmissionDto : CreateStudentAdmissionDto
    {
    }
}
