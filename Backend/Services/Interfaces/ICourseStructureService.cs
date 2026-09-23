using BTech.DTOs.CourseStructure;

namespace BTech.Services.Interfaces
{
    public interface ICourseStructureService
    {
        Task<CourseStructureResponseDto> AddAsync(
            CreateCourseStructureDto dto,
            long? userId);

        Task<IEnumerable<CourseStructureResponseDto>>
            GetAllAsync();

        Task<IEnumerable<CourseStructureResponseDto>>
            GetByCourseIdAsync(long courseId);

        Task<CourseStructureResponseDto?>
            GetByIdAsync(long structureId);

        Task<CourseStructureResponseDto?>
            UpdateAsync(
                long structureId,
                UpdateCourseStructureDto dto,
                long? userId);

        Task<bool> DeleteAsync(
            long structureId,
            long? userId);
    }
}