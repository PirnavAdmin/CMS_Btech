using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Services
{
    public class SemesterService : ISemesterService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SemesterService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SemesterService(
            ApplicationDbContext context,
            ILogger<SemesterService> logger, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        private long? SelectedCollegeId()
        {
            var context = _httpContextAccessor.HttpContext;
            if (context?.Items[BTech.Middleware.ModulePermissionMiddleware.SuperAdminItem] is not bool)
                throw new UnauthorizedAccessException("A verified semester request is required.");
            return CollegeRequestScope.GetCollegeId(context) ??
                context.Items[AcademicYearScopeRequest.ItemKey] as long?;
        }

        private IQueryable<Semester> ScopedSemesters()
        {
            var collegeId = SelectedCollegeId();
            return collegeId.HasValue
                ? _context.Semesters.Where(s => s.Course != null && s.Course.CollegeId == collegeId.Value)
                : _context.Semesters;
        }

        private async Task<long> ResolveAcademicYearAsync(long suppliedId, Branch branch, long collegeId)
        {
            var years = _context.AcademicYears.AsNoTracking().Where(x =>
                x.CollegeId == collegeId && x.DeletedAt == null && x.IsArchived == 0);
            if (suppliedId > 0)
            {
                if (await years.AnyAsync(x => x.AcademicYearId == suppliedId)) return suppliedId;
                throw new ArgumentException("academicYearId must identify a non-archived academic year in the branch's college.");
            }
            if (branch.StartingAcademicYearId is > 0 &&
                await years.AnyAsync(x => x.AcademicYearId == branch.StartingAcademicYearId.Value))
                return branch.StartingAcademicYearId.Value;
            var active = await years.Where(x => x.Status == 1).Select(x => x.AcademicYearId).Take(2).ToListAsync();
            if (active.Count == 1) return active[0];
            throw new ArgumentException("academicYearId is required: this branch has no valid starting academic year and its college has no unique active academic year.");
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

            var course = await _context.Courses.AsNoTracking().FirstOrDefaultAsync(x =>
                x.CourseId == effectiveCourseId && x.DeletedAt == null);
            if (course == null) throw new ArgumentException("Course not found.");
            var authorizedCollege = SelectedCollegeId();
            if (authorizedCollege.HasValue && course.CollegeId != authorizedCollege)
                throw new BTech.Exceptions.ForbiddenException("Cross-college access is not permitted.");

            if (branch.CourseId != effectiveCourseId)
                throw new ArgumentException("The selected branch does not belong to the selected course.");

            dto.AcademicYearId = await ResolveAcademicYearAsync(dto.AcademicYearId, branch, course.CollegeId);

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
            var existing = await ScopedSemesters().AsNoTracking().FirstOrDefaultAsync(x =>
                x.BranchId == dto.BranchId && x.AcademicYearId == dto.AcademicYearId &&
                x.SemesterNumber == dto.SemesterNumber && x.IsArchived == 0);
            if (existing != null) return existing; // Retrying creation never modifies the saved record.

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
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateException ex) when (ex.InnerException is MySqlException { Number: 1062 } mysql &&
                mysql.Message.Contains("uq_semester_active_slot", StringComparison.OrdinalIgnoreCase))
            {
                // A simultaneous request won the unique key. Return its committed record.
                _context.Entry(semester).State = EntityState.Detached;
                return await ScopedSemesters().AsNoTracking().SingleAsync(x =>
                    x.BranchId == dto.BranchId && x.AcademicYearId == dto.AcademicYearId &&
                    x.SemesterNumber == dto.SemesterNumber && x.IsArchived == 0);
            }

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
            return await ScopedSemesters()
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
            var total = await ScopedSemesters()
                .CountAsync(x => x.IsArchived == 0);

            var active = await ScopedSemesters()
                .CountAsync(x =>
                    x.IsArchived == 0 &&
                    x.Status == 1);

            var inactive = await ScopedSemesters()
                .CountAsync(x =>
                    x.IsArchived == 0 &&
                    x.Status != 1);

            var archived = await ScopedSemesters()
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
            var query = ScopedSemesters()
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
            var query = ScopedSemesters()
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
            return await ScopedSemesters()
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
            var semester = await ScopedSemesters()
                .FirstOrDefaultAsync(
                    x => x.SemesterId == semesterId && x.IsArchived == 0);

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

            var course = await _context.Courses.AsNoTracking().FirstOrDefaultAsync(x =>
                x.CourseId == effectiveCourseId && x.DeletedAt == null);
            if (course == null) throw new ArgumentException("Course not found.");
            var authorizedCollege = SelectedCollegeId();
            if (authorizedCollege.HasValue && course.CollegeId != authorizedCollege)
                throw new BTech.Exceptions.ForbiddenException("Cross-college access is not permitted.");

            if (branch.CourseId != effectiveCourseId)
                throw new ArgumentException("The selected branch does not belong to the selected course.");

            dto.AcademicYearId = await ResolveAcademicYearAsync(dto.AcademicYearId, branch, course.CollegeId);

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
            var duplicate = await ScopedSemesters()
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

        public async Task<bool> DeleteAsync(long semesterId)
        {
            var semester = await ScopedSemesters()
                .FirstOrDefaultAsync(x => x.SemesterId == semesterId && x.IsArchived == 0);

            if (semester == null)
            {
                return false;
            }

            semester.IsArchived = 1;
            semester.Status = 0;
            semester.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
