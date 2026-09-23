using BTech.DTOs.Sections;

namespace BTech.Repositories.Interfaces
{
    public interface ISectionAssignmentRepository
    {
        Task<ClassTeacherDto?> GetClassTeacherAsync(long sectionId);
        Task<IEnumerable<ClassTeacherCandidateDto>> GetClassTeacherCandidatesAsync(long sectionId);
        Task<ClassTeacherDto?> AssignClassTeacherAsync(long sectionId, long employeeProfileId, long updatedBy);
        Task<bool> RemoveClassTeacherAsync(long sectionId, long updatedBy);

        Task<SectionCapacityDto?> GetCapacityAsync(long sectionId);
        Task<IEnumerable<StudentCandidateDto>> GetStudentCandidatesAsync(long sectionId, string? search);
        Task<IEnumerable<SectionStudentDto>> GetAllStudentsAsync();
        Task<IEnumerable<SectionStudentDto>> GetStudentsAsync(long sectionId);
        Task<AssignStudentsResultDto?> AssignStudentsAsync(long sectionId, IReadOnlyCollection<long> studentIds, long assignedBy);
        Task<bool> RemoveStudentAsync(long sectionId, long studentId, long removedBy);
    }
}
