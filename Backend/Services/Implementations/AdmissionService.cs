using BTech.DTOs;
using BTech.Models;
using BTech.Services;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using UserRoleManagement.API.Data;

namespace BTech.Services.Implementations
{
    public class AdmissionService : IAdmissionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdmissionService> _logger;
        private readonly IAccountSetupService _accountSetupService;

        public AdmissionService(
            AppDbContext context,
            ILogger<AdmissionService> logger,
            IAccountSetupService accountSetupService)
        {
            _context = context;
            _logger = logger;
            _accountSetupService = accountSetupService;
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
            string? credentialEmail = null;
            string provisioningStatus = "NotProvisioned";
            string deliveryStatus = "NotAttempted";
            AdmissionActionResponseDto response;

            await using var transaction = await _context.Database.BeginTransactionAsync();
            var admission = await _context.Admissions
                .FirstOrDefaultAsync(x => x.AdmissionId == admissionId && !x.IsDeleted);
            if (admission == null) return null;

            var previousStatus = NormalizeStatus(admission.AdmissionStatus);
            if (admission.IsRejected || previousStatus == "Rejected")
                throw new InvalidOperationException("Rejected admission cannot be approved.");
            if (!admission.IsApproved && previousStatus != "Approved" && !CanApproveFrom(previousStatus))
                throw new InvalidOperationException($"Admission cannot be approved from status '{admission.AdmissionStatus}'.");

            var now = DateTime.UtcNow;
            if (!admission.IsApproved)
            {
                admission.AdmissionStatus = "Approved";
                admission.Status = "Approved";
                admission.IsApproved = true;
                admission.IsRejected = false;
                admission.IsVerified = true;
                admission.ApprovedBy = userId;
                admission.ApprovedAt = now;
                admission.ReviewedBy = userId;
                admission.ReviewedAt ??= now;
                admission.UpdatedBy = userId;
                admission.UpdatedAt = now;
                admission.Remarks = request?.Remarks;
                if (string.IsNullOrWhiteSpace(admission.AdmissionNo))
                    admission.AdmissionNo = BuildAdmissionNumber(admission.AdmissionId, now);
                admission.AdmissionDate ??= now.Date;

                _context.AdmissionStatusHistories.Add(new AdmissionStatusHistory
                {
                    AdmissionId = admission.AdmissionId,
                    PreviousStatus = previousStatus,
                    NewStatus = "Approved",
                    ActionType = "APPROVED",
                    Remarks = request?.Remarks,
                    ChangedBy = userId,
                    ChangedAt = now,
                    IsApproved = true,
                    IsRejected = false,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedAt = now,
                    UpdatedBy = userId,
                    UpdatedAt = now
                });
            }

            // Use the existing students.admission_id -> students.user_id relationship.
            // This makes approval retries idempotent without introducing a new table.
            if (string.IsNullOrWhiteSpace(admission.AdmissionNo))
                throw new InvalidOperationException("Admission number is required before provisioning student credentials.");

            var admissionNo = admission.AdmissionNo.Trim();
            var student = await _context.Students
                .SingleOrDefaultAsync(s => s.AdmissionId == admission.AdmissionId);
            if (student?.DeletedAt != null)
                throw new InvalidOperationException("A deleted student record is linked to this admission. Manual review is required; it will not be recreated automatically.");

            var approver = userId.HasValue
                ? await _context.Users.SingleOrDefaultAsync(x => x.user_id == userId.Value)
                : null;
            var creator = admission.CreatedBy.HasValue
                ? await _context.Users.SingleOrDefaultAsync(x => x.user_id == admission.CreatedBy.Value)
                : null;
            var collegeId = student != null && student.CollegeId > 0
                ? student.CollegeId
                : approver?.college_id ?? creator?.college_id;

            // The Admission entity/table has no college column. Use the existing student
            // mapping first, then the approver/creator's college, and enforce tenant isolation.
            if (student != null && approver?.college_id.HasValue == true &&
                student.CollegeId != approver.college_id.Value)
                throw new UnauthorizedAccessException("Approver is not authorized for this student's college.");
            if (!collegeId.HasValue || !await _context.Colleges.AnyAsync(c => c.CollegeId == collegeId.Value))
                throw new InvalidOperationException("Cannot provision student account: owning college could not be established.");

            if (student != null && student.CollegeId != collegeId.Value)
                throw new InvalidOperationException("Existing student college conflicts with the admission college. Manual tenant-isolation review is required.");

            var academicYearId = student?.AcademicYearId ?? admission.AcademicYearId;
            if (!academicYearId.HasValue)
                throw new InvalidOperationException("Cannot provision a student account: an academic year must be assigned to the admission or existing student record.");
            var academicYear = await _context.AcademicYears.SingleOrDefaultAsync(y =>
                y.AcademicYearId == academicYearId.Value && y.DeletedAt == null && y.IsArchived == 0);
            if (academicYear == null)
                throw new InvalidOperationException("Cannot provision a student account: the academic year is missing, archived, or deleted.");
            if (academicYear.CollegeId != collegeId.Value)
                throw new InvalidOperationException("The academic year belongs to a different college. Student provisioning was blocked to preserve college isolation.");

            var studentRole = await _context.Roles.SingleOrDefaultAsync(r =>
                r.RoleCode == "STUDENT" && r.Status == 1 && r.DeletedAt == null);
            if (studentRole == null)
                throw new InvalidOperationException("Active STUDENT role is missing; account provisioning was rolled back.");

            User? account = null;
            if (student?.UserId is long linkedUserId)
            {
                account = await _context.Users.SingleOrDefaultAsync(x => x.user_id == linkedUserId);
                if (account == null)
                    throw new InvalidOperationException("Student.user_id points to a missing account. Repair the link before retrying approval.");
                if (account.DeletedAt != null || account.Status != 1)
                {
                    // Never silently reactivate an intentionally disabled account.
                    provisioningStatus = "LinkedAccountDisabledNotActivated";
                    deliveryStatus = "NotResentExistingAccount";
                }
                else
                {
                    if (account.college_id.HasValue && account.college_id.Value != collegeId.Value)
                        throw new InvalidOperationException("Linked account college conflicts with the admission college. Manual tenant-isolation review is required.");
                    if (!account.college_id.HasValue)
                    {
                        account.college_id = collegeId.Value;
                        account.UpdatedAt = now;
                        account.UpdatedBy = userId;
                    }

                    var roleMapping = await _context.UserRoleMappings.SingleOrDefaultAsync(r =>
                        r.UserId == account.user_id && r.RoleId == studentRole.Role_id);
                    if (roleMapping == null)
                    {
                        _context.UserRoleMappings.Add(new UserRoleMapping
                        {
                            UserId = account.user_id,
                            RoleId = studentRole.Role_id,
                            Status = 1,
                            AssignedAt = now,
                            AssignedBy = userId
                        });
                        provisioningStatus = "ExistingAccountRepairedMissingRoleOrCollege";
                    }
                    else if (roleMapping.Status != 1 || roleMapping.RemovedAt != null)
                    {
                        // Do not reactivate an explicitly disabled role mapping.
                        provisioningStatus = "LinkedAccountRoleDisabledNotActivated";
                    }
                    else
                    {
                        provisioningStatus = "AlreadyProvisioned";
                    }
                    if (account.MustChangePassword && !string.IsNullOrWhiteSpace(account.Email))
                    {
                        credentialEmail = account.Email;
                        deliveryStatus = "PendingSetupLink";
                        provisioningStatus = "ExistingAccountNeedsPasswordSetup";
                    }
                    else
                    {
                        deliveryStatus = "NotResentExistingAccount";
                    }
                }
            }
            else
            {
                // An unlinked student row may be repaired, but account collisions are never adopted implicitly.
                var email = string.IsNullOrWhiteSpace(admission.StudentEmail)
                    ? admission.Email?.Trim()
                    : admission.StudentEmail.Trim();
                var mobile = admission.MobileNumber?.Trim();
                var collision = await _context.Users.AnyAsync(u => u.DeletedAt == null &&
                    (u.EmployeeUserId == admissionNo ||
                     (!string.IsNullOrWhiteSpace(email) && u.Email != null && u.Email.ToLower() == email.ToLower()) ||
                     (!string.IsNullOrWhiteSpace(mobile) && u.Mobile == mobile)));
                if (collision)
                    throw new InvalidOperationException("Student account provisioning blocked by an existing login identifier, email, or mobile collision. Resolve the identity manually.");

                if (student == null)
                {
                    var duplicateStudentCode = await _context.Students.AnyAsync(s => s.StudentCode == admissionNo);
                    if (duplicateStudentCode)
                        throw new InvalidOperationException("Admission number is already used as a student code by another record.");

                    var fullNameForStudent = string.Join(" ", new[] { admission.FirstName, admission.LastName }
                        .Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
                    student = new Student
                    {
                        AdmissionId = admission.AdmissionId,
                        CollegeId = collegeId.Value,
                        StudentCode = admissionNo,
                        FullName = fullNameForStudent,
                        Gender = admission.Gender,
                        DateOfBirth = admission.DateOfBirth,
                        Email = string.IsNullOrWhiteSpace(email) ? null : email,
                        Mobile = string.IsNullOrWhiteSpace(mobile) ? null : mobile,
                        BloodGroup = admission.BloodGroup,
                        Address = admission.Address,
                        AcademicYearId = academicYearId.Value,
                        Status = 1,
                        CreatedAt = now,
                        CreatedBy = userId
                    };
                    _context.Students.Add(student);
                }
                else
                {
                    // Existing student row may have no user link; preserve its other academic data.
                    if (student.CollegeId != collegeId.Value)
                        throw new InvalidOperationException("Existing student college conflicts with the admission college.");
                    if (student.UserId.HasValue)
                        throw new InvalidOperationException("Student account link changed during provisioning. Retry after checking the current record.");
                }

                // The account receives a random unshared initial secret. The student sets
                // their real password through the single-use email link after approval.
                var initialSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
                var fullName = string.Join(" ", new[] { admission.FirstName, admission.LastName }
                    .Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
                account = new User
                {
                    college_id = collegeId.Value,
                    EmployeeUserId = admissionNo,
                    FullName = fullName,
                    Email = string.IsNullOrWhiteSpace(email) ? null : email,
                    Mobile = string.IsNullOrWhiteSpace(mobile) ? null : mobile,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(initialSecret, workFactor: 12),
                    MustChangePassword = true,
                    Status = 1,
                    CreatedAt = now,
                    CreatedBy = userId
                };
                _context.Users.Add(account);
                await _context.SaveChangesAsync(); // obtain user_id before linking it

                _context.UserRoleMappings.Add(new UserRoleMapping
                {
                    UserId = account.user_id,
                    RoleId = studentRole.Role_id,
                    Status = 1,
                    AssignedAt = now,
                    AssignedBy = userId
                });
                student.UserId = account.user_id;
                student.UpdatedAt = now;
                student.UpdatedBy = userId;
                await _context.SaveChangesAsync();

                credentialEmail = email;
                provisioningStatus = "Provisioned";
                deliveryStatus = string.IsNullOrWhiteSpace(credentialEmail) ? "FailedNoStudentEmail" : "Pending";
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Setup links are delivered only after the account/admission transaction commits.
            // Existing accounts only receive a fresh link if they still require initial setup.
            if ((provisioningStatus == "Provisioned" ||
                 provisioningStatus == "ExistingAccountNeedsPasswordSetup") &&
                !string.IsNullOrWhiteSpace(credentialEmail))
            {
                try
                {
                    var accountUserId = account?.user_id
                        ?? throw new InvalidOperationException("Provisioned account ID is unavailable.");
                    await _accountSetupService.SendSetupLinkAsync(accountUserId, "student");
                    deliveryStatus = "Sent";
                }
                catch (Exception ex)
                {
                    deliveryStatus = "FailedEmailDelivery";
                    _logger.LogWarning(ex,
                        "Student account setup email delivery failed. AdmissionId={AdmissionId}, UserId={UserId}",
                        admission.AdmissionId, account?.user_id);
                }
            }

            response = new AdmissionActionResponseDto
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
                ChangedAt = now,
                Remarks = admission.Remarks,
                RejectionReason = admission.RejectionReason,
                AccountProvisioningStatus = provisioningStatus,
                CredentialDeliveryStatus = deliveryStatus
            };
            return response;
        }

        private static string GenerateTemporaryPassword()
        {
            // Random, one-time temporary secret. Only its BCrypt hash is persisted.
            var bytes = RandomNumberGenerator.GetBytes(18);
            return Convert.ToBase64String(bytes).Replace("+", "A").Replace("/", "b").TrimEnd('=') + "!7";
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