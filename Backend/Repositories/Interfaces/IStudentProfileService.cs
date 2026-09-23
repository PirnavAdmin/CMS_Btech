using BTech.DTOs.StudentProfile;

namespace BTech.Services.Interfaces
{
    public interface ILegacyStudentProfileService
    {
        Task<StudentProfileDto?> GetByStudentIdAsync(long studentId);
    }
}