using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace BTech.DocumentManagement;

public sealed class DocumentUploadRequest
{
    [Range(1, long.MaxValue)]
    public long CategoryId { get; set; }

    [Required, StringLength(30)]
    public string EntityType { get; set; } = string.Empty;

    [Range(1, long.MaxValue)]
    public long EntityId { get; set; }

    [Required, StringLength(250)]
    public string DocumentTitle { get; set; } = string.Empty;

    [StringLength(100)]
    public string? DocumentNumber { get; set; }

    public DateTime? IssueDate { get; set; }

    public DateTime? ExpiryDate { get; set; }

    [StringLength(500)]
    public string? Remarks { get; set; }

    [Required]
    public IFormFile File { get; set; } = null!;
}

public sealed class DocumentApprovalRequest
{
    [Required, StringLength(20)]
    public string Action { get; set; } = string.Empty;

    [Range(1, 100)]
    public int ApprovalLevel { get; set; } = 1;

    [StringLength(1000)]
    public string? Comments { get; set; }
}

public sealed class DocumentResponse
{
    public long DocumentId { get; set; }
    public long CategoryId { get; set; }
    public string CategoryCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public long EntityId { get; set; }
    public string? EntityName { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string? DocumentNumber { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? OriginalFileName { get; set; }
    public string? FilePath { get; set; }
    public string? FileUrl { get; set; }
    public string? FileExtension { get; set; }
    public string? MimeType { get; set; }
    public long? FileSize { get; set; }
    public DateTime? IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? Remarks { get; set; }
    public string Status { get; set; } = string.Empty;
    public string WorkflowStatus { get; set; } = string.Empty;
    public bool IsExpired { get; set; }
    public string ExpiryStatus { get; set; } = string.Empty;
    public int? DaysToExpiry { get; set; }
    public long UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string DownloadUrl { get; set; } = string.Empty;
}

public sealed class DocumentCategoryResponse
{
    public long CategoryId { get; set; }
    public string CategoryCode { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public bool Status { get; set; }
}

public sealed class DocumentApprovalResponse
{
    public long ApprovalId { get; set; }
    public long DocumentId { get; set; }
    public long ApproverUserId { get; set; }
    public int ApprovalLevel { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Comments { get; set; }
    public DateTime ActionAt { get; set; }
    public string DocumentStatus { get; set; } = string.Empty;
}

public sealed class DocumentDashboardResponse
{
    public long TotalDocuments { get; set; }
    public long SubmittedDocuments { get; set; }
    public long ApprovedDocuments { get; set; }
    public long RejectedDocuments { get; set; }
    public long ExpiredDocuments { get; set; }
    public long ActiveCategories { get; set; }
    public IReadOnlyList<DocumentResponse> RecentDocuments { get; set; } = Array.Empty<DocumentResponse>();
}

public sealed class ExpiredDocumentsResponse
{
    public long Total { get; set; }
    public IReadOnlyList<DocumentResponse> Documents { get; set; } = Array.Empty<DocumentResponse>();
}

public sealed record DocumentActor(long UserId, long? CollegeId);

public sealed class DocumentEntityPermissions
{
    public string EntityType { get; set; } = string.Empty;
    public long EntityId { get; set; }
    public long CollegeId { get; set; }
    public bool IsActive { get; set; }
    public bool CanView { get; set; }
    public bool CanDownload { get; set; }
    public bool CanUpload { get; set; }
    public bool CanApprove { get; set; }
}

public sealed class DocumentEntityAccessRequest
{
    [Range(1, long.MaxValue)] public long UserId { get; set; }
    [Required, StringLength(50)] public string EntityType { get; set; } = string.Empty;
    [Range(1, long.MaxValue)] public long EntityId { get; set; }
    public bool CanDownload { get; set; } = true;
    public bool CanUpload { get; set; }
    public bool CanApprove { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
}

public sealed class DocumentEntityAccessResponse
{
    public long AccessId { get; set; }
    public long UserId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public long EntityId { get; set; }
    public bool CanDownload { get; set; }
    public bool CanUpload { get; set; }
    public bool CanApprove { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool Status { get; set; }
    public long GrantedBy { get; set; }
    public DateTime GrantedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class DocumentApiException : Exception
{
    public int StatusCode { get; }
    public DocumentApiException(int statusCode, string message) : base(message) => StatusCode = statusCode;
}
