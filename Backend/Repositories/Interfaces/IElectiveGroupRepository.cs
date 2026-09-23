using BTech.DTOs.Electives;

namespace BTech.Repositories.Interfaces
{
    public interface IElectiveGroupRepository
    {
        Task<IEnumerable<ElectiveGroupResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveGroupListRequestDto request);

        Task<long> CreateAsync(
            long collegeId,
            CreateElectiveGroupDto request,
            long createdBy);

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