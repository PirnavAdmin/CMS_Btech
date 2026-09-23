namespace BTech.Models
{
    public class ProfileChangeAudit
    {
        public long ProfileChangeAuditId { get; set; }
        public long UserId { get; set; }
        public long ChangedBy { get; set; }
        public string? ChangedByName { get; set; }
        public DateTime ChangedAt { get; set; }
        public string ChangedInformation { get; set; } = "[]";
    }
}
