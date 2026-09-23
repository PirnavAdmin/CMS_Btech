using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IStudentAcademicDetailsRepository
    {
        Task<StudentAcademicDetails?> GetByAdmissionIdAsync(long admissionId);
        Task<StudentAcademicDetails?> UpdateAsync(StudentAcademicDetails entity);
    }
}
