using BTech.DTOs.Electives;

namespace BTech.Repositories.Interfaces
{
    public interface IStudentElectiveSelectionRepository
    {
        Task<long> CreateAsync(
            long collegeId,
            long studentId,
            CreateStudentElectiveSelectionDto request,
            long createdBy);

        Task<IEnumerable<StudentElectiveSelectionResponseDto>> GetByStudentAsync(
            long collegeId,
            long studentId);
    }
}