namespace BTech.DTOs
{
    public class AdmissionActionResponseDto
    {
        public long AdmissionId { get; set; }

        public string PreviousStatus { get; set; } = string.Empty;

        public string NewStatus { get; set; } = string.Empty;

        public string ActionType { get; set; } = string.Empty;

        public string? AdmissionNo { get; set; }

        public DateTime? AdmissionDate { get; set; }

        public bool IsApproved { get; set; }

        public bool IsRejected { get; set; }

        public long? ChangedBy { get; set; }

        public DateTime ChangedAt { get; set; }

        public string? Remarks { get; set; }

        public string? RejectionReason { get; set; }
    }
}