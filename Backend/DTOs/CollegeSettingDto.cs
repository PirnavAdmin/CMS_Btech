namespace BTech.DTOs;

public class CollegeSettingDto
{
    public long Id { get; set; }

    // Master college ID from colleges.college_id
    public long CollegeId { get; set; }

    public string CollegeName { get; set; } = string.Empty;

    public string CollegeCode { get; set; } = string.Empty;

    public string? CollegeEmail { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Website { get; set; }

    public string? AddressLine1 { get; set; }

    public string? AddressLine2 { get; set; }

    public string? City { get; set; }

    public string? State { get; set; }

    public string? Pincode { get; set; }

    public string? AcademicYear { get; set; }

    public string? Semester { get; set; }

    public string? InstitutionType { get; set; }

    public string? DateFormat { get; set; }

    public string? TimeZone { get; set; }

    public byte Status { get; set; }

    public bool IsArchived { get; set; }

    public DateTime CreatedAt { get; set; }

    public long? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public long? UpdatedBy { get; set; }
}