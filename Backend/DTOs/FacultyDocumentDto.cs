namespace BTech.DTOs.Faculty
{
    public class FacultyDocumentDto
    {
        public long FacultyDocumentId { get; set; }

        public long FacultyId { get; set; }

        public string DocumentType { get; set; } = string.Empty;

        public string DocumentName { get; set; } = string.Empty;

        public string FilePath { get; set; } = string.Empty;

        public string? Description { get; set; }

        public string? UploadedBy { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}