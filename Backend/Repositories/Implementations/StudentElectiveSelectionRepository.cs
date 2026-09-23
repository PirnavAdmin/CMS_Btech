using System.Data;
using BTech.DTOs.Electives;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories
{
    public class StudentElectiveSelectionRepository
        : IStudentElectiveSelectionRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<StudentElectiveSelectionRepository> _logger;

        public StudentElectiveSelectionRepository(
            IConfiguration configuration,
            ILogger<StudentElectiveSelectionRepository> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        // ============================================================
        // DATABASE CONNECTION
        // ============================================================

        private MySqlConnection CreateConnection()
        {
            var connectionString =
                _configuration.GetConnectionString(
                    "DefaultConnection");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "DefaultConnection is missing from appsettings.json.");
            }

            return new MySqlConnection(connectionString);
        }

        // ============================================================
        // CREATE STUDENT ELECTIVE SELECTION
        // SP: sp_student_elective_selection_create
        // ============================================================

        public async Task<long> CreateAsync(
            long collegeId,
            long studentId,
            CreateStudentElectiveSelectionDto request,
            long createdBy)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            var parameters = new
            {
                p_college_id = collegeId,
                p_student_id = studentId,
                p_elective_group_id = request.ElectiveGroupId,
                p_subject_id = request.SubjectId,
                p_academic_year_id = request.AcademicYearId,
                p_semester_id = request.SemesterId,
                p_remarks = request.Remarks,
                p_created_by = createdBy
            };

            _logger.LogInformation(
                "Creating student elective selection. " +
                "CollegeId={CollegeId}, StudentId={StudentId}, " +
                "ElectiveGroupId={ElectiveGroupId}, SubjectId={SubjectId}",
                collegeId,
                studentId,
                request.ElectiveGroupId,
                request.SubjectId);

            var result = await connection.QuerySingleAsync<long>(
                "sp_student_elective_selection_create",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result;
        }

        // ============================================================
        // GET STUDENT ELECTIVE SELECTIONS
        // SP: sp_student_elective_selection_list
        // ============================================================

        public async Task<IEnumerable<StudentElectiveSelectionResponseDto>>
            GetByStudentAsync(
                long collegeId,
                long studentId)
        {
            await using var connection = CreateConnection();

            await connection.OpenAsync();

            var parameters = new
            {
                p_college_id = collegeId,
                p_student_id = studentId
            };

            _logger.LogInformation(
                "Getting student elective selections. " +
                "CollegeId={CollegeId}, StudentId={StudentId}",
                collegeId,
                studentId);

            return await connection.QueryAsync<
                StudentElectiveSelectionResponseDto>(
                "sp_student_elective_selection_list",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
    }
}