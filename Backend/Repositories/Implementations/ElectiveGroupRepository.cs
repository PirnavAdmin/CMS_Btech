using System.Data;
using System.Text.Json;
using BTech.DTOs.Electives;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories
{
    public class ElectiveGroupRepository : IElectiveGroupRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ElectiveGroupRepository> _logger;

        public ElectiveGroupRepository(
            IConfiguration configuration,
            ILogger<ElectiveGroupRepository> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        // ============================================================
        // CREATE DATABASE CONNECTION
        // ============================================================

        private MySqlConnection CreateConnection()
        {
            return new MySqlConnection(
                _configuration.GetConnectionString(
                    "DefaultConnection"));
        }

        // ============================================================
        // GET ELECTIVE GROUPS
        // SP: sp_elective_group_list
        // ============================================================

        public async Task<IEnumerable<ElectiveGroupResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveGroupListRequestDto request)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            var parameters = new
            {
                p_college_id = collegeId,
                p_course_id = request.CourseId,
                p_branch_id = request.BranchId,
                p_semester_id = request.SemesterId,
                p_academic_year_id = request.AcademicYearId,
                p_status = request.Status,
                p_search = string.IsNullOrWhiteSpace(request.Search)
                    ? null
                    : request.Search.Trim()
            };

            _logger.LogInformation(
                "Getting elective groups. CollegeId={CollegeId}",
                collegeId);

            return await connection.QueryAsync<ElectiveGroupResponseDto>(
                "sp_elective_group_list",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        // ============================================================
        // CREATE ELECTIVE GROUP
        // SP: sp_elective_group_create
        // ============================================================

        public async Task<long> CreateAsync(
            long collegeId,
            CreateElectiveGroupDto request,
            long createdBy)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            var parameters = new
            {
                p_college_id = collegeId,
                p_group_code = request.GroupCode,
                p_group_name = request.GroupName,
                p_description = request.Description,
                p_course_id = request.CourseId,
                p_branch_id = request.BranchId,
                p_semester_id = request.SemesterId,
                p_academic_year_id = request.AcademicYearId,
                p_min_selections = request.MinSelections,
                p_max_selections = request.MaxSelections,
                p_created_by = createdBy
            };

            _logger.LogInformation(
                "Creating elective group. CollegeId={CollegeId}, GroupCode={GroupCode}",
                collegeId,
                request.GroupCode);

            var result = await connection.QuerySingleAsync<long>(
                "sp_elective_group_create",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result;
        }

        // ============================================================
        // GET GROUP SUBJECTS
        // SP: sp_elective_group_subjects_get
        // ============================================================

        public async Task<IEnumerable<ElectiveGroupSubjectResponseDto>> GetSubjectsAsync(
            long collegeId,
            long electiveGroupId)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            var parameters = new
            {
                p_college_id = collegeId,
                p_elective_group_id = electiveGroupId
            };

            _logger.LogInformation(
                "Getting elective group subjects. " +
                "CollegeId={CollegeId}, ElectiveGroupId={ElectiveGroupId}",
                collegeId,
                electiveGroupId);

            return await connection.QueryAsync<ElectiveGroupSubjectResponseDto>(
                "sp_elective_group_subjects_get",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        // ============================================================
        // ADD SUBJECTS TO GROUP
        // SP: sp_elective_group_subjects_add
        // ============================================================

        public async Task AddSubjectsAsync(
            long collegeId,
            long electiveGroupId,
            List<long> subjectIds,
            long createdBy)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            var jsonSubjectIds =
                JsonSerializer.Serialize(subjectIds);

            var parameters = new
            {
                p_college_id = collegeId,
                p_elective_group_id = electiveGroupId,
                p_subject_ids = jsonSubjectIds,
                p_created_by = createdBy
            };

            _logger.LogInformation(
                "Adding subjects to elective group. " +
                "CollegeId={CollegeId}, ElectiveGroupId={ElectiveGroupId}",
                collegeId,
                electiveGroupId);

            await connection.QueryAsync(
                "sp_elective_group_subjects_add",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
    }
}