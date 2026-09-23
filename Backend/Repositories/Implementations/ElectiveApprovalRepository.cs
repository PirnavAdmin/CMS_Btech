using BTech.DTOs.Electives;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;
using System.Data;

namespace BTech.Repositories.Implementations
{
    public class ElectiveApprovalRepository : IElectiveApprovalRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ElectiveApprovalRepository> _logger;

        public ElectiveApprovalRepository(
            IConfiguration configuration,
            ILogger<ElectiveApprovalRepository> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        private MySqlConnection CreateConnection()
        {
            var connectionString =
                _configuration.GetConnectionString("DefaultConnection");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "DefaultConnection connection string is not configured.");
            }

            return new MySqlConnection(connectionString);
        }

        public async Task<IEnumerable<ElectiveApprovalResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveApprovalListRequestDto request)
        {
            await using var connection = CreateConnection();

            try
            {
                await connection.OpenAsync();

                var parameters = new DynamicParameters();

                parameters.Add(
                    "p_college_id",
                    collegeId,
                    DbType.Int64);

                parameters.Add(
                    "p_academic_year_id",
                    request.AcademicYearId,
                    DbType.Int64);

                parameters.Add(
                    "p_course_id",
                    request.CourseId,
                    DbType.Int64);

                parameters.Add(
                    "p_branch_id",
                    request.BranchId,
                    DbType.Int64);

                parameters.Add(
                    "p_semester_id",
                    request.SemesterId,
                    DbType.Int64);

                parameters.Add(
                    "p_elective_group_id",
                    request.ElectiveGroupId,
                    DbType.Int64);

                parameters.Add(
                    "p_approval_status",
                    string.IsNullOrWhiteSpace(request.ApprovalStatus)
                        ? null
                        : request.ApprovalStatus.Trim(),
                    DbType.String);

                parameters.Add(
                    "p_search",
                    string.IsNullOrWhiteSpace(request.Search)
                        ? null
                        : request.Search.Trim(),
                    DbType.String);

                var result =
                    await connection.QueryAsync<ElectiveApprovalResponseDto>(
                        "sp_elective_approval_list",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving elective approvals for CollegeId {CollegeId}",
                    collegeId);

                throw;
            }
        }

        public async Task<ElectiveApprovalResponseDto?> UpdateAsync(
            long collegeId,
            long selectionId,
            ElectiveApprovalRequestDto request,
            long approvedBy)
        {
            await using var connection = CreateConnection();

            try
            {
                await connection.OpenAsync();

                var parameters = new DynamicParameters();

                parameters.Add(
                    "p_college_id",
                    collegeId,
                    DbType.Int64);

                parameters.Add(
                    "p_selection_id",
                    selectionId,
                    DbType.Int64);

                parameters.Add(
                    "p_approval_status",
                    request.ApprovalStatus?.Trim(),
                    DbType.String);

                parameters.Add(
                    "p_remarks",
                    string.IsNullOrWhiteSpace(request.Remarks)
                        ? null
                        : request.Remarks.Trim(),
                    DbType.String);

                parameters.Add(
                    "p_approved_by",
                    approvedBy,
                    DbType.Int64);

                var result =
                    await connection.QueryFirstOrDefaultAsync<ElectiveApprovalResponseDto>(
                        "sp_elective_approval_update",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating elective approval for CollegeId {CollegeId}, SelectionId {SelectionId}",
                    collegeId,
                    selectionId);

                throw;
            }
        }
    }
}