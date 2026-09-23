using BTech.DTOs.Department;
using BTech.Exceptions;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services
{
    public class DepartmentService : IDepartmentService
    {
        private readonly IDepartmentRepository _repository;
        private readonly ILogger<DepartmentService> _logger;

        public DepartmentService(
            IDepartmentRepository repository,
            ILogger<DepartmentService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<HodResponseDto?> GetHodAsync(
    long departmentId)
        {
            if (departmentId <= 0)
                throw new BusinessException(
                    "Invalid department ID.");

            _logger.LogInformation(
                "Service: Getting HOD for DepartmentId {DepartmentId}",
                departmentId);

            return await _repository.GetHodAsync(
                departmentId);
        }

        public async Task<IEnumerable<HodCandidateDto>>
    GetHodCandidatesAsync(long departmentId)
        {
            if (departmentId <= 0)
                throw new BusinessException(
                    "Invalid department ID.");

            return await _repository
                .GetHodCandidatesAsync(departmentId);
        }

        public async Task<HodResponseDto>
    AssignHodAsync(
        long departmentId,
        long employeeProfileId,
        long updatedBy)
        {
            if (departmentId <= 0)
                throw new BusinessException(
                    "Invalid department ID.");

            if (employeeProfileId <= 0)
                throw new BusinessException(
                    "Invalid employee profile ID.");

            if (updatedBy <= 0)
                throw new BusinessException(
                    "Invalid user ID.");

            _logger.LogInformation(
                "Service: Assigning HOD. DepartmentId: {DepartmentId}, EmployeeProfileId: {EmployeeProfileId}",
                departmentId,
                employeeProfileId);

            try
            {
                return await _repository.AssignHodAsync(
                    departmentId,
                    employeeProfileId,
                    updatedBy);
            }
            catch (MySqlConnector.MySqlException ex)
            {
                _logger.LogError(
                    ex,
                    "Stored procedure failed while assigning HOD.");

                throw new BusinessException(ex.Message);
            }
        }

        public async Task RemoveHodAsync(
    long departmentId,
    long updatedBy)
        {
            if (departmentId <= 0)
                throw new BusinessException(
                    "Invalid department ID.");

            await _repository.RemoveHodAsync(
                departmentId,
                updatedBy);
        }

    }
}