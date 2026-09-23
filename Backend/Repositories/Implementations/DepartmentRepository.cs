using System.Data;
using Dapper;
using MySqlConnector;
using BTech.DTOs.Department;
using BTech.Repositories.Interfaces;

namespace BTech.Repositories
{
    public class DepartmentRepository : IDepartmentRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<DepartmentRepository> _logger;

        public DepartmentRepository(
            IConfiguration configuration,
            ILogger<DepartmentRepository> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        private MySqlConnection CreateConnection()
        {
            return new MySqlConnection(
                _configuration.GetConnectionString("DefaultConnection"));
        }

        public async Task<HodResponseDto?> GetHodAsync(
    long departmentId)
        {
            try
            {
                _logger.LogInformation(
                    "Getting HOD for DepartmentId: {DepartmentId}",
                    departmentId);

                using var connection = CreateConnection();

                await connection.OpenAsync();

                var result = await connection.QueryFirstOrDefaultAsync<HodResponseDto>(
                    "sp_Department_GetHod",
                    new
                    {
                        p_department_id = departmentId
                    },
                    commandType: CommandType.StoredProcedure);

                _logger.LogInformation(
                    "Completed getting HOD for DepartmentId: {DepartmentId}",
                    departmentId);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error while getting HOD for DepartmentId: {DepartmentId}",
                    departmentId);

                throw;
            }
        }

        public async Task<IEnumerable<HodCandidateDto>>
    GetHodCandidatesAsync(long departmentId)
        {
            try
            {
                _logger.LogInformation(
                    "Getting HOD candidates for DepartmentId: {DepartmentId}",
                    departmentId);

                using var connection = CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QueryAsync<HodCandidateDto>(
                        "sp_Department_GetHodCandidates",
                        new
                        {
                            p_department_id = departmentId
                        },
                        commandType: CommandType.StoredProcedure);

                _logger.LogInformation(
                    "Found {Count} HOD candidates for DepartmentId: {DepartmentId}",
                    result.Count(),
                    departmentId);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error getting HOD candidates for DepartmentId: {DepartmentId}",
                    departmentId);

                throw;
            }
        }

        public async Task<HodResponseDto>
    AssignHodAsync(
        long departmentId,
        long employeeProfileId,
        long updatedBy)
        {
            try
            {
                _logger.LogInformation(
                    "Assigning HOD. DepartmentId: {DepartmentId}, EmployeeProfileId: {EmployeeProfileId}, UpdatedBy: {UpdatedBy}",
                    departmentId,
                    employeeProfileId,
                    updatedBy);

                using var connection = CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QueryFirstOrDefaultAsync<HodResponseDto>(
                        "sp_Department_AssignHod",
                        new
                        {
                            p_department_id = departmentId,
                            p_employee_profile_id = employeeProfileId,
                            p_updated_by = updatedBy
                        },
                        commandType: CommandType.StoredProcedure);

                if (result == null)
                {
                    throw new InvalidOperationException(
                        "HOD assignment failed.");
                }

                _logger.LogInformation(
                    "HOD assigned successfully. DepartmentId: {DepartmentId}, EmployeeProfileId: {EmployeeProfileId}",
                    departmentId,
                    employeeProfileId);

                return result;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while assigning HOD. DepartmentId: {DepartmentId}, EmployeeProfileId: {EmployeeProfileId}",
                    departmentId,
                    employeeProfileId);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while assigning HOD.");

                throw;
            }
        }

        public async Task RemoveHodAsync(
    long departmentId,
    long updatedBy)
        {
            try
            {
                _logger.LogInformation(
                    "Removing HOD. DepartmentId: {DepartmentId}, UpdatedBy: {UpdatedBy}",
                    departmentId,
                    updatedBy);

                using var connection = CreateConnection();

                await connection.OpenAsync();

                await connection.QueryAsync(
                    "sp_Department_RemoveHod",
                    new
                    {
                        p_department_id = departmentId,
                        p_updated_by = updatedBy
                    },
                    commandType: CommandType.StoredProcedure);

                _logger.LogInformation(
                    "HOD removed successfully. DepartmentId: {DepartmentId}",
                    departmentId);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error removing HOD for DepartmentId: {DepartmentId}",
                    departmentId);

                throw;
            }
        }
    }
}
