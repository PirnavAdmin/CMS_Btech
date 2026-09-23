using BTech.DTOs;
using BTech.Models;

namespace BTech.Services
{
    public interface IAcademicLevelService
    {
        Task<AcademicLevel> CreateAsync(AcademicLevelDto dto);
        Task<List<AcademicLevel>> GetAllAsync();
        Task<AcademicLevel?> GetByIdAsync(long id);
        Task<bool> UpdateAsync(long id, AcademicLevelDto dto);
        Task<bool> DeleteAsync(long id);
    }
} 