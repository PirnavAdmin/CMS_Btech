using BTech.DTOs.Department;

namespace BTech.Repositories.Interfaces
{
    public interface IDepartmentRepository
    {
        Task<HodResponseDto?> GetHodAsync(
            long departmentId);

        Task<IEnumerable<HodCandidateDto>>
            GetHodCandidatesAsync(
                long departmentId);

        Task<HodResponseDto>
            AssignHodAsync(
                long departmentId,
                long employeeProfileId,
                long updatedBy);

        Task RemoveHodAsync(
            long departmentId,
            long updatedBy);
    }
}