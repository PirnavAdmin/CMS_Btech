using BTech.DTOs.StudentProfile;

namespace BTech.Services.Interfaces
{
    /// <summary>
    /// Stable profile-to-results integration seam. The Examination/Results module
    /// can replace the registered implementation without changing the controller or UI.
    /// </summary>
    public interface IStudentExamResultsProvider
    {
        Task<StudentExamResultsResponseDto> GetByStudentIdAsync(
            long studentId,
            CancellationToken cancellationToken = default);
    }
}
