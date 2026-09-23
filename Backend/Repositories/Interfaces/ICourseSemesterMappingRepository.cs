using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface ICourseSemesterMappingRepository
    {
        Task<CourseSemesterMapping?> GetByIdAsync(long id);

        Task<List<CourseSemesterMapping>> GetAllAsync();

        Task<bool> ExistsAsync(long courseId, long semesterId);

        Task AddAsync(CourseSemesterMapping mapping);

        Task UpdateAsync(CourseSemesterMapping mapping);
    }
}