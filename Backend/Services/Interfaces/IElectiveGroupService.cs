using BTech.DTOs.Electives;

namespace BTech.Services.Interfaces
{
    public interface IElectiveGroupService
    {
        Task<IEnumerable<ElectiveGroupResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveGroupListRequestDto request);

        Task<long> CreateAsync(
            long collegeId,
            CreateElectiveGroupDto request,
            long createdBy);

        Task UpdateAsync(
            long collegeId,
            long electiveGroupId,
            CreateElectiveGroupDto request);

        Task DeleteAsync(long collegeId, long electiveGroupId);

        Task<IEnumerable<ElectiveGroupSubjectResponseDto>> GetSubjectsAsync(
            long collegeId,
            long electiveGroupId);

        Task AddSubjectsAsync(
            long collegeId,
            long electiveGroupId,
            List<long> subjectIds,
            long createdBy);
    }
}