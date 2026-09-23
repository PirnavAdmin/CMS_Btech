using BTech.DTOs.StudentAcademicDetails;

namespace BTech.Services.Interfaces
{
    public interface IStudentAcademicDetailsService
    {
        Task<StudentAcademicDetailsResponseDto?> GetAsync(long admissionId);
        Task<StudentAcademicDetailsResponseDto?> UpdateAsync(long admissionId, UpdateStudentAcademicDetailsDto dto, long? userId);
    }
}
