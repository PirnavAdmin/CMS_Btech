using Microsoft.AspNetCore.Http;

namespace BTech.DTOs.Faculty
{
    public class FacultyDocumentUploadDto
    {
        public string DocumentType { get; set; } = string.Empty;

        public string DocumentName { get; set; } = string.Empty;

        public string? DocumentNumber { get; set; }

        public DateTime? IssueDate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        public string? Remarks { get; set; }

        public IFormFile File { get; set; } = null!;
    }
}