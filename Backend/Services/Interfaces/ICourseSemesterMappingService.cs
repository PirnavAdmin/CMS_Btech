using BTech.DTOs.CourseSemesterMapping;

namespace BTech.Services.Interfaces
{
    public interface ICourseSemesterMappingService
    {
        Task<CourseSemesterMappingResponseDto>
            CreateAsync(CreateCourseSemesterMappingDto dto);

        Task<List<CourseSemesterMappingResponseDto>>
            GetAllAsync();

        Task<CourseSemesterMappingResponseDto?>
            GetByIdAsync(long id);

        Task<CourseSemesterMappingResponseDto>
            UpdateAsync(
                long id,
                UpdateCourseSemesterMappingDto dto);

        Task<bool>
            UpdateStatusAsync(
                long id,
                CourseSemesterMappingStatusDto dto);
    }
}