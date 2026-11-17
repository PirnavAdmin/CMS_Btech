using BTech.DTOs.College;

namespace BTech.Services.Interfaces;

public interface ISuperAdminCollegeService
{
    Task<CollegeOnboardingResult> CreateCollegeAsync(SuperAdminCreateCollegeDto dto);
    Task<string?> RetryCollegeWelcomeEmailAsync(long collegeId);
}
