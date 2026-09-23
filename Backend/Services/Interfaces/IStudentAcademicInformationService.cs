using BTech.DTOs.StudentAcademicInformation;

namespace BTech.Services.Interfaces
{
    public interface IStudentAcademicInformationService
    {
        Task<StudentAcademicInformationResponseDto?> GetByIdAsync(int academicId);
        Task<StudentAcademicInformationResponseDto?> UpdateAsync(
            int academicId,
            UpdateStudentAcademicInformationDto dto);
    }
}
