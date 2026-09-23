using BTech.DTOs.Electives;

namespace BTech.Services.Interfaces
{
    public interface IStudentElectiveSelectionService
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