using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("faculty_documents")]
    public class FacultyDocument
    {
        [Key]
        [Column("faculty_document_id")]
        public long FacultyDocumentId { get; set; }

        [Column("faculty_id")]
        public long FacultyId { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("document_type")]
        public string DocumentType { get; set; } = string.Empty;

        [Column("document_name")]
        public string DocumentName { get; set; } = string.Empty;

        [Column("file_name")]
        public string FileName { get; set; } = string.Empty;

        [Column("original_file_name")]
        public string? OriginalFileName { get; set; }

        [Column("file_path")]
        public string? FilePath { get; set; }

        [Column("file_url")]
        public string? FileUrl { get; set; }

        [Column("file_extension")]
        public string? FileExtension { get; set; }

        [Column("mime_type")]
        public string? MimeType { get; set; }

        [Column("file_size")]
        public long? FileSize { get; set; }

        [Column("document_number")]
        public string? DocumentNumber { get; set; }

        [Column("issue_date")]
        public DateTime? IssueDate { get; set; }

        [Column("expiry_date")]
        public DateTime? ExpiryDate { get; set; }

        [Column("remarks")]
        public string? Remarks { get; set; }

        [Column("is_verified")]
        public byte IsVerified { get; set; }

        [Column("verified_by")]
        public long? VerifiedBy { get; set; }

        [Column("verified_at")]
        public DateTime? VerifiedAt { get; set; }

        [Column("status")]
        public byte Status { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("created_by")]
        public long? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public long? UpdatedBy { get; set; }

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        [Column("deleted_by")]
        public long? DeletedBy { get; set; }
    }
}