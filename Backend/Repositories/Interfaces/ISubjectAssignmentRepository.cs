using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface ISubjectAssignmentRepository
    {
        Task<SubjectSemesterAssignment?> GetByIdAsync(long id);

        Task<List<SubjectSemesterAssignment>> GetAllAsync();

        Task<bool> ExistsAsync(
            long subjectId,
            long semesterId);

        Task AddAsync(
            SubjectSemesterAssignment assignment);

        Task UpdateAsync(
            SubjectSemesterAssignment assignment);
    }
}