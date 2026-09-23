using BTech.DTOs.ProfileAudit;

namespace BTech.Services.Interfaces
{
    public interface IProfileChangeAuditService
    {
        Task RecordAsync(long userId, long changedBy, IReadOnlyCollection<ProfileFieldChangeDto> changes);
        Task<IReadOnlyList<ProfileChangeAuditResponseDto>> GetByUserIdAsync(long userId);
    }
}
