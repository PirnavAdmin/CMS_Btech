using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface ICourseStructureRepository
    {
        Task<CourseStructure?> AddAsync(
            CourseStructure entity);

        Task<IEnumerable<CourseStructure>>
            GetAllAsync();

        Task<IEnumerable<CourseStructure>>
            GetByCourseIdAsync(
                long courseId);

        Task<CourseStructure?> GetByIdAsync(
            long structureId);

        Task<CourseStructure?> UpdateAsync(
            CourseStructure entity);

        Task<bool> DeleteAsync(
            long structureId,
            long? userId);
    }
}