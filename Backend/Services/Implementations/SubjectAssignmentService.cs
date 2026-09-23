using BTech.DTOs.SubjectAssignment;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class SubjectAssignmentService
        : ISubjectAssignmentService
    {
        private readonly ISubjectAssignmentRepository _repository;

        public SubjectAssignmentService(
            ISubjectAssignmentRepository repository)
        {
            _repository = repository;
        }

        public async Task<SubjectAssignmentResponseDto>
            CreateAsync(
                CreateSubjectAssignmentDto dto)
        {
            var exists = await _repository.ExistsAsync(
                dto.SubjectId,
                dto.SemesterId);

            if (exists)
            {
                throw new InvalidOperationException(
                    "Subject is already assigned to this semester.");
            }

            var assignment = new SubjectSemesterAssignment
            {
                SubjectId = dto.SubjectId,
                SemesterId = dto.SemesterId,
                Status = 1,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = dto.CreatedBy
            };

            await _repository.AddAsync(assignment);

            return MapToResponse(assignment);
        }

        public async Task<List<SubjectAssignmentResponseDto>>
            GetAllAsync()
        {
            var assignments =
                await _repository.GetAllAsync();

            return assignments
                .Select(MapToResponse)
                .ToList();
        }

        public async Task<SubjectAssignmentResponseDto?>
            GetByIdAsync(long id)
        {
            var assignment =
                await _repository.GetByIdAsync(id);

            if (assignment == null)
            {
                return null;
            }

            return MapToResponse(assignment);
        }

        public async Task<SubjectAssignmentResponseDto>
            UpdateAsync(
                long id,
                UpdateSubjectAssignmentDto dto)
        {
            var assignment =
                await _repository.GetByIdAsync(id);

            if (assignment == null)
            {
                throw new KeyNotFoundException(
                    "Subject assignment not found.");
            }

            assignment.SubjectId = dto.SubjectId;
            assignment.SemesterId = dto.SemesterId;
            assignment.UpdatedBy = dto.UpdatedBy;
            assignment.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(assignment);

            return MapToResponse(assignment);
        }

        public async Task<bool> UpdateStatusAsync(
            long id,
            byte status)
        {
            var assignment =
                await _repository.GetByIdAsync(id);

            if (assignment == null)
            {
                return false;
            }

            assignment.Status = status;
            assignment.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(assignment);

            return true;
        }

        private static SubjectAssignmentResponseDto
            MapToResponse(
                SubjectSemesterAssignment assignment)
        {
            return new SubjectAssignmentResponseDto
            {
                SubjectSemesterAssignmentId =
                    assignment.SubjectSemesterAssignmentId,

                SubjectId =
                    assignment.SubjectId,

                SemesterId =
                    assignment.SemesterId,

                Status =
                    assignment.Status,

                CreatedAt =
                    assignment.CreatedAt,

                UpdatedAt =
                    assignment.UpdatedAt
            };
        }
    }
}