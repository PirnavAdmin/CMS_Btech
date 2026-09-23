using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories.Implementations
{
    public class SubjectAssignmentRepository
        : ISubjectAssignmentRepository
    {
        private readonly ApplicationDbContext _context;

        public SubjectAssignmentRepository(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<SubjectSemesterAssignment?> GetByIdAsync(
            long id)
        {
            return await _context.SubjectSemesterAssignments
                .FirstOrDefaultAsync(
                    x => x.SubjectSemesterAssignmentId == id);
        }

        public async Task<List<SubjectSemesterAssignment>>
            GetAllAsync()
        {
            return await _context.SubjectSemesterAssignments
                .OrderBy(x => x.SubjectId)
                .ThenBy(x => x.SemesterId)
                .ToListAsync();
        }

        public async Task<bool> ExistsAsync(
            long subjectId,
            long semesterId)
        {
            return await _context.SubjectSemesterAssignments
                .AnyAsync(x =>
                    x.SubjectId == subjectId &&
                    x.SemesterId == semesterId &&
                    x.Status == 1);
        }

        public async Task AddAsync(
            SubjectSemesterAssignment assignment)
        {
            await _context.SubjectSemesterAssignments
                .AddAsync(assignment);

            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(
            SubjectSemesterAssignment assignment)
        {
            _context.SubjectSemesterAssignments
                .Update(assignment);

            await _context.SaveChangesAsync();
        }
    }
}