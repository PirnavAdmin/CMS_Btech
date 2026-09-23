using BTech.DTOs.CourseStructure;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class CourseStructureService
        : ICourseStructureService
    {
        private readonly ICourseStructureRepository _repository;

        public CourseStructureService(
            ICourseStructureRepository repository)
        {
            _repository = repository;
        }

        // =====================================================
        // ADD
        // =====================================================

        public async Task<CourseStructureResponseDto>
            AddAsync(
                CreateCourseStructureDto dto,
                long? userId)
        {
            Validate(dto);

            var entity = new CourseStructure
            {
                CourseId = dto.CourseId,

                BranchId = dto.BranchId,

                YearNumber = dto.YearNumber,

                SemesterNumber =
                    dto.SemesterNumber,

                SemesterName =
                    string.IsNullOrWhiteSpace(
                        dto.SemesterName)
                        ? $"Semester {dto.SemesterNumber}"
                        : dto.SemesterName.Trim(),

                Status = 1,

                CreatedAt = DateTime.UtcNow,

                CreatedBy = userId
            };

            var result =
                await _repository.AddAsync(entity);

            if (result == null)
            {
                throw new InvalidOperationException(
                    "Course structure could not be created.");
            }

            return Map(result);
        }

        // =====================================================
        // GET ALL
        // =====================================================

        public async Task<
            IEnumerable<CourseStructureResponseDto>>
            GetAllAsync()
        {
            var result =
                await _repository.GetAllAsync();

            return result.Select(Map);
        }

        // =====================================================
        // GET BY COURSE
        // =====================================================

        public async Task<
            IEnumerable<CourseStructureResponseDto>>
            GetByCourseIdAsync(long courseId)
        {
            if (courseId <= 0)
            {
                throw new ArgumentException(
                    "Valid CourseId is required.");
            }

            var result =
                await _repository.GetByCourseIdAsync(
                    courseId);

            return result.Select(Map);
        }

        // =====================================================
        // GET BY ID
        // =====================================================

        public async Task<CourseStructureResponseDto?>
            GetByIdAsync(long structureId)
        {
            if (structureId <= 0)
            {
                throw new ArgumentException(
                    "Valid structure ID is required.");
            }

            var result =
                await _repository.GetByIdAsync(
                    structureId);

            return result == null
                ? null
                : Map(result);
        }

        // =====================================================
        // UPDATE
        // =====================================================

        public async Task<CourseStructureResponseDto?>
            UpdateAsync(
                long structureId,
                UpdateCourseStructureDto dto,
                long? userId)
        {
            if (structureId <= 0)
            {
                throw new ArgumentException(
                    "Valid structure ID is required.");
            }

            Validate(dto);

            var entity =
                await _repository.GetByIdAsync(
                    structureId);

            if (entity == null)
            {
                return null;
            }

            entity.CourseId =
                dto.CourseId;

            entity.BranchId =
                dto.BranchId;

            entity.YearNumber =
                dto.YearNumber;

            entity.SemesterNumber =
                dto.SemesterNumber;

            entity.SemesterName =
                string.IsNullOrWhiteSpace(
                    dto.SemesterName)
                    ? $"Semester {dto.SemesterNumber}"
                    : dto.SemesterName.Trim();

            entity.Status =
                dto.Status;

            entity.UpdatedAt =
                DateTime.UtcNow;

            entity.UpdatedBy =
                userId;

            return Map(
                await _repository.UpdateAsync(entity)
                ?? entity);
        }

        // =====================================================
        // DELETE
        // =====================================================

        public async Task<bool> DeleteAsync(
            long structureId,
            long? userId)
        {
            if (structureId <= 0)
            {
                throw new ArgumentException(
                    "Valid structure ID is required.");
            }

            return await _repository.DeleteAsync(
                structureId,
                userId);
        }

        // =====================================================
        // VALIDATION
        // =====================================================

        private static void Validate(
            CreateCourseStructureDto dto)
        {
            if (dto.CourseId <= 0)
            {
                throw new ArgumentException(
                    "Valid CourseId is required.");
            }

            if (dto.BranchId.HasValue &&
                dto.BranchId.Value <= 0)
            {
                throw new ArgumentException(
                    "Invalid BranchId.");
            }

            if (dto.YearNumber <= 0)
            {
                throw new ArgumentException(
                    "Year number must be greater than zero.");
            }

            if (dto.SemesterNumber <= 0)
            {
                throw new ArgumentException(
                    "Semester number must be greater than zero.");
            }
        }

        private static void Validate(
            UpdateCourseStructureDto dto)
        {
            if (dto.CourseId <= 0)
            {
                throw new ArgumentException(
                    "Valid CourseId is required.");
            }

            if (dto.BranchId.HasValue &&
                dto.BranchId.Value <= 0)
            {
                throw new ArgumentException(
                    "Invalid BranchId.");
            }

            if (dto.YearNumber <= 0)
            {
                throw new ArgumentException(
                    "Year number must be greater than zero.");
            }

            if (dto.SemesterNumber <= 0)
            {
                throw new ArgumentException(
                    "Semester number must be greater than zero.");
            }
        }

        // =====================================================
        // MAP
        // =====================================================

        private static CourseStructureResponseDto Map(
            CourseStructure x)
        {
            return new CourseStructureResponseDto
            {
                StructureId =
                    x.StructureId,

                CourseId =
                    x.CourseId,

                CourseCode =
                    x.Course?.CourseCode
                    ?? string.Empty,

                CourseName =
                    x.Course?.CourseName
                    ?? string.Empty,

                BranchId =
                    x.BranchId,

                BranchCode =
                    x.Branch?.BranchCode,

                BranchName =
                    x.Branch?.BranchName,

                YearNumber =
                    x.YearNumber,

                SemesterNumber =
                    x.SemesterNumber,

                SemesterName =
                    x.SemesterName,

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