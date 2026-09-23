using BTech.Data;
using BTech.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/admissions")]
    public class AdmissionStatusController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AdmissionStatusController(ApplicationDbContext context)
        {
            _context = context;
        }


        // =========================================================
        // GET CURRENT STATUS
        // GET: api/admissions/1/status
        // =========================================================

        [HttpGet("{admissionId:long}/status")]
        public async Task<IActionResult> GetAdmissionStatus(long admissionId)
        {
            try
            {
                var admission = await _context.StudentAdmissions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.AdmissionId == admissionId &&
                        !x.IsDeleted);

                if (admission == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Admission not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Admission status retrieved successfully.",
                    data = new
                    {
                        admissionId = admission.AdmissionId,
                        admissionNo = admission.AdmissionNo,
                        registrationNo = admission.RegistrationNo,
                        applicationNo = admission.ApplicationNo,
                        admissionStatus = admission.AdmissionStatus
                    }
                });
            }
            catch (Exception) { throw; }
        }


        // =========================================================
        // UPDATE STATUS
        // PUT: api/admissions/1/status
        // =========================================================

        [HttpPut("{admissionId:long}/status")]
        public async Task<IActionResult> UpdateAdmissionStatus(
            long admissionId,
            [FromBody] UpdateAdmissionStatusRequest request)
        {
            try
            {
                if (request == null ||
                    string.IsNullOrWhiteSpace(request.NewStatus))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "New status is required."
                    });
                }


                // =================================================
                // FIND ADMISSION
                // =================================================

                var admission = await _context.StudentAdmissions
                    .FirstOrDefaultAsync(x =>
                        x.AdmissionId == admissionId &&
                        !x.IsDeleted);

                if (admission == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Admission not found."
                    });
                }


                var previousStatus = admission.AdmissionStatus;

                var newStatus = request.NewStatus.Trim();


                // =================================================
                // SAME STATUS
                // =================================================

                if (string.Equals(
                        previousStatus,
                        newStatus,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "New status is same as current status."
                    });
                }


                var now = DateTime.Now;


                // =================================================
                // UPDATE ADMISSION
                // =================================================

                admission.AdmissionStatus = newStatus;

                admission.UpdatedBy = request.ChangedBy;
                admission.UpdatedAt = now;


                // =================================================
                // STATUS-SPECIFIC INFORMATION
                // =================================================

                switch (newStatus)
                {
                    case "Application Submitted":

                        admission.SubmittedAt = now;

                        break;


                    case "Under Review":

                        admission.ReviewedAt = now;
                        admission.ReviewedBy = request.ChangedBy;

                        break;


                    case "Approved":

                        admission.ApprovedAt = now;
                        admission.ApprovedBy = request.ChangedBy;
                        admission.IsApproved = true;
                        admission.IsRejected = false;

                        break;


                    case "Rejected":

                        admission.RejectedAt = now;
                        admission.RejectedBy = request.ChangedBy;
                        admission.RejectionReason = request.Reason;
                        admission.IsRejected = true;
                        admission.IsApproved = false;

                        break;


                    case "Admitted":

                        admission.AdmittedAt = now;
                        admission.IsApproved = true;
                        admission.IsRejected = false;

                        break;


                    case "Cancelled":

                        admission.CancelledAt = now;
                        admission.CancelledBy = request.ChangedBy;
                        admission.CancellationReason = request.Reason;

                        break;


                    case "Withdrawn":

                        admission.WithdrawnAt = now;
                        admission.WithdrawalReason = request.Reason;

                        break;


                    case "Document Verification":

                        admission.DocumentsVerified = true;
                        admission.DocumentsVerifiedAt = now;
                        admission.DocumentsVerifiedBy =
                            request.ChangedBy;

                        break;


                    case "Waitlisted":

                        admission.WaitlistedAt = now;

                        break;


                    case "Admission Offered":

                        admission.OfferDate = now;

                        break;


                    case "Fee Pending":

                        break;


                    case "Interview Scheduled":

                        admission.InterviewStatus = "Scheduled";

                        break;


                    case "Interview Completed":

                        admission.InterviewStatus = "Completed";

                        break;
                }


                // =================================================
                // CREATE HISTORY
                // =================================================

                var history = new AdmissionStatusHistory
                {
                    AdmissionId = admissionId,

                    PreviousStatus = previousStatus,

                    NewStatus = newStatus,

                    ActionType =
                        string.IsNullOrWhiteSpace(request.ActionType)
                            ? "STATUS_CHANGED"
                            : request.ActionType.Trim(),

                    Remarks = request.Remarks,

                    RejectionReason =
                        newStatus == "Rejected"
                            ? request.Reason
                            : null,

                    ChangedBy = request.ChangedBy,

                    ChangedAt = now,

                    IsApproved =
                        newStatus == "Approved" ||
                        newStatus == "Admitted",

                    IsRejected =
                        newStatus == "Rejected",

                    IsActive = true,

                    IsDeleted = false,

                    CreatedBy = request.ChangedBy,

                    CreatedAt = now,

                    UpdatedBy = request.ChangedBy,

                    UpdatedAt = now,

                    DeletedBy = null,

                    DeletedAt = null
                };


                _context.AdmissionStatusHistories.Add(history);


                // =================================================
                // SAVE
                // =================================================

                await _context.SaveChangesAsync();


                // =================================================
                // RESPONSE
                // =================================================

                return Ok(new
                {
                    success = true,
                    message = "Admission status updated successfully.",

                    data = new
                    {
                        admissionId = admission.AdmissionId,

                        admissionNo = admission.AdmissionNo,

                        previousStatus = previousStatus,

                        newStatus = admission.AdmissionStatus,

                        changedBy = request.ChangedBy,

                        changedAt = now
                    }
                });
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error updating admission status.",
                    error = ex.InnerException?.Message ?? ex.Message
                });
            }
            catch (Exception) { throw; }
        }


        // =========================================================
        // GET STATUS HISTORY
        // GET: api/admissions/1/status-history
        // =========================================================

        [HttpGet("{admissionId:long}/status-history")]
        public async Task<IActionResult> GetStatusHistory(long admissionId)
        {
            try
            {
                var admissionExists =
                    await _context.StudentAdmissions
                        .AsNoTracking()
                        .AnyAsync(x =>
                            x.AdmissionId == admissionId &&
                            !x.IsDeleted);

                if (!admissionExists)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Admission not found."
                    });
                }


                var history =
                    await _context.AdmissionStatusHistories
                        .AsNoTracking()
                        .Where(x =>
                            x.AdmissionId == admissionId &&
                            !x.IsDeleted)
                        .OrderBy(x => x.ChangedAt)
                        .Select(x => new
                        {
                            admissionStatusHistoryId =
                                x.AdmissionStatusHistoryId,

                            admissionId =
                                x.AdmissionId,

                            previousStatus =
                                x.PreviousStatus,

                            newStatus =
                                x.NewStatus,

                            actionType =
                                x.ActionType,

                            remarks =
                                x.Remarks,

                            rejectionReason =
                                x.RejectionReason,

                            changedBy =
                                x.ChangedBy,

                            changedAt =
                                x.ChangedAt,

                            isApproved =
                                x.IsApproved,

                            isRejected =
                                x.IsRejected,

                            createdBy =
                                x.CreatedBy,

                            createdAt =
                                x.CreatedAt,

                            updatedBy =
                                x.UpdatedBy,

                            updatedAt =
                                x.UpdatedAt
                        })
                        .ToListAsync();


                return Ok(new
                {
                    success = true,
                    message =
                        "Admission status history retrieved successfully.",

                    data = history
                });
            }
            catch (Exception) { throw; }
        }
    }


    // =============================================================
    // REQUEST MODEL
    // =============================================================

    public class UpdateAdmissionStatusRequest
    {
        public string NewStatus { get; set; } = string.Empty;

        public string? ActionType { get; set; }

        public string? Remarks { get; set; }

        public string? Reason { get; set; }

        public long? ChangedBy { get; set; }
    }
}