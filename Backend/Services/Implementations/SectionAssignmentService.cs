using BTech.DTOs.Sections;
using BTech.Exceptions;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;
using MySqlConnector;

namespace BTech.Services.Implementations
{
    public class SectionAssignmentService : ISectionAssignmentService
    {
        private readonly ISectionAssignmentRepository _repository;

        public SectionAssignmentService(ISectionAssignmentRepository repository)
        {
            _repository = repository;
        }

        public Task<ClassTeacherDto?> GetClassTeacherAsync(long sectionId)
        {
            ValidateSectionId(sectionId);
            return _repository.GetClassTeacherAsync(sectionId);
        }

        public Task<IEnumerable<ClassTeacherCandidateDto>> GetClassTeacherCandidatesAsync(long sectionId)
        {
            ValidateSectionId(sectionId);
            return _repository.GetClassTeacherCandidatesAsync(sectionId);
        }

        public async Task<ClassTeacherDto> AssignClassTeacherAsync(long sectionId, long employeeProfileId, long updatedBy)
        {
            ValidateSectionId(sectionId);
            if (employeeProfileId <= 0)
                throw new BusinessException("EmployeeProfileId is required.");
            if (updatedBy <= 0)
                throw new BusinessException("Invalid authenticated user.");

            try
            {
                return await _repository.AssignClassTeacherAsync(sectionId, employeeProfileId, updatedBy)
                    ?? throw new BusinessException("Class teacher assignment failed.");
            }
            catch (MySqlException ex)
            {
                throw new BusinessException(ex.Message);
            }
        }

        public async Task RemoveClassTeacherAsync(long sectionId, long updatedBy)
        {
            ValidateSectionId(sectionId);
            try
            {
                if (!await _repository.RemoveClassTeacherAsync(sectionId, updatedBy))
                    throw new BusinessException("Section not found or class teacher is already empty.");
            }
            catch (MySqlException ex)
            {
                throw new BusinessException(ex.Message);
            }
        }

        public async Task<SectionCapacityDto> GetCapacityAsync(long sectionId)
        {
            ValidateSectionId(sectionId);
            return await _repository.GetCapacityAsync(sectionId)
                ?? throw new BusinessException("Section not found.");
        }

        public Task<IEnumerable<StudentCandidateDto>> GetStudentCandidatesAsync(long sectionId, string? search)
        {
            ValidateSectionId(sectionId);
            return _repository.GetStudentCandidatesAsync(sectionId, search);
        }

        public Task<IEnumerable<SectionStudentDto>> GetStudentsAsync(long sectionId)
        {
            ValidateSectionId(sectionId);
            return _repository.GetStudentsAsync(sectionId);
        }

        public Task<IEnumerable<SectionStudentDto>> GetAllStudentsAsync() =>
            _repository.GetAllStudentsAsync();

        public async Task<AssignStudentsResultDto> AssignStudentsAsync(long sectionId, IReadOnlyCollection<long> studentIds, long assignedBy)
        {
            ValidateSectionId(sectionId);
            if (studentIds == null || studentIds.Count == 0)
                throw new BusinessException("Select at least one student.");
            if (studentIds.Any(x => x <= 0))
                throw new BusinessException("Invalid StudentId supplied.");
            if (assignedBy <= 0)
                throw new BusinessException("Invalid authenticated user.");

            try
            {
                return await _repository.AssignStudentsAsync(sectionId, studentIds, assignedBy)
                    ?? throw new BusinessException("Student assignment failed.");
            }
            catch (MySqlException ex)
            {
                throw new BusinessException(ex.Message);
            }
        }

        public async Task RemoveStudentAsync(long sectionId, long studentId, long removedBy)
        {
            ValidateSectionId(sectionId);
            if (studentId <= 0)
                throw new BusinessException("Invalid student ID.");

            try
            {
                if (!await _repository.RemoveStudentAsync(sectionId, studentId, removedBy))
                    throw new BusinessException("Active student-section assignment not found.");
            }
            catch (MySqlException ex)
            {
                throw new BusinessException(ex.Message);
            }
        }

        private static void ValidateSectionId(long sectionId)
        {
            if (sectionId <= 0)
                throw new BusinessException("Invalid section ID.");
        }
    }
}
