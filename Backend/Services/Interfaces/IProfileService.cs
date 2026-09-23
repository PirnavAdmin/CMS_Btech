using BTech.DTOs.Profile;

namespace BTech.Services.Interfaces
{
    public interface IProfileService
    {
        Task<ProfileResponseDto?> GetProfileAsync(long userId);

        Task<(
            bool Success,
            string Message,
            ProfileResponseDto? Data)>
            UpdateProfileAsync(
                long userId,
                UpdateProfileRequestDto request,
                long? changedBy = null);

        Task<FeeSummaryDto?> GetFeeSummaryAsync(long studentId);
    }
}
