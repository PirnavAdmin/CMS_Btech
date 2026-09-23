using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services.Implementations
{
    public class AcademicLevelService : IAcademicLevelService
    {
        private readonly ApplicationDbContext _context;

        public AcademicLevelService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<AcademicLevel> CreateAsync(
            AcademicLevelDto dto)
        {
            var level = new AcademicLevel
            {
                AcademicYearId = dto.AcademicYearId,
                LevelType = dto.LevelType.Trim(),
                LevelName = dto.LevelName.Trim(),
                LevelNumber = dto.LevelNumber,
                Status = dto.Status,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = dto.CreatedBy
            };

            _context.AcademicLevels.Add(level);

            await _context.SaveChangesAsync();

            return level;
        }

        public async Task<List<AcademicLevel>> GetAllAsync()
        {
            return await _context.AcademicLevels
                .OrderBy(x => x.LevelType)
                .ThenBy(x => x.LevelNumber)
                .ToListAsync();
        }

        public async Task<AcademicLevel?> GetByIdAsync(long id)
        {
            return await _context.AcademicLevels
                .FirstOrDefaultAsync(x =>
                    x.AcademicLevelId == id);
        }

        public async Task<bool> UpdateAsync(
            long id,
            AcademicLevelDto dto)
        {
            var level = await _context.AcademicLevels
                .FirstOrDefaultAsync(x =>
                    x.AcademicLevelId == id);

            if (level == null)
                return false;

            level.AcademicYearId = dto.AcademicYearId;
            level.LevelType = dto.LevelType.Trim();
            level.LevelName = dto.LevelName.Trim();
            level.LevelNumber = dto.LevelNumber;
            level.Status = dto.Status;
            level.UpdatedAt = DateTime.UtcNow;
            level.UpdatedBy = dto.CreatedBy;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> DeleteAsync(long id)
        {
            var level = await _context.AcademicLevels
                .FirstOrDefaultAsync(x =>
                    x.AcademicLevelId == id);

            if (level == null)
                return false;

            level.Status = 0;

            await _context.SaveChangesAsync();

            return true;
        }
    }
}
