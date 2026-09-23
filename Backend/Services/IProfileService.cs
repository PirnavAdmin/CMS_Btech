using BTech.DTOs.Profile;

namespace BTech.Services.Interfaces
{
    public interface ProfileService
    {
        Task<ProfileResponseDto?> GetProfileAsync(
            long studentId);

        Task<(
            bool Success,
            string Message,
            ProfileResponseDto? Data)>
            UpdateProfileAsync(
                long studentId,
                UpdateProfileRequestDto request);

        Task<FeeSummaryDto?> GetFeeSummaryAsync(
            long studentId);
    }
}