using BTech.DTOs.AcademicYear;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace BTech.Services.Implementations
{
    public class AcademicYearService : IAcademicYearService
    {
        private readonly IAcademicYearRepository _repository;
        private readonly ILogger<AcademicYearService> _logger;

        public AcademicYearService(
            IAcademicYearRepository repository,
            ILogger<AcademicYearService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<AcademicYearResponseDto> AddAsync(
            long collegeId,
            CreateAcademicYearDto dto,
            long? userId)
        {
            ValidateDates(dto.StartDate, dto.EndDate);

            var entity = await _repository.AddAsync(
                collegeId,
                dto.AcademicYearName.Trim(),
                dto.StartDate,
                dto.EndDate,
                userId)
                ?? throw new InvalidOperationException(
                    "Academic year could not be created.");

            _logger.LogInformation(
                "Academic year service created a record for CollegeId={CollegeId}, ActorUserId={ActorUserId}",
                collegeId, userId);

            return Map(entity);
        }

        public async Task<IEnumerable<AcademicYearResponseDto>> GetAllAsync(
            long collegeId)
        {
            var items = await _repository.GetAllAsync(collegeId);
            return items.Select(Map);
        }

        public Task<AcademicYearDashboardDto> GetDashboardAsync(
            long collegeId,
            string? search,
            string? filter)
        {
            return _repository.GetDashboardAsync(collegeId, search, filter);
        }

        public async Task<AcademicYearResponseDto> GenerateNextYearAsync(
            long collegeId,
            GenerateNextAcademicYearDto dto,
            long? userId)
        {
            var entity = await _repository.GenerateNextYearAsync(
                collegeId,
                dto.ActivateImmediately,
                userId,
                dto.StartDate);

            if (entity == null)
            {
                throw new InvalidOperationException(
                    "Next academic year could not be generated.");
            }

            return Map(entity);
        }

        public async Task<AcademicYearResponseDto?> GetByIdAsync(
            long academicYearId,
            long collegeId)
        {
            var entity = await _repository.GetByIdAsync(
                academicYearId,
                collegeId);

            return entity == null ? null : Map(entity);
        }

        public async Task<AcademicYearResponseDto?> EditAsync(
            long academicYearId,
            long collegeId,
            UpdateAcademicYearDto dto,
            long? userId)
        {
            ValidateDates(dto.StartDate, dto.EndDate);

            var entity = await _repository.EditAsync(
                academicYearId,
                collegeId,
                dto.AcademicYearName.Trim(),
                dto.StartDate,
                dto.EndDate,
                userId);

            return entity == null ? null : Map(entity);
        }

        public Task<bool> ActivateAsync(
            long academicYearId,
            long collegeId,
            long? userId)
        {
            return _repository.ActivateAsync(
                academicYearId,
                collegeId,
                userId);
        }

        public Task<bool> DeactivateAsync(
            long academicYearId,
            long collegeId,
            long? userId)
        {
            return _repository.DeactivateAsync(
                academicYearId,
                collegeId,
                userId);
        }

        public async Task<bool> ArchiveAsync(
            long academicYearId,
            long collegeId,
            long? userId)
        {
            var entity = await _repository.GetByIdAsync(
                academicYearId,
                collegeId);

            if (entity == null)
                return false;

            if (entity.IsArchived == 1)
            {
                throw new InvalidOperationException(
                    "Academic year is already archived.");
            }

            var archived = await _repository.ArchiveAsync(
                academicYearId,
                collegeId,
                userId);

            return archived != null;
        }

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

        private static AcademicYearResponseDto Map(AcademicYear x)
        {
            return new AcademicYearResponseDto
            {
                AcademicYearId = x.AcademicYearId,
                CollegeId = x.CollegeId,
                AcademicYearName = x.AcademicYearName,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                Status = x.Status,
                IsArchived = x.IsArchived,
                CreatedAt = x.CreatedAt,
                CreatedBy = x.CreatedBy,
                UpdatedAt = x.UpdatedAt,
                UpdatedBy = x.UpdatedBy
            };
        }
    }
}
