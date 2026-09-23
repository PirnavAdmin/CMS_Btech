using BTech.Data;
using BTech.DTOs.CourseSemesterMapping;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services.Implementations
{
    public class CourseSemesterMappingService : ICourseSemesterMappingService
    {
        private readonly ICourseSemesterMappingRepository _repository;
        private readonly ApplicationDbContext _context;

        public CourseSemesterMappingService(ICourseSemesterMappingRepository repository, ApplicationDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task<CourseSemesterMappingResponseDto> CreateAsync(CreateCourseSemesterMappingDto dto)
        {
            await ValidateAsync(dto.CourseId, dto.BranchId, dto.SemesterId);
            if (await _repository.ExistsAsync(dto.CourseId, dto.SemesterId))
                throw new InvalidOperationException("Course is already mapped to this semester.");

            var mapping = new CourseSemesterMapping
            { CourseId = dto.CourseId, SemesterId = dto.SemesterId, Status = 1, CreatedAt = DateTime.UtcNow, CreatedBy = dto.CreatedBy };
            await _repository.AddAsync(mapping);
            var saved = await _repository.GetByIdAsync(mapping.CourseSemesterMappingId);
            return Map(saved ?? mapping);
        }

        public async Task<List<CourseSemesterMappingResponseDto>> GetAllAsync()
            => (await _repository.GetAllAsync()).Select(Map).ToList();

        public async Task<CourseSemesterMappingResponseDto?> GetByIdAsync(long id)
        {
            var mapping = await _repository.GetByIdAsync(id);
            return mapping == null ? null : Map(mapping);
        }

        public async Task<CourseSemesterMappingResponseDto> UpdateAsync(long id, UpdateCourseSemesterMappingDto dto)
        {
            var mapping = await _repository.GetByIdAsync(id) ?? throw new KeyNotFoundException("Course semester mapping not found.");
            await ValidateAsync(dto.CourseId, dto.BranchId, dto.SemesterId);
            var duplicate = await _context.CourseSemesterMappings.AnyAsync(x => x.CourseSemesterMappingId != id && x.CourseId == dto.CourseId && x.SemesterId == dto.SemesterId && x.Status == 1);
            if (duplicate) throw new InvalidOperationException("Course is already mapped to this semester.");
            mapping.CourseId = dto.CourseId; mapping.SemesterId = dto.SemesterId; mapping.UpdatedBy = dto.UpdatedBy; mapping.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(mapping);
            var updated = await _repository.GetByIdAsync(id);
            return Map(updated ?? mapping);
        }

        public async Task<bool> UpdateStatusAsync(long id, CourseSemesterMappingStatusDto dto)
        {
            var mapping = await _repository.GetByIdAsync(id);
            if (mapping == null) return false;
            mapping.Status = dto.Status; mapping.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(mapping); return true;
        }

        private async Task ValidateAsync(long courseId, long branchId, long semesterId)
        {
            var course = await _context.Courses.AsNoTracking().FirstOrDefaultAsync(x => x.CourseId == courseId && x.DeletedAt == null);
            if (course == null) throw new ArgumentException("Course not found.");
            var branch = await _context.Branches.AsNoTracking().FirstOrDefaultAsync(x => x.BranchId == branchId && x.CourseId == courseId && x.DeletedAt == null);
            if (branch == null) throw new ArgumentException("Branch not found or does not belong to the selected course.");
            var semester = await _context.Semesters.AsNoTracking().FirstOrDefaultAsync(x => x.SemesterId == semesterId && x.IsArchived == 0);
            if (semester == null) throw new ArgumentException("Semester not found.");
            if (semester.CourseId != courseId || semester.BranchId != branchId) throw new ArgumentException("The selected semester does not belong to the selected course and branch.");
        }

        private static CourseSemesterMappingResponseDto Map(CourseSemesterMapping mapping) => new()
        {
            CourseSemesterMappingId = mapping.CourseSemesterMappingId, CourseId = mapping.CourseId, SemesterId = mapping.SemesterId, BranchId = mapping.Semester?.BranchId ?? 0, Status = mapping.Status, CreatedAt = mapping.CreatedAt, UpdatedAt = mapping.UpdatedAt,
            Course = mapping.Course == null ? null : new() { CourseId = mapping.Course.CourseId, CourseCode = mapping.Course.CourseCode, CourseName = mapping.Course.CourseName },
            Branch = mapping.Semester?.Branch == null ? null : new() { BranchId = mapping.Semester.Branch.BranchId, CourseId = mapping.Semester.Branch.CourseId, BranchCode = mapping.Semester.Branch.BranchCode, BranchName = mapping.Semester.Branch.BranchName },
            Semester = mapping.Semester == null ? null : new() { SemesterId = mapping.Semester.SemesterId, CourseId = mapping.Semester.CourseId, BranchId = mapping.Semester.BranchId, SemesterNumber = mapping.Semester.SemesterNumber, YearNumber = mapping.Semester.YearNumber, SemesterName = mapping.Semester.SemesterName }
        };
    }
}
