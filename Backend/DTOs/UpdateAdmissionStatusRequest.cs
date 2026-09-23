namespace BTech.DTOs
{
    public class UpdateAdmissionStatusRequest
    {
        public string NewStatus { get; set; } = string.Empty;

        public string ActionType { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public string? RejectionReason { get; set; }

        public long? ChangedBy { get; set; }
    }
}