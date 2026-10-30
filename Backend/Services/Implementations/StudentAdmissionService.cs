using BTech.DTOs.StudentAdmission;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using System.Text.Json;

namespace BTech.Services.Implementations
{
    public class StudentAdmissionService : IStudentAdmissionService
    {
        private readonly IStudentAdmissionRepository _repository;
        private readonly IStudentAcademicDetailsRepository _academicRepository;

        public StudentAdmissionService(IStudentAdmissionRepository repository, IStudentAcademicDetailsRepository academicRepository)
        {
            _repository = repository;
            _academicRepository = academicRepository;
        }

        public async Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionDto dto,
            long? userId)
        {
            HydrateFromFrontendForm(dto);
            Validate(dto);

            var entity = BuildEntity(dto);
            entity.CreatedBy = userId;

            var result = await _repository.CreateAsync(entity);
            if (result == null)
                throw new InvalidOperationException("Student admission could not be created.");

            await SaveFormDataAsync(result.AdmissionId, dto.FormData, userId);
            await PersistAcademicMappingAsync(result.AdmissionId, dto, userId);
            return Map(await _repository.GetByIdAsync(result.AdmissionId) ?? result);
        }

        public async Task<StudentAdmissionResponseDto?> UpdateAsync(
            long admissionId,
            UpdateStudentAdmissionDto dto,
            long? userId)
        {
            if (admissionId <= 0)
                throw new ArgumentException("Valid AdmissionId is required.");

            HydrateFromFrontendForm(dto);
            Validate(dto);

            var entity = BuildEntity(dto);
            entity.AdmissionId = admissionId;
            entity.UpdatedBy = userId;

            var result = await _repository.UpdateAsync(entity);
            if (result == null) return null;

            await SaveFormDataAsync(admissionId, dto.FormData, userId);
            await PersistAcademicMappingAsync(admissionId, dto, userId);
            return Map(await _repository.GetByIdAsync(admissionId) ?? result);
        }

        public async Task<StudentAdmissionResponseDto?> GetByIdAsync(long admissionId)
        {
            if (admissionId <= 0)
                throw new ArgumentException("Valid AdmissionId is required.");

            var result = await _repository.GetByIdAsync(admissionId);
            return result == null ? null : Map(result);
        }

        public async Task<StudentAdmissionPagedResponseDto> GetAllAsync(
            string? search,
            string? admissionStatus,
            int pageNumber,
            int pageSize, long? courseId = null, long? departmentId = null, long? branchId = null, long? semesterId = null, long? academicYearId = null)
        {
            if (pageNumber <= 0)
                throw new ArgumentException("PageNumber must be greater than zero.");

            if (pageSize < 0 || pageSize > 100)
                throw new ArgumentException("PageSize must be between 1 and 100.");

            var result = await _repository.GetAllAsync(
                Clean(search),
                Clean(admissionStatus),
                pageNumber,
                pageSize, courseId, departmentId, branchId, semesterId, academicYearId);

            return new StudentAdmissionPagedResponseDto
            {
                Items = result.Items.Select(Map).ToArray(),
                PageNumber = pageNumber,
                PageSize = pageSize == 0 ? result.Items.Count : pageSize,
                TotalRecords = result.TotalRecords,
                TotalPages = result.TotalRecords == 0
                    ? 0
                    : pageSize == 0 ? 1 : (int)Math.Ceiling(result.TotalRecords / (double)pageSize)
            };
        }

        private static StudentAdmission BuildEntity(CreateStudentAdmissionDto dto)
        {
            return new StudentAdmission
            {
                    RegistrationNo = Clean(dto.RegistrationNo),
                    RegistrationDate = dto.RegistrationDate?.Date,
                    ApplicationNo = Clean(dto.ApplicationNo),
                    ApplicationDate = dto.ApplicationDate?.Date,
                    AdmissionNo = Clean(dto.AdmissionNo),
                    AdmissionDate = dto.AdmissionDate?.Date,
                    AdmissionType = Clean(dto.AdmissionType),
                    AdmissionQuota = Clean(dto.AdmissionQuota),
                    Medium = Clean(dto.Medium),
                    ScholarshipStatus = Clean(dto.ScholarshipStatus),
                    FirstName = dto.FirstName.Trim(),
                    LastName = Clean(dto.LastName),
                    Gender = NormalizeGender(dto.Gender),
                    DateOfBirth = dto.DateOfBirth.Date,
                    BloodGroup = Clean(dto.BloodGroup),
                    StudentPhoto = Clean(dto.StudentPhoto),
                    Email = Clean(dto.Email),
                    StudentEmail = Clean(dto.StudentEmail),
                    MobileNumber = Clean(dto.MobileNumber),
                    AadhaarNumber = Clean(dto.AadhaarNumber),
                    Nationality = Clean(dto.Nationality),
                    Religion = Clean(dto.Religion),
                    Category = Clean(dto.Category),
                    FatherName = Clean(dto.FatherName),
                    MotherName = Clean(dto.MotherName),
                    GuardianName = Clean(dto.GuardianName),
                    Occupation = Clean(dto.Occupation),
                    AnnualIncome = dto.AnnualIncome,
                    MotherEmail = Clean(dto.MotherEmail),
                    GuardianMobile = Clean(dto.GuardianMobile),
                    GuardianEmail = Clean(dto.GuardianEmail),
                    Address = Clean(dto.Address),
                    City = Clean(dto.City),
                    District = Clean(dto.District),
                    State = Clean(dto.State),
                    Pincode = Clean(dto.Pincode),
                    BoardId = dto.BoardId,
                    AcademicYearId = dto.AcademicYearId,
                    AcademicLevelId = dto.AcademicLevelId,
                    GroupId = dto.GroupId,
                    SectionId = dto.SectionId,
                    SecondLanguage = Clean(dto.SecondLanguage),
                    PreviousSchool = Clean(dto.PreviousSchool),
                    PreviousBoard = Clean(dto.PreviousBoard),
                    PreviousYear = Clean(dto.PreviousYear),
                    PreviousPercentage = dto.PreviousPercentage,
                    PreviousHallTicket = Clean(dto.PreviousHallTicket),
                    BirthCertificate = Clean(dto.BirthCertificate),
                    TransferCertificate = Clean(dto.TransferCertificate),
                    StudyCertificate = Clean(dto.StudyCertificate),
                    AadhaarDocument = Clean(dto.AadhaarDocument),
                    CommunityCertificate = Clean(dto.CommunityCertificate),
                    IncomeCertificate = Clean(dto.IncomeCertificate),
                    PassportPhoto = Clean(dto.PassportPhoto),
                    MarksMemo = Clean(dto.MarksMemo),
                    CasteCertificate = Clean(dto.CasteCertificate),
                    TenthCertificate = Clean(dto.TenthCertificate),
                    Status = Clean(dto.Status),
                    AdmissionStatus = Clean(dto.AdmissionStatus) ?? "Draft",
                    InterviewRequired = dto.InterviewRequired,
                    AdmissionFeeAmount = dto.AdmissionFeeAmount,
                    Remarks = Clean(dto.Remarks),
                    IsActive = dto.IsActive,
            };
        }

        private static void Validate(CreateStudentAdmissionDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FirstName))
                throw new ArgumentException("First name is required.");

            if (string.IsNullOrWhiteSpace(dto.Gender))
                throw new ArgumentException("Gender is required.");

            var gender = dto.Gender.Trim();
            if (!gender.Equals("Male", StringComparison.OrdinalIgnoreCase) &&
                !gender.Equals("Female", StringComparison.OrdinalIgnoreCase) &&
                !gender.Equals("Other", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Gender must be Male, Female, or Other.");

            if (dto.DateOfBirth == default)
                throw new ArgumentException("Date of birth is required.");

            if (dto.DateOfBirth.Date > DateTime.UtcNow.Date)
                throw new ArgumentException("Date of birth cannot be in the future.");

            if (dto.PreviousPercentage is < 0 or > 100)
                throw new ArgumentException("Previous percentage must be between 0 and 100.");

            if (dto.AnnualIncome < 0)
                throw new ArgumentException("Annual income cannot be negative.");

            if (dto.AdmissionFeeAmount < 0)
                throw new ArgumentException("Admission fee amount cannot be negative.");

            if (dto.RegistrationDate.HasValue && dto.ApplicationDate.HasValue &&
                dto.ApplicationDate.Value.Date < dto.RegistrationDate.Value.Date)
                throw new ArgumentException("Application date cannot be before registration date.");

            if (dto.AdmissionDate.HasValue && dto.ApplicationDate.HasValue &&
                dto.AdmissionDate.Value.Date < dto.ApplicationDate.Value.Date)
                throw new ArgumentException("Admission date cannot be before application date.");
        }

        private static string? Clean(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string NormalizeGender(string value)
        {
            if (value.Equals("Male", StringComparison.OrdinalIgnoreCase)) return "Male";
            if (value.Equals("Female", StringComparison.OrdinalIgnoreCase)) return "Female";
            return "Other";
        }

        private static StudentAdmissionResponseDto Map(StudentAdmission x)
        {
            return new StudentAdmissionResponseDto
            {
                AdmissionId = x.AdmissionId,
                StudentId = x.StudentId,
                RegistrationNo = x.RegistrationNo,
                RegistrationDate = x.RegistrationDate,
                ApplicationNo = x.ApplicationNo,
                ApplicationDate = x.ApplicationDate,
                AdmissionNo = x.AdmissionNo,
                AdmissionDate = x.AdmissionDate,
                AdmissionType = x.AdmissionType,
                AdmissionQuota = x.AdmissionQuota,
                EntryType = x.EntryType,
                Regulation = x.Regulation,
                Batch = x.Batch,
                Medium = x.Medium,
                ScholarshipStatus = x.ScholarshipStatus,
                FirstName = x.FirstName,
                LastName = x.LastName,
                Gender = x.Gender,
                DateOfBirth = x.DateOfBirth,
                BloodGroup = x.BloodGroup,
                StudentPhoto = x.StudentPhoto,
                Email = x.Email,
                StudentEmail = x.StudentEmail,
                MobileNumber = x.MobileNumber,
                AadhaarNumber = x.AadhaarNumber,
                Nationality = x.Nationality,
                Religion = x.Religion,
                Category = x.Category,
                FatherName = x.FatherName,
                MotherName = x.MotherName,
                GuardianName = x.GuardianName,
                Occupation = x.Occupation,
                AnnualIncome = x.AnnualIncome,
                MotherEmail = x.MotherEmail,
                GuardianMobile = x.GuardianMobile,
                GuardianEmail = x.GuardianEmail,
                Address = x.Address,
                City = x.City,
                District = x.District,
                State = x.State,
                Pincode = x.Pincode,
                BoardId = x.BoardId,
                AcademicYearId = x.AcademicYearId,
                AcademicLevelId = x.AcademicLevelId,
                GroupId = x.GroupId,
                SectionId = x.SectionId,
                CollegeId = x.AdmissionCollegeId,
                CollegeName = x.AdmissionCollegeName,
                DepartmentId = x.AdmissionDepartmentId,
                DepartmentName = x.AdmissionDepartmentName,
                CourseId = x.AdmissionCourseId,
                CourseName = x.AdmissionCourseName,
                BranchId = x.AdmissionBranchId,
                BranchName = x.AdmissionBranchName,
                AcademicYearName = x.AcademicYearName,
                SemesterId = x.SemesterId,
                SemesterNumber = x.SemesterNumber,
                SemesterName = x.SemesterName,
                SectionName = x.SectionName,
                SecondLanguage = x.SecondLanguage,
                PreviousSchool = x.PreviousSchool,
                PreviousBoard = x.PreviousBoard,
                PreviousYear = x.PreviousYear,
                PreviousPercentage = x.PreviousPercentage,
                PreviousHallTicket = x.PreviousHallTicket,
                BirthCertificate = x.BirthCertificate,
                TransferCertificate = x.TransferCertificate,
                StudyCertificate = x.StudyCertificate,
                AadhaarDocument = x.AadhaarDocument,
                CommunityCertificate = x.CommunityCertificate,
                IncomeCertificate = x.IncomeCertificate,
                PassportPhoto = x.PassportPhoto,
                MarksMemo = x.MarksMemo,
                CasteCertificate = x.CasteCertificate,
                TenthCertificate = x.TenthCertificate,
                Status = x.Status,
                AdmissionStatus = x.AdmissionStatus,
                IsVerified = x.IsVerified,
                IsApproved = x.IsApproved,
                IsRejected = x.IsRejected,
                SubmittedAt = x.SubmittedAt,
                ReviewedAt = x.ReviewedAt,
                ApprovedAt = x.ApprovedAt,
                RejectedAt = x.RejectedAt,
                AdmittedAt = x.AdmittedAt,
                CancelledAt = x.CancelledAt,
                WithdrawnAt = x.WithdrawnAt,
                ReviewedBy = x.ReviewedBy,
                ApprovedBy = x.ApprovedBy,
                RejectedBy = x.RejectedBy,
                CancelledBy = x.CancelledBy,
                RejectionReason = x.RejectionReason,
                CancellationReason = x.CancellationReason,
                WithdrawalReason = x.WithdrawalReason,
                DocumentsVerified = x.DocumentsVerified,
                DocumentsVerifiedBy = x.DocumentsVerifiedBy,
                DocumentsVerifiedAt = x.DocumentsVerifiedAt,
                InterviewRequired = x.InterviewRequired,
                InterviewDate = x.InterviewDate,
                InterviewStatus = x.InterviewStatus,
                InterviewRemarks = x.InterviewRemarks,
                OfferDate = x.OfferDate,
                OfferExpiryDate = x.OfferExpiryDate,
                OfferAcceptedAt = x.OfferAcceptedAt,
                AdmissionFeeAmount = x.AdmissionFeeAmount,
                AdmissionFeePaid = x.AdmissionFeePaid,
                AdmissionFeePaidAt = x.AdmissionFeePaidAt,
                WaitlistNumber = x.WaitlistNumber,
                WaitlistedAt = x.WaitlistedAt,
                Remarks = x.Remarks,
                IsActive = x.IsActive,
                CreatedBy = x.CreatedBy,
                CreatedAt = x.CreatedAt,
                UpdatedBy = x.UpdatedBy,
                UpdatedAt = x.UpdatedAt,
                FormData = ParseFormData(x.FrontendFormDataJson)
            };
        }

        private async Task PersistAcademicMappingAsync(long admissionId, CreateStudentAdmissionDto dto, long? userId)
        {
            if (!(dto.CollegeId.HasValue || dto.DepartmentId.HasValue || dto.CourseId.HasValue ||
                  dto.BranchId.HasValue || dto.SemesterId.HasValue || dto.AcademicYearId.HasValue ||
                  !string.IsNullOrWhiteSpace(dto.EntryType) || !string.IsNullOrWhiteSpace(dto.Regulation) ||
                  !string.IsNullOrWhiteSpace(dto.Batch) || !string.IsNullOrWhiteSpace(dto.AdmissionType)))
                return;

            await _academicRepository.UpdateAsync(new StudentAcademicDetails
            {
                AdmissionId = admissionId,
                CollegeId = dto.CollegeId,
                DepartmentId = dto.DepartmentId,
                CourseId = dto.CourseId,
                BranchId = dto.BranchId,
                SemesterId = dto.SemesterId,
                AcademicYearId = dto.AcademicYearId,
                BoardId = dto.BoardId,
                AcademicLevelId = dto.AcademicLevelId,
                GroupId = dto.GroupId,
                SectionId = dto.SectionId,
                AdmissionType = Clean(dto.AdmissionType),
                EntryType = Clean(dto.EntryType),
                Regulation = Clean(dto.Regulation),
                Batch = Clean(dto.Batch),
                Medium = Clean(dto.Medium),
                SecondLanguage = Clean(dto.SecondLanguage),
                PreviousSchool = Clean(dto.PreviousSchool),
                PreviousBoard = Clean(dto.PreviousBoard),
                PreviousYear = Clean(dto.PreviousYear),
                PreviousPercentage = dto.PreviousPercentage,
                PreviousHallTicket = Clean(dto.PreviousHallTicket),
                UpdatedBy = userId
            });
        }

        private async Task SaveFormDataAsync(
            long admissionId,
            JsonElement? formData,
            long? userId)
        {
            if (!formData.HasValue || formData.Value.ValueKind != JsonValueKind.Object)
                return;

            await _repository.SaveFormDataAsync(
                admissionId,
                formData.Value.GetRawText(),
                userId);
        }

        private static void HydrateFromFrontendForm(CreateStudentAdmissionDto dto)
        {
            dto.RegistrationNo ??= dto.RegistrationNumber;
            dto.MobileNumber ??= dto.Mobile;
            dto.StudentPhoto ??= dto.Photo;
            if (!dto.FormData.HasValue || dto.FormData.Value.ValueKind != JsonValueKind.Object)
                dto.FormData = JsonSerializer.SerializeToElement(dto, new JsonSerializerOptions(JsonSerializerDefaults.Web));

            var root = dto.FormData.Value;
            dto.Address ??= JoinJsonAddress(root, "currentAddress");
            dto.City ??= JsonText(root, "currentAddress", "city");
            dto.District ??= JsonText(root, "currentAddress", "district");
            dto.State ??= JsonText(root, "currentAddress", "state");
            dto.Pincode ??= JsonText(root, "currentAddress", "pincode");
            dto.StudentEmail ??= dto.Email;
            dto.RegistrationNo ??= JsonText(root, "application", "registrationNumber")
                ?? JsonText(root, "application", "number");
            dto.RegistrationDate ??= JsonDate(root, "application", "date");
            dto.AdmissionNo ??= JsonText(root, "application", "admissionNumber");
            dto.AdmissionDate ??= JsonDate(root, "application", "admissionDate");

            dto.FirstName = Clean(dto.FirstName)
                ?? JsonText(root, "personal", "firstName")
                ?? string.Empty;
            if (string.IsNullOrWhiteSpace(dto.LastName))
            {
                dto.LastName = string.Join(" ", new[]
                {
                    JsonText(root, "personal", "middleName"),
                    JsonText(root, "personal", "lastName")
                }.Where(value => !string.IsNullOrWhiteSpace(value)));
            }
            dto.Gender = Clean(dto.Gender)
                ?? JsonText(root, "personal", "gender")
                ?? string.Empty;
            if (dto.DateOfBirth == default)
                dto.DateOfBirth = JsonDate(root, "personal", "dob") ?? default;
            dto.StudentPhoto ??= JsonText(root, "personal", "photo");
            dto.BloodGroup ??= JsonText(root, "personal", "bloodGroup");
            dto.Nationality ??= JsonText(root, "personal", "nationality");
            dto.AadhaarNumber ??= JsonText(root, "personal", "aadhaar");

            dto.MobileNumber ??= JsonText(root, "contact", "mobile");
            dto.StudentEmail ??= JsonText(root, "contact", "email");
            dto.Email ??= JsonText(root, "contact", "alternateEmail");
            dto.Address ??= JoinJsonAddress(root, "contact", "currentAddress");
            dto.City ??= JsonText(root, "contact", "currentAddress", "city");
            dto.District ??= JsonText(root, "contact", "currentAddress", "district");
            dto.State ??= JsonText(root, "contact", "currentAddress", "state");
            dto.Pincode ??= JsonText(root, "contact", "currentAddress", "pincode");

            dto.FatherName ??= JsonText(root, "parents", "father", "name");
            dto.Occupation ??= JsonText(root, "parents", "father", "occupation");
            dto.AnnualIncome ??= JsonDecimal(root, "parents", "father", "income");
            dto.MotherName ??= JsonText(root, "parents", "mother", "name");
            dto.MotherEmail ??= JsonText(root, "parents", "mother", "email");
            dto.GuardianName ??= JsonText(root, "parents", "guardian", "name");
            dto.GuardianMobile ??= JsonText(root, "parents", "guardian", "mobile")
                ?? JsonText(root, "parents", "emergencyMobile");

            dto.AdmissionType ??= JsonText(root, "academic", "admissionType")
                ?? JsonText(root, "academic", "entryType");
            dto.EntryType ??= JsonText(root, "academic", "entryType");
            dto.Regulation ??= JsonText(root, "academic", "regulation");
            dto.Batch ??= JsonText(root, "academic", "batch");
            dto.CollegeId ??= JsonLong(root, "academic", "collegeId");
            dto.DepartmentId ??= JsonLong(root, "academic", "departmentId");
            dto.CourseId ??= JsonLong(root, "academic", "courseId");
            dto.BranchId ??= JsonLong(root, "academic", "branchId");
            dto.SemesterId ??= JsonLong(root, "academic", "semesterId");
            dto.AcademicYearId ??= JsonLong(root, "academic", "academicYearId");
            dto.Quota ??= JsonText(root, "academic", "quota");
            dto.QuotaOther ??= JsonText(root, "academic", "quotaOther");
            dto.AdmissionQuota ??= string.Equals(dto.Quota, "Other", StringComparison.OrdinalIgnoreCase)
                ? dto.QuotaOther
                : dto.Quota;
            dto.PreviousSchool ??= JsonText(root, "previousEducation", "tenth", "institution");
            dto.PreviousBoard ??= JsonText(root, "previousEducation", "tenth", "board");
            dto.PreviousYear ??= JsonText(root, "previousEducation", "tenth", "passingYear");
            dto.PreviousPercentage ??= JsonDecimal(root, "previousEducation", "tenth", "score");
            dto.PreviousHallTicket ??= JsonText(root, "previousEducation", "tenth", "rollNumber");

            dto.ScholarshipStatus ??= JsonText(root, "admission", "scholarship");
            if (dto.AdmissionFeeAmount == 0)
                dto.AdmissionFeeAmount = JsonDecimal(root, "fees", "admissionFee") ?? 0;

            var frontendStatus = JsonText(root, "status");
            if (!string.IsNullOrWhiteSpace(frontendStatus))
                dto.AdmissionStatus = NormalizeFrontendAdmissionStatus(frontendStatus);
        }

        private static string NormalizeFrontendAdmissionStatus(string status) =>
            status.Trim().ToUpperInvariant() switch
            {
                "DRAFT" => "Draft",
                "SUBMITTED" => "Application Submitted",
                "UNDER_REVIEW" => "Under Review",
                "VERIFIED" => "Document Verification",
                "APPROVED" => "Approved",
                "REJECTED" => "Rejected",
                "CORRECTION_REQUIRED" => "Under Review",
                _ => "Draft"
            };

        private static JsonElement? ParseFormData(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                using var document = JsonDocument.Parse(json);
                return document.RootElement.Clone();
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static JsonElement? JsonValue(JsonElement root, params string[] path)
        {
            var current = root;
            foreach (var segment in path)
            {
                if (current.ValueKind != JsonValueKind.Object
                    || !current.TryGetProperty(segment, out current))
                    return null;
            }
            return current;
        }

        private static long? JsonLong(JsonElement root, params string[] path)
        {
            var value = JsonValue(root, path);
            if (!value.HasValue) return null;
            if (value.Value.ValueKind == JsonValueKind.Number && value.Value.TryGetInt64(out var n)) return n;
            if (value.Value.ValueKind == JsonValueKind.String && long.TryParse(value.Value.GetString(), out n)) return n;
            return null;
        }

        private static string? JsonText(JsonElement root, params string[] path)
        {
            var value = JsonValue(root, path);
            if (!value.HasValue || value.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
                return null;
            var text = value.Value.ValueKind == JsonValueKind.String
                ? value.Value.GetString()
                : value.Value.ToString();
            return Clean(text);
        }

        private static DateTime? JsonDate(JsonElement root, params string[] path) =>
            DateTime.TryParse(JsonText(root, path), out var result) ? result.Date : null;

        private static decimal? JsonDecimal(JsonElement root, params string[] path)
        {
            var raw = JsonText(root, path);
            if (string.IsNullOrWhiteSpace(raw)) return null;
            return BTech.DTOs.Common.FlexibleNullableDecimalJsonConverter.TryParseFlexible(raw, out var result)
                ? result
                : null;
        }

        private static string? JoinJsonAddress(JsonElement root, params string[] path)
        {
            var address = JsonValue(root, path);
            if (!address.HasValue) return null;
            var values = new[] { "line1", "line2", "town" }
                .Select(key => JsonText(address.Value, key))
                .Where(value => !string.IsNullOrWhiteSpace(value));
            return Clean(string.Join(", ", values));
        }
    }
}
