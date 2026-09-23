namespace BTech.Task_FacultyStatusHistory.DTOs
{
    public class FacultyStatusHistoryResponse
    {
        public long FacultyStatusHistoryId { get; set; }

        public long FacultyId { get; set; }

        public string? OldStatus { get; set; }

        public string NewStatus { get; set; } = string.Empty;

        public string? Reason { get; set; }

        public long? ChangedBy { get; set; }

        public DateTime ChangedAt { get; set; }
    }
}