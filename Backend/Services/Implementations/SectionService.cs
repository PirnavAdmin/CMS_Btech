using BTech.DTOs.Sections;
using BTech.Exceptions;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class SectionService : ISectionService
    {
        private readonly ISectionRepository _repository;
        private readonly ILogger<SectionService> _logger;

        public SectionService(
            ISectionRepository repository,
            ILogger<SectionService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        // =========================================================
        // GET ALL
        // =========================================================

        public async Task<IEnumerable<SectionResponseDto>>
            GetAllAsync()
        {
            try
            {
                _logger.LogInformation(
                    "SectionService: Getting all sections.");

                var result =
                    await _repository.GetAllAsync();

                _logger.LogInformation(
                    "SectionService: Retrieved sections successfully.");

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "SectionService: Error while getting all sections.");

                throw;
            }
        }

        // =========================================================
        // GET BY ID
        // =========================================================

        public async Task<SectionResponseDto?>
            GetByIdAsync(long sectionId)
        {
            try
            {
                if (sectionId <= 0)
                {
                    throw new BusinessException(
                        "Invalid section ID.");
                }

                _logger.LogInformation(
                    "SectionService: Getting section. SectionId: {SectionId}",
                    sectionId);

                return await _repository.GetByIdAsync(
                    sectionId);
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "SectionService: Error getting section. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
        }

        // =========================================================
        // SEARCH
        // =========================================================

        public async Task<IEnumerable<SectionResponseDto>>
            SearchAsync(
                string? search,
                long? departmentId,
                long? courseId,
                long? branchId,
                long? semesterId,
                bool? status)
        {
            try
            {
                _logger.LogInformation(
                    "SectionService: Searching sections. " +
                    "Search={Search}, DepartmentId={DepartmentId}, " +
                    "CourseId={CourseId}, BranchId={BranchId}, " +
                    "SemesterId={SemesterId}, Status={Status}",
                    search,
                    departmentId,
                    courseId,
                    branchId,
                    semesterId,
                    status);

                return await _repository.SearchAsync(
                    search,
                    departmentId,
                    courseId,
                    branchId,
                    semesterId,
                    status);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "SectionService: Error searching sections.");

                throw;
            }
        }

        // =========================================================
        // CREATE
        // =========================================================

        public async Task<long> CreateAsync(
            CreateSectionRequestDto request,
            long userId)
        {
            try
            {
                _logger.LogInformation(
                    "SectionService: Creating section. " +
                    "SectionCode={SectionCode}, UserId={UserId}",
                    request.SectionCode,
                    userId);

                if (userId <= 0)
                {
                    throw new BusinessException(
                        "Invalid authenticated user.");
                }

                if (request.CollegeId <= 0)
                {
                    throw new BusinessException(
                        "College is required.");
                }

                if (request.AcademicYearId <= 0)
                {
                    throw new BusinessException(
                        "Academic year is required.");
                }

                if (request.DepartmentId <= 0)
                {
                    throw new BusinessException(
                        "Department is required.");
                }

                if (request.CourseId <= 0)
                {
                    throw new BusinessException(
                        "Course is required.");
                }

                if (request.BranchId <= 0)
                {
                    throw new BusinessException(
                        "Branch is required.");
                }

                if (request.SemesterId <= 0)
                {
                    throw new BusinessException(
                        "Semester is required.");
                }

                if (string.IsNullOrWhiteSpace(
                    request.SectionCode))
                {
                    throw new BusinessException(
                        "Section code is required.");
                }

                if (string.IsNullOrWhiteSpace(
                    request.SectionName))
                {
                    throw new BusinessException(
                        "Section name is required.");
                }

                if (request.Capacity <= 0)
                {
                    throw new BusinessException(
                        "Section capacity must be greater than zero.");
                }

                var section = new Section
                {
                    CollegeId =
                        request.CollegeId,

                    AcademicYearId =
                        request.AcademicYearId,

                    DepartmentId =
                        request.DepartmentId,

                    CourseId =
                        request.CourseId,

                    BranchId =
                        request.BranchId,

                    SemesterId =
                        request.SemesterId,

                    SectionCode =
                        request.SectionCode.Trim(),

                    SectionName =
                        request.SectionName.Trim(),

                    Capacity =
                        request.Capacity,

                    FacultyAdvisorEmployeeProfileId =
                        request.FacultyAdvisorEmployeeProfileId,

                    Room =
                        string.IsNullOrWhiteSpace(request.Room)
                            ? null
                            : request.Room.Trim(),

                    Shift =
                        string.IsNullOrWhiteSpace(request.Shift)
                            ? null
                            : request.Shift.Trim(),

                    SectionType =
                        string.IsNullOrWhiteSpace(request.SectionType)
                            ? null
                            : request.SectionType.Trim(),

                    Status = true,

                    IsArchived = false,

                    CreatedBy = userId
                };

                var sectionId =
                    await _repository.CreateAsync(
                        section);

                _logger.LogInformation(
                    "SectionService: Section created successfully. " +
                    "SectionId={SectionId}, SectionCode={SectionCode}",
                    sectionId,
                    section.SectionCode);

                return sectionId;
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "SectionService: Error creating section. " +
                    "SectionCode={SectionCode}",
                    request.SectionCode);

                throw;
            }
        }

        // =========================================================
        // UPDATE
        // =========================================================

        public async Task UpdateAsync(
            long sectionId,
            UpdateSectionRequestDto request,
            long userId)
        {
            try
            {
                _logger.LogInformation(
                    "SectionService: Updating section. " +
                    "SectionId={SectionId}, UserId={UserId}",
                    sectionId,
                    userId);

                if (sectionId <= 0)
                {
                    throw new BusinessException(
                        "Invalid section ID.");
                }

                if (userId <= 0)
                {
                    throw new BusinessException(
                        "Invalid authenticated user.");
                }

                if (string.IsNullOrWhiteSpace(
                    request.SectionCode))
                {
                    throw new BusinessException(
                        "Section code is required.");
                }

                if (string.IsNullOrWhiteSpace(
                    request.SectionName))
                {
                    throw new BusinessException(
                        "Section name is required.");
                }

                if (request.Capacity <= 0)
                {
                    throw new BusinessException(
                        "Section capacity must be greater than zero.");
                }

                var existing =
                    await _repository.GetByIdAsync(
                        sectionId);

                if (existing == null)
                {
                    throw new NotFoundException(
                        "Section not found.");
                }

                var model = new Section
                {
                    SectionId = sectionId,

                    CollegeId =
                        existing.CollegeId,

                    AcademicYearId =
                        existing.AcademicYearId,

                    DepartmentId =
                        existing.DepartmentId,

                    CourseId =
                        existing.CourseId,

                    BranchId =
                        existing.BranchId,

                    SemesterId =
                        existing.SemesterId,

                    SectionCode =
                        request.SectionCode.Trim(),

                    SectionName =
                        request.SectionName.Trim(),

                    Capacity =
                        request.Capacity,

                    FacultyAdvisorEmployeeProfileId =
                        request.FacultyAdvisorEmployeeProfileId,

                    Room =
                        string.IsNullOrWhiteSpace(request.Room)
                            ? null
                            : request.Room.Trim(),

                    Shift =
                        string.IsNullOrWhiteSpace(request.Shift)
                            ? null
                            : request.Shift.Trim(),

                    SectionType =
                        string.IsNullOrWhiteSpace(request.SectionType)
                            ? null
                            : request.SectionType.Trim(),

                    Status =
                        existing.Status,

                    IsArchived =
                        existing.IsArchived,

                    UpdatedBy =
                        userId
                };

                var updated =
                    await _repository.UpdateAsync(
                        model);

                if (!updated)
                {
                    throw new BusinessException(
                        "Section update failed.");
                }

                _logger.LogInformation(
                    "SectionService: Section updated successfully. " +
                    "SectionId={SectionId}",
                    sectionId);
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (NotFoundException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "SectionService: Error updating section. " +
                    "SectionId={SectionId}",
                    sectionId);

                throw;
            }
        }

        // =========================================================
        // DELETE / ARCHIVE
        // =========================================================

        public async Task DeleteAsync(
            long sectionId,
            long userId)
        {
            try
            {
                if (sectionId <= 0)
                {
                    throw new BusinessException(
                        "Invalid section ID.");
                }

                if (userId <= 0)
                {
                    throw new BusinessException(
                        "Invalid authenticated user.");
                }

                _logger.LogInformation(
                    "SectionService: Archiving section. " +
                    "SectionId={SectionId}, UserId={UserId}",
                    sectionId,
                    userId);

                var existing =
                    await _repository.GetByIdAsync(
                        sectionId);

                if (existing == null)
                {
                    throw new NotFoundException(
                        "Section not found.");
                }

                var deleted =
                    await _repository.DeleteAsync(
                        sectionId,
                        userId);

                if (!deleted)
                {
                    throw new BusinessException(
                        "Section could not be archived.");
                }

                _logger.LogInformation(
                    "SectionService: Section archived successfully. " +
                    "SectionId={SectionId}",
                    sectionId);
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (NotFoundException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "SectionService: Error archiving section. " +
                    "SectionId={SectionId}",
                    sectionId);

                throw;
            }
        }

        // =========================================================
        // STATUS
        // =========================================================

        public async Task UpdateStatusAsync(
            long sectionId,
            bool status,
            long userId)
        {
            try
            {
                if (sectionId <= 0)
                {
                    throw new BusinessException(
                        "Invalid section ID.");
                }

                if (userId <= 0)
                {
                    throw new BusinessException(
                        "Invalid authenticated user.");
                }

                _logger.LogInformation(
                    "SectionService: Updating status. " +
                    "SectionId={SectionId}, Status={Status}",
                    sectionId,
                    status);

                var existing =
                    await _repository.GetByIdAsync(
                        sectionId);

                if (existing == null)
                {
                    throw new NotFoundException(
                        "Section not found.");
                }

                var updated =
                    await _repository.UpdateStatusAsync(
                        sectionId,
                        status,
                        userId);

                if (!updated)
                {
                    throw new BusinessException(
                        "Section status update failed.");
                }

                _logger.LogInformation(
                    "SectionService: Status updated successfully. " +
                    "SectionId={SectionId}, Status={Status}",
                    sectionId,
                    status);
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (NotFoundException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "SectionService: Error updating status. " +
                    "SectionId={SectionId}",
                    sectionId);

                throw;
            }
        }

        // =========================================================
        // CAPACITY
        // =========================================================

        public async Task<SectionCapacityValidationDto>
            ValidateCapacityAsync(
                long? sectionId,
                int capacity)
        {
            try
            {
                if (capacity <= 0)
                {
                    throw new BusinessException(
                        "Section capacity must be greater than zero.");
                }

                if (sectionId.HasValue &&
                    sectionId.Value <= 0)
                {
                    throw new BusinessException(
                        "Invalid section ID.");
                }

                _logger.LogInformation(
                    "SectionService: Validating capacity. " +
                    "SectionId={SectionId}, Capacity={Capacity}",
                    sectionId,
                    capacity);

                return await _repository.ValidateCapacityAsync(
                    sectionId,
                    capacity);
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "SectionService: Error validating capacity. " +
                    "SectionId={SectionId}, Capacity={Capacity}",
                    sectionId,
                    capacity);

                throw;
            }
        }

        public async Task<SectionSummaryResponseDto> GetSummaryAsync()
        {
            try
            {
                _logger.LogInformation(
                    "Getting section management summary.");

                var summary =
                    await _repository.GetSummaryAsync();

                _logger.LogInformation(
                    "Section management summary retrieved successfully.");

                return summary;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while getting section management summary.");

                throw;
            }
        }
    }
}