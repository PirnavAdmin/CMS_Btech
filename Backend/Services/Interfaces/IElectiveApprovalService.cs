using BTech.DTOs.Electives;

namespace BTech.Services.Interfaces
{
    public interface IElectiveApprovalService
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