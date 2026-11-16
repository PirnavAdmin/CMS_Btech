using BTech.CampusManagement;
using BTech.Exceptions;
using System.Data;
using BTech.DTOs.Sections;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public class SectionRepository : ISectionRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SectionRepository> _logger;
        private readonly IHttpContextAccessor _http;
        private CampusWorkspaceScope? Campus => CampusWorkspaceScope.From(_http.HttpContext);

        public SectionRepository(
            IConfiguration configuration,
            ILogger<SectionRepository> logger,
            IHttpContextAccessor http)
        {
            _configuration = configuration;
            _logger = logger;
            _http = http;
        }

        private DynamicParameters ScopedParameters(object? values = null)
        {
            var parameters = new DynamicParameters(values);
            if (Campus is { } scope)
            {
                parameters.Add("p_scope_college_id", scope.CollegeId);
                parameters.Add("p_campus_id", scope.CampusId);
            }
            return parameters;
        }

        private MySqlConnection CreateConnection()
        {
            return new MySqlConnection(
                _configuration.GetConnectionString(
                    "DefaultConnection"));
        }


        // =========================================================
        // GET ALL
        // =========================================================

        public async Task<IEnumerable<SectionResponseDto>>
            GetAllAsync()
        {
            try
            {
                _logger.LogInformation(
                    "Getting all sections");

                await using var connection =
                    CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QueryAsync<SectionResponseDto>(
                        Campus is null ? "sp_section_get_all" : "sp_campus_section_get_all",
                        ScopedParameters(),
                        commandType:
                            CommandType.StoredProcedure);

                _logger.LogInformation(
                    "Successfully retrieved all sections");

                return result;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while getting all sections");

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while getting all sections");

                throw;
            }
        }


        // =========================================================
        // GET BY ID
        // =========================================================

        public async Task<SectionResponseDto?>
            GetByIdAsync(long sectionId)
        {
            try
            {
                _logger.LogInformation(
                    "Getting section by ID: {SectionId}",
                    sectionId);

                await using var connection =
                    CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QueryFirstOrDefaultAsync<
                        SectionResponseDto>(
                        Campus is null ? "sp_section_get_by_id" : "sp_campus_section_get_by_id",
                        ScopedParameters(new
                        {
                            p_section_id = sectionId
                        }),
                        commandType:
                            CommandType.StoredProcedure);

                if (result == null)
                {
                    _logger.LogWarning(
                        "Section not found. SectionId: {SectionId}",
                        sectionId);
                }
                else
                {
                    _logger.LogInformation(
                        "Section retrieved successfully. SectionId: {SectionId}",
                        sectionId);
                }

                return result;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while getting section. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while getting section. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
        }


        // =========================================================
        // SEARCH
        // =========================================================

        public async Task<IEnumerable<SectionResponseDto>>
            SearchAsync(
                string? search,
                long? departmentId,
                long? courseId,
                long? branchId,
                long? semesterId,
                bool? status)
        {
            try
            {
                _logger.LogInformation(
                    "Searching sections. Search: {Search}, DepartmentId: {DepartmentId}, CourseId: {CourseId}, BranchId: {BranchId}, SemesterId: {SemesterId}, Status: {Status}",
                    search,
                    departmentId,
                    courseId,
                    branchId,
                    semesterId,
                    status);

                await using var connection =
                    CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QueryAsync<SectionResponseDto>(
                        Campus is null ? "sp_section_search" : "sp_campus_section_search",
                        ScopedParameters(new
                        {
                            p_search = search,
                            p_department_id = departmentId,
                            p_course_id = courseId,
                            p_branch_id = branchId,
                            p_semester_id = semesterId,
                            p_status = status.HasValue
                                ? (int?)(status.Value ? 1 : 0)
                                : null
                        }),
                        commandType:
                            CommandType.StoredProcedure);

                _logger.LogInformation(
                    "Section search completed successfully");

                return result;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while searching sections");

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while searching sections");

                throw;
            }
        }


        // =========================================================
        // CREATE
        // =========================================================

        public async Task<long> CreateAsync(
            Section section)
        {
            try
            {
                _logger.LogInformation(
                    "Creating section. SectionName: {SectionName}, SectionCode: {SectionCode}, CollegeId: {CollegeId}, AcademicYearId: {AcademicYearId}, SemesterId: {SemesterId}",
                    section.SectionName,
                    section.SectionCode, section.CollegeId, section.AcademicYearId, section.SemesterId);

                await using var connection =
                    CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QuerySingleAsync<long>(
                        Campus is null ? "sp_section_create" : "sp_campus_section_create",
                        ScopedParameters(new
                        {
                            p_college_id =
                                section.CollegeId,

                            p_academic_year_id =
                                section.AcademicYearId,

                            p_department_id =
                                section.DepartmentId,

                            p_course_id =
                                section.CourseId,

                            p_branch_id =
                                section.BranchId,

                            p_semester_id =
                                section.SemesterId,

                            p_section_code =
                                section.SectionCode,

                            p_section_name =
                                section.SectionName,

                            p_capacity =
                                section.Capacity,

                            p_created_by =
                                section.CreatedBy
                        }),
                        commandType:
                            CommandType.StoredProcedure);

                _logger.LogInformation(
                    "Section created successfully. SectionId: {SectionId}",
                    result);

                return result;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while creating section. SectionName: {SectionName}",
                    section.SectionName);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while creating section. SectionName: {SectionName}",
                    section.SectionName);

                throw;
            }
        }


        // =========================================================
        // UPDATE
        // =========================================================

        public async Task<bool> UpdateAsync(
            Section section)
        {
            try
            {
                _logger.LogInformation(
                    "Updating section. SectionId: {SectionId}",
                    section.SectionId);

                await using var connection =
                    CreateConnection();

                await connection.OpenAsync();

                // -------------------------------------------------
                // Dynamic parameters for Section Update
                // -------------------------------------------------

                var parameters = ScopedParameters();

                parameters.Add(
                    "p_section_id",
                    section.SectionId);

                parameters.Add(
                    "p_section_name",
                    section.SectionName);

                parameters.Add(
                    "p_section_code",
                    section.SectionCode);

                parameters.Add(
                    "p_capacity",
                    section.Capacity);

                parameters.Add(
                    "p_class_teacher_employee_profile_id",
                    section.FacultyAdvisorEmployeeProfileId);

                parameters.Add(
                    "p_room",
                    section.Room);

                parameters.Add(
                    "p_shift",
                    section.Shift);

                parameters.Add(
                    "p_section_type",
                    section.SectionType);

                parameters.Add(
                    "p_status",
                    section.Status);

                parameters.Add(
                    "p_updated_by",
                    section.UpdatedBy);


                _logger.LogDebug(
                    "Executing sp_section_update_details for SectionId: {SectionId}",
                    section.SectionId);


                var result =
                    await connection.QuerySingleAsync<int>(
                        Campus is null ? "sp_section_update_details" : "sp_campus_section_update_details",
                        parameters,
                        commandType:
                            CommandType.StoredProcedure);


                if (result > 0)
                {
                    _logger.LogInformation(
                        "Section updated successfully. SectionId: {SectionId}",
                        section.SectionId);

                    return true;
                }


                _logger.LogWarning(
                    "Section update returned no affected rows. SectionId: {SectionId}",
                    section.SectionId);

                return false;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while updating section. SectionId: {SectionId}",
                    section.SectionId);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while updating section. SectionId: {SectionId}",
                    section.SectionId);

                throw;
            }
        }


        // =========================================================
        // DELETE
        // =========================================================

        public async Task<bool> DeleteAsync(
            long sectionId,
            long deletedBy)
        {
            try
            {
                _logger.LogInformation(
                    "Deleting section. SectionId: {SectionId}, DeletedBy: {DeletedBy}",
                    sectionId,
                    deletedBy);

                await using var connection =
                    CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QuerySingleAsync<int>(
                        Campus is null ? "sp_section_delete" : "sp_campus_section_delete",
                        ScopedParameters(new
                        {
                            p_section_id =
                                sectionId,

                            p_deleted_by =
                                deletedBy
                        }),
                        commandType:
                            CommandType.StoredProcedure);

                if (result > 0)
                {
                    _logger.LogInformation(
                        "Section deleted successfully. SectionId: {SectionId}",
                        sectionId);

                    return true;
                }

                _logger.LogWarning(
                    "Section delete returned no affected rows. SectionId: {SectionId}",
                    sectionId);

                return false;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while deleting section. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while deleting section. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
        }


        // =========================================================
        // UPDATE STATUS
        // =========================================================

        public async Task<bool> UpdateStatusAsync(
            long sectionId,
            bool status,
            long updatedBy)
        {
            try
            {
                _logger.LogInformation(
                    "Updating section status. SectionId: {SectionId}, Status: {Status}",
                    sectionId,
                    status);

                await using var connection =
                    CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QuerySingleAsync<int>(
                        Campus is null ? "sp_section_update_status" : "sp_campus_section_update_status",
                        ScopedParameters(new
                        {
                            p_section_id =
                                sectionId,

                            p_status =
                                status ? 1 : 0,

                            p_updated_by =
                                updatedBy
                        }),
                        commandType:
                            CommandType.StoredProcedure);

                if (result > 0)
                {
                    _logger.LogInformation(
                        "Section status updated successfully. SectionId: {SectionId}",
                        sectionId);

                    return true;
                }

                _logger.LogWarning(
                    "Section status update returned no affected rows. SectionId: {SectionId}",
                    sectionId);

                return false;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while updating section status. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while updating section status. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
        }


        // =========================================================
        // VALIDATE CAPACITY
        // =========================================================

        public async Task<SectionCapacityValidationDto>
            ValidateCapacityAsync(
                long? sectionId,
                int capacity)
        {
            try
            {
                _logger.LogInformation(
                    "Validating section capacity. SectionId: {SectionId}, Capacity: {Capacity}",
                    sectionId,
                    capacity);

                await using var connection =
                    CreateConnection();

                await connection.OpenAsync();

                var result =
                    await connection.QuerySingleOrDefaultAsync<
                        SectionCapacityValidationDto>(
                        Campus is null ? "sp_section_validate_capacity" : "sp_campus_section_validate_capacity",
                        ScopedParameters(new
                        {
                            p_section_id = sectionId,
                            p_capacity = capacity
                        }),
                        commandType:
                            CommandType.StoredProcedure);

                if (result == null)
                    throw new NotFoundException("Section not found.");

                _logger.LogInformation(
                    "Section capacity validation completed. SectionId: {SectionId}",
                    sectionId);

                return result;
            }
            catch (MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Database error while validating section capacity. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error while validating section capacity. SectionId: {SectionId}",
                    sectionId);

                throw;
            }
        }

        public async Task<SectionSummaryResponseDto> GetSummaryAsync()
        {
            try
            {
                _logger.LogInformation(
                    "Fetching section management summary.");

                using var connection = CreateConnection();

                var result = await connection.QuerySingleAsync<SectionSummaryResponseDto>(
                    Campus is null ? "sp_section_get_summary" : "sp_campus_section_get_summary",
                        ScopedParameters(),
                    commandType: CommandType.StoredProcedure);

                _logger.LogInformation(
                    "Section summary retrieved successfully. " +
                    "TotalSections={TotalSections}, " +
                    "ActiveSections={ActiveSections}, " +
                    "TotalCapacity={TotalCapacity}, " +
                    "UnassignedAdvisors={UnassignedAdvisors}",
                    result.TotalSections,
                    result.ActiveSections,
                    result.TotalCapacity,
                    result.UnassignedAdvisors);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error while fetching section management summary.");

                throw;
            }
        }
    }
}
