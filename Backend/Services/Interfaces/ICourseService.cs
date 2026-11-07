using BTech.DTOs.Course;

namespace BTech.Services.Interfaces
{
    public interface ICourseService
    {
        Task<IEnumerable<CourseResponseDto>> GetAllAsync(
            string? search,
            sbyte? status,
            long? collegeId,
            long? departmentId);

        Task<CourseResponseDto?> GetByIdAsync(long courseId);
        Task<CourseResponseDto> AddAsync(CreateCourseDto dto, long? userId);
        Task<CourseResponseDto?> UpdateAsync(long courseId, UpdateCourseDto dto, long? userId);
        Task<CourseResponseDto?> UpdateStatusAsync(long courseId, sbyte status, long? userId);
    }
}
