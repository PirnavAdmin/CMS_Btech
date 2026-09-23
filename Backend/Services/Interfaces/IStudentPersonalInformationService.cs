using BTech.DTOs.StudentProfile;

namespace BTech.Services.Interfaces
{
    public interface IStudentPersonalInformationService
    {
        Task<StudentPersonalInformationResponseDto?> GetAsync(long studentId);

        Task<StudentPersonalInformationResponseDto?> UpdateAsync(
            long studentId,
            UpdateStudentPersonalInformationRequestDto request,
            long changedBy,
            string? ipAddress,
            string? userAgent);
    }
}
