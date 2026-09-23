namespace BTech.DTOs
{
    public class AdmissionStatusHistoryDto
    {
        public long AdmissionStatusHistoryId { get; set; }

        public long AdmissionId { get; set; }

        public string? PreviousStatus { get; set; }

        public string NewStatus { get; set; } = string.Empty;

        public string ActionType { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public string? RejectionReason { get; set; }

        public long? ChangedBy { get; set; }

        public DateTime ChangedAt { get; set; }

        public bool IsApproved { get; set; }

        public bool IsRejected { get; set; }
    }
}