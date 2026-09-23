
using BTech.DTOs.Electives;

namespace BTech.Repositories.Interfaces
{
    public interface IElectiveAllocationRepository
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