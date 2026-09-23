using System.Data;
using BTech.DTOs.Integration;
using BTech.Services.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Services.Implementations
{
    public sealed class StudentIntegrationService : IStudentIntegrationService
    {
        private static readonly HashSet<string> AllowedDocumentExtensions =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ".pdf", ".jpg", ".jpeg", ".png"
            };

        private readonly string _connectionString;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<StudentIntegrationService> _logger;

        public StudentIntegrationService(
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<StudentIntegrationService> logger)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("DefaultConnection is missing.");
            _environment = environment;
            _logger = logger;
        }

        public async Task<StudentDocumentDetailDto> UploadDocumentAsync(
            long studentId,
            StudentDocumentUploadDto request,
            long actorUserId)
        {
            ValidateId(studentId, "student");
            ValidateActor(actorUserId);

            var file = request.File
                ?? throw new ArgumentException("A document file is required.");
            if (file.Length <= 0)
                throw new ArgumentException("The document file is empty.");
            if (file.Length > 10 * 1024 * 1024)
                throw new ArgumentException("The document file cannot exceed 10 MB.");

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedDocumentExtensions.Contains(extension))
                throw new ArgumentException("Only PDF, JPG, JPEG and PNG documents are allowed.");

            var documentType = CleanRequired(request.DocumentType, "Document type");
            var safeFileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var relativeDirectory = Path.Combine("Uploads", "Students", studentId.ToString());
            var absoluteDirectory = Path.Combine(_environment.ContentRootPath, relativeDirectory);
            Directory.CreateDirectory(absoluteDirectory);
            var absolutePath = Path.Combine(absoluteDirectory, safeFileName);
            var relativePath = Path.Combine(relativeDirectory, safeFileName).Replace('\\', '/');

            await using (var stream = new FileStream(
                absolutePath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                81920,
                useAsync: true))
            {
                await file.CopyToAsync(stream);
            }

            try
            {
                await using var connection = CreateConnection();
                var result = await connection.QueryFirstOrDefaultAsync<StudentDocumentDetailDto>(
                    "sp_student_document_create",
                    new
                    {
                        p_student_id = studentId,
                        p_document_type = documentType,
                        p_file_name = Path.GetFileName(file.FileName),
                        p_file_path = relativePath,
                        p_content_type = file.ContentType,
                        p_file_size = file.Length,
                        p_created_by = actorUserId
                    },
                    commandType: CommandType.StoredProcedure);

                var created = result ?? throw new InvalidOperationException("Document metadata could not be saved.");
                SetDownloadUrl(created);
                _logger.LogInformation(
                    "Student document metadata created. StudentId={StudentId}, DocumentId={DocumentId}, ActorUserId={ActorUserId}",
                    studentId,
                    created.DocumentId,
                    actorUserId);
                return created;
            }
            catch
            {
                if (File.Exists(absolutePath))
                    File.Delete(absolutePath);
                throw;
            }
        }

        public async Task<StudentDocumentDetailDto?> GetDocumentAsync(long studentId, long documentId)
        {
            ValidateId(studentId, "student");
            ValidateId(documentId, "document");
            await using var connection = CreateConnection();
            var result = await connection.QueryFirstOrDefaultAsync<StudentDocumentDetailDto>(
                "sp_student_document_get_by_id",
                new { p_student_id = studentId, p_document_id = documentId },
                commandType: CommandType.StoredProcedure);
            if (result != null) SetDownloadUrl(result);
            return result;
        }

        public async Task<StudentDocumentDownloadDto?> DownloadDocumentAsync(
            long studentId,
            long documentId)
        {
            var metadata = await GetDocumentAsync(studentId, documentId);
            if (metadata?.FilePath == null) return null;

            var absolutePath = ResolveUploadedFile(metadata.FilePath);
            if (absolutePath == null || !File.Exists(absolutePath)) return null;

            return new StudentDocumentDownloadDto
            {
                Content = new FileStream(
                    absolutePath,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.Read,
                    81920,
                    useAsync: true),
                FileName = metadata.FileName,
                ContentType = string.IsNullOrWhiteSpace(metadata.ContentType)
                    ? "application/octet-stream"
                    : metadata.ContentType
            };
        }

        public async Task<bool> DeleteDocumentAsync(long studentId, long documentId, long actorUserId)
        {
            ValidateId(studentId, "student");
            ValidateId(documentId, "document");
            ValidateActor(actorUserId);
            var existing = await GetDocumentAsync(studentId, documentId);
            if (existing == null) return false;

            await using var connection = CreateConnection();
            var result = await connection.QueryFirstOrDefaultAsync<int?>(
                "sp_student_document_delete",
                new
                {
                    p_student_id = studentId,
                    p_document_id = documentId,
                    p_deleted_by = actorUserId
                },
                commandType: CommandType.StoredProcedure);
            var deleted = result == 1;
            if (deleted && existing?.FilePath != null)
            {
                var absolutePath = ResolveUploadedFile(existing.FilePath);
                if (absolutePath != null && File.Exists(absolutePath))
                {
                    try
                    {
                        File.Delete(absolutePath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(
                            ex,
                            "Document metadata was deleted but the physical file could not be removed. DocumentId={DocumentId}",
                            documentId);
                    }
                }
            }
            _logger.LogInformation(
                "Student document delete completed. StudentId={StudentId}, DocumentId={DocumentId}, Deleted={Deleted}, ActorUserId={ActorUserId}",
                studentId,
                documentId,
                deleted,
                actorUserId);
            return deleted;
        }

        public async Task<AdmissionSubmissionDto?> SubmitAdmissionAsync(long admissionId, long actorUserId)
        {
            ValidateId(admissionId, "admission");
            ValidateActor(actorUserId);
            await using var connection = CreateConnection();
            var result = await connection.QueryFirstOrDefaultAsync<AdmissionSubmissionDto>(
                "sp_student_admission_submit",
                new { p_admission_id = admissionId, p_submitted_by = actorUserId },
                commandType: CommandType.StoredProcedure);
            _logger.LogInformation(
                "Student admission submitted. AdmissionId={AdmissionId}, ActorUserId={ActorUserId}",
                admissionId,
                actorUserId);
            return result;
        }

        public async Task<AdmissionFeeSummaryDto?> GetFeeSummaryAsync(long admissionId)
        {
            ValidateId(admissionId, "admission");
            try
            {
                _logger.LogInformation("Retrieving admission fee summary. AdmissionId={AdmissionId}", admissionId);
                await using var connection = CreateConnection();
                var result = await connection.QueryFirstOrDefaultAsync<AdmissionFeeSummaryDto>(
                    "sp_student_admission_fee_get",
                    new { p_admission_id = admissionId },
                    commandType: CommandType.StoredProcedure);
                _logger.LogInformation("Admission fee summary retrieval completed. AdmissionId={AdmissionId}, Found={Found}", admissionId, result != null);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve admission fee summary. AdmissionId={AdmissionId}", admissionId);
                throw;
            }
        }

        public async Task<AdmissionFeeStructureDetailDto?> GetFeeStructureAsync(long admissionId)
        {
            ValidateId(admissionId, "admission");
            try
            {
                _logger.LogInformation("Retrieving assigned admission fee structure. AdmissionId={AdmissionId}", admissionId);
                await using var connection = CreateConnection();
                var result = await connection.QueryFirstOrDefaultAsync<AdmissionFeeStructureDetailDto>(
                    "sp_student_admission_fee_structure_get",
                    new { p_admission_id = admissionId },
                    commandType: CommandType.StoredProcedure);
                if (result != null)
                {
                    result.FeeComponents = new List<AdmissionFeeComponentDto>
                    {
                        new() { ComponentCode = "TUITION_FEE", Name = "Tuition Fee", Amount = result.TuitionFee },
                        new() { ComponentCode = "ADMISSION_FEE", Name = "Admission Fee", Amount = result.AdmissionFee },
                        new() { ComponentCode = "HOSTEL_FEE", Name = "Hostel Fee", Amount = result.HostelFee },
                        new() { ComponentCode = "TRANSPORTATION_FEE", Name = "Transportation Fee", Amount = result.TransportationFee }
                    };
                }
                _logger.LogInformation("Assigned admission fee structure retrieval completed. AdmissionId={AdmissionId}, Found={Found}, FeeStructureId={FeeStructureId}", admissionId, result != null, result?.FeeStructureId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve assigned admission fee structure. AdmissionId={AdmissionId}", admissionId);
                throw;
            }
        }

        public async Task<AdmissionFeeSummaryDto?> UpdateFeeStructureAsync(
            long admissionId,
            AdmissionFeeStructureRequestDto request,
            long actorUserId)
        {
            ValidateId(admissionId, "admission");
            ValidateActor(actorUserId);
            await using var connection = CreateConnection();
            var result = await connection.QueryFirstOrDefaultAsync<AdmissionFeeSummaryDto>(
                "sp_student_admission_fee_upsert",
                new
                {
                    p_admission_id = admissionId,
                    p_tuition_fee = request.TuitionFee,
                    p_admission_fee = request.AdmissionFee,
                    p_hostel_fee = request.HostelFee,
                    p_transportation_fee = request.TransportationFee,
                    p_scholarship_amount = request.ScholarshipAmount,
                    p_payment_plan = request.PaymentPlan,
                    p_payment_status = request.PaymentStatus,
                    p_updated_by = actorUserId
                },
                commandType: CommandType.StoredProcedure);
            _logger.LogInformation(
                "Admission fee structure updated. AdmissionId={AdmissionId}, ActorUserId={ActorUserId}",
                admissionId,
                actorUserId);
            return result;
        }

        public async Task<IReadOnlyList<PreviousEducationRecordDto>> GetPreviousEducationAsync(long admissionId)
        {
            ValidateId(admissionId, "admission");
            await using var connection = CreateConnection();
            var result = await connection.QueryAsync<PreviousEducationRecordDto>(
                "sp_student_admission_previous_education_get",
                new { p_admission_id = admissionId },
                commandType: CommandType.StoredProcedure);
            return result.AsList();
        }

        public async Task<IReadOnlyList<PreviousEducationRecordDto>> UpdatePreviousEducationAsync(
            long admissionId,
            PreviousEducationUpdateDto request,
            long actorUserId)
        {
            ValidateId(admissionId, "admission");
            ValidateActor(actorUserId);

            var records = new List<PreviousEducationRecordDto>(request.Records ?? new());
            if (request.Tenth != null)
            {
                request.Tenth.QualificationLevel = "TENTH";
                records.Add(request.Tenth);
            }
            if (request.Intermediate != null)
            {
                request.Intermediate.QualificationLevel = "INTERMEDIATE";
                records.Add(request.Intermediate);
            }
            if (records.Count == 0)
                throw new ArgumentException("At least one previous-education record is required.");

            await using var connection = CreateConnection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();
            try
            {
                foreach (var record in records)
                {
                    var level = CleanRequired(record.QualificationLevel, "Qualification level")
                        .ToUpperInvariant();
                    if (level is not ("TENTH" or "INTERMEDIATE" or "DIPLOMA" or "OTHER"))
                        throw new ArgumentException("QualificationLevel must be TENTH, INTERMEDIATE, DIPLOMA or OTHER.");

                    await connection.ExecuteAsync(
                        "sp_student_admission_previous_education_upsert",
                        new
                        {
                            p_admission_id = admissionId,
                            p_qualification_level = level,
                            p_qualification = record.Qualification,
                            p_board_or_university = record.BoardOrUniversity,
                            p_institution = record.Institution,
                            p_roll_number = record.RollNumber,
                            p_passing_year = record.PassingYear,
                            p_stream = record.Stream,
                            p_score = record.Score,
                            p_updated_by = actorUserId
                        },
                        transaction,
                        commandType: CommandType.StoredProcedure);
                }
                await transaction.CommitAsync();
                _logger.LogInformation(
                    "Previous education updated. AdmissionId={AdmissionId}, RecordCount={RecordCount}, ActorUserId={ActorUserId}",
                    admissionId,
                    records.Count,
                    actorUserId);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return await GetPreviousEducationAsync(admissionId);
        }

        public async Task<PromotionDashboardDto> GetPromotionDashboardAsync(
            long? collegeId,
            long? academicYearId,
            long? courseId,
            long? branchId)
        {
            await using var connection = CreateConnection();
            return await connection.QueryFirstAsync<PromotionDashboardDto>(
                "sp_student_promotion_dashboard",
                new
                {
                    p_college_id = collegeId,
                    p_academic_year_id = academicYearId,
                    p_course_id = courseId,
                    p_branch_id = branchId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IntegrationPageDto<PromotionDirectoryItemDto>> GetPromotionDirectoryAsync(
            long? collegeId,
            string? search,
            long? academicYearId,
            long? courseId,
            long? branchId,
            int pageNumber,
            int pageSize)
        {
            ValidatePage(ref pageNumber, ref pageSize);
            await using var connection = CreateConnection();
            using var result = await connection.QueryMultipleAsync(
                "sp_student_promotion_directory",
                new
                {
                    p_college_id = collegeId,
                    p_search = Clean(search),
                    p_academic_year_id = academicYearId,
                    p_course_id = courseId,
                    p_branch_id = branchId,
                    p_page_number = pageNumber,
                    p_page_size = pageSize
                },
                commandType: CommandType.StoredProcedure);
            var items = (await result.ReadAsync<PromotionDirectoryItemDto>()).AsList();
            var total = await result.ReadFirstAsync<long>();
            return Page(items, total, pageNumber, pageSize);
        }

        public async Task<IntegrationPageDto<PromotionHistoryDirectoryItemDto>> GetPromotionHistoryAsync(
            long? collegeId,
            string? search,
            string? status,
            int pageNumber,
            int pageSize)
        {
            ValidatePage(ref pageNumber, ref pageSize);
            await using var connection = CreateConnection();
            using var result = await connection.QueryMultipleAsync(
                "sp_student_promotion_history_directory",
                new
                {
                    p_college_id = collegeId,
                    p_search = Clean(search),
                    p_status = Clean(status)?.ToUpperInvariant(),
                    p_page_number = pageNumber,
                    p_page_size = pageSize
                },
                commandType: CommandType.StoredProcedure);
            var items = (await result.ReadAsync<PromotionHistoryDirectoryItemDto>()).AsList();
            var total = await result.ReadFirstAsync<long>();
            return Page(items, total, pageNumber, pageSize);
        }

        private MySqlConnection CreateConnection() => new(_connectionString);

        private static void SetDownloadUrl(StudentDocumentDetailDto document)
        {
            document.DownloadUrl =
                $"/api/v1/students/{document.StudentId}/documents/{document.DocumentId}/download";
        }

        private string? ResolveUploadedFile(string relativePath)
        {
            var normalized = relativePath.Replace('/', Path.DirectorySeparatorChar);
            var uploadsRoot = Path.GetFullPath(
                Path.Combine(_environment.ContentRootPath, "Uploads"));
            var absolutePath = Path.GetFullPath(
                Path.Combine(_environment.ContentRootPath, normalized));
            var rootPrefix = uploadsRoot.EndsWith(Path.DirectorySeparatorChar)
                ? uploadsRoot
                : uploadsRoot + Path.DirectorySeparatorChar;
            return absolutePath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
                ? absolutePath
                : null;
        }

        private static IntegrationPageDto<T> Page<T>(IReadOnlyList<T> items, long total, int number, int size) =>
            new()
            {
                Items = items,
                PageNumber = number,
                PageSize = size,
                TotalRecords = total,
                TotalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)size)
            };

        private static void ValidateId(long value, string name)
        {
            if (value <= 0) throw new ArgumentException($"A valid {name} ID is required.");
        }

        private static void ValidateActor(long value)
        {
            if (value <= 0) throw new UnauthorizedAccessException("Invalid authenticated user.");
        }

        private static void ValidatePage(ref int pageNumber, ref int pageSize)
        {
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;
        }

        private static string CleanRequired(string? value, string label) =>
            Clean(value) ?? throw new ArgumentException($"{label} is required.");

        private static string? Clean(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
