using BTech.DTOs.StudentAdmission;

namespace BTech.Services.Interfaces
{
    public interface IStudentAdmissionService
    {
        Task<StudentAdmissionResponseDto> CreateAsync(CreateStudentAdmissionDto dto, long? userId);
        Task<StudentAdmissionResponseDto?> UpdateAsync(long admissionId, UpdateStudentAdmissionDto dto, long? userId);
        Task<StudentAdmissionResponseDto?> GetByIdAsync(long admissionId);
        Task<StudentAdmissionPagedResponseDto> GetAllAsync(
            string? search,
            string? admissionStatus,
            int pageNumber,
            int pageSize, long? courseId = null, long? departmentId = null, long? branchId = null, long? semesterId = null, long? academicYearId = null);
    }
}
