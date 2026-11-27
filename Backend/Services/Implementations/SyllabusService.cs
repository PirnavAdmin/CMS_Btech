using BTech.DTOs.Syllabus;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations;

public sealed class SyllabusService(ISyllabusRepository repository) : ISyllabusService
{
    public const int MaxFileSize = 25 * 1024 * 1024;
    private static readonly IReadOnlyDictionary<string, string> FileTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = "application/pdf", [".doc"] = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xls"] = "application/vnd.ms-excel",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        [".csv"] = "text/csv", [".ppt"] = "application/vnd.ms-powerpoint",
        [".pptx"] = "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        [".txt"] = "text/plain", [".rtf"] = "application/rtf",
        [".odt"] = "application/vnd.oasis.opendocument.text", [".ods"] = "application/vnd.oasis.opendocument.spreadsheet",
        [".odp"] = "application/vnd.oasis.opendocument.presentation",
        [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png"
    };

    public Task<IReadOnlyList<SyllabusRecord>> List(SyllabusAccess access, SyllabusFilter filter) => repository.List(access, filter);

    public async Task<SyllabusRecord> Get(SyllabusAccess access, long id) =>
        (await repository.List(access, new SyllabusFilter(), id)).SingleOrDefault()
        ?? throw new BadHttpRequestException("Syllabus not found.", StatusCodes.Status404NotFound);

    public Task<long> Save(SyllabusAccess access, long? id, SyllabusInput input)
    {
        input.Title = input.Title.Trim();
        input.Version = input.Version.Trim();
        if (input.Title.Length == 0 || input.Version.Length == 0 ||
            (input.Category == "Subject-wise Syllabus" && input.SubjectId is null))
            throw new BadHttpRequestException("A title and version are required. Select a subject for a subject-wise syllabus.");
        return repository.Save(access, id, input);
    }

    public Task Publish(SyllabusAccess access, long id) => repository.ChangeStatus(access, id, "Published");
    public Task Archive(SyllabusAccess access, long id) => repository.ChangeStatus(access, id, "Archived");
    public Task<IEnumerable<object>> History(SyllabusAccess access, long id, bool versions) => repository.History(access, id, versions);

    public async Task<long> Upload(SyllabusAccess access, long id, long? replaces, IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0) throw new BadHttpRequestException("Select a non-empty document.");
        if (file.Length > MaxFileSize)
            throw new BadHttpRequestException("Documents must be 25 MB or smaller.", StatusCodes.Status413PayloadTooLarge);

        var fileName = Path.GetFileName(file.FileName.Replace('\\', '/'));
        if (fileName.Length > 255 || fileName.Any(char.IsControl))
            throw new BadHttpRequestException("The document file name is invalid.");
        if (!FileTypes.TryGetValue(Path.GetExtension(fileName), out var contentType))
            throw new BadHttpRequestException("This document type is not supported.", StatusCodes.Status415UnsupportedMediaType);

        using var content = new MemoryStream((int)file.Length);
        await file.CopyToAsync(content, cancellationToken);
        return await repository.Upload(access, id, replaces, new SyllabusDownload
        {
            FileName = fileName, ContentType = contentType, FileSize = content.Length, Content = content.ToArray()
        });
    }

    public async Task<SyllabusDownload> Download(SyllabusAccess access, long id) =>
        await repository.Download(access, id)
        ?? throw new BadHttpRequestException("Document not found.", StatusCodes.Status404NotFound);
}
