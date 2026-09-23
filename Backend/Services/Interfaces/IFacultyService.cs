using BTech.DTOs.Faculty;

namespace BTech.Services.Interfaces
{
    public interface IFacultyService
    {
        Task<FacultyListResponseDto>
            GetFacultyListAsync(
                FacultyListRequestDto request);

        Task<FacultyDetailsResponseDto?> GetFacultyDetailsAsync(
            long facultyId);

        Task<FacultyWorkloadResponseDto?> GetFacultyWorkloadAsync(
            long facultyId);

        Task<bool> UpdateFacultyAsync(
            long userId,
            FacultyUpdateDto request,
            string? updatedBy);
    }
}