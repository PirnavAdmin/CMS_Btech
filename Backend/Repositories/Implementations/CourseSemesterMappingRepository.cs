using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories.Implementations
{
    public class CourseSemesterMappingRepository
        : ICourseSemesterMappingRepository
    {
        private readonly ApplicationDbContext _context;

        public CourseSemesterMappingRepository(
            ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<CourseSemesterMapping?> GetByIdAsync(
            long id)
        {
            return await _context.CourseSemesterMappings
                .Include(x => x.Course)
                .Include(x => x.Semester)
                    .ThenInclude(x => x!.Branch)
                .FirstOrDefaultAsync(
                    x => x.CourseSemesterMappingId == id);
        }

        public async Task<List<CourseSemesterMapping>> GetAllAsync()
        {
            return await _context.CourseSemesterMappings
                .Include(x => x.Course)
                .Include(x => x.Semester)
                    .ThenInclude(x => x!.Branch)
                .OrderBy(x => x.CourseId)
                .ThenBy(x => x.SemesterId)
                .ToListAsync();
        }

        public async Task<bool> ExistsAsync(
            long courseId,
            long semesterId)
        {
            return await _context.CourseSemesterMappings
                .AnyAsync(x =>
                    x.CourseId == courseId &&
                    x.SemesterId == semesterId &&
                    x.Status == 1);
        }

        public async Task AddAsync(
            CourseSemesterMapping mapping)
        {
            await _context.CourseSemesterMappings
                .AddAsync(mapping);

            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(
            CourseSemesterMapping mapping)
        {
            _context.CourseSemesterMappings.Update(mapping);

            await _context.SaveChangesAsync();
        }
    }
}