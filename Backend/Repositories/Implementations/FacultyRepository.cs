using System.Data;
using BTech.DTOs.Faculty;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public class FacultyRepository : IFacultyRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<FacultyRepository> _logger;

        public FacultyRepository(
            IConfiguration configuration,
            ILogger<FacultyRepository> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }


        private MySqlConnection CreateConnection()
        {
            return new MySqlConnection(
                _configuration.GetConnectionString(
                    "DefaultConnection"));
        }


        // =====================================================
        // GET FACULTY LIST
        // =====================================================

        public async Task<FacultyListResponseDto>
            GetFacultyListAsync(
                FacultyListRequestDto request)
        {
            await using var connection =
                CreateConnection();

            await connection.OpenAsync();

            var parameters = new
            {
                p_page_number = request.PageNumber,
                p_page_size = request.PageSize,

                p_search =
                    string.IsNullOrWhiteSpace(request.Search)
                        ? null
                        : request.Search.Trim(),

                p_college_id = request.CollegeId,

                p_department_id =
                    request.DepartmentId,

                p_status = request.Status
            };

            _logger.LogInformation(
                "Executing sp_faculty_list.");

            using var multi =
                await connection.QueryMultipleAsync(
                    "sp_faculty_list",
                    parameters,
                    commandType:
                        CommandType.StoredProcedure);

            var data =
                (await multi.ReadAsync<FacultyListItemDto>())
                .ToList();

            var totalRecords =
                await multi.ReadFirstAsync<long>();

            var totalPages =
                (int)Math.Ceiling(
                    totalRecords /
                    (double)request.PageSize);

            return new FacultyListResponseDto
            {
                Data = data,

                PageNumber =
                    request.PageNumber,

                PageSize =
                    request.PageSize,

                TotalRecords =
                    totalRecords,

                TotalPages =
                    totalPages
            };
        }


        // =====================================================
        // GET COMPLETE FACULTY DETAILS
        // =====================================================

        public async Task<FacultyDetailsResponseDto?>
            GetFacultyDetailsAsync(
                long facultyId)
        {
            await using var connection =
                CreateConnection();

            await connection.OpenAsync();

            _logger.LogInformation(
                "Executing sp_faculty_get_by_id for FacultyId: {FacultyId}",
                facultyId);

            var result =
                await connection.QueryFirstOrDefaultAsync
                    <FacultyDetailsResponseDto>(
                        "sp_faculty_get_by_id",
                        new
                        {
                            p_faculty_id = facultyId
                        },
                        commandType:
                            CommandType.StoredProcedure);

            return result;
        }

        public async Task<FacultyWorkloadResponseDto?>
    GetFacultyWorkloadAsync(
        long facultyId)
        {
            await using var connection =
                CreateConnection();

            await connection.OpenAsync();

            _logger.LogInformation(
                "Calculating workload for FacultyId: {FacultyId}",
                facultyId);

            var result =
                await connection.QueryFirstOrDefaultAsync<
                    FacultyWorkloadResponseDto>(
                        "sp_faculty_get_workload",
                        new
                        {
                            p_faculty_id = facultyId
                        },
                        commandType:
                            CommandType.StoredProcedure);

            return result;
        }
    }
}