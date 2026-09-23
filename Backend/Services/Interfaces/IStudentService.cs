using BTech.DTOs.Student;

namespace BTech.Services.Interfaces
{
    public interface IStudentService
    {
        // Student List
        Task<StudentPagedResponseDto> GetAllAsync(
            StudentListFilterDto filter);

        // Student Search
        Task<StudentPagedResponseDto> SearchAsync(
            StudentSearchFilterDto filter);

        // Get Student By ID
        Task<StudentResponseDto?> GetByIdAsync(
            long studentId);

        // Create Student
        Task<StudentResponseDto> CreateAsync(
            CreateStudentDto dto,
            long? userId);

        // Update Student
        Task<StudentResponseDto?> UpdateAsync(
            long studentId,
            UpdateStudentDto dto,
            long? userId);

        // Update Student Status
        Task<StudentResponseDto?> UpdateStatusAsync(
            long studentId,
            sbyte status,
            long? userId);

        // Student Documents
        Task<IReadOnlyList<StudentDocumentResponseDto>> GetDocumentsAsync(
            long studentId);

        // Promote Individual Student
        Task<StudentPromotionResponseDto?> PromoteAsync(
            long studentId,
            long? createdBy);
    }
}