using BTech.DTOs.Electives;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services
{
    public class StudentElectiveSelectionService
        : IStudentElectiveSelectionService
    {
        private readonly IStudentElectiveSelectionRepository _repository;

        public StudentElectiveSelectionService(
            IStudentElectiveSelectionRepository repository)
        {
            _repository = repository;
        }

        // ============================================================
        // CREATE STUDENT ELECTIVE SELECTION
        // ============================================================

        public async Task<long> CreateAsync(
            long collegeId,
            long studentId,
            CreateStudentElectiveSelectionDto request,
            long createdBy)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException(
                    "College information is required.");
            }

            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "Student information is required.");
            }

            if (createdBy <= 0)
            {
                throw new ArgumentException(
                    "User information is required.");
            }

            if (request == null)
            {
                throw new ArgumentNullException(
                    nameof(request));
            }

            if (request.ElectiveGroupId <= 0)
            {
                throw new ArgumentException(
                    "Elective group is required.");
            }

            if (request.SubjectId <= 0)
            {
                throw new ArgumentException(
                    "Subject is required.");
            }

            if (request.AcademicYearId <= 0)
            {
                throw new ArgumentException(
                    "Academic year is required.");
            }

            if (request.SemesterId <= 0)
            {
                throw new ArgumentException(
                    "Semester is required.");
            }

            if (!string.IsNullOrWhiteSpace(request.Remarks))
            {
                request.Remarks = request.Remarks.Trim();
            }

            return await _repository.CreateAsync(
                collegeId,
                studentId,
                request,
                createdBy);
        }

        // ============================================================
        // GET STUDENT ELECTIVE SELECTIONS
        // ============================================================

        public async Task<IEnumerable<StudentElectiveSelectionResponseDto>>
            GetByStudentAsync(
                long collegeId,
                long studentId)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException(
                    "College information is required.");
            }

            if (studentId <= 0)
            {
                throw new ArgumentException(
                    "Student information is required.");
            }

            return await _repository.GetByStudentAsync(
                collegeId,
                studentId);
        }
    }
}