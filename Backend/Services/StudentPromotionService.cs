using BTech.Data;
using BTech.DTOs.StudentPromotion;
using BTech.Exceptions;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services
{
    public class StudentPromotionService : IStudentPromotionService
    {
        private readonly ApplicationDbContext _context;
        private readonly IStudentPromotionRepository _repository;
        private readonly ILogger<StudentPromotionService> _logger;

        public StudentPromotionService(
            ApplicationDbContext context,
            IStudentPromotionRepository repository,
            ILogger<StudentPromotionService> logger)
        {
            _context = context;
            _repository = repository;
            _logger = logger;
        }

        // =====================================================
        // 1. GET ELIGIBLE STUDENTS
        // =====================================================

        public async Task<List<EligibleStudentDto>> GetEligibleStudentsAsync(
            long branchId,
            long academicYearId,
            int semesterNumber)
        {
            if (branchId <= 0)
                throw new ArgumentException(
                    "A valid branch ID is required.");

            if (academicYearId <= 0)
                throw new ArgumentException(
                    "A valid academic year ID is required.");

            if (semesterNumber <= 0)
                throw new ArgumentException(
                    "A valid semester number is required.");

            var collegeId = await _context.Students
                .AsNoTracking()
                .Where(s =>
                    s.BranchId == branchId &&
                    s.AcademicYearId == academicYearId &&
                    s.Status == 1 &&
                    s.DeletedAt == null)
                .Select(s => (long?)s.CollegeId)
                .FirstOrDefaultAsync();

            if (!collegeId.HasValue)
            {
                return new List<EligibleStudentDto>();
            }

            var result = await _repository.GetEligibleStudentsAsync(
                collegeId.Value,
                new EligibleStudentRequestDto
                {
                    AcademicYearId = academicYearId,
                    BranchId = branchId,
                    Semester = semesterNumber
                });

            return result.ToList();
        }


        // =====================================================
        // 2. GET STUDENT ELIGIBILITY
        // =====================================================

        public async Task<EligibleStudentDto?> GetStudentEligibilityAsync(
            long studentId)
        {
            if (studentId <= 0)
                throw new ArgumentException(
                    "A valid student ID is required.");

            var student = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s =>
                    s.StudentId == studentId &&
                    s.Status == 1 &&
                    s.DeletedAt == null);

            if (student == null)
                return null;

            var result = await _repository.GetEligibleStudentsAsync(
                student.CollegeId,
                new EligibleStudentRequestDto
                {
                    AcademicYearId = student.AcademicYearId,
                    BranchId = student.BranchId,
                    Search = student.StudentCode
                });

            var eligibility = result.FirstOrDefault(item =>
                item.StudentId == studentId);

            if (eligibility != null)
            {
                return eligibility;
            }

            var latestPromotion = await _context.StudentPromotions
                .AsNoTracking()
                .Where(p =>
                    p.StudentId == studentId &&
                    p.DeletedAt == null)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();

            return new EligibleStudentDto
            {
                StudentId = student.StudentId,
                StudentName = student.FullName,
                BranchId = student.BranchId ?? 0,
                AcademicYearId = student.AcademicYearId,
                CurrentSemester = latestPromotion?.NextSemester ?? 0,
                NextSemester = (latestPromotion?.NextSemester ?? 0) + 1,
                EligibilityStatus =
                    latestPromotion?.EligibilityStatus ?? "PENDING_REVIEW",
                PromotionStatus = latestPromotion?.PromotionStatus
            };
        }


        // =====================================================
        // 3. PROMOTE SINGLE STUDENT
        // =====================================================

        public async Task<PromotionResponseDto?> PromoteStudentAsync(
            PromoteStudentRequestDto request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.StudentId <= 0)
                throw new ArgumentException(
                    "A valid student ID is required.");

            /*
             * IMPORTANT
             * -------------------------------------------------
             * Do NOT query _context.Students here.
             *
             * The Student EF model currently contains properties
             * that do not match the actual students table
             * (for example Address).
             *
             * That EF query was causing:
             *
             * Unknown column 's.address' in 'field list'
             *
             * The stored procedure handles the complete
             * promotion transaction.
             */

            if ((request.BranchId > 0 &&
                 request.AcademicYearId > 0 &&
                 request.CurrentSemester > 0 &&
                 request.NextSemester > 0) ||
                request.TargetAcademicYearId.HasValue ||
                request.TargetSemesterId.HasValue ||
                request.TargetSectionId.HasValue ||
                request.DegreeConferred)
            {
                var result = await _repository.PromoteStudentContractAsync(request);
                if (result != null)
                    result.History = (await _repository.GetCompletePromotionHistoryAsync(request.StudentId)).ToList();
                return result;
            }

            // Backward compatibility for callers using the original Swagger contract.
            return await _repository.PromoteStudentAsync(
                request.StudentId,
                request.CreatedBy);
        }


        // =====================================================
        // 4. BULK PROMOTE STUDENTS
        // =====================================================

        public async Task<List<PromotionResponseDto>> PromoteStudentsBulkAsync(
            BulkPromoteStudentRequestDto request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

            if (request.StudentIds == null || request.StudentIds.Count == 0)
                errors["studentIds"] = new[] { "At least one student ID is required." };
            else if (request.StudentIds.Any(id => id <= 0))
                errors["studentIds"] = new[] { "Every studentIds value must be a positive numeric ID." };

            if (request.BranchId <= 0)
                errors["branchId"] = new[] { "branchId must be a positive numeric ID." };

            if (request.AcademicYearId <= 0)
                errors["academicYearId"] = new[] { "academicYearId must be a positive numeric ID." };

            if (request.CurrentSemester <= 0)
                errors["currentSemester"] = new[] { "currentSemester must be a positive integer semester number." };

            if (request.NextSemester <= 0)
                errors["nextSemester"] = new[] { "nextSemester must be a positive integer semester number." };
            else if (!request.DegreeConferred && request.CurrentSemester > 0 &&
                     request.NextSemester != request.CurrentSemester + 1)
                errors["nextSemester"] = new[] { "nextSemester must be the immediate next semester number." };

            if (!string.Equals(request.EligibilityStatus?.Trim(), "ELIGIBLE", StringComparison.OrdinalIgnoreCase))
                errors["eligibilityStatus"] = new[] { "eligibilityStatus must be ELIGIBLE for promotion." };

            if (request.TargetAcademicYearId.HasValue && request.TargetAcademicYearId.Value <= 0)
                errors["targetAcademicYearId"] = new[] { "targetAcademicYearId must be a positive numeric ID when supplied." };

            if (request.TargetSemesterId.HasValue && request.TargetSemesterId.Value <= 0)
                errors["targetSemesterId"] = new[] { "targetSemesterId must be a positive numeric ID when supplied." };

            if (request.TargetSectionId.HasValue && request.TargetSectionId.Value <= 0)
                errors["targetSectionId"] = new[] { "targetSectionId must be a positive numeric ID or null." };

            if (errors.Count > 0)
                throw new PromotionValidationException(errors);

            // This path is atomic: either every requested student is promoted,
            // including academic-year/semester/history updates, or none are.
            // targetSectionId is intentionally nullable: an unassigned promoted
            // student can be allocated to a section later.
            var rows = await _repository.PromoteStudentsBulkAtomicAsync(request);
            foreach (var row in rows)
                row.History = (await _repository.GetCompletePromotionHistoryAsync(row.StudentId)).ToList();
            return rows;
        }


        // =====================================================
        // 5. GET PROMOTED STUDENTS
        // =====================================================

        public async Task<List<PromotionResponseDto>> GetPromotedStudentsAsync(
            long? branchId,
            long? academicYearId,
            int? semesterNumber)
        {
            var query = _context.StudentPromotions
                .AsNoTracking()
                .Where(p =>
                    p.PromotionStatus == "APPROVED" &&
                    p.DeletedAt == null);

            if (branchId.HasValue)
            {
                if (branchId.Value <= 0)
                    throw new ArgumentException(
                        "A valid branch ID is required.");

                query = query.Where(p =>
                    p.BranchId == branchId.Value);
            }

            if (academicYearId.HasValue)
            {
                if (academicYearId.Value <= 0)
                    throw new ArgumentException(
                        "A valid academic year ID is required.");

                query = query.Where(p =>
                    p.AcademicYearId == academicYearId.Value);
            }

            if (semesterNumber.HasValue)
            {
                if (semesterNumber.Value <= 0)
                    throw new ArgumentException(
                        "A valid semester number is required.");

                query = query.Where(p =>
                    p.NextSemester == semesterNumber.Value);
            }

            var promotions = await query
                .Include(p => p.Student)
                .ToListAsync();

            return promotions.Select(p => new PromotionResponseDto
            {
                PromotionId = p.PromotionId,
                StudentId = p.StudentId,
                StudentName = p.Student?.FullName ?? string.Empty,
                BranchId = p.BranchId,
                AcademicYearId = p.AcademicYearId,
                CurrentSemester = p.CurrentSemester,
                NextSemester = p.NextSemester,
                EligibilityStatus = p.EligibilityStatus,
                PromotionStatus = p.PromotionStatus,
                Remarks = p.Remarks,
                CreatedAt = p.CreatedAt,
                FromAcademicYearId = p.AcademicYearId,
                ToAcademicYearId = p.ToAcademicYearId,
                FromCourseId = p.FromCourseId,
                ToCourseId = p.ToCourseId,
                FromBranchId = p.BranchId,
                ToBranchId = p.ToBranchId,
                Decision = p.Decision,
                PromotionEligibility = p.EligibilityStatus,
                PromotionType = p.PromotionType,
                PromotionDate = p.PromotionDate,
                EffectiveDate = p.EffectiveDate
            }).ToList();
        }


        // =====================================================
        // 6. GET PROMOTION HISTORY
        // =====================================================

        public async Task<List<PromotionResponseDto>> GetPromotionHistoryAsync(
            long studentId)
        {
            if (studentId <= 0)
                throw new ArgumentException(
                    "A valid student ID is required.");

            var promotions = await _context.StudentPromotions
                .AsNoTracking()
                .Include(p => p.Student)
                .Where(p =>
                    p.StudentId == studentId &&
                    p.DeletedAt == null)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return promotions.Select(p => new PromotionResponseDto
            {
                PromotionId = p.PromotionId,
                StudentId = p.StudentId,
                StudentName = p.Student?.FullName ?? string.Empty,
                BranchId = p.BranchId,
                AcademicYearId = p.AcademicYearId,
                CurrentSemester = p.CurrentSemester,
                NextSemester = p.NextSemester,
                EligibilityStatus = p.EligibilityStatus,
                PromotionStatus = p.PromotionStatus,
                Remarks = p.Remarks,
                CreatedAt = p.CreatedAt,
                FromAcademicYearId = p.AcademicYearId,
                ToAcademicYearId = p.ToAcademicYearId,
                FromCourseId = p.FromCourseId,
                ToCourseId = p.ToCourseId,
                FromBranchId = p.BranchId,
                ToBranchId = p.ToBranchId,
                Decision = p.Decision,
                PromotionEligibility = p.EligibilityStatus,
                PromotionType = p.PromotionType,
                PromotionDate = p.PromotionDate,
                EffectiveDate = p.EffectiveDate
            }).ToList();
        }


        // =====================================================
        // 7. GET COMPLETE PROMOTION HISTORY
        // =====================================================

        public async Task<List<CompletePromotionHistoryDto>>
            GetCompletePromotionHistoryAsync(long studentId)
        {
            if (studentId <= 0)
            {
                _logger.LogWarning(
                    "Complete promotion history requested with invalid StudentId={StudentId}",
                    studentId);

                throw new ArgumentException(
                    "A valid student ID is required.",
                    nameof(studentId));
            }

            _logger.LogInformation(
                "Retrieving complete promotion history. StudentId={StudentId}",
                studentId);

            try
            {
                var result = await _repository
                    .GetCompletePromotionHistoryAsync(studentId);

                var history = result.ToList();

                _logger.LogInformation(
                    "Complete promotion history retrieved successfully. StudentId={StudentId}, RecordCount={RecordCount}",
                    studentId,
                    history.Count);

                return history;
            }
            catch (ArgumentException)
            {
                throw;
            }
            catch (InvalidOperationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while retrieving complete promotion history. StudentId={StudentId}",
                    studentId);

                throw new InvalidOperationException(
                    "An unexpected error occurred while retrieving the student's promotion history.",
                    ex);
            }
        }


        // =====================================================
        // 8. UPDATE ELIGIBILITY STATUS
        // =====================================================

        public async Task<bool> UpdateEligibilityStatusAsync(
            long studentId,
            string eligibilityStatus)
        {
            if (studentId <= 0)
                throw new ArgumentException(
                    "A valid student ID is required.");

            if (string.IsNullOrWhiteSpace(eligibilityStatus))
                throw new ArgumentException(
                    "Eligibility status is required.");

            var student = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s =>
                    s.StudentId == studentId &&
                    s.DeletedAt == null);

            if (student == null)
                return false;

            var normalizedStatus = eligibilityStatus
                .Trim()
                .ToUpperInvariant()
                .Replace(' ', '_');

            var allowedStatuses = new HashSet<string>(
                StringComparer.OrdinalIgnoreCase)
            {
                "ELIGIBLE",
                "PENDING_REVIEW",
                "NOT_ELIGIBLE",
                "FAILED",
                "DETAINED"
            };

            if (!allowedStatuses.Contains(normalizedStatus))
            {
                throw new ArgumentException(
                    "Eligibility status must be ELIGIBLE, PENDING_REVIEW, NOT_ELIGIBLE, FAILED, or DETAINED.");
            }

            var promotion = await _context.StudentPromotions
                .Where(p =>
                    p.StudentId == studentId &&
                    p.DeletedAt == null)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();

            if (promotion == null)
            {
                return false;
            }

            promotion.EligibilityStatus = normalizedStatus;
            promotion.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }
    }
}
