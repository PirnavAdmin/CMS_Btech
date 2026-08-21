namespace BTech.Models
{
    public class LoginAudit
    {
        public long login_audit_id { get; set; }

        public long? UserId { get; set; }

        public string? LoginIdentifier { get; set; }

        public string EventType { get; set; } = string.Empty;

        public string LoginStatus { get; set; } = string.Empty;

        public string? IpAddress { get; set; }

        public string? UserAgent { get; set; }

        public string? FailureReason { get; set; }

        public DateTime LoginAt { get; set; }

        public DateTime? LogoutAt { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}