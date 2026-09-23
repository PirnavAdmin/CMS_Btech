using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services
{
    public class SemesterService : ISemesterService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SemesterService> _logger;

        public SemesterService(
            ApplicationDbContext context,
            ILogger<SemesterService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // =====================================================
        // POST - ADD SEMESTER
        // =====================================================

        public async Task<Semester> AddAsync(SemesterDto dto)
        {
            var branch = await _context.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.BranchId == dto.BranchId &&
                    x.DeletedAt == null);

            if (branch == null)
            {
                throw new ArgumentException("Branch not found.");
            }

            // Frontend 4 currently omits courseId from its save payload even
            // though a course is selected. The branch relationship is the
            // authoritative fallback; a supplied courseId must still match.
            var effectiveCourseId = dto.CourseId > 0
                ? dto.CourseId
                : branch.CourseId;

            var courseExists = await _context.Courses
                .AnyAsync(x =>
                    x.CourseId == effectiveCourseId &&
                    x.DeletedAt == null);

            if (!courseExists)
                throw new ArgumentException("Course not found.");

            if (branch.CourseId != effectiveCourseId)
                throw new ArgumentException("The selected branch does not belong to the selected course.");

            // Validate Academic Year
            var academicYearExists = await _context.AcademicYears
                .AnyAsync(x => x.AcademicYearId == dto.AcademicYearId);

            if (!academicYearExists)
            {
                throw new ArgumentException("Academic year not found.");
            }

            // Validate Semester Number
            if (dto.SemesterNumber <= 0)
            {
                throw new ArgumentException(
                    "Semester number must be greater than 0.");
            }

            // Validate Semester Name
            if (string.IsNullOrWhiteSpace(dto.SemesterName))
            {
                throw new ArgumentException(
                    "Semester name is required.");
            }

            // Validate Dates
            if (dto.StartDate.HasValue &&
                dto.EndDate.HasValue &&
                dto.StartDate.Value > dto.EndDate.Value)
            {
                throw new ArgumentException(
                    "Start date cannot be greater than end date.");
            }

            // Check Duplicate
            var duplicate = await _context.Semesters
                .AnyAsync(x =>
                    x.BranchId == dto.BranchId &&
                    x.AcademicYearId == dto.AcademicYearId &&
                    x.SemesterNumber == dto.SemesterNumber &&
                    x.IsArchived == 0);

            if (duplicate)
            {
                throw new ArgumentException(
                    "This semester already exists for the selected branch and academic year.");
            }

            var semester = new Semester
            {
                CourseId = effectiveCourseId,

                BranchId = dto.BranchId,

                AcademicYearId = dto.AcademicYearId,

                SemesterNumber = dto.SemesterNumber,

                YearNumber = dto.YearNumber > 0
                    ? dto.YearNumber
                    : (int)Math.Ceiling(dto.SemesterNumber / 2.0),

                SemesterName = dto.SemesterName.Trim(),

                StartDate = dto.StartDate,

                EndDate = dto.EndDate,

                Status = dto.Status,

                IsArchived = 0,

                CreatedAt = DateTime.UtcNow,

                CreatedBy = dto.CreatedBy
            };

            _context.Semesters.Add(semester);

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Semester created. SemesterId={SemesterId}, CourseId={CourseId}, BranchId={BranchId}, AcademicYearId={AcademicYearId}",
                semester.SemesterId,
                semester.CourseId,
                semester.BranchId,
                semester.AcademicYearId);

            return (await GetByIdAsync(semester.SemesterId))!;
        }
        // =====================================================
        // GET - SEMESTER DETAILS
        // =====================================================

        public async Task<Semester?> GetByIdAsync(long semesterId)
        {
            return await _context.Semesters
                .AsNoTracking()
                .Include(x => x.Course)
                .Include(x => x.Branch)
                .Include(x => x.AcademicYear)
                .FirstOrDefaultAsync(x =>
                    x.SemesterId == semesterId &&
                    x.IsArchived == 0);
        }


        // =====================================================
        // GET - SEMESTER SUMMARY
        // =====================================================

        public async Task<object> GetSummaryAsync()
        {
            var total = await _context.Semesters
                .CountAsync(x => x.IsArchived == 0);

            var active = await _context.Semesters
                .CountAsync(x =>
                    x.IsArchived == 0 &&
                    x.Status == 1);

            var inactive = await _context.Semesters
                .CountAsync(x =>
                    x.IsArchived == 0 &&
                    x.Status != 1);

            var archived = await _context.Semesters
                .CountAsync(x => x.IsArchived == 1);

            return new
            {
                totalSemesters = total,
                activeSemesters = active,
                inactiveSemesters = inactive,
                archivedSemesters = archived
            };
        }


        // =====================================================
        // GET - SEARCH / FILTER
        // =====================================================

        public async Task<List<Semester>> SearchAsync(
            string? search,
            long? branchId,
            long? academicYearId,
            byte? status)
        {
            var query = _context.Semesters
                .AsNoTracking()
                .Include(x => x.Course)
                .Include(x => x.Branch)
                .Include(x => x.AcademicYear)
                .Where(x => x.IsArchived == 0)
                .AsQueryable();

            // Search by semester name
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                query = query.Where(x =>
                    x.SemesterName.Contains(search) ||
                    (x.Course != null && x.Course.CourseName.Contains(search)) ||
                    (x.Branch != null && x.Branch.BranchName.Contains(search)));
            }

            // Filter by branch
            if (branchId.HasValue)
            {
                query = query.Where(x =>
                    x.BranchId == branchId.Value);
            }

            // Filter by academic year
            if (academicYearId.HasValue)
            {
                query = query.Where(x =>
                    x.AcademicYearId == academicYearId.Value);
            }

            // Filter by status
            if (status.HasValue)
            {
                query = query.Where(x =>
                    x.Status == status.Value);
            }

            return await query
                .OrderBy(x => x.SemesterNumber)
                .ToListAsync();
        }
        // =====================================================
        // GET - SEARCH SEMESTERS
        // =====================================================

        public async Task<List<Semester>> SearchAsync(string? search)
        {
            var query = _context.Semesters
                .AsNoTracking()
                .Include(x => x.Course)
                .Include(x => x.Branch)
                .Include(x => x.AcademicYear)
                .Where(x => x.IsArchived == 0)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                query = query.Where(x =>
                    x.SemesterName.Contains(search) ||
                    x.SemesterNumber.ToString().Contains(search)
                );
            }

            return await query
                .OrderBy(x => x.SemesterNumber)
                .ToListAsync();
        } 

        // =====================================================
        // GET - LIST SEMESTERS
        // =====================================================

        public async Task<List<Semester>> GetAllAsync()
        {
            return await _context.Semesters
                .AsNoTracking()
                .Include(x => x.Course)
                .Include(x => x.Branch)
                .Include(x => x.AcademicYear)
                .Where(x => x.IsArchived == 0)
                .OrderBy(x => x.SemesterNumber)
                .ToListAsync();
        }

        // =====================================================
        // PUT - UPDATE SEMESTER
        // =====================================================

        public async Task<Semester?> UpdateAsync(
            long semesterId,
            SemesterDto dto)
        {
            var semester = await _context.Semesters
                .FirstOrDefaultAsync(
                    x => x.SemesterId == semesterId);

            if (semester == null)
            {
                return null;
            }

            var branch = await _context.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.BranchId == dto.BranchId &&
                    x.DeletedAt == null);

            if (branch == null)
            {
                throw new ArgumentException("Branch not found.");
            }

            var effectiveCourseId = dto.CourseId > 0
                ? dto.CourseId
                : branch.CourseId;

            var courseExists = await _context.Courses
                .AnyAsync(x =>
                    x.CourseId == effectiveCourseId &&
                    x.DeletedAt == null);

            if (!courseExists)
                throw new ArgumentException("Course not found.");

            if (branch.CourseId != effectiveCourseId)
                throw new ArgumentException("The selected branch does not belong to the selected course.");

            // Validate Academic Year
            var academicYearExists = await _context.AcademicYears
                .AnyAsync(x =>
                    x.AcademicYearId == dto.AcademicYearId);

            if (!academicYearExists)
            {
                throw new ArgumentException(
                    "Academic year not found.");
            }

            // Validate Semester Number
            if (dto.SemesterNumber <= 0)
            {
                throw new ArgumentException(
                    "Semester number must be greater than 0.");
            }

            // Validate Semester Name
            if (string.IsNullOrWhiteSpace(dto.SemesterName))
            {
                throw new ArgumentException(
                    "Semester name is required.");
            }

            // Validate Dates
            if (dto.StartDate.HasValue &&
                dto.EndDate.HasValue &&
                dto.StartDate.Value > dto.EndDate.Value)
            {
                throw new ArgumentException(
                    "Start date cannot be greater than end date.");
            }

            // Check Duplicate
            var duplicate = await _context.Semesters
                .AnyAsync(x =>
                    x.SemesterId != semesterId &&
                    x.BranchId == dto.BranchId &&
                    x.AcademicYearId == dto.AcademicYearId &&
                    x.SemesterNumber == dto.SemesterNumber &&
                    x.IsArchived == 0);

            if (duplicate)
            {
                throw new ArgumentException(
                    "Another semester with the same number already exists.");
            }


            // Update
            semester.CourseId = effectiveCourseId;

            semester.BranchId = dto.BranchId;

            semester.AcademicYearId =
                dto.AcademicYearId;

            semester.SemesterNumber =
                dto.SemesterNumber;

            semester.YearNumber = dto.YearNumber > 0
                ? dto.YearNumber
                : (int)Math.Ceiling(dto.SemesterNumber / 2.0);

            semester.SemesterName =
                dto.SemesterName.Trim();

            semester.StartDate =
                dto.StartDate;

            semester.EndDate =
                dto.EndDate;

            semester.Status =
                dto.Status;

            semester.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Semester updated. SemesterId={SemesterId}, CourseId={CourseId}, BranchId={BranchId}, AcademicYearId={AcademicYearId}",
                semester.SemesterId,
                semester.CourseId,
                semester.BranchId,
                semester.AcademicYearId);

            return await GetByIdAsync(semesterId);
        }
    }
}
