namespace BTech.DTOs.Student
{
    public sealed class StudentDocumentResponseDto
    {
        public long DocumentId { get; set; }

        public long StudentId { get; set; }

        public string DocumentType { get; set; } = string.Empty;

        public string? FileName { get; set; }

        public DateTime UploadedDate { get; set; }
    }
}