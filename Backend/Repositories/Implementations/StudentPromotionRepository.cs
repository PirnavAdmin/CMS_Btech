using BTech.DTOs.StudentPromotion;
using BTech.Exceptions;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;
using System.Data;

namespace BTech.Repositories.Implementations
{
    public class StudentPromotionRepository : IStudentPromotionRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<StudentPromotionRepository> _logger;

        public StudentPromotionRepository(
            IConfiguration configuration,
            ILogger<StudentPromotionRepository> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        // =====================================================
        // CREATE DATABASE CONNECTION
        // =====================================================

        private MySqlConnection CreateConnection()
        {
            return new MySqlConnection(
                _configuration.GetConnectionString("DefaultConnection"));
        }


        // =====================================================
        // 1. GET ELIGIBLE STUDENTS
        // =====================================================

        public async Task<IEnumerable<EligibleStudentDto>>
            GetEligibleStudentsAsync(
                long collegeId,
                EligibleStudentRequestDto request)
        {
            const string procedure =
                "sp_student_promotion_get_eligible";

            _logger.LogInformation(
                "Getting eligible promotion students. " +
                "CollegeId={CollegeId}, AcademicYearId={AcademicYearId}",
                collegeId,
                request.AcademicYearId);

            await using var connection = CreateConnection();

            await connection.OpenAsync();

            var parameters = new
            {
                p_college_id = collegeId,
                p_academic_year_id = request.AcademicYearId,
                p_course_id = request.CourseId,
                p_branch_id = request.BranchId,
                p_semester = request.Semester,
                p_search = request.Search
            };

            var result =
                await connection.QueryAsync<EligibleStudentDto>(
                    procedure,
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return result;
        }


        // =====================================================
        // 2. PROMOTE SINGLE STUDENT
        // =====================================================

        public async Task<PromotionResponseDto?>
            PromoteStudentAsync(
                long studentId,
                long? createdBy)
        {
            const string procedure =
                "sp_student_promote";

            _logger.LogInformation(
                "Promoting student. StudentId={StudentId}, CreatedBy={CreatedBy}",
                studentId,
                createdBy);

            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "A valid student ID is required.",
                    nameof(studentId));
            }

            await using var connection = CreateConnection();

            await connection.OpenAsync();

            var parameters = new
            {
                p_student_id = studentId,
                p_created_by = createdBy
            };

            try
            {
                var result =
                    await connection.QueryFirstOrDefaultAsync<PromotionResponseDto>(
                        procedure,
                        parameters,
                        commandType: CommandType.StoredProcedure);

                if (result == null)
                {
                    _logger.LogWarning(
                        "Promotion procedure returned no result. " +
                        "StudentId={StudentId}",
                        studentId);

                    return null;
                }

                _logger.LogInformation(
                    "Promotion successful. " +
                    "PromotionId={PromotionId}, " +
                    "StudentId={StudentId}, " +
                    "StudentName={StudentName}, " +
                    "FromAcademicYearId={FromAcademicYearId}, " +
                    "ToAcademicYearId={ToAcademicYearId}",
                    result.PromotionId,
                    result.StudentId,
                    result.StudentName,
                    result.FromAcademicYearId,
                    result.ToAcademicYearId);

                return result;
            }
            catch (MySqlException ex)
                when (ex.SqlState == "45000")
            {
                _logger.LogWarning(
                    ex,
                    "Promotion validation failed for StudentId={StudentId}",
                    studentId);

                throw new InvalidOperationException(
                    ex.Message,
                    ex);
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while promoting StudentId={StudentId}",
                    studentId);

                throw;
            }
        }


        // =====================================================
        // FRONTEND CONTRACT PROMOTION
        // =====================================================

        public async Task<PromotionResponseDto?> PromoteStudentContractAsync(
            PromoteStudentRequestDto request)
        {
            const string procedure = "sp_student_promote_contract";

            await using var connection = CreateConnection();
            await connection.OpenAsync();

            var parameters = new
            {
                p_student_id = request.StudentId,
                p_branch_id = request.BranchId,
                p_academic_year_id = request.AcademicYearId,
                p_current_semester = request.CurrentSemester,
                p_next_semester = request.NextSemester,
                p_target_academic_year_id = request.TargetAcademicYearId,
                p_target_semester_id = request.TargetSemesterId,
                p_target_section_id = request.TargetSectionId,
                p_eligibility_status = request.EligibilityStatus,
                p_remarks = request.Remarks,
                p_degree_conferred = request.DegreeConferred ? 1 : 0,
                p_degree_conferred_at = request.DegreeConferredAt,
                p_created_by = request.CreatedBy,
                p_manage_transaction = 1
            };

            try
            {
                return await connection.QueryFirstOrDefaultAsync<PromotionResponseDto>(
                    procedure,
                    parameters,
                    commandType: CommandType.StoredProcedure);
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                throw CreatePromotionValidationException(request.StudentId, ex.Message);
            }
        }

        public async Task<List<PromotionResponseDto>> PromoteStudentsBulkAtomicAsync(
            BulkPromoteStudentRequestDto request)
        {
            const string procedure = "sp_student_promote_contract";
            var results = new List<PromotionResponseDto>();
            long currentStudentId = 0;

            await using var connection = CreateConnection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();

            try
            {
                foreach (var studentId in request.StudentIds.Distinct())
                {
                    currentStudentId = studentId;

                    if (studentId <= 0)
                        throw new InvalidOperationException("Every student ID must be valid for atomic bulk promotion.");

                    var row = await connection.QueryFirstOrDefaultAsync<PromotionResponseDto>(
                        procedure,
                        new
                        {
                            p_student_id = studentId,
                            p_branch_id = request.BranchId,
                            p_academic_year_id = request.AcademicYearId,
                            p_current_semester = request.CurrentSemester,
                            p_next_semester = request.NextSemester,
                            p_target_academic_year_id = request.TargetAcademicYearId,
                            p_target_semester_id = request.TargetSemesterId,
                            p_target_section_id = request.TargetSectionId,
                            p_eligibility_status = request.EligibilityStatus,
                            p_remarks = request.Remarks,
                            p_degree_conferred = request.DegreeConferred ? 1 : 0,
                            p_degree_conferred_at = request.DegreeConferredAt,
                            p_created_by = request.CreatedBy,
                            p_manage_transaction = 0
                        },
                        transaction: transaction,
                        commandType: CommandType.StoredProcedure);

                    if (row == null)
                        throw new InvalidOperationException($"Promotion returned no row for StudentId {studentId}.");

                    results.Add(row);
                }

                await transaction.CommitAsync();
                return results;
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                await transaction.RollbackAsync();
                throw CreatePromotionValidationException(currentStudentId, ex.Message);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private static PromotionValidationException CreatePromotionValidationException(
            long studentId,
            string databaseMessage)
        {
            var message = string.IsNullOrWhiteSpace(databaseMessage)
                ? "Promotion validation failed."
                : databaseMessage.Trim();

            var knownFields = new[]
            {
                "studentIds", "branchId", "academicYearId", "currentSemester",
                "nextSemester", "eligibilityStatus", "targetAcademicYearId",
                "targetSemesterId", "targetSectionId", "degreeConferred", "createdBy"
            };

            foreach (var field in knownFields)
            {
                var token = field + ":";
                var index = message.IndexOf(token, StringComparison.OrdinalIgnoreCase);
                if (index >= 0)
                {
                    var detail = message[(index + token.Length)..].Trim();
                    return new PromotionValidationException(
                        field,
                        $"StudentId {studentId}: {detail}",
                        studentId);
                }
            }

            return new PromotionValidationException(
                "promotion",
                $"StudentId {studentId}: {message}",
                studentId);
        }

        // =====================================================
        // 3. GET COMPLETE PROMOTION HISTORY
        // =====================================================

        public async Task<IEnumerable<CompletePromotionHistoryDto>>
            GetCompletePromotionHistoryAsync(long studentId)
        {
            const string procedure =
                "sp_student_promotion_get_history";

            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "A valid student ID is required.",
                    nameof(studentId));
            }

            _logger.LogInformation(
                "Retrieving complete promotion history from database. StudentId={StudentId}",
                studentId);

            try
            {
                await using var connection = CreateConnection();
                await connection.OpenAsync();

                var result = await connection.QueryAsync<CompletePromotionHistoryDto>(
                    procedure,
                    new { p_student_id = studentId },
                    commandType: CommandType.StoredProcedure);

                var history = result.AsList();

                _logger.LogInformation(
                    "Complete promotion history retrieved from database. StudentId={StudentId}, RecordCount={RecordCount}",
                    studentId,
                    history.Count);

                return history;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while retrieving complete promotion history. StudentId={StudentId}",
                    studentId);

                throw new InvalidOperationException(
                    "Unable to retrieve the student's promotion history due to a database error.",
                    ex);
            }
        }
    }
}