using BTech.Data;
using BTech.DTOs;
using BTech.Models;
using BTech.Rules;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using BTech.Services.Interfaces;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;

namespace BTech.Controllers.V1
{
    [ApiController]
    [Route("api/v1/student-admissions")]
    public class StudentAdmissionStatusController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAccountSetupService _accountSetupService;
        private readonly ILogger<StudentAdmissionStatusController> _logger;

        public StudentAdmissionStatusController(
            ApplicationDbContext context,
            IAccountSetupService accountSetupService,
            ILogger<StudentAdmissionStatusController> logger)
        {
            _context = context;
            _accountSetupService = accountSetupService;
            _logger = logger;
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

            var accountProvisioningStatus = "NotRequired";
            var credentialDeliveryStatus = "NotAttempted";
            if (newStatus == "Approved" && generatedStudentId.HasValue)
            {
                try
                {
                    var accountResult = await EnsureApprovedStudentAccountAsync(
                        generatedStudentId.Value,
                        admissionId);

                    accountProvisioningStatus = accountResult.ProvisioningStatus;
                    credentialDeliveryStatus = accountResult.HasEmail ? "NotRequired" : "FailedNoStudentEmail";

                    if (accountResult.NeedsSetupLink && accountResult.HasEmail)
                    {
                        try
                        {
                            await _accountSetupService.SendSetupLinkAsync(
                                accountResult.UserId,
                                "student");
                            credentialDeliveryStatus = "Sent";
                        }
                        catch (Exception emailException)
                        {
                            credentialDeliveryStatus = "FailedEmailDelivery";
                            _logger.LogWarning(emailException,
                                "Student account was provisioned but setup email delivery failed. AdmissionId={AdmissionId}, StudentId={StudentId}, UserId={UserId}",
                                admissionId, generatedStudentId.Value, accountResult.UserId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    accountProvisioningStatus = "Failed";
                    credentialDeliveryStatus = "NotSentProvisioningFailed";
                    _logger.LogError(ex,
                        "Student admission was approved but account provisioning could not be completed. AdmissionId={AdmissionId}, StudentId={StudentId}",
                        admissionId, generatedStudentId.Value);
                }
            }

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
                    accountProvisioningStatus,
                    credentialDeliveryStatus,

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

        private async Task<(long UserId, bool NeedsSetupLink, bool HasEmail, string ProvisioningStatus)>
            EnsureApprovedStudentAccountAsync(long studentId, long admissionId)
        {
            await using var accountTransaction = await _context.Database.BeginTransactionAsync();

            var student = await _context.Students.SingleOrDefaultAsync(s =>
                s.StudentId == studentId && s.AdmissionId == admissionId && s.DeletedAt == null);
            if (student == null)
                throw new InvalidOperationException("Approved student record was not found.");

            if (student.CollegeId <= 0 || student.AcademicYearId <= 0)
                throw new InvalidOperationException("Student college and academic year must be configured before account provisioning.");

            var collegeExists = await _context.Colleges.AnyAsync(c =>
                c.CollegeId == student.CollegeId && c.DeletedAt == null && c.Status == 1);
            if (!collegeExists)
                throw new InvalidOperationException("Student's college is missing or inactive.");

            var academicYearExists = await _context.AcademicYears.AnyAsync(y =>
                y.AcademicYearId == student.AcademicYearId &&
                y.CollegeId == student.CollegeId &&
                y.DeletedAt == null &&
                y.IsArchived == 0);
            if (!academicYearExists)
                throw new InvalidOperationException("Student academic year is missing, archived, or belongs to another college.");

            var studentRole = await _context.Roles.SingleOrDefaultAsync(r =>
                r.RoleCode == "STUDENT" && r.Status == 1 && r.DeletedAt == null);
            if (studentRole == null)
                throw new InvalidOperationException("Active STUDENT role is missing.");

            User? user = null;
            var createdNewAccount = false;
            if (student.UserId.HasValue)
            {
                user = await _context.Users.SingleOrDefaultAsync(u =>
                    u.user_id == student.UserId.Value);
                if (user == null)
                    throw new InvalidOperationException("Student.user_id points to a missing user account.");
                if (user.Status != 1 || user.DeletedAt != null)
                    throw new InvalidOperationException("The linked student user account is inactive or deleted.");
                if (user.college_id.HasValue && user.college_id.Value != student.CollegeId)
                    throw new InvalidOperationException("The linked student user belongs to another college.");
                if (!user.college_id.HasValue)
                {
                    user.college_id = student.CollegeId;
                    user.UpdatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                var loginId = student.StudentCode.Trim();
                var email = student.Email?.Trim();
                var mobile = student.Mobile?.Trim();
                var collision = await _context.Users.AnyAsync(u => u.DeletedAt == null &&
                    (u.EmployeeUserId == loginId ||
                     (!string.IsNullOrWhiteSpace(email) && u.Email != null &&
                      u.Email.ToLower() == email.ToLower()) ||
                     (!string.IsNullOrWhiteSpace(mobile) && u.Mobile == mobile)));
                if (collision)
                    throw new InvalidOperationException("Student account provisioning was blocked because the login ID, email, or mobile already belongs to another user.");

                var randomInitialSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
                user = new User
                {
                    college_id = student.CollegeId,
                    EmployeeUserId = loginId,
                    FullName = student.FullName,
                    Email = string.IsNullOrWhiteSpace(email) ? null : email,
                    Mobile = string.IsNullOrWhiteSpace(mobile) ? null : mobile,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(randomInitialSecret, workFactor: 12),
                    MustChangePassword = true,
                    Status = 1,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                student.UserId = user.user_id;
                student.UpdatedAt = DateTime.UtcNow;
                createdNewAccount = true;
            }

            var roleMapping = await _context.UserRoles.SingleOrDefaultAsync(r =>
                r.UserId == user.user_id && r.RoleId == studentRole.Role_id);
            if (roleMapping == null)
            {
                _context.UserRoles.Add(new UserRole
                {
                    UserId = user.user_id,
                    RoleId = studentRole.Role_id,
                    Status = 1,
                    AssignedAt = DateTime.UtcNow
                });
            }
            else if (roleMapping.Status != 1 || roleMapping.RemovedAt != null)
            {
                throw new InvalidOperationException("The linked student role is disabled. An administrator must review it before login.");
            }

            await _context.SaveChangesAsync();
            await accountTransaction.CommitAsync();

            var hasEmail = !string.IsNullOrWhiteSpace(user.Email);
            var needsSetup = user.MustChangePassword && hasEmail;
            var status = createdNewAccount
                ? "Provisioned"
                : needsSetup ? "ExistingAccountNeedsPasswordSetup" : "AlreadyProvisioned";

            return (user.user_id, needsSetup, hasEmail, status);
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