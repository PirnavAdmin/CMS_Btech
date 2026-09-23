using BTech.DTOs;
using BTech.Models;

namespace BTech.Services.Interfaces
{
    public interface ISemesterService
    {
        Task<Semester> AddAsync(SemesterDto dto);

        Task<List<Semester>> GetAllAsync();

        Task<Semester?> GetByIdAsync(long semesterId);

        Task<Semester?> UpdateAsync(
            long semesterId,
            SemesterDto dto);

        Task<object> GetSummaryAsync();

        Task<List<Semester>> SearchAsync(
            string? search,
            long? branchId,
            long? academicYearId,
            byte? status);
    }
}