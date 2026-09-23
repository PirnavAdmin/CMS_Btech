using BTech.DTOs.StudentProfile;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public sealed class PendingStudentExamResultsProvider : IStudentExamResultsProvider
    {
        public Task<StudentExamResultsResponseDto> GetByStudentIdAsync(
            long studentId,
            CancellationToken cancellationToken = default)
        {
            var response = new StudentExamResultsResponseDto
            {
                StudentId = studentId,
                IsModuleAvailable = false,
                IntegrationStatus = "Awaiting Examination/Results module",
                ContractVersion = "1.0",
                Results = Array.Empty<StudentExamResultDto>()
            };

            return Task.FromResult(response);
        }
    }
}
