using BTech.DTOs.AcademicYear;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class AcademicYearService : IAcademicYearService
    {
        private readonly IAcademicYearRepository _repository;

        public AcademicYearService(
            IAcademicYearRepository repository)
        {
            _repository = repository;
        }

        // =========================================================
        // ADD
        // =========================================================

        public async Task<AcademicYearResponseDto> AddAsync(
            CreateAcademicYearDto dto,
            long? userId)
        {
            ValidateDates(
                dto.StartDate,
                dto.EndDate);

            var entity =
                await _repository.AddAsync(
                    dto.AcademicYearName.Trim(),
                    dto.StartDate,
                    dto.EndDate,
                    userId)
                ?? throw new InvalidOperationException(
                    "Academic year could not be created.");

            return Map(entity);
        }

        // =========================================================
        // GET ALL
        // =========================================================

        public async Task<IEnumerable<AcademicYearResponseDto>>
            GetAllAsync()
        {
            var items =
                await _repository.GetAllAsync();

            return items.Select(Map);
        }


        // =========================================================
        // DASHBOARD
        // =========================================================

        public async Task<AcademicYearDashboardDto> GetDashboardAsync(
            string? search,
            string? filter)
        {
            var result = await _repository.GetDashboardAsync(search, filter);
            return result;
        }

        // =========================================================
        // GENERATE NEXT ACADEMIC YEAR
        // =========================================================

        public async Task<AcademicYearResponseDto> GenerateNextYearAsync(
            GenerateNextAcademicYearDto dto,
            long? userId)
        {
            var entity = await _repository.GenerateNextYearAsync(
                dto.ActivateImmediately,
                userId);

            if (entity == null)
            {
                throw new InvalidOperationException(
                    "Next academic year could not be generated.");
            }

            return Map(entity);
        }

        // =========================================================
        // GET BY ID
        // =========================================================

        public async Task<AcademicYearResponseDto?>
            GetByIdAsync(
                long academicYearId)
        {
            var entity =
                await _repository.GetByIdAsync(
                    academicYearId);

            return entity == null
                ? null
                : Map(entity);
        }

        // =========================================================
        // EDIT
        // =========================================================

        public async Task<AcademicYearResponseDto?>
            EditAsync(
                long academicYearId,
                UpdateAcademicYearDto dto,
                long? userId)
        {
            ValidateDates(
                dto.StartDate,
                dto.EndDate);

            var entity =
                await _repository.EditAsync(
                    academicYearId,
                    dto.AcademicYearName.Trim(),
                    dto.StartDate,
                    dto.EndDate,
                    userId);

            return entity == null
                ? null
                : Map(entity);
        }

        // =========================================================
        // ACTIVATE
        // =========================================================

        public Task<bool> ActivateAsync(
            long academicYearId,
            long? userId)
        {
            return _repository.ActivateAsync(
                academicYearId,
                userId);
        }

        // =========================================================
        // DEACTIVATE
        // =========================================================

        public Task<bool> DeactivateAsync(
            long academicYearId,
            long? userId)
        {
            return _repository.DeactivateAsync(
                academicYearId,
                userId);
        }

        // =========================================================
        // ARCHIVE ACADEMIC YEAR
        // =========================================================
        // Today's task:
        // Allow previous academic years to be archived
        // without deleting historical data.
        // =========================================================

        public async Task<bool> ArchiveAsync(
            long academicYearId,
            long? userId)
        {
            var entity =
                await _repository.GetByIdAsync(
                    academicYearId);

            if (entity == null)
            {
                return false;
            }

            // Already archived
            if (entity.IsArchived == 1)
            {
                throw new InvalidOperationException(
                    "Academic year is already archived.");
            }

            // Archive instead of deleting
            var archived =
                await _repository.ArchiveAsync(
                    academicYearId,
                    userId);

            return archived != null;
        }

        // =========================================================
        // DATE VALIDATION
        // =========================================================

        private static void ValidateDates(
            DateTime startDate,
            DateTime endDate)
        {
            if (endDate.Date <= startDate.Date)
            {
                throw new ArgumentException(
                    "End date must be greater than start date.");
            }
        }

        // =========================================================
        // ENTITY → DTO
        // =========================================================

        private static AcademicYearResponseDto Map(
            AcademicYear x)
        {
            return new AcademicYearResponseDto
            {
                AcademicYearId =
                    x.AcademicYearId,

                AcademicYearName =
                    x.AcademicYearName,

                StartDate =
                    x.StartDate,

                EndDate =
                    x.EndDate,

                Status =
                    x.Status,

                IsArchived =
                    x.IsArchived,

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