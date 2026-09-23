using BTech.DTOs.Sections;

namespace BTech.Services.Interfaces
{

    public interface ISectionService
    {
        Task<IEnumerable<SectionResponseDto>>
            GetAllAsync();

        Task<SectionResponseDto?>
            GetByIdAsync(long sectionId);

        Task<IEnumerable<SectionResponseDto>>
            SearchAsync(
                string? search,
                long? departmentId,
                long? courseId,
                long? branchId,
                long? semesterId,
                bool? status);

        Task<long> CreateAsync(
            CreateSectionRequestDto request,
            long userId);

        Task UpdateAsync(
            long sectionId,
            UpdateSectionRequestDto request,
            long userId);

        Task DeleteAsync(
            long sectionId,
            long userId);

        Task UpdateStatusAsync(
            long sectionId,
            bool status,
            long userId);

        Task<SectionCapacityValidationDto>
    ValidateCapacityAsync(
        long? sectionId,
        int capacity);

        Task<SectionSummaryResponseDto> GetSummaryAsync();
    }
}
