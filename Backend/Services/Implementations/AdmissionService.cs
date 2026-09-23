using BTech.DTOs;
using BTech.Models;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UserRoleManagement.API.Data;

namespace BTech.Services.Implementations
{
    public class AdmissionService : IAdmissionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdmissionService> _logger;

        public AdmissionService(
            AppDbContext context,
            ILogger<AdmissionService> logger)
        {
            _context = context;
            _logger = logger;
        }


        private static string NormalizeStatus(string? status)
        {
            var value = (status ?? string.Empty).Trim();

            return value.ToLowerInvariant() switch
            {
                "submitted" => "Application Submitted",
                "pending" => "Application Submitted",
                "application submitted" => "Application Submitted",
                "under_review" => "Under Review",
                "under review" => "Under Review",
                "verified" => "Document Verification",
                "document verification" => "Document Verification",
                "approved" => "Approved",
                "rejected" => "Rejected",
                "draft" => "Draft",
                _ => value
            };
        }

        private static bool CanApproveFrom(string? status)
        {
            var normalized = NormalizeStatus(status);
            return normalized == "Application Submitted"
                || normalized == "Under Review"
                || normalized == "Document Verification";
        }

        private static bool CanRejectFrom(string? status)
        {
            var normalized = NormalizeStatus(status);
            return normalized == "Application Submitted"
                || normalized == "Under Review"
                || normalized == "Document Verification";
        }

        private static string BuildAdmissionNumber(long admissionId, DateTime now)
            => $"ADM{now:yyyy}{admissionId:D3}";

        // =====================================================
        // APPROVE ADMISSION
        // =====================================================

        public async Task<AdmissionActionResponseDto?>
            ApproveAdmissionAsync(
                long admissionId,
                AdmissionStatusRequestDto request,
                long? userId)
        {
            var admission = await _context.Admissions
                .FirstOrDefaultAsync(x =>
                    x.AdmissionId == admissionId &&
                    !x.IsDeleted);

            if (admission == null)
                return null;

            var previousStatus = NormalizeStatus(admission.AdmissionStatus);

            if (admission.IsApproved || previousStatus == "Approved")
                throw new InvalidOperationException("Admission is already approved.");

            if (admission.IsRejected || previousStatus == "Rejected")
                throw new InvalidOperationException("Rejected admission cannot be approved.");

            // The frontend calls the direct approve endpoint after submission.
            // Explicitly support the real statuses stored by studentadmissions.
            if (!CanApproveFrom(previousStatus))
            {
                throw new InvalidOperationException(
                    $"Admission cannot be approved from status '{admission.AdmissionStatus}'. " +
                    "Allowed source statuses are Application Submitted, Under Review, or Document Verification.");
            }

            var currentTime = DateTime.UtcNow;

            admission.AdmissionStatus = "Approved";
            admission.Status = "Approved";
            admission.IsApproved = true;
            admission.IsRejected = false;
            admission.IsVerified = true;
            admission.ApprovedBy = userId;
            admission.ApprovedAt = currentTime;
            admission.ReviewedBy = userId;
            admission.ReviewedAt ??= currentTime;
            admission.UpdatedBy = userId;
            admission.UpdatedAt = currentTime;
            admission.Remarks = request?.Remarks;

            // Approval contract requires an admission number to be generated.
            if (string.IsNullOrWhiteSpace(admission.AdmissionNo))
                admission.AdmissionNo = BuildAdmissionNumber(admission.AdmissionId, currentTime);

            admission.AdmissionDate ??= currentTime.Date;

            var history = new AdmissionStatusHistory
            {
                AdmissionId = admission.AdmissionId,
                PreviousStatus = previousStatus,
                NewStatus = "Approved",
                ActionType = "APPROVED",
                Remarks = request?.Remarks,
                RejectionReason = null,
                ChangedBy = userId,
                ChangedAt = currentTime,
                IsApproved = true,
                IsRejected = false,
                IsActive = true,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedAt = currentTime,
                UpdatedBy = userId,
                UpdatedAt = currentTime,
                DeletedBy = null,
                DeletedAt = null
            };

            _context.AdmissionStatusHistories.Add(history);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(
                    ex,
                    "Admission approval database failure. AdmissionId={AdmissionId}, UserId={UserId}, PreviousStatus={PreviousStatus}",
                    admissionId,
                    userId,
                    previousStatus);
                throw;
            }

            return new AdmissionActionResponseDto
            {
                AdmissionId = admission.AdmissionId,
                PreviousStatus = previousStatus,
                NewStatus = admission.AdmissionStatus,
                ActionType = "APPROVED",
                AdmissionNo = admission.AdmissionNo,
                AdmissionDate = admission.AdmissionDate,
                IsApproved = admission.IsApproved,
                IsRejected = admission.IsRejected,
                ChangedBy = userId,
                ChangedAt = currentTime,
                Remarks = admission.Remarks,
                RejectionReason = null
            };
        }


        // =====================================================
        // REJECT ADMISSION
        // =====================================================

        public async Task<AdmissionActionResponseDto?>
            RejectAdmissionAsync(
                long admissionId,
                AdmissionStatusRequestDto request,
                long? userId)
        {
            var admission = await _context.Admissions
                .FirstOrDefaultAsync(x =>
                    x.AdmissionId == admissionId &&
                    !x.IsDeleted);

            if (admission == null)
                return null;

            var previousStatus = NormalizeStatus(admission.AdmissionStatus);

            if (admission.IsApproved || previousStatus == "Approved")
                throw new InvalidOperationException("Approved admission cannot be rejected.");

            if (admission.IsRejected || previousStatus == "Rejected")
                throw new InvalidOperationException("Admission is already rejected.");

            if (!CanRejectFrom(previousStatus))
            {
                throw new InvalidOperationException(
                    $"Admission cannot be rejected from status '{admission.AdmissionStatus}'. " +
                    "Allowed source statuses are Application Submitted, Under Review, or Document Verification.");
            }

            if (string.IsNullOrWhiteSpace(request?.RejectionReason))
                throw new ArgumentException("Rejection reason is required.");

            var currentTime = DateTime.UtcNow;

            admission.AdmissionStatus = "Rejected";
            admission.Status = "Rejected";
            admission.IsApproved = false;
            admission.IsRejected = true;
            admission.RejectedBy = userId;
            admission.RejectedAt = currentTime;
            admission.ReviewedBy = userId;
            admission.ReviewedAt ??= currentTime;
            admission.UpdatedBy = userId;
            admission.UpdatedAt = currentTime;
            admission.RejectionReason = request.RejectionReason;
            admission.Remarks = request.Remarks;

            var history = new AdmissionStatusHistory
            {
                AdmissionId = admission.AdmissionId,
                PreviousStatus = previousStatus,
                NewStatus = "Rejected",
                ActionType = "REJECTED",
                Remarks = request.Remarks,
                RejectionReason = request.RejectionReason,
                ChangedBy = userId,
                ChangedAt = currentTime,
                IsApproved = false,
                IsRejected = true,
                IsActive = true,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedAt = currentTime,
                UpdatedBy = userId,
                UpdatedAt = currentTime,
                DeletedBy = null,
                DeletedAt = null
            };

            _context.AdmissionStatusHistories.Add(history);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(
                    ex,
                    "Admission rejection database failure. AdmissionId={AdmissionId}, UserId={UserId}, PreviousStatus={PreviousStatus}",
                    admissionId,
                    userId,
                    previousStatus);
                throw;
            }

            return new AdmissionActionResponseDto
            {
                AdmissionId = admission.AdmissionId,
                PreviousStatus = previousStatus,
                NewStatus = admission.AdmissionStatus,
                ActionType = "REJECTED",
                AdmissionNo = admission.AdmissionNo,
                AdmissionDate = admission.AdmissionDate,
                IsApproved = admission.IsApproved,
                IsRejected = admission.IsRejected,
                ChangedBy = userId,
                ChangedAt = currentTime,
                Remarks = admission.Remarks,
                RejectionReason = admission.RejectionReason
            };
        }


        // =====================================================
        // GET STATUS HISTORY
        // =====================================================

        public async Task<List<AdmissionStatusHistoryDto>>
            GetStatusHistoryAsync(long admissionId)
        {
            return await _context
                .AdmissionStatusHistories
                .AsNoTracking()
                .Where(x =>
                    x.AdmissionId == admissionId &&
                    !x.IsDeleted)
                .OrderByDescending(
                    x => x.ChangedAt)
                .Select(x =>
                    new AdmissionStatusHistoryDto
                    {
                        AdmissionStatusHistoryId =
                            x.AdmissionStatusHistoryId,

                        AdmissionId =
                            x.AdmissionId,

                        PreviousStatus =
                            x.PreviousStatus,

                        NewStatus =
                            x.NewStatus,

                        ActionType =
                            x.ActionType,

                        Remarks =
                            x.Remarks,

                        RejectionReason =
                            x.RejectionReason,

                        ChangedBy =
                            x.ChangedBy,

                        ChangedAt =
                            x.ChangedAt,

                        IsApproved =
                            x.IsApproved,

                        IsRejected =
                            x.IsRejected
                    })
                .ToListAsync();
        }
    }
}