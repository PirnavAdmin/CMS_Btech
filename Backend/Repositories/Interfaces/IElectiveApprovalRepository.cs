using BTech.DTOs.Electives;

namespace BTech.Repositories.Interfaces
{
    public interface IElectiveApprovalRepository
    {
        Task<IEnumerable<ElectiveApprovalResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveApprovalListRequestDto request);

        Task<ElectiveApprovalResponseDto?> UpdateAsync(
            long collegeId,
            long selectionId,
            ElectiveApprovalRequestDto request,
            long approvedBy);
    }
}