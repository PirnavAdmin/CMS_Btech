using BTech.DTOs.Department;

namespace BTech.Services.Interfaces
{
    public interface IDepartmentService
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