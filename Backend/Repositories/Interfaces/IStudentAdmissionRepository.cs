using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IStudentAdmissionRepository
    {
        Task<StudentAdmission?> CreateAsync(StudentAdmission entity);
        Task<StudentAdmission?> UpdateAsync(StudentAdmission entity);
        Task<StudentAdmission?> GetByIdAsync(long admissionId);
        Task SaveFormDataAsync(long admissionId, string formDataJson, long? updatedBy);
        Task<(IReadOnlyList<StudentAdmission> Items, long TotalRecords)> GetAllAsync(
            string? search,
            string? admissionStatus,
            int pageNumber,
            int pageSize, long? courseId = null, long? departmentId = null, long? branchId = null, long? semesterId = null, long? academicYearId = null);
    }
}
