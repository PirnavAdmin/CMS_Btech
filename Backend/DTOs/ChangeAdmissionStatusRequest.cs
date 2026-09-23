namespace BTech.DTOs
{
    public class ChangeAdmissionStatusRequest
    {
        public string NewStatus { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public string? RejectionReason { get; set; }
    }
}