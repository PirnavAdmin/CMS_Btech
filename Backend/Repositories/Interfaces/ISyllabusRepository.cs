using BTech.DTOs.Syllabus;

namespace BTech.Repositories.Interfaces;

public interface ISyllabusRepository
{
    Task<IReadOnlyList<SyllabusRecord>> List(SyllabusAccess access, SyllabusFilter filter, long? id = null);
    Task<long> Save(SyllabusAccess access, long? id, SyllabusInput input);
    Task ChangeStatus(SyllabusAccess access, long id, string status);
    Task<long> Upload(SyllabusAccess access, long id, long? replaces, SyllabusDownload document);
    Task<IEnumerable<object>> History(SyllabusAccess access, long id, bool versions);
    Task<SyllabusDownload?> Download(SyllabusAccess access, long documentId);
}
