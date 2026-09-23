using BTech.Models;

namespace BTech.Repositories.Interfaces
{
    public interface IStudentAcademicInformationRepository
    {
        Task<StudentAcademicInformation?> GetByIdAsync(int academicId);
        Task<StudentAcademicInformation?> UpdateAsync(StudentAcademicInformation academicDetails);
    }
}
