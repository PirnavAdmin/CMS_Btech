using BTech.Data;
using BTech.DTOs.Profile;
using BTech.DTOs.ProfileAudit;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using Dapper;
using DocumentFormat.OpenXml.Drawing;
using DocumentFormat.OpenXml.InkML;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Hosting;
using System.Data;

using System.Net.Mail;

namespace BTech.Services
{
    public class ProfileService : IProfileService
    {
        private readonly IUserRepository _userRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IEmployeeProfileRepository _employeeProfileRepository;
        private readonly IProfileChangeAuditService _profileChangeAuditService;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ProfileService> _logger;

        public ProfileService(
            IUserRepository userRepository,
            IUserRoleRepository userRoleRepository,
            IEmployeeProfileRepository employeeProfileRepository,
            IProfileChangeAuditService profileChangeAuditService,
            ApplicationDbContext context,
            ILogger<ProfileService> logger)
        {
            _userRepository = userRepository;
            _userRoleRepository = userRoleRepository;
            _employeeProfileRepository = employeeProfileRepository;
            _profileChangeAuditService = profileChangeAuditService;
            _context = context;
            _logger = logger;
        }

        public async Task<ProfileResponseDto?> GetProfileAsync(long userId)
        {
            _logger.LogInformation(
                "Getting profile. UserId={UserId}",
                userId);

            try
            {
                var user =
                    await _userRepository.GetProfileByIdAsync(userId);

                if (user == null)
                {
                    _logger.LogWarning(
                        "Profile user was not found. UserId={UserId}",
                        userId);

                    return null;
                }

                var roles =
                    await _userRoleRepository
                        .GetRoleCodesByUserIdAsync(userId);

                var employeeProfile =
                    await _employeeProfileRepository
                        .GetByUserIdAsync(userId);

                DateTime? updatedAt = user.UpdatedAt;

                if (employeeProfile?.UpdatedAt != null &&
                    (updatedAt == null ||
                     employeeProfile.UpdatedAt > updatedAt))
                {
                    updatedAt = employeeProfile.UpdatedAt;
                }

                var response = new ProfileResponseDto
                {
                    UserId = user.user_id,
                    CollegeId = user.college_id,
                    Country = employeeProfile?.Country,
                    ProfileCompleted = user.ProfileCompleted,
                    EmployeeUserId = user.InternalIdentifier ? string.Empty : user.EmployeeUserId,
                    FullName = user.FullName,
                    Email = user.Email,
                    Mobile = user.Mobile,
                    Roles = roles,

                    DateOfBirth =
                        employeeProfile?.DateOfBirth,

                    Gender =
                        employeeProfile?.Gender,

                    DepartmentId =
                        employeeProfile?.DepartmentId,

                    DepartmentName =
                        employeeProfile?.DepartmentName,

                    Designation =
                        employeeProfile?.Designation,

                    Address =
                        employeeProfile?.Address,

                    HouseNumber =
                        employeeProfile?.HouseNumber,

                    PermanentHouseNumber =
                        employeeProfile?.PermanentHouseNumber,

                    PermanentAddress =
                        employeeProfile?.PermanentAddress,

                    PermanentPincode =
                        employeeProfile?.PermanentPincode,

                    PermanentCity =
                        employeeProfile?.PermanentCity,

                    PermanentDistrict =
                        employeeProfile?.PermanentDistrict,

                    PermanentState =
                        employeeProfile?.PermanentState,

                    PermanentCountry =
                        employeeProfile?.PermanentCountry,

                    Pincode =
                        employeeProfile?.Pincode,

                    City =
                        employeeProfile?.City,

                    District =
                        employeeProfile?.District,

                    State =
                        employeeProfile?.State,

                    AboutMe =
                        employeeProfile?.AboutMe,

                    ProfileImagePath =
                        employeeProfile?.ProfileImagePath,

                    LastLoginAt =
                        user.LastLoginAt,

                    UpdatedAt =
                        updatedAt
                };

                if (roles.Any(role =>
                    string.Equals(
                        role,
                        "STUDENT",
                        StringComparison.OrdinalIgnoreCase)))
                {
                    var student =
                        await GetStudentProfileAsync(user);

                    if (student != null)
                    {
                        response.StudentId =
                            student.StudentId;

                        response.StudentCode =
                            student.StudentCode;

                        response.FullName =
                            student.FullName;

                        response.Email =
                            student.Email ?? response.Email;

                        response.Mobile =
                            student.Mobile ?? response.Mobile;

                        response.DateOfBirth =
                            student.DateOfBirth;

                        response.Gender =
                            student.Gender;

                        response.Address =
                            student.Address;

                        response.HouseNumber =
                            student.HouseNumber;

                        response.PermanentHouseNumber =
                            student.PermanentHouseNumber;

                        response.PermanentAddress =
                            student.PermanentAddress;

                        response.PermanentPincode =
                            student.PermanentPincode;

                        response.PermanentCity =
                            student.PermanentCity;

                        response.PermanentDistrict =
                            student.PermanentDistrict;

                        response.PermanentState =
                            student.PermanentState;

                        response.PermanentCountry =
                            student.PermanentCountry;

                        response.Pincode =
                            student.Pincode;

                        response.City =
                            student.City;

                        response.District =
                            student.District;

                        response.State =
                            student.State;

                        response.Status =
                            student.Status;

                        response.RegistrationNumber =
                            student.RegistrationNumber;

                        response.AdmissionNumber =
                            student.AdmissionNumber;

                        response.RollNumber =
                            student.StudentCode;

                        response.DepartmentName =
                            student.DepartmentName;

                        response.Designation =
                            student.CourseName;

                        response.CourseName =
                            student.CourseName;

                        response.BranchName =
                            student.BranchName;

                        response.AcademicYearName =
                            student.AcademicYearName;

                        response.SemesterName =
                            student.SemesterName;

                        response.SectionName =
                            student.SectionName;

                        response.Batch =
                            student.AcademicYearName;

                        response.UpdatedAt =
                            student.UpdatedAt ??
                            response.UpdatedAt;
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Student role has no matching student record. UserId={UserId}, EmployeeUserId={EmployeeUserId}",
                            userId,
                            user.EmployeeUserId);
                    }
                }

                if (user.college_id.HasValue)
                {
                    var college = await _context.Colleges.AsNoTracking().FirstOrDefaultAsync(
                        c => c.CollegeId == user.college_id.Value && c.DeletedAt == null);
                    if (college != null)
                    {
                        response.CollegeName = college.CollegeName;
                        response.AssignedOrganization = new AssignedOrganizationResponseDto
                        {
                            CollegeId = college.CollegeId, CollegeName = college.CollegeName,
                            CollegeCode = college.CollegeCode, CollegeType = college.CollegeType,
                            UniversityName = college.UniversityName, OfficialEmail = college.Email,
                            OfficialPhone = college.Phone ?? college.Mobile, Address = college.AddressLine1,
                            AddressLine2 = college.AddressLine2, City = college.City, District = college.District,
                            State = college.State, Country = college.Country, Pincode = college.Pincode,
                            Website = college.Website
                        };
                    }
                }

                // Derive employee completion from saved fields, even if the legacy
                // users.profile_completed cache is stale. Student rules stay unchanged.
                if (EmployeeProfileCompletion.AppliesTo(roles))
                {
                    response.ProfileCompleted = employeeProfile is { Status: 1 } &&
                        EmployeeProfileCompletion.IsComplete(
                            user.FullName, user.Email, user.Mobile, employeeProfile.HouseNumber);
                }

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to get profile. UserId={UserId}",
                    userId);

                throw;
            }
        }

        public async Task<(
            bool Success,
            string Message,
            ProfileResponseDto? Data)>
            UpdateProfileAsync(
                long userId,
                UpdateProfileRequestDto request,
                long? changedBy = null)
        {
            var actorUserId = changedBy ?? userId;
            if (actorUserId != userId) throw new UnauthorizedAccessException("Profile updates are limited to the current account.");
            if (request.AboutMe != null && request.Bio != null && request.AboutMe != request.Bio)
                return (false, "bio and aboutMe must match when both are supplied.", null);
            request.AboutMe ??= request.Bio;

            _logger.LogInformation(
                "Profile update started. UserId={UserId}, ChangedBy={ChangedBy}",
                userId,
                actorUserId);

            try
            {
                // ============================================================
                // 1. Load the current profile for PATCH merging and audit comparison.
                // ============================================================

                var beforeProfile =
                    await GetProfileAsync(userId);

                if (beforeProfile == null)
                {
                    return (
                        false,
                        "User profile not found.",
                        null);
                }

                // ============================================================
                // 2. Validate basic user fields
                // ============================================================

                string? fullName = null;
                string? email = null;
                string? mobile = null;

                if (request.FullName != null)
                {
                    fullName =
                        request.FullName.Trim();

                    if (string.IsNullOrWhiteSpace(fullName))
                    {
                        return (
                            false,
                            "Full name cannot be empty.",
                            null);
                    }
                }

                if (request.Email != null)
                {
                    email =
                        request.Email.Trim();

                    if (string.IsNullOrWhiteSpace(email))
                    {
                        return (
                            false,
                            "Email cannot be empty.",
                            null);
                    }

                    try
                    {
                        var mailAddress =
                            new MailAddress(email);

                        if (!mailAddress.Address.Equals(
                                email,
                                StringComparison.OrdinalIgnoreCase))
                        {
                            return (
                                false,
                                "Invalid email address.",
                                null);
                        }
                    }
                    catch (FormatException)
                    {
                        return (
                            false,
                            "Invalid email address.",
                            null);
                    }
                }

                if (request.Mobile != null)
                {
                    mobile =
                        request.Mobile.Trim();

                    if (string.IsNullOrWhiteSpace(mobile))
                    {
                        return (
                            false,
                            "Mobile number cannot be empty.",
                            null);
                    }
                }

                // ============================================================
                // 3. Validate department if supplied
                // ============================================================

                if (request.DepartmentId.HasValue)
                {
                    var department =
                        await _employeeProfileRepository
                            .GetDepartmentByIdAsync(
                                request.DepartmentId.Value);

                    if (department == null)
                    {
                        return (
                            false,
                            "Invalid department.",
                            null);
                    }

                    var user =
                        await _userRepository
                            .GetProfileByIdAsync(userId);

                    if (user == null)
                    {
                        return (
                            false,
                            "User profile not found.",
                            null);
                    }

                    if (!user.college_id.HasValue)
                    {
                        return (
                            false,
                            "User is not assigned to a college.",
                            null);
                    }

                    if (department.CollegeId !=
                        user.college_id.Value)
                    {
                        return (
                            false,
                            "Department does not belong to the user's college.",
                            null);
                    }
                }

                College? assignedCollege = null;
                if (request.AssignedOrganization is { } organization)
                {
                    var roles = beforeProfile.Roles.Select(CanonicalRoleCode.Normalize).ToHashSet();
                    if (!roles.Contains("COLLEGE_ADMIN") || roles.Contains("STUDENT"))
                        throw new BTech.Exceptions.ForbiddenException("Only College Admin can update assigned organization details.");
                    var account = await _userRepository.GetProfileByIdAsync(userId);
                    if (account?.college_id is not > 0 ||
                        (organization.CollegeId.HasValue && organization.CollegeId != account.college_id))
                        throw new BTech.Exceptions.ForbiddenException("Only the assigned college may be updated.");
                    assignedCollege = await _context.Colleges.FirstOrDefaultAsync(
                        c => c.CollegeId == account.college_id.Value && c.DeletedAt == null);
                    if (assignedCollege == null) return (false, "Assigned college not found.", null);
                }

                // ============================================================
                // 4. Determine whether employee profile fields were supplied
                // ============================================================

                bool hasEmployeeProfileData =
                    request.DateOfBirth.HasValue ||
                    request.Gender != null ||
                    request.DepartmentId.HasValue ||
                    request.Designation != null ||
                    request.Address != null ||
                    request.Pincode != null ||
                    request.City != null ||
                    request.District != null ||
                    request.State != null ||
                    request.AboutMe != null ||
                    request.HouseNumber != null ||
                    request.PermanentHouseNumber != null ||
                    request.PermanentAddress != null ||
                    request.PermanentPincode != null ||
                    request.PermanentCity != null ||
                    request.PermanentDistrict != null ||
                    request.PermanentState != null ||
                    request.PermanentCountry != null || request.Country != null;

                if (fullName == null &&
                    email == null &&
                    mobile == null &&
                    !hasEmployeeProfileData && assignedCollege == null)
                {
                    return (
                        false,
                        "At least one profile field is required to update.",
                        null);
                }

                // ============================================================
                // 5. Update users table
                // ============================================================

                await using var transaction = await _context.Database.BeginTransactionAsync();
                if (assignedCollege != null && request.AssignedOrganization is { } org)
                {
                    assignedCollege.CollegeType = org.CollegeType ?? assignedCollege.CollegeType;
                    assignedCollege.UniversityName = org.UniversityName ?? assignedCollege.UniversityName;
                    assignedCollege.Email = org.OfficialEmail ?? assignedCollege.Email;
                    assignedCollege.Phone = org.OfficialPhone ?? assignedCollege.Phone;
                    assignedCollege.AddressLine1 = org.Address ?? assignedCollege.AddressLine1;
                    assignedCollege.AddressLine2 = org.AddressLine2 ?? assignedCollege.AddressLine2;
                    assignedCollege.City = org.City ?? assignedCollege.City;
                    assignedCollege.District = org.District ?? assignedCollege.District;
                    assignedCollege.State = org.State ?? assignedCollege.State;
                    assignedCollege.Country = org.Country ?? assignedCollege.Country;
                    assignedCollege.Pincode = org.Pincode ?? assignedCollege.Pincode;
                    assignedCollege.Website = org.Website ?? assignedCollege.Website;
                    assignedCollege.UpdatedBy = actorUserId;
                    assignedCollege.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
                if (fullName != null || email != null || mobile != null)
                {
                    var updated =
                        await _userRepository
                            .UpdateProfileAsync(
                                userId,
                                fullName,
                                email,
                                mobile);

                    if (!updated)
                    {
                        return (
                            false,
                            "User profile update failed.",
                            null);
                    }
                }

                // ============================================================
                // 6. Update employee_profiles table
                //
                // Preserve fields that were not supplied in PATCH.
                // ============================================================

                if (hasEmployeeProfileData)
                {
                    // First profile saves may have no employee_profiles row yet.
                    // Create only the current active user's row; never revive deleted rows.
                    if (EmployeeProfileCompletion.AppliesTo(beforeProfile.Roles))
                    {
                        await _context.Database.ExecuteSqlInterpolatedAsync($@"
                            INSERT INTO employee_profiles(user_id,status,created_by)
                            SELECT user_id,1,{actorUserId} FROM users u
                            WHERE u.user_id={userId} AND u.status=1 AND u.deleted_at IS NULL
                            ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)");
                    }
                    var updated =
                        await _employeeProfileRepository.UpdateAsync(
                            userId,

                            request.DateOfBirth ??
                                beforeProfile.DateOfBirth,

                            request.Gender ??
                                beforeProfile.Gender,

                            request.DepartmentId ??
                                beforeProfile.DepartmentId,

                            request.Designation ??
                                beforeProfile.Designation,

                            request.Address ??
                                beforeProfile.Address,

                            request.Pincode ??
                                beforeProfile.Pincode,

                            request.City ??
                                beforeProfile.City,

                            request.District ??
                                beforeProfile.District,

                            request.State ??
                                beforeProfile.State,

                            request.AboutMe ??
                                beforeProfile.AboutMe,

                            actorUserId,
                            request);

                    if (!updated)
                    {
                        return (
                            false,
                            "Employee profile update failed.",
                            null);
                    }
                }

                // Read back persisted values so PATCH, GET and login apply the
                // same completion rule. Never report unsaved request fields as complete.
                var updatedProfile = await GetProfileAsync(userId);
                if (updatedProfile == null)
                {
                    return (false, "User profile not found after update.", null);
                }

                if (EmployeeProfileCompletion.AppliesTo(updatedProfile.Roles))
                {
                    var completed = updatedProfile.ProfileCompleted;
                    await _context.Database.ExecuteSqlInterpolatedAsync(
                        $"UPDATE users SET profile_completed={completed} WHERE user_id={userId} AND status=1 AND deleted_at IS NULL");
                    _logger.LogInformation(
                        "Employee profile completion evaluated. UserId={UserId}, ProfileCompleted={ProfileCompleted}",
                        userId, completed);
                }

                var changes =
                    BuildChanges(
                        beforeProfile,
                        updatedProfile,
                        request);

                // ============================================================
                // 10. Save audit
                // ============================================================

                if (changes.Count > 0)
                {
                    await _profileChangeAuditService
                        .RecordAsync(
                            userId,
                            actorUserId,
                            changes);
                }

                // ============================================================
                // 11. Return response
                // ============================================================

                _logger.LogInformation(
                    "Profile update completed. UserId={UserId}, ChangedBy={ChangedBy}, ChangedFieldCount={ChangedFieldCount}",
                    userId,
                    actorUserId,
                    changes.Count);

                await transaction.CommitAsync();
                return (
                    true,
                    "Profile updated successfully.",
                    updatedProfile);
            }
            catch (Exception ex)
            {
                // IMPORTANT:
                // No transaction.RollbackAsync() here because this method
                // no longer creates a manual transaction.
                _logger.LogError(
                    ex,
                    "Profile update failed. UserId={UserId}, ChangedBy={ChangedBy}",
                    userId,
                    actorUserId);

                throw;
            }
        }

        private static List<ProfileFieldChangeDto> BuildChanges(
            ProfileResponseDto before,
            ProfileResponseDto after,
            UpdateProfileRequestDto request)
        {
            var changes =
                new List<ProfileFieldChangeDto>();

            AddIfChanged(
                changes,
                "FullName",
                request.FullName != null,
                before.FullName,
                after.FullName);

            AddIfChanged(
                changes,
                "Email",
                request.Email != null,
                before.Email,
                after.Email);

            AddIfChanged(
                changes,
                "Mobile",
                request.Mobile != null,
                before.Mobile,
                after.Mobile);

            AddIfChanged(
                changes,
                "DateOfBirth",
                request.DateOfBirth.HasValue,
                FormatDate(before.DateOfBirth),
                FormatDate(after.DateOfBirth));

            AddIfChanged(
                changes,
                "Gender",
                request.Gender != null,
                before.Gender,
                after.Gender);

            AddIfChanged(
                changes,
                "DepartmentId",
                request.DepartmentId.HasValue,
                before.DepartmentId?.ToString(),
                after.DepartmentId?.ToString());

            AddIfChanged(
                changes,
                "Designation",
                request.Designation != null,
                before.Designation,
                after.Designation);

            AddIfChanged(
                changes,
                "Address",
                request.Address != null,
                before.Address,
                after.Address);

            AddIfChanged(
                changes,
                "Pincode",
                request.Pincode != null,
                before.Pincode,
                after.Pincode);

            AddIfChanged(
                changes,
                "City",
                request.City != null,
                before.City,
                after.City);

            AddIfChanged(
                changes,
                "District",
                request.District != null,
                before.District,
                after.District);

            AddIfChanged(
                changes,
                "State",
                request.State != null,
                before.State,
                after.State);

            AddIfChanged(
                changes,
                "AboutMe",
                request.AboutMe != null,
                before.AboutMe,
                after.AboutMe);

            AddIfChanged(
                changes,
                "HouseNumber",
                request.HouseNumber != null,
                before.HouseNumber,
                after.HouseNumber);

            AddIfChanged(
                changes,
                "PermanentHouseNumber",
                request.PermanentHouseNumber != null,
                before.PermanentHouseNumber,
                after.PermanentHouseNumber);

            AddIfChanged(
                changes,
                "PermanentAddress",
                request.PermanentAddress != null,
                before.PermanentAddress,
                after.PermanentAddress);

            AddIfChanged(
                changes,
                "PermanentPincode",
                request.PermanentPincode != null,
                before.PermanentPincode,
                after.PermanentPincode);

            AddIfChanged(
                changes,
                "PermanentCity",
                request.PermanentCity != null,
                before.PermanentCity,
                after.PermanentCity);

            AddIfChanged(
                changes,
                "PermanentDistrict",
                request.PermanentDistrict != null,
                before.PermanentDistrict,
                after.PermanentDistrict);

            AddIfChanged(
                changes,
                "PermanentState",
                request.PermanentState != null,
                before.PermanentState,
                after.PermanentState);

            AddIfChanged(
                changes,
                "PermanentCountry",
                request.PermanentCountry != null,
                before.PermanentCountry,
                after.PermanentCountry);

            AddIfChanged(changes, "Country", request.Country != null, before.Country, after.Country);
            if (request.AssignedOrganization is { } organization)
            {
                foreach (var property in typeof(AssignedOrganizationUpdateDto).GetProperties())
                {
                    if (property.Name == "CollegeId" || property.GetValue(organization) == null) continue;
                    var responseProperty = typeof(AssignedOrganizationResponseDto).GetProperty(property.Name)!;
                    AddIfChanged(changes, "AssignedOrganization." + property.Name, true,
                        before.AssignedOrganization == null ? null : responseProperty.GetValue(before.AssignedOrganization)?.ToString(),
                        after.AssignedOrganization == null ? null : responseProperty.GetValue(after.AssignedOrganization)?.ToString());
                }
            }
            return changes;
        }

        private static void AddIfChanged(
            ICollection<ProfileFieldChangeDto> changes,
            string fieldName,
            bool wasProvided,
            string? oldValue,
            string? newValue)
        {
            if (!wasProvided)
                return;

            if (string.Equals(
                    oldValue,
                    newValue,
                    StringComparison.Ordinal))
            {
                return;
            }

            changes.Add(
                new ProfileFieldChangeDto
                {
                    FieldName = fieldName,
                    OldValue = oldValue,
                    NewValue = newValue
                });
        }

        private static string? FormatDate(
            DateTime? value) =>
            value?.ToString("yyyy-MM-dd");

        private async Task<StudentProfileRow?> GetStudentProfileAsync(
            User user)
        {
            const string sql = @"
                SELECT
                    s.student_id AS StudentId,
                    s.student_code AS StudentCode,
                    s.full_name AS FullName,
                    s.email AS Email,
                    s.mobile AS Mobile,
                    s.gender AS Gender,
                    s.date_of_birth AS DateOfBirth,

                    COALESCE(
                        sp.Address,
                        s.address
                    ) AS Address,

                    sp.Pincode AS Pincode,
                    sp.HouseNumber AS HouseNumber,
                    sp.PermanentHouseNumber AS PermanentHouseNumber,
                    sp.PermanentAddress AS PermanentAddress,
                    sp.PermanentPincode AS PermanentPincode,
                    sp.PermanentCity AS PermanentCity,
                    sp.PermanentDistrict AS PermanentDistrict,
                    sp.PermanentState AS PermanentState,
                    sp.PermanentCountry AS PermanentCountry,

                    sp.City AS City,
                    sp.District AS District,
                    sp.State AS State,

                    CASE
                        WHEN s.status = 1
                        THEN 'Active'
                        ELSE 'Inactive'
                    END AS Status,

                    sa.RegistrationNo AS RegistrationNumber,
                    sa.AdmissionNo AS AdmissionNumber,

                    d.department_name AS DepartmentName,
                    c.course_name AS CourseName,
                    b.branch_name AS BranchName,
                    ay.academic_year_name AS AcademicYearName,

                    COALESCE(
                        sem.semester_name,
                        CONCAT(
                            'Semester ',
                            sec.semester
                        )
                    ) AS SemesterName,

                    sec.section_code AS SectionName,

                    GREATEST(
                        COALESCE(
                            s.updated_at,
                            s.created_at
                        ),
                        COALESCE(
                            sp.UpdatedAt,
                            sp.CreatedAt
                        ),
                        COALESCE(
                            ssa.assigned_at,
                            s.created_at
                        )
                    ) AS UpdatedAt

                FROM students s

                LEFT JOIN studentadmissions sa
                    ON sa.AdmissionId = s.admission_id
                   AND sa.IsDeleted = 0

                LEFT JOIN student_profiles sp
                    ON sp.StudentId = s.student_id
                   AND sp.IsDeleted = 0

                LEFT JOIN courses c
                    ON c.course_id = s.course_id
                   AND c.deleted_at IS NULL

                LEFT JOIN branches b
                    ON b.branch_id = s.branch_id
                   AND b.deleted_at IS NULL

                LEFT JOIN departments d
                    ON d.department_id =
                        COALESCE(
                            b.department_id,
                            c.department_id
                        )
                   AND d.deleted_at IS NULL

                LEFT JOIN academicyears ay
                    ON ay.academic_year_id =
                        s.academic_year_id
                   AND ay.deleted_at IS NULL

                LEFT JOIN student_section_assignments ssa
                    ON ssa.student_id = s.student_id
                   AND ssa.status = 1

                LEFT JOIN sections sec
                    ON sec.section_id = ssa.section_id
                   AND sec.deleted_at IS NULL

                LEFT JOIN semesters sem
                    ON sem.semester_id = sec.semester_id

                WHERE s.college_id = @CollegeId
                  AND s.deleted_at IS NULL

                  AND
                  (
                      s.student_code = @EmployeeUserId
                      OR s.email = @Email
                      OR s.mobile = @Mobile

                      OR sa.StudentEmail = @Email
                      OR sa.Email = @Email
                      OR sa.MobileNumber = @Mobile

                      OR LOWER(s.full_name) =
                         LOWER(@FullName)
                  )

                ORDER BY
                    CASE
                        WHEN s.student_code =
                             @EmployeeUserId
                        THEN 1

                        WHEN s.email = @Email
                          OR s.mobile = @Mobile
                        THEN 2

                        WHEN sa.StudentEmail = @Email
                          OR sa.Email = @Email
                          OR sa.MobileNumber = @Mobile
                        THEN 3

                        ELSE 4
                    END,

                    ssa.assigned_at DESC,
                    s.student_id DESC

                LIMIT 1;";

            var connection =
                _context.Database.GetDbConnection();

            var shouldClose =
                connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                return await connection
                    .QueryFirstOrDefaultAsync<StudentProfileRow>(
                        sql,
                        new
                        {
                            CollegeId = user.college_id,
                            user.EmployeeUserId,
                            user.Email,
                            user.Mobile,
                            user.FullName
                        }, transaction: _context.Database.CurrentTransaction?.GetDbTransaction());
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        private sealed class StudentProfileRow
        {
            public string? HouseNumber { get; set; }

            public string? PermanentHouseNumber { get; set; }

            public string? PermanentAddress { get; set; }

            public string? PermanentPincode { get; set; }

            public string? PermanentCity { get; set; }

            public string? PermanentDistrict { get; set; }

            public string? PermanentState { get; set; }

            public string? PermanentCountry { get; set; }

            public long StudentId { get; set; }

            public string StudentCode { get; set; }
                = string.Empty;

            public string FullName { get; set; }
                = string.Empty;

            public string? Email { get; set; }

            public string? Mobile { get; set; }

            public string? Gender { get; set; }

            public DateTime? DateOfBirth { get; set; }

            public string? Address { get; set; }

            public string? Pincode { get; set; }

            public string? City { get; set; }

            public string? District { get; set; }

            public string? State { get; set; }

            public string? Status { get; set; }

            public string? RegistrationNumber { get; set; }

            public string? AdmissionNumber { get; set; }

            public string? DepartmentName { get; set; }

            public string? CourseName { get; set; }

            public string? BranchName { get; set; }

            public string? AcademicYearName { get; set; }

            public string? SemesterName { get; set; }

            public string? SectionName { get; set; }

            public DateTime? UpdatedAt { get; set; }
        }

        public Task<FeeSummaryDto?> GetFeeSummaryAsync(
            long studentId)
        {
            return Task.FromResult<FeeSummaryDto?>(null);
        }
    }
}
