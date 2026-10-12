using System.ComponentModel.DataAnnotations;

namespace BTech.LibraryManagement;

public sealed class LibraryCategoryRequest
{
    [Range(1, long.MaxValue)] public long CollegeId { get; set; }
    [Required, StringLength(30)] public string CategoryCode { get; set; } = "";
    [Required, StringLength(100)] public string CategoryName { get; set; } = "";
    [StringLength(500)] public string? Description { get; set; }
    public bool Status { get; set; } = true;
}
public sealed class LibraryBookRequest
{
    [Range(1, long.MaxValue)] public long CollegeId { get; set; }
    [Range(1, long.MaxValue)] public long CategoryId { get; set; }
    [StringLength(20)] public string? Isbn { get; set; }
    [Required, StringLength(50)] public string AccessionNo { get; set; } = "";
    [Required, StringLength(255)] public string Title { get; set; } = "";
    [Required, StringLength(200)] public string Author { get; set; } = "";
    [StringLength(200)] public string? Publisher { get; set; }
    [StringLength(50)] public string? Edition { get; set; }
    [Range(1901, 2155)] public int? PublicationYear { get; set; }
    [Required, StringLength(50)] public string Language { get; set; } = "English";
    [Range(1, int.MaxValue)] public int TotalCopies { get; set; } = 1;
    [StringLength(100)] public string? ShelfLocation { get; set; }
    [Range(typeof(decimal), "0", "99999999.99")] public decimal? Price { get; set; }
    [StringLength(1000)] public string? Description { get; set; }
    public bool Status { get; set; } = true;
}
public sealed class LibraryIssueRequest
{
    [Range(1, long.MaxValue)] public long CollegeId { get; set; }
    [Range(1, long.MaxValue)] public long BookId { get; set; }
    [Range(1, long.MaxValue)] public long StudentId { get; set; }
    public DateTime IssueDate { get; set; } = DateTime.Today;
    public DateTime DueDate { get; set; } = DateTime.Today.AddDays(14);
    [StringLength(500)] public string? Remarks { get; set; }
}
public sealed class LibraryReturnRequest
{
    public DateTime ReturnDate { get; set; } = DateTime.Today;
    [StringLength(500)] public string? Remarks { get; set; }
}
public sealed class LibraryFineRequest
{
    [Range(1, long.MaxValue)] public long CollegeId { get; set; }
    [Range(1, long.MaxValue)] public long IssueId { get; set; }
    [Required, StringLength(255)] public string FineReason { get; set; } = "";
    [Range(typeof(decimal), "0.01", "99999999.99")] public decimal FineAmount { get; set; }
    public DateTime AssessedDate { get; set; } = DateTime.Today;
    [StringLength(500)] public string? Remarks { get; set; }
}
public sealed class LibraryFinePaymentRequest
{
    [Range(typeof(decimal), "0.01", "99999999.99")] public decimal Amount { get; set; }
    [Required, StringLength(50)] public string PaymentMethod { get; set; } = "CASH";
    [Required, StringLength(100)] public string ReceiptNo { get; set; } = "";
    public DateTime PaymentDate { get; set; } = DateTime.Today;
    [StringLength(500)] public string? Remarks { get; set; }
}
public sealed class LibraryFineWaiverRequest
{
    [Required, StringLength(500)] public string Reason { get; set; } = "";
}
public sealed class LibraryStatusRequest { public bool Status { get; set; } }

internal sealed class LibraryApiException : Exception
{
    public int StatusCode { get; }
    public LibraryApiException(int statusCode, string message) : base(message) => StatusCode = statusCode;
}
