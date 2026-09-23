using BTech.DTOs;

namespace BTech.Services.Interfaces
{
    public interface IStudentProfileService
    {
        Task<StudentProfileDto?> GetStudentProfileAsync(long userId);
    }
}