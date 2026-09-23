using BTech.DTOs.Electives;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services
{
    public class ElectiveGroupService : IElectiveGroupService
    {
        private readonly IElectiveGroupRepository _repository;

        public ElectiveGroupService(
            IElectiveGroupRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<ElectiveGroupResponseDto>> GetAllAsync(
            long collegeId,
            ElectiveGroupListRequestDto request)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException("College information is required.");
            }

            return await _repository.GetAllAsync(
                collegeId,
                request);
        }

        public async Task<long> CreateAsync(
            long collegeId,
            CreateElectiveGroupDto request,
            long createdBy)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException("College information is required.");
            }

            if (createdBy <= 0)
            {
                throw new ArgumentException("User information is required.");
            }

            if (request == null)
            {
                throw new ArgumentNullException(nameof(request));
            }

            if (string.IsNullOrWhiteSpace(request.GroupCode))
            {
                throw new ArgumentException("Group code is required.");
            }

            if (string.IsNullOrWhiteSpace(request.GroupName))
            {
                throw new ArgumentException("Group name is required.");
            }

            if (request.CourseId <= 0)
            {
                throw new ArgumentException("Course is required.");
            }

            if (request.BranchId <= 0)
            {
                throw new ArgumentException("Branch is required.");
            }

            if (request.SemesterId <= 0)
            {
                throw new ArgumentException("Semester is required.");
            }

            if (request.AcademicYearId <= 0)
            {
                throw new ArgumentException("Academic year is required.");
            }

            if (request.MinSelections <= 0)
            {
                throw new ArgumentException(
                    "Minimum selections must be greater than zero.");
            }

            if (request.MaxSelections < request.MinSelections)
            {
                throw new ArgumentException(
                    "Maximum selections cannot be less than minimum selections.");
            }

            request.GroupCode = request.GroupCode.Trim();
            request.GroupName = request.GroupName.Trim();

            if (!string.IsNullOrWhiteSpace(request.Description))
            {
                request.Description = request.Description.Trim();
            }

            return await _repository.CreateAsync(
                collegeId,
                request,
                createdBy);
        }

        public async Task<IEnumerable<ElectiveGroupSubjectResponseDto>> GetSubjectsAsync(
            long collegeId,
            long electiveGroupId)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException("College information is required.");
            }

            if (electiveGroupId <= 0)
            {
                throw new ArgumentException("Elective group is required.");
            }

            return await _repository.GetSubjectsAsync(
                collegeId,
                electiveGroupId);
        }

        public async Task AddSubjectsAsync(
            long collegeId,
            long electiveGroupId,
            List<long> subjectIds,
            long createdBy)
        {
            if (collegeId <= 0)
            {
                throw new ArgumentException("College information is required.");
            }

            if (electiveGroupId <= 0)
            {
                throw new ArgumentException("Elective group is required.");
            }

            if (createdBy <= 0)
            {
                throw new ArgumentException("User information is required.");
            }

            if (subjectIds == null || subjectIds.Count == 0)
            {
                throw new ArgumentException(
                    "At least one subject must be selected.");
            }

            subjectIds = subjectIds
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            if (subjectIds.Count == 0)
            {
                throw new ArgumentException(
                    "At least one valid subject must be selected.");
            }

            await _repository.AddSubjectsAsync(
                collegeId,
                electiveGroupId,
                subjectIds,
                createdBy);
        }
    }
}