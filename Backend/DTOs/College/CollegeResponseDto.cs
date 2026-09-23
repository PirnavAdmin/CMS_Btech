using System;

namespace BTech.DTOs.College
{
    public class CollegeResponseDto
    {
        public long CollegeId { get; set; }
        public string CollegeCode { get; set; } = string.Empty;
        public string CollegeName { get; set; } = string.Empty;
        public string? CollegeType { get; set; }
        public string? UniversityName { get; set; }
        public string? Email { get; set; }
        public string? Mobile { get; set; }
        public string? Phone { get; set; }
        public string? Principal { get; set; }
        public string? PrincipalEmail { get; set; }
        public string? PrincipalContact { get; set; }
        public string? AlternateContactNumber { get; set; }
        public string? AccreditationStatus { get; set; }
        public string? AccreditationBody { get; set; }
        public string? AccreditationGrade { get; set; }
        public string? AccreditationNumber { get; set; }
        public DateOnly? ValidFrom { get; set; }
        public DateOnly? ValidUntil { get; set; }
        public string? AddressLine1 { get; set; }
        public string? AddressLine2 { get; set; }
        public string? City { get; set; }
        public string? Area { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? Pincode { get; set; }
        public string? Website { get; set; }
        public long? AcademicYearId { get; set; }
        public string Timezone { get; set; } = string.Empty;
        public string CurrencyCode { get; set; } = string.Empty;
        public string? LogoPath { get; set; }
        public sbyte Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Current frontend aliases. Canonical properties above remain
        // available for Swagger and other API consumers.
        public string Name => CollegeName;
        public string Code => CollegeCode;
        public string? Type => CollegeType;
        public string? University => UniversityName;
        public string? Address => AddressLine1;
        public string? Contact => Mobile ?? Phone;
        public string? Logo => LogoPath;
    }
}
