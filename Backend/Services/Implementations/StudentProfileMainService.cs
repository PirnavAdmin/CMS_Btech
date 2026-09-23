using BTech.DTOs.StudentProfileMain;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services
{
    public class StudentProfileMainService : IStudentProfileMainService
    {
        private readonly IStudentProfileMainRepository _repository;
        private readonly ILogger<StudentProfileMainService> _logger;

        public StudentProfileMainService(
            IStudentProfileMainRepository repository,
            ILogger<StudentProfileMainService> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<IEnumerable<StudentProfileListDto>> GetAllAsync(
            long collegeId,
            string? search,
            long? departmentId,
            long? courseId,
            long? branchId,
            long? academicYearId,
            int? semester,
            long? sectionId,
            int? status)
        {
            _logger.LogInformation(
                "Getting student profiles. CollegeId: {CollegeId}",
                collegeId);

            return await _repository.GetAllAsync(
                collegeId,
                search,
                departmentId,
                courseId,
                branchId,
                academicYearId,
                semester,
                sectionId,
                status);
        }

        public async Task<StudentProfilePreviewDto?> GetPreviewAsync(
            long studentId,
            long collegeId)
        {
            _logger.LogInformation(
                "Getting student profile preview. StudentId: {StudentId}, CollegeId: {CollegeId}",
                studentId,
                collegeId);

            return await _repository.GetPreviewAsync(
                studentId,
                collegeId);
        }

        public async Task<StudentProfilePreviewDto?> UpdateAsync(
            long studentId,
            long collegeId,
            UpdateStudentProfileDto request,
            long changedBy,
            string? ipAddress,
            string? userAgent)
        {
            if (studentId <= 0) throw new ArgumentException("A valid student ID is required.");
            if (collegeId <= 0) throw new ArgumentException("A valid college ID is required.");
            if (changedBy <= 0) throw new UnauthorizedAccessException("Invalid authenticated user.");

            request.FullName = request.FullName?.Trim() ?? string.Empty;
            if (request.FullName.Length is < 2 or > 150)
                throw new ArgumentException("Full name must contain between 2 and 150 characters.");
            if (request.DateOfBirth.HasValue && request.DateOfBirth.Value.Date > DateTime.UtcNow.Date)
                throw new ArgumentException("Date of birth cannot be in the future.");

            var updated = await _repository.UpdateAsync(
                studentId,
                collegeId,
                request,
                changedBy,
                ipAddress,
                userAgent);

            if (!updated) return null;

            _logger.LogInformation(
                "Student profile screen fields updated. StudentId={StudentId}, CollegeId={CollegeId}, ChangedBy={ChangedBy}",
                studentId,
                collegeId,
                changedBy);
            return await _repository.GetPreviewAsync(studentId, collegeId);
        }
    }
}
