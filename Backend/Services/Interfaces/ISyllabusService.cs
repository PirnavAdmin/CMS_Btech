using BTech.DTOs.Syllabus;

namespace BTech.Services.Interfaces;

public interface ISyllabusService
{
    Task<IReadOnlyList<SyllabusRecord>> List(SyllabusAccess access, SyllabusFilter filter);
    Task<SyllabusRecord> Get(SyllabusAccess access, long id);
    Task<long> Save(SyllabusAccess access, long? id, SyllabusInput input);
    Task Publish(SyllabusAccess access, long id);
    Task Archive(SyllabusAccess access, long id);
    Task<IEnumerable<object>> History(SyllabusAccess access, long id, bool versions);
    Task<long> Upload(SyllabusAccess access, long id, long? replaces, IFormFile? file, CancellationToken cancellationToken);
    Task<SyllabusDownload> Download(SyllabusAccess access, long id);
}
