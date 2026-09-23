using BTech.DTOs.Faculty;

namespace BTech.Repositories.Interfaces
{
    public interface IFacultyRepository
    {
        Task<FacultyListResponseDto> GetFacultyListAsync(
            FacultyListRequestDto request);

        Task<FacultyDetailsResponseDto?>GetFacultyDetailsAsync(long facultyId);

        Task<FacultyWorkloadResponseDto?>GetFacultyWorkloadAsync(long facultyId);
    }
}