using System.Collections.Generic;
using System.Threading.Tasks;
using BTech.DTOs.College;
using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface ICollegeRepository
    {
        Task<College?> GetByIdAsync(long collegeId);
        Task<College?> GetByCodeAsync(string collegeCode);
        Task<IEnumerable<College>> GetAllAsync(string? search = null, sbyte? status = null);
        Task<(IEnumerable<College> Items, int TotalCount)> SearchAsync(CollegeSearchFilterDto filter);
        Task<College> AddAsync(College college);
        Task UpdateAsync(College college);
        Task<College?> UpdateStatusAsync(long collegeId, sbyte status, long? updatedBy);

        // Soft-delete a college
        Task<bool> DeleteAsync(long collegeId,long? deletedBy);

        Task<bool> ExistsCodeAsync(string collegeCode, long? excludeId = null);
    }
}
