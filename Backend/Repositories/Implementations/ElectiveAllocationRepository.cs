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

        // ============================================================
        // CREATE DATABASE CONNECTION
        // ============================================================
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

        // ============================================================
        // GET ALL ELECTIVE ALLOCATIONS
        // GET: api/v1/elective-allocations
        // ============================================================
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

                _logger.LogInformation(
                    "Retrieving elective allocations. CollegeId={CollegeId}",
                    collegeId);

                var result =
                    await connection.QueryAsync<ElectiveAllocationResponseDto>(
                        "sp_elective_allocation_list",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                return result;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "MYSQL ERROR retrieving elective allocations. " +
                    "Number={Number}, SqlState={SqlState}, Message={Message}, " +
                    "CollegeId={CollegeId}",
                    ex.Number,
                    ex.SqlState,
                    ex.Message,
                    collegeId);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "ERROR retrieving elective allocations. " +
                    "CollegeId={CollegeId}",
                    collegeId);

                throw;
            }
        }

        // ============================================================
        // CREATE ELECTIVE ALLOCATION
        // Existing endpoint:
        // POST: api/v1/elective-allocations/{selectionId}
        //
        // Also used by the new frontend-compatible endpoint:
        // POST: api/v1/electives/allocations
        // ============================================================
        public async Task<ElectiveAllocationResponseDto?> CreateAsync(
            long collegeId,
            long selectionId,
            ElectiveAllocationCreateDto request,
            long allocatedBy)
        {
            await using var connection = CreateConnection();

            try
            {
                // ----------------------------------------------------
                // Open MySQL connection
                // ----------------------------------------------------
                await connection.OpenAsync();

                // ----------------------------------------------------
                // Validate request
                // ----------------------------------------------------
                if (collegeId <= 0)
                {
                    throw new ArgumentException(
                        "CollegeId must be greater than zero.");
                }

                if (selectionId <= 0)
                {
                    throw new ArgumentException(
                        "SelectionId must be greater than zero.");
                }

                if (allocatedBy <= 0)
                {
                    throw new ArgumentException(
                        "AllocatedBy must be greater than zero.");
                }

                if (request == null)
                {
                    throw new ArgumentNullException(
                        nameof(request),
                        "Allocation request is required.");
                }

                // ----------------------------------------------------
                // Prepare parameters
                // ----------------------------------------------------
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

                // ----------------------------------------------------
                // Log request information
                // ----------------------------------------------------
                _logger.LogInformation(
                    "Creating elective allocation. " +
                    "CollegeId={CollegeId}, " +
                    "SelectionId={SelectionId}, " +
                    "AllocatedBy={AllocatedBy}, " +
                    "Remarks={Remarks}",
                    collegeId,
                    selectionId,
                    allocatedBy,
                    request.Remarks);

                // ----------------------------------------------------
                // Execute stored procedure
                // ----------------------------------------------------
                var result =
                    await connection.QueryFirstOrDefaultAsync<ElectiveAllocationResponseDto>(
                        "sp_elective_allocation_create",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                // ----------------------------------------------------
                // Check result
                // ----------------------------------------------------
                if (result == null)
                {
                    _logger.LogWarning(
                        "Elective allocation stored procedure returned no result. " +
                        "CollegeId={CollegeId}, " +
                        "SelectionId={SelectionId}, " +
                        "AllocatedBy={AllocatedBy}",
                        collegeId,
                        selectionId,
                        allocatedBy);

                    return null;
                }

                _logger.LogInformation(
                    "Elective allocation created successfully. " +
                    "AllocationId={AllocationId}, " +
                    "SelectionId={SelectionId}",
                    result.AllocationId,
                    selectionId);

                return result;
            }
            catch (MySqlException ex)
            {
                // ====================================================
                // IMPORTANT:
                // This captures the actual MySQL error.
                // ====================================================
                _logger.LogError(
                    ex,
                    "MYSQL ERROR creating elective allocation. " +
                    "Number={Number}, " +
                    "SqlState={SqlState}, " +
                    "Message={Message}, " +
                    "CollegeId={CollegeId}, " +
                    "SelectionId={SelectionId}, " +
                    "AllocatedBy={AllocatedBy}",
                    ex.Number,
                    ex.SqlState,
                    ex.Message,
                    collegeId,
                    selectionId,
                    allocatedBy);

                throw;
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(
                    ex,
                    "VALIDATION ERROR creating elective allocation. " +
                    "CollegeId={CollegeId}, " +
                    "SelectionId={SelectionId}, " +
                    "AllocatedBy={AllocatedBy}",
                    collegeId,
                    selectionId,
                    allocatedBy);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "ERROR creating elective allocation. " +
                    "CollegeId={CollegeId}, " +
                    "SelectionId={SelectionId}, " +
                    "AllocatedBy={AllocatedBy}",
                    collegeId,
                    selectionId,
                    allocatedBy);

                throw;
            }
        }
    }
}