namespace BTech.DTOs.ProfileAudit
{
    public class ProfileFieldChangeDto
    {
        public string FieldName { get; set; } = string.Empty;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
    }

    public class ProfileChangeAuditResponseDto
    {
        public long ProfileChangeAuditId { get; set; }
        public long UserId { get; set; }
        public long ChangedBy { get; set; }
        public string? ChangedByName { get; set; }
        public DateTime ChangedAt { get; set; }
        public List<ProfileFieldChangeDto> ChangedInformation { get; set; } = new();
    }
}
