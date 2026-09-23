using BTech.DTOs.StudentProfile;

namespace BTech.Repositories.Interfaces
{
    public interface IStudentPersonalInformationRepository
    {
        Task<StudentPersonalInformationResponseDto?> GetByStudentIdAsync(long studentId);

        Task<StudentPersonalInformationResponseDto?> UpdateAsync(
            long studentId,
            UpdateStudentPersonalInformationRequestDto request,
            long changedBy,
            string? ipAddress,
            string? userAgent);
    }
}
