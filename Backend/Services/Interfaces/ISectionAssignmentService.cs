using BTech.DTOs.Sections;

namespace BTech.Services.Interfaces
{
    public interface ISectionAssignmentService
    {
        Task<ClassTeacherDto?> GetClassTeacherAsync(long sectionId);
        Task<IEnumerable<ClassTeacherCandidateDto>> GetClassTeacherCandidatesAsync(long sectionId);
        Task<ClassTeacherDto> AssignClassTeacherAsync(long sectionId, long employeeProfileId, long updatedBy);
        Task RemoveClassTeacherAsync(long sectionId, long updatedBy);

        Task<SectionCapacityDto> GetCapacityAsync(long sectionId);
        Task<IEnumerable<StudentCandidateDto>> GetStudentCandidatesAsync(long sectionId, string? search);
        Task<IEnumerable<SectionStudentDto>> GetAllStudentsAsync();
        Task<IEnumerable<SectionStudentDto>> GetStudentsAsync(long sectionId);
        Task<AssignStudentsResultDto> AssignStudentsAsync(long sectionId, IReadOnlyCollection<long> studentIds, long assignedBy);
        Task RemoveStudentAsync(long sectionId, long studentId, long removedBy);
    }
}
