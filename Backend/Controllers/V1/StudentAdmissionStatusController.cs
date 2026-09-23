using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Rules;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/student-admissions")]
    public class StudentAdmissionStatusController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public StudentAdmissionStatusController(
            ApplicationDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // GET CURRENT STATUS + WORKFLOW INFORMATION
        // =========================================================

        [HttpGet("{admissionId:long}/status")]
        public async Task<IActionResult> GetStudentAdmissionStatus(
    long admissionId)
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
                    message = "Student admission not found.",
                    data = (object?)null
                });
            }

            var currentStatus = AdmissionStatusRules.Normalize(admission.AdmissionStatus);
            var allowedNextStatuses = AdmissionStatusRules.GetAllowedNextStatuses(currentStatus);
            var isFinalStatus = AdmissionStatusRules.IsFinalStatus(currentStatus);

            return Ok(new
            {
                success = true,
                message =
                    "Student admission status retrieved successfully.",

                data = new
                {
                    admissionId = admission.AdmissionId,
                    currentStatus = currentStatus,
                    allowedNextStatuses = allowedNextStatuses,
                    canChangeStatus =
                        allowedNextStatuses.Length > 0,
                    isFinalStatus = isFinalStatus,
                    statusFlow =
                        "Draft -> Application Submitted -> Under Review -> Document Verification -> Approved/Rejected"
                }
            });
        }


        [HttpGet("{admissionId:long}/status-history")]
        public async Task<IActionResult> GetStatusHistory(long admissionId)
        {
            var exists = await _context.StudentAdmissions
                .AsNoTracking()
                .AnyAsync(x => x.AdmissionId == admissionId && !x.IsDeleted);

            if (!exists)
                return NotFound(new { success = false, message = "Student admission not found.", data = (object?)null });

            var rows = await _context.AdmissionStatusHistories
                .AsNoTracking()
                .Where(x => x.AdmissionId == admissionId && !x.IsDeleted)
                .OrderByDescending(x => x.ChangedAt)
                .ThenByDescending(x => x.AdmissionStatusHistoryId)
                .ToListAsync();

            return Ok(new { success = true, message = "Admission status history retrieved successfully.", data = rows });
        }

        // =========================================================
        // POST - CHANGE STATUS
        // =========================================================

        [HttpPost("{admissionId:long}/status")]
        public async Task<IActionResult> ChangeStudentAdmissionStatus(
            long admissionId,
            [FromBody] ChangeAdmissionStatusRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.NewStatus))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "NewStatus is required.",
                    data = (object?)null
                });
            }

            var newStatus =
                AdmissionStatusRules.Normalize(
                    request.NewStatus);

            // -----------------------------------------------------
            // Validate requested status
            // -----------------------------------------------------

            if (!AdmissionStatusRules.IsValidStatus(newStatus))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "NewStatus must be Draft, Application Submitted, Under Review, Document Verification, Correction Required, Approved, or Rejected.",
                    data = (object?)null
                });
            }

            // -----------------------------------------------------
            // Find admission
            // -----------------------------------------------------

            var admission =
                await _context.StudentAdmissions
                    .FirstOrDefaultAsync(x =>
                        x.AdmissionId == admissionId &&
                        !x.IsDeleted);

            if (admission == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Student admission not found.",
                    data = (object?)null
                });
            }

            // Get actual current status
            var currentStatus = admission.AdmissionStatus;

            // -----------------------------------------------------
            // Prevent same status
            // -----------------------------------------------------

            if (string.Equals(
                    currentStatus,
                    newStatus,
                    StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        $"Status is already {currentStatus}.",
                    data = (object?)null
                });
            }

            // -----------------------------------------------------
            // PREVENT INVALID STATUS TRANSITIONS
            // -----------------------------------------------------

            if (!AdmissionStatusRules.IsAllowedTransition(
                    currentStatus,
                    newStatus))
            {
                return Conflict(new
                {
                    success = false,
                    message =
                        $"Invalid status transition: " +
                        $"{currentStatus} -> {newStatus}. " +
                        "Allowed flow: Draft -> Application Submitted -> Under Review -> Document Verification -> Approved/Rejected.",
                    data = (object?)null
                });
            }

            // -----------------------------------------------------
            // Rejection reason validation
            // -----------------------------------------------------

            if (newStatus == "Rejected" &&
                string.IsNullOrWhiteSpace(
                    request.RejectionReason))
            {
                return BadRequest(new
                {
                    success = false,
                    message =
                        "RejectionReason is required when status is Rejected.",
                    data = (object?)null
                });
            }

            var now = DateTime.Now;
            await using var transaction = await _context.Database.BeginTransactionAsync();
            long? generatedStudentId = null;

            // -----------------------------------------------------
            // Update admission status
            // -----------------------------------------------------

            admission.AdmissionStatus = newStatus;
            admission.Status = newStatus;
            admission.UpdatedAt = now;

            // -----------------------------------------------------
            // Status-specific fields
            // -----------------------------------------------------

            if (newStatus == "Application Submitted")
            {
                admission.SubmittedAt = now;
                admission.IsApproved = false;
                admission.IsRejected = false;
            }
            else if (newStatus == "Under Review")
            {
                admission.ReviewedAt = now;
            }
            else if (newStatus == "Document Verification")
            {
                admission.IsVerified = true;
                admission.DocumentsVerified = true;
                admission.DocumentsVerifiedAt = now;
            }
            else if (newStatus == "Approved")
            {
                admission.ApprovedAt = now;
                admission.AdmissionDate ??= now.Date;
                admission.AdmissionNo ??= $"ADM{now:yyyy}{admission.AdmissionId:D3}";
                admission.IsVerified = true;
                admission.IsApproved = true;
                admission.IsRejected = false;
            }
            else if (newStatus == "Rejected")
            {
                admission.RejectedAt = now;

                admission.RejectionReason =
                    request.RejectionReason;

                admission.IsRejected = true;
                admission.IsApproved = false;
            }

            // -----------------------------------------------------
            // Save status history
            // -----------------------------------------------------

            var history = new AdmissionStatusHistory
            {
                AdmissionId =
                    admission.AdmissionId,

                PreviousStatus =
                    currentStatus,

                NewStatus =
                    newStatus,

                ActionType =
                    $"STATUS_{newStatus.ToUpperInvariant()}",

                Remarks =
                    request.Remarks,

                RejectionReason =
                    newStatus == "Rejected"
                        ? request.RejectionReason
                        : null,

                ChangedAt =
                    now,

                IsApproved =
                    newStatus == "Approved",

                IsRejected =
                    newStatus == "Rejected",

                IsActive = true,

                IsDeleted = false,

                CreatedAt = now,

                UpdatedAt = now
            };

            _context.AdmissionStatusHistories.Add(history);

            await _context.SaveChangesAsync();

            if (newStatus == "Approved")
            {
                generatedStudentId = await EnsureApprovedStudentAsync(admissionId);
                if (generatedStudentId.HasValue)
                    await EnsureParentFromAdmissionAsync(generatedStudentId.Value, admission);
            }

            await transaction.CommitAsync();

            // -----------------------------------------------------
            // Response
            // -----------------------------------------------------

            var allowedNextStatuses =
                AdmissionStatusRules.GetAllowedNextStatuses(
                    newStatus);

            var isFinalStatus =
                AdmissionStatusRules.IsFinalStatus(
                    newStatus);

            return Ok(new
            {
                success = true,

                message =
                    "Student admission status updated successfully.",

                data = new
                {
                    admissionId =
                        admission.AdmissionId,

                    previousStatus =
                        currentStatus,

                    newStatus =
                        newStatus,

                    studentId = generatedStudentId,

                    allowedNextStatuses =
                        allowedNextStatuses,

                    canChangeStatus =
                        allowedNextStatuses.Length > 0,

                    isFinalStatus =
                        isFinalStatus
                }
            });
        }
        private async Task<long?> EnsureApprovedStudentAsync(long admissionId)
        {
            // Idempotent: repeated reads of an already-approved admission return the same student.
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            await using (var insert = connection.CreateCommand())
            {
                insert.Transaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                insert.CommandText = @"
INSERT INTO students
(admission_id, college_id, student_code, full_name, gender, date_of_birth, email, mobile, blood_group, address, course_id, branch_id, academic_year_id, status, created_at)
SELECT
    sa.AdmissionId,
    COALESCE(sa.AcademicCollegeId, sec.college_id),
    COALESCE(NULLIF(sa.AdmissionNo,''), CONCAT('ADM', YEAR(UTC_DATE()), LPAD(sa.AdmissionId,3,'0'))),
    TRIM(CONCAT_WS(' ', sa.FirstName, sa.LastName)),
    sa.Gender, sa.DateOfBirth, COALESCE(sa.StudentEmail, sa.Email), sa.MobileNumber, sa.BloodGroup, sa.Address,
    COALESCE(sa.AcademicCourseId, sec.course_id),
    COALESCE(sa.AcademicBranchId, sec.branch_id),
    sa.AcademicYearId, 1, UTC_TIMESTAMP()
FROM studentadmissions sa
LEFT JOIN sections sec ON sec.section_id = sa.SectionId
WHERE sa.AdmissionId = @admissionId
  AND sa.IsDeleted = 0
  AND NOT EXISTS (SELECT 1 FROM students s WHERE s.admission_id = sa.AdmissionId AND s.deleted_at IS NULL);";
                var parameter = insert.CreateParameter();
                parameter.ParameterName = "@admissionId";
                parameter.Value = admissionId;
                insert.Parameters.Add(parameter);
                await insert.ExecuteNonQueryAsync();
            }

            await using var select = connection.CreateCommand();
            select.Transaction = _context.Database.CurrentTransaction?.GetDbTransaction();
            select.CommandText = "SELECT MIN(student_id) FROM students WHERE admission_id=@admissionId AND deleted_at IS NULL";
            var p = select.CreateParameter();
            p.ParameterName = "@admissionId";
            p.Value = admissionId;
            select.Parameters.Add(p);
            var value = await select.ExecuteScalarAsync();
            return value == null || value == DBNull.Value ? null : Convert.ToInt64(value);
        }

        private async Task EnsureParentFromAdmissionAsync(long studentId, StudentAdmission admission)
        {
            var parent = await _context.StudentParents.FirstOrDefaultAsync(x => x.StudentId == studentId);
            if (parent == null)
            {
                parent = new StudentParent { StudentId = studentId, CreatedAt = DateTime.UtcNow };
                _context.StudentParents.Add(parent);
            }
            parent.FatherName = admission.FatherName;
            parent.MotherName = admission.MotherName;
            parent.MotherEmail = admission.MotherEmail;
            parent.GuardianName = admission.GuardianName;
            parent.GuardianMobile = admission.GuardianMobile;
            parent.GuardianEmail = admission.GuardianEmail;
            parent.Occupation = admission.Occupation;
            parent.AnnualIncome = admission.AnnualIncome;
            parent.Address = admission.Address;
            parent.City = admission.City;
            parent.District = admission.District;
            parent.State = admission.State;
            parent.Pincode = admission.Pincode;
            parent.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

    }
}