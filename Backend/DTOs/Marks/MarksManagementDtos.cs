namespace BTech.DTOs.MarksManagement;

public sealed class MarkEntryRequest
{
    public long ExamId { get; set; }
    public long StudentId { get; set; }
    public long SubjectId { get; set; }
    public long? SectionId { get; set; }
    public decimal MarksObtained { get; set; }
    public decimal? MaxMarks { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
}

public sealed class MarkEditRequest
{
    public decimal MarksObtained { get; set; }
    public decimal? MaxMarks { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
}

public sealed class MarkBulkRow
{
    public string StudentCode { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
    public decimal MarksObtained { get; set; }
    public decimal? MaxMarks { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
}

public sealed class BulkMarksRequest
{
    public long ExamId { get; set; }
    public long? SectionId { get; set; }
    public bool UpsertDrafts { get; set; } = false;
    public List<MarkBulkRow> Rows { get; set; } = new();
}

public sealed class BulkUploadPreviewRequest
{
    public long ExamId { get; set; }
    public long? SectionId { get; set; }
    public List<MarkBulkRow> Rows { get; set; } = new();
}

public sealed class BulkMarksResultDto
{
    public long? UploadId { get; set; }
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InsertedRows { get; set; }
    public int UpdatedRows { get; set; }
    public int RejectedRows { get; set; }
    public List<BulkMarkErrorDto> Errors { get; set; } = new();
}

public sealed class BulkMarkErrorDto
{
    public int RowNumber { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string SubjectCode { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public sealed class MarkDto
{
    public long MarkId { get; set; }
    public long CollegeId { get; set; }
    public long ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string ExamName { get; set; } = string.Empty;
    public long StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public long SubjectId { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public long? SectionId { get; set; }
    public string? SectionName { get; set; }
    public decimal MaxMarks { get; set; }
    public decimal MarksObtained { get; set; }
    public decimal Percentage { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public string WorkflowStatus { get; set; } = "DRAFT";
    public int VersionNo { get; set; }
    public long? EnteredBy { get; set; }
    public DateTime EnteredAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public sealed class MarkListFilter
{
    public long? ExamId { get; set; }
    public long? StudentId { get; set; }
    public long? SubjectId { get; set; }
    public long? SectionId { get; set; }
    public string? WorkflowStatus { get; set; }
    public string? Search { get; set; }
}

public sealed class MarksReportFilter
{
    public long ExamId { get; set; }
    public long? SectionId { get; set; }
    public long? SubjectId { get; set; }
    public long? StudentId { get; set; }
    public string? WorkflowStatus { get; set; }
}

public sealed class MarksSummaryReportDto
{
    public long ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string ExamName { get; set; } = string.Empty;
    public int TotalStudents { get; set; }
    public int TotalSubjects { get; set; }
    public int ExpectedEntries { get; set; }
    public int EnteredEntries { get; set; }
    public int PendingEntries { get; set; }
    public int DraftEntries { get; set; }
    public int SubmittedEntries { get; set; }
    public int ApprovedEntries { get; set; }
    public int RejectedEntries { get; set; }
    public decimal AveragePercentage { get; set; }
    public decimal HighestPercentage { get; set; }
    public decimal LowestPercentage { get; set; }
}

public sealed class StudentMarksReportDto
{
    public long StudentId { get; set; }
    public string StudentCode { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public long ExamId { get; set; }
    public string ExamCode { get; set; } = string.Empty;
    public string ExamName { get; set; } = string.Empty;
    public decimal TotalObtained { get; set; }
    public decimal TotalMaxMarks { get; set; }
    public decimal OverallPercentage { get; set; }
    public List<StudentSubjectMarkDto> Subjects { get; set; } = new();
}

public sealed class StudentSubjectMarkDto
{
    public long SubjectId { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public decimal MarksObtained { get; set; }
    public decimal MaxMarks { get; set; }
    public decimal Percentage { get; set; }
    public string? Grade { get; set; }
    public string WorkflowStatus { get; set; } = string.Empty;
}

public sealed class SubjectMarksReportDto
{
    public long SubjectId { get; set; }
    public string SubjectCode { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public long ExamId { get; set; }
    public int TotalStudents { get; set; }
    public int EnteredCount { get; set; }
    public int ApprovedCount { get; set; }
    public decimal AverageMarks { get; set; }
    public decimal AveragePercentage { get; set; }
    public decimal HighestMarks { get; set; }
    public decimal LowestMarks { get; set; }
}

public sealed class MarksWorkflowRequest
{
    public long ExamId { get; set; }
    public List<long> MarkIds { get; set; } = new();
    public long? SectionId { get; set; }
    public long? SubjectId { get; set; }
    public string? Remarks { get; set; }
}

public sealed class MarksApprovalDto
{
    public long ApprovalId { get; set; }
    public long MarkId { get; set; }
    public string ApprovalStatus { get; set; } = string.Empty;
    public long? SubmittedBy { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public long? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? Remarks { get; set; }
}

public sealed class MarksApprovalHistoryDto
{
    public long HistoryId { get; set; }
    public long MarkId { get; set; }
    public string FromStatus { get; set; } = string.Empty;
    public string ToStatus { get; set; } = string.Empty;
    public long? ActionBy { get; set; }
    public DateTime ActionAt { get; set; }
    public string? Remarks { get; set; }
}

public sealed class MarksApprovalResultDto
{
    public int RequestedCount { get; set; }
    public int ProcessedCount { get; set; }
    public int RejectedCount { get; set; }
    public List<long> ProcessedMarkIds { get; set; } = new();
    public List<BulkMarkErrorDto> Errors { get; set; } = new();
}
