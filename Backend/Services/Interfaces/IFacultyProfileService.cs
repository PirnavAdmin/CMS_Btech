using BTech.DTOs.Faculty;

namespace BTech.Services.Interfaces
{
    public interface IFacultyProfileService
    {
        Task<FacultyProfileResponseDto?> GetFacultyProfileAsync(long facultyId);

        Task<bool> UpdateFacultyProfileAsync(
            long facultyId,
            FacultyProfileUpdateDto request,
            string? updatedBy);
    }
}