using BTech.DTOs.Electives;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class ElectiveApprovalService : IElectiveApprovalService
    {
        private readonly IElectiveApprovalRepository _repository;
        private readonly ILogger<ElectiveApprovalService> _logger;

        public ElectiveApprovalService(
            IElectiveApprovalRepository repository,
            ILogger<ElectiveApprovalService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<IEnumerable<ElectiveApprovalResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveApprovalListRequestDto request)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException("Invalid college information.");
            }

            request ??= new ElectiveApprovalListRequestDto();

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

            if (!string.IsNullOrWhiteSpace(request.ApprovalStatus))
            {
                request.ApprovalStatus =
                    request.ApprovalStatus.Trim().ToUpperInvariant();

                if (request.ApprovalStatus != "PENDING" &&
                    request.ApprovalStatus != "APPROVED" &&
                    request.ApprovalStatus != "REJECTED")
                {
                    throw new ArgumentException(
                        "ApprovalStatus must be PENDING, APPROVED or REJECTED.");
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

        public async Task<ElectiveApprovalResponseDto?> UpdateAsync(
            long collegeId,
            long selectionId,
            ElectiveApprovalRequestDto request,
            long approvedBy)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException("Invalid college information.");
            }

            if (selectionId <= 0)
            {
                throw new ArgumentException(
                    "SelectionId must be greater than zero.");
            }

            if (approvedBy <= 0)
            {
                throw new ArgumentException(
                    "Invalid approving user information.");
            }

            if (request == null)
            {
                throw new ArgumentNullException(
                    nameof(request),
                    "Approval request is required.");
            }

            request.ApprovalStatus =
                request.ApprovalStatus?.Trim().ToUpperInvariant()
                ?? string.Empty;

            if (request.ApprovalStatus != "APPROVED" &&
                request.ApprovalStatus != "REJECTED")
            {
                throw new ArgumentException(
                    "ApprovalStatus must be APPROVED or REJECTED.");
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

            return await _repository.UpdateAsync(
                collegeId,
                selectionId,
                request,
                approvedBy);
        }
    }
}