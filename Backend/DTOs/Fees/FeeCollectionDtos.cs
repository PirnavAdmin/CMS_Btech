using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Fees;

public sealed class FeeDashboardQuery
{
    public long? AcademicYearId { get; set; }
    public long? CourseId { get; set; }
    public long? BranchId { get; set; }
    public long? SemesterId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

public sealed class FeeDashboardDto
{
    public decimal TotalAssigned { get; set; }
    public decimal TotalConcession { get; set; }
    public decimal TotalPayable { get; set; }
    public decimal TotalCollected { get; set; }
    public decimal TotalPending { get; set; }
    public decimal TotalOverdue { get; set; }
    public decimal TotalFineAssessed { get; set; }
    public decimal TotalFineCollected { get; set; }
    public decimal TotalFinePending { get; set; }
    public int StudentsWithPending { get; set; }
    public int StudentsOverdue { get; set; }
    public int PaymentsCount { get; set; }
    public int ReceiptsCount { get; set; }
    public List<FeeCollectionTrendDto> CollectionTrend { get; set; } = new();
    public List<FeeCategoryCollectionDto> ByCategory { get; set; } = new();
    public List<PaymentModeSummaryDto> ByPaymentMode { get; set; } = new();
}

public sealed class FeeCollectionTrendDto
{
    public DateTime Date { get; set; }
    public decimal Amount { get; set; }
    public int PaymentCount { get; set; }
}

public sealed class FeeCategoryCollectionDto
{
    public long FeeCategoryId { get; set; }
    public string CategoryName { get; set; } = "";
    public decimal Assigned { get; set; }
    public decimal Collected { get; set; }
    public decimal Pending { get; set; }
}

public sealed class PaymentModeSummaryDto
{
    public string PaymentMode { get; set; } = "";
    public decimal Amount { get; set; }
    public int PaymentCount { get; set; }
}

public sealed class FeePendingQuery
{
    public long? StudentId { get; set; }
    public long? AcademicYearId { get; set; }
    public long? CourseId { get; set; }
    public long? BranchId { get; set; }
    public long? SemesterId { get; set; }
    public bool OverdueOnly { get; set; }
    public string? Search { get; set; }
    public DateTime? DueFrom { get; set; }
    public DateTime? DueTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public sealed class FeePendingItemDto
{
    public long StudentFeeId { get; set; }
    public long StudentId { get; set; }
    public string StudentCode { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string? CourseName { get; set; }
    public string? BranchName { get; set; }
    public long? SemesterId { get; set; }
    public string FeeCode { get; set; } = "";
    public string FeeCategory { get; set; } = "";
    public int InstallmentNumber { get; set; }
    public decimal AssignedAmount { get; set; }
    public decimal ConcessionAmount { get; set; }
    public decimal PayableAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal FinePending { get; set; }
    public decimal BalanceAmount { get; set; }
    public DateTime DueDate { get; set; }
    public bool Overdue { get; set; }
    public int DaysOverdue { get; set; }
}

public sealed class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public long TotalCount { get; set; }
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling((double)TotalCount / PageSize);
}

public sealed class FeePaymentCreateRequest
{
    [Range(1, long.MaxValue)] public long StudentFeeId { get; set; }
    [Range(0.01, double.MaxValue)] public decimal FeeAmount { get; set; }
    [Range(0, double.MaxValue)] public decimal FineAmount { get; set; }
    public long? FineId { get; set; }
    [Required, StringLength(30)] public string PaymentMode { get; set; } = "";
    [StringLength(150)] public string? TransactionReference { get; set; }
    [StringLength(500)] public string? Remarks { get; set; }
    public DateTime? PaymentDate { get; set; }
}

public sealed class FeePaymentDto
{
    public long PaymentId { get; set; }
    public string PaymentCode { get; set; } = "";
    public long StudentFeeId { get; set; }
    public string FeeCode { get; set; } = "";
    public long StudentId { get; set; }
    public string StudentCode { get; set; } = "";
    public string StudentName { get; set; } = "";
    public decimal FeeAmount { get; set; }
    public decimal FineAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string PaymentMode { get; set; } = "";
    public string? TransactionReference { get; set; }
    public long? FineId { get; set; }
    public long ReceiptId { get; set; }
    public string ReceiptNumber { get; set; } = "";
}

public sealed class FeeHistoryQuery
{
    public long? StudentId { get; set; }
    public long? PaymentId { get; set; }
    public string? Search { get; set; }
    public string? PaymentMode { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public sealed class FeeHistoryItemDto
{
    public long PaymentId { get; set; }
    public string PaymentCode { get; set; } = "";
    public long StudentId { get; set; }
    public string StudentCode { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string FeeCode { get; set; } = "";
    public string FeeCategory { get; set; } = "";
    public decimal FeeAmount { get; set; }
    public decimal FineAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentMode { get; set; } = "";
    public string? TransactionReference { get; set; }
    public DateTime PaymentDate { get; set; }
    public long ReceiptId { get; set; }
    public string ReceiptNumber { get; set; } = "";
}

public sealed class FineCreateRequest
{
    [Range(1, long.MaxValue)] public long StudentFeeId { get; set; }
    public string FineType { get; set; } = "LATE_PAYMENT";
    [Required, StringLength(500)] public string Reason { get; set; } = "";
    [Range(0.01, double.MaxValue)] public decimal Amount { get; set; }
    public DateTime? AssessedOn { get; set; }
}

public sealed class FineWaiveRequest
{
    [Range(0.01, double.MaxValue)] public decimal WaivedAmount { get; set; }
    [Required, StringLength(500)] public string Reason { get; set; } = "";
}

public sealed class FeeFineQuery
{
    public long? StudentId { get; set; }
    public long? StudentFeeId { get; set; }
    public string? Status { get; set; }
    public bool PendingOnly { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public sealed class FeeFineDto
{
    public long FineId { get; set; }
    public string FineCode { get; set; } = "";
    public long StudentFeeId { get; set; }
    public long StudentId { get; set; }
    public string StudentCode { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string FeeCode { get; set; } = "";
    public string FineType { get; set; } = "";
    public string Reason { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal WaivedAmount { get; set; }
    public decimal NetAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal PendingAmount { get; set; }
    public DateTime AssessedOn { get; set; }
    public DateTime DueDate { get; set; }
    public string Status { get; set; } = "";
}

public sealed class FeeReceiptDto
{
    public long ReceiptId { get; set; }
    public string ReceiptNumber { get; set; } = "";
    public long PaymentId { get; set; }
    public string PaymentCode { get; set; } = "";
    public DateTime IssuedAt { get; set; }
    public string? IssuedByName { get; set; }
    public long StudentId { get; set; }
    public string StudentCode { get; set; } = "";
    public string StudentName { get; set; } = "";
    public string FeeCode { get; set; } = "";
    public string FeeCategory { get; set; } = "";
    public decimal FeeAmount { get; set; }
    public decimal FineAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentMode { get; set; } = "";
    public string? TransactionReference { get; set; }
    public string? Remarks { get; set; }
}
