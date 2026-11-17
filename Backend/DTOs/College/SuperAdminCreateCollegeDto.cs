using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.College;

public sealed class SuperAdminCreateCollegeDto : CreateCollegeDto
{
    [StringLength(150)]
    public string? AdminName { get; set; }

    [EmailAddress]
    [StringLength(150)]
    public string? AdminEmail { get; set; }
}

public sealed record CollegeOnboardingResult(
    CollegeResponseDto College, long AdminUserId, string AdminEmailStatus, string CollegeEmailStatus);
