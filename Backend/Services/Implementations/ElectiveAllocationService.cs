using BTech.DTOs.Electives;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class ElectiveAllocationService : IElectiveAllocationService
    {
        private readonly IElectiveAllocationRepository _repository;
        private readonly ILogger<ElectiveAllocationService> _logger;

        public ElectiveAllocationService(
            IElectiveAllocationRepository repository,
            ILogger<ElectiveAllocationService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<IEnumerable<ElectiveAllocationResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveAllocationListRequestDto request)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException(
                    "Invalid college information.");
            }

            request ??= new ElectiveAllocationListRequestDto();

            if (request.AcademicYearId.HasValue &&
                request.AcademicYearId.Value <= 0)
            {
                throw new ArgumentException(
                    "AcademicYearId must be greater than zero.");
            }

            if (request.CourseId.HasValue &&
                request.CourseId.Value <= 0)
            {
                throw new ArgumentException(
                    "CourseId must be greater than zero.");
            }

            if (request.BranchId.HasValue &&
                request.BranchId.Value <= 0)
            {
                throw new ArgumentException(
                    "BranchId must be greater than zero.");
            }

            if (request.SemesterId.HasValue &&
                request.SemesterId.Value <= 0)
            {
                throw new ArgumentException(
                    "SemesterId must be greater than zero.");
            }

            if (request.ElectiveGroupId.HasValue &&
                request.ElectiveGroupId.Value <= 0)
            {
                throw new ArgumentException(
                    "ElectiveGroupId must be greater than zero.");
            }

            if (!string.IsNullOrWhiteSpace(request.AllocationStatus))
            {
                request.AllocationStatus =
                    request.AllocationStatus
                        .Trim()
                        .ToUpperInvariant();

                if (request.AllocationStatus != "ALLOCATED")
                {
                    throw new ArgumentException(
                        "AllocationStatus must be ALLOCATED.");
                }
            }

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                request.Search = request.Search.Trim();

                if (request.Search.Length > 150)
                {
                    throw new ArgumentException(
                        "Search cannot exceed 150 characters.");
                }
            }

            return await _repository.GetAllAsync(
                collegeId,
                request);
        }

        public async Task<ElectiveAllocationResponseDto?> CreateAsync(
            long collegeId,
            long selectionId,
            ElectiveAllocationCreateDto request,
            long allocatedBy)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException(
                    "Invalid college information.");
            }

            if (selectionId <= 0)
            {
                throw new ArgumentException(
                    "SelectionId must be greater than zero.");
            }

            if (allocatedBy <= 0)
            {
                throw new ArgumentException(
                    "Invalid allocating user information.");
            }

            if (request == null)
            {
                throw new ArgumentNullException(
                    nameof(request),
                    "Allocation request is required.");
            }

            if (!string.IsNullOrWhiteSpace(request.Remarks))
            {
                request.Remarks = request.Remarks.Trim();

                if (request.Remarks.Length > 500)
                {
                    throw new ArgumentException(
                        "Remarks cannot exceed 500 characters.");
                }
            }
            else
            {
                request.Remarks = null;
            }

            return await _repository.CreateAsync(
                collegeId,
                selectionId,
                request,
                allocatedBy);
        }
    }
}