using BTech.DTOs.Branch;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class BranchService : IBranchService
    {
        private readonly IBranchRepository _repository;

        public BranchService(
            IBranchRepository repository)
        {
            _repository = repository;
        }

        // =====================================================
        // ADD BRANCH
        // =====================================================

        public async Task<BranchResponseDto>
            AddAsync(
                CreateBranchDto dto,
                long? userId)
        {
            if (dto.CourseId <= 0)
            {
                throw new ArgumentException(
                    "Valid CourseId is required.");
            }

            if (string.IsNullOrWhiteSpace(
                dto.BranchCode))
            {
                throw new ArgumentException(
                    "Branch code is required.");
            }

            if (string.IsNullOrWhiteSpace(
                dto.BranchName))
            {
                throw new ArgumentException(
                    "Branch name is required.");
            }

            var entity =
                new Branch
                {
                    Specialization = dto.Specialization?.Trim(),
                    CourseId =
                        dto.CourseId,

                    BranchCode =
                        dto.BranchCode
                            .Trim()
                            .ToUpperInvariant(),

                    BranchName =
                        dto.BranchName.Trim(),

                    ShortName =
                        dto.ShortName?.Trim(),

                    DepartmentId =
                        dto.DepartmentId,

                    BranchType =
                        dto.BranchType?.Trim(),

                    Duration =
                        dto.Duration,

                    TotalSemesters =
                        dto.TotalSemesters,

                    IntakeCapacity =
                        dto.IntakeCapacity,

                    StartingAcademicYearId =
                        dto.StartingAcademicYearId,

                    Description =
                        dto.Description?.Trim(),

                    Status =
                        1,

                    CreatedAt =
                        DateTime.UtcNow,

                    CreatedBy =
                        userId
                };

            var result =
                await _repository
                    .AddAsync(entity);

            if (result == null)
            {
                throw new InvalidOperationException(
                    "Branch could not be created.");
            }

            return Map(result);
        }

        // =====================================================
        // GET ALL
        // =====================================================

        public async Task<
            IEnumerable<BranchResponseDto>>
            GetAllAsync()
        {
            var branches =
                await _repository
                    .GetAllAsync();

            return branches.Select(Map);
        }

        // =====================================================
        // GET BY ID
        // =====================================================

        public async Task<BranchResponseDto?>
            GetByIdAsync(
                long branchId)
        {
            if (branchId <= 0)
            {
                throw new ArgumentException(
                    "Valid BranchId is required.");
            }

            var branch =
                await _repository
                    .GetByIdAsync(branchId);

            if (branch == null)
            {
                return null;
            }

            return Map(branch);
        }

        // =====================================================
        // GET BY COURSE ID
        //
        // GET:
        // /api/v1/branches/course/{courseId}
        //
        // SP:
        // sp_get_branches_by_course
        // =====================================================

        public async Task<
            IEnumerable<BranchResponseDto>>
            GetByCourseIdAsync(
                long courseId)
        {
            if (courseId <= 0)
            {
                throw new ArgumentException(
                    "Valid CourseId is required.");
            }

            var branches =
                await _repository
                    .GetByCourseIdAsync(courseId);

            return branches.Select(Map);
        }

        // =====================================================
        // UPDATE
        // =====================================================

        public async Task<BranchResponseDto?>
            UpdateAsync(
                long branchId,
                UpdateBranchDto dto,
                long? userId)
        {
            if (branchId <= 0)
            {
                throw new ArgumentException(
                    "Valid BranchId is required.");
            }

            var entity =
                await _repository
                    .GetByIdAsync(branchId);

            if (entity == null)
            {
                return null;
            }

            if (dto.CourseId <= 0)
            {
                throw new ArgumentException(
                    "Valid CourseId is required.");
            }

            if (string.IsNullOrWhiteSpace(
                dto.BranchCode))
            {
                throw new ArgumentException(
                    "Branch code is required.");
            }

            if (string.IsNullOrWhiteSpace(
                dto.BranchName))
            {
                throw new ArgumentException(
                    "Branch name is required.");
            }

            entity.Specialization = dto.Specialization?.Trim();

            entity.CourseId =
                dto.CourseId;

            entity.BranchCode =
                dto.BranchCode
                    .Trim()
                    .ToUpperInvariant();

            entity.BranchName =
                dto.BranchName.Trim();

            entity.ShortName =
                dto.ShortName?.Trim();

            entity.DepartmentId =
                dto.DepartmentId;

            entity.BranchType =
                dto.BranchType?.Trim();

            entity.Duration =
                dto.Duration;

            entity.TotalSemesters =
                dto.TotalSemesters;

            entity.IntakeCapacity =
                dto.IntakeCapacity;

            entity.StartingAcademicYearId =
                dto.StartingAcademicYearId;

            entity.Description =
                dto.Description?.Trim();

            entity.Status =
                dto.Status;

            entity.UpdatedAt =
                DateTime.UtcNow;

            entity.UpdatedBy =
                userId;

            var updated =
                await _repository
                    .UpdateAsync(entity);

            if (updated == null)
            {
                return null;
            }

            return Map(updated);
        }

        // =====================================================
        // DELETE
        // =====================================================

        public async Task<bool>
            DeleteAsync(
                long branchId,
                long? userId)
        {
            if (branchId <= 0)
            {
                throw new ArgumentException(
                    "Valid BranchId is required.");
            }

            return await _repository
                .DeleteAsync(
                    branchId,
                    userId);
        }

        // =====================================================
        // MAP ENTITY → DTO
        // =====================================================

        private static BranchResponseDto
            Map(Branch x)
        {
            return new BranchResponseDto
            {
                BranchId =
                    x.BranchId,

                CourseId =
                    x.CourseId,

                CourseCode =
                    x.Course?.CourseCode
                    ?? string.Empty,

                CourseName =
                    x.Course?.CourseName
                    ?? string.Empty,

                BranchCode =
                    x.BranchCode,

                BranchName =
                    x.BranchName,

                ShortName =
                    x.ShortName,

                Specialization =
                    x.Specialization,

                DepartmentId =
                    x.DepartmentId,

                DepartmentName =
                    x.Department?.DepartmentName
                    ?? string.Empty,

                BranchType =
                    x.BranchType,

                Duration =
                    x.Duration,

                TotalSemesters =
                    x.TotalSemesters,

                IntakeCapacity =
                    x.IntakeCapacity,

                StartingAcademicYearId =
                    x.StartingAcademicYearId,

                StartingAcademicYear =
                    x.StartingAcademicYear
                        ?.AcademicYearName,

                Description =
                    x.Description,

                Status =
                    x.Status,

                CreatedAt =
                    x.CreatedAt,

                CreatedBy =
                    x.CreatedBy,

                UpdatedAt =
                    x.UpdatedAt,

                UpdatedBy =
                    x.UpdatedBy
            };
        }
    }
}
