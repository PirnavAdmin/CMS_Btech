using BTech.DTOs.Student;
using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IStudentRepository
    {
        Task<(IReadOnlyList<Student> Items, long TotalRecords)> GetAllAsync(
            sbyte? status,
            long? collegeId,
            long? courseId,
            long? branchId,
            long? academicYearId,
            int pageNumber,
            int pageSize);

        Task<(IReadOnlyList<Student> Items, long TotalRecords)> SearchAsync(
            string query,
            sbyte? status,
            long? collegeId,
            long? courseId,
            long? branchId,
            long? academicYearId,
            int pageNumber,
            int pageSize);

        Task<Student?> GetByIdAsync(
            long studentId);

        Task<Student> CreateAsync(
            Student student);

        Task<Student?> UpdateAsync(
            Student student);

        Task<Student?> UpdateStatusAsync(
            long studentId,
            sbyte status,
            long? updatedBy);

        Task<bool> StudentCodeExistsAsync(
            string studentCode,
            long? excludeStudentId = null);

        Task<StudentReferenceValidation> ValidateReferencesAsync(
            long collegeId,
            long academicYearId,
            long? courseId,
            long? branchId);

        // Student documents
        Task<IReadOnlyList<StudentDocumentResponseDto>> GetDocumentsAsync(
            long studentId);

        // Student promotion
        Task<StudentPromotionResponseDto?> PromoteAsync(
            long studentId,
            long? createdBy);
    }
}