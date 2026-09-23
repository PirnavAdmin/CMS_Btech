using BTech.DTOs.StudentProfileMain;

namespace BTech.Services.Interfaces
{
    public interface IStudentProfileMainService
    {
        Task<IEnumerable<StudentProfileListDto>> GetAllAsync(
            long collegeId,
            string? search,
            long? departmentId,
            long? courseId,
            long? branchId,
            long? academicYearId,
            int? semester,
            long? sectionId,
            int? status);

        Task<StudentProfilePreviewDto?> GetPreviewAsync(
            long studentId,
            long collegeId);

        Task<StudentProfilePreviewDto?> UpdateAsync(
            long studentId,
            long collegeId,
            UpdateStudentProfileDto request,
            long changedBy,
            string? ipAddress,
            string? userAgent);
    }
}
