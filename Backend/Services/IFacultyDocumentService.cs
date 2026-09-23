using BTech.DTOs.Faculty;

namespace BTech.Services.Interfaces
{
    public interface IFacultyDocumentService
    {
        Task<IEnumerable<FacultyDocumentResponseDto>>
            GetDocumentsAsync(long facultyId);

        Task<FacultyDocumentResponseDto>
            UploadDocumentAsync(
                long facultyId,
                FacultyDocumentUploadDto request,
                string? createdBy);

        Task DeleteDocumentAsync(
            long facultyDocumentId,
            string? deletedBy);
    }
}