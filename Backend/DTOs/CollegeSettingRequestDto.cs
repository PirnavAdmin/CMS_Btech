namespace BTech.DTOs;

public class CollegeSettingRequestDto
{
    // Preferred mapping field from colleges.college_id
    public long? CollegeId { get; set; }

    // Kept for compatibility with the existing frontend
    public string? CollegeName { get; set; }

    public string? CollegeCode { get; set; }

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

    public string? DateFormat { get; set; } = "dd-MM-yyyy";

    public string? TimeZone { get; set; } = "Asia/Kolkata";

    public byte Status { get; set; } = 1;
}