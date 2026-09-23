using BTech.DTOs.Sections;
using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    
    public interface ISectionRepository
    {
        Task<IEnumerable<SectionResponseDto>> GetAllAsync();

        Task<SectionResponseDto?> GetByIdAsync(
            long sectionId);

        Task<IEnumerable<SectionResponseDto>> SearchAsync(
            string? search,
            long? departmentId,
            long? courseId,
            long? branchId,
            long? semesterId,
            bool? status);

        Task<long> CreateAsync(
            Section section);

        Task<bool> UpdateAsync(
            Section section);

        Task<bool> DeleteAsync(
            long sectionId,
            long deletedBy);

        Task<bool> UpdateStatusAsync(
            long sectionId,
            bool status,
            long updatedBy);

        Task<SectionCapacityValidationDto>
    ValidateCapacityAsync(
        long? sectionId,
        int capacity);

        Task<SectionSummaryResponseDto> GetSummaryAsync();
    }
}