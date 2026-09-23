using BTech.DTOs.Electives;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;
using System.Data;

namespace BTech.Repositories.Implementations
{
    public class ElectiveAllocationRepository : IElectiveAllocationRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ElectiveAllocationRepository> _logger;

        public ElectiveAllocationRepository(
            IConfiguration configuration,
            ILogger<ElectiveAllocationRepository> logger)
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

        public async Task<IEnumerable<ElectiveAllocationResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveAllocationListRequestDto request)
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
                    "p_allocation_status",
                    string.IsNullOrWhiteSpace(request.AllocationStatus)
                        ? null
                        : request.AllocationStatus.Trim(),
                    DbType.String);

                parameters.Add(
                    "p_search",
                    string.IsNullOrWhiteSpace(request.Search)
                        ? null
                        : request.Search.Trim(),
                    DbType.String);

                var result =
                    await connection.QueryAsync<ElectiveAllocationResponseDto>(
                        "sp_elective_allocation_list",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving elective allocations for CollegeId {CollegeId}",
                    collegeId);

                throw;
            }
        }

        public async Task<ElectiveAllocationResponseDto?> CreateAsync(
            long collegeId,
            long selectionId,
            ElectiveAllocationCreateDto request,
            long allocatedBy)
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
                    "p_allocated_by",
                    allocatedBy,
                    DbType.Int64);

                parameters.Add(
                    "p_remarks",
                    string.IsNullOrWhiteSpace(request.Remarks)
                        ? null
                        : request.Remarks.Trim(),
                    DbType.String);

                var result =
                    await connection.QueryFirstOrDefaultAsync<ElectiveAllocationResponseDto>(
                        "sp_elective_allocation_create",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error creating elective allocation for CollegeId {CollegeId}, SelectionId {SelectionId}",
                    collegeId,
                    selectionId);

                throw;
            }
        }
    }
}