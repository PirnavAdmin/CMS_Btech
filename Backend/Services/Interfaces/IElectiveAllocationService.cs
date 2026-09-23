using BTech.DTOs.Electives;

namespace BTech.Services.Interfaces
{
    public interface IElectiveAllocationService
    {
        Task<IEnumerable<ElectiveAllocationResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveAllocationListRequestDto request);

        Task<ElectiveAllocationResponseDto?> CreateAsync(
            long collegeId,
            long selectionId,
            ElectiveAllocationCreateDto request,
            long allocatedBy);
    }
}