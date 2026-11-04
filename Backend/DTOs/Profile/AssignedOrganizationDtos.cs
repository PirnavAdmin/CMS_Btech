using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Profile;

// Identity fields are absent deliberately. The target comes from users.college_id.
public class AssignedOrganizationUpdateDto
{
    public long? CollegeId { get; set; } // optional assertion, never selects a target
    [StringLength(50)] public string? CollegeType { get; set; }
    [StringLength(200)] public string? UniversityName { get; set; }
    [EmailAddress, StringLength(150)] public string? OfficialEmail { get; set; }
    [Phone, StringLength(20)] public string? OfficialPhone { get; set; }
    [StringLength(255)] public string? Address { get; set; }
    [StringLength(255)] public string? AddressLine2 { get; set; }
    [StringLength(100)] public string? City { get; set; }
    [StringLength(100)] public string? District { get; set; }
    [StringLength(100)] public string? State { get; set; }
    [StringLength(100)] public string? Country { get; set; }
    [RegularExpression(@"^[1-9][0-9]{5}$")] public string? Pincode { get; set; }
    [Url, StringLength(255)] public string? Website { get; set; }
}

public sealed class AssignedOrganizationResponseDto
{
    public long CollegeId { get; set; }
    public string CollegeName { get; set; } = string.Empty;
    public string CollegeCode { get; set; } = string.Empty;
    public string? CollegeType { get; set; }
    public string? UniversityName { get; set; }
    public string? OfficialEmail { get; set; }
    public string? OfficialPhone { get; set; }
    public string? Address { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? Pincode { get; set; }
    public string? Website { get; set; }
}
