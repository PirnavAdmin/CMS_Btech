namespace BTech.DTOs.Faculty
{
    public class FacultyDocumentResponseDto
    {
        public long FacultyDocumentId { get; set; }
        public long FacultyId { get; set; }
        public long UserId { get; set; }

        public string DocumentType { get; set; } = string.Empty;
        public string DocumentName { get; set; } = string.Empty;

        public string FileName { get; set; } = string.Empty;
        public string? OriginalFileName { get; set; }

        public string? FilePath { get; set; }
        public string? FileUrl { get; set; }

        public string? FileExtension { get; set; }
        public string? MimeType { get; set; }
        public long? FileSize { get; set; }

        public string? DocumentNumber { get; set; }

        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }

        public string? Remarks { get; set; }

        public byte IsVerified { get; set; }
        public byte Status { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}