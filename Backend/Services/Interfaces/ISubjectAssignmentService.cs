using BTech.DTOs.SubjectAssignment;

namespace BTech.Services.Interfaces
{
    public interface ISubjectAssignmentService
    {
        Task<SubjectAssignmentResponseDto> CreateAsync(
            CreateSubjectAssignmentDto dto);

        Task<List<SubjectAssignmentResponseDto>> GetAllAsync();

        Task<SubjectAssignmentResponseDto?> GetByIdAsync(
            long id);

        Task<SubjectAssignmentResponseDto> UpdateAsync(
            long id,
            UpdateSubjectAssignmentDto dto);

        Task<bool> UpdateStatusAsync(
            long id,
            byte status);
    }
}