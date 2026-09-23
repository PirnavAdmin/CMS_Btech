using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface ICourseRepository
    {
        Task<IEnumerable<Course>> GetAllAsync(
            string? search,
            sbyte? status,
            long? collegeId,
            long? departmentId);

        Task<Course?> GetByIdAsync(long courseId);
        Task<Course> AddAsync(Course course);
        Task<Course?> UpdateAsync(Course course);
        Task<Course?> UpdateStatusAsync(long courseId, sbyte status, long? updatedBy);
        Task<bool> ExistsCodeAsync(string courseCode, long? excludeId = null);
    }
}
