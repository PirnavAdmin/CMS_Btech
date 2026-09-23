namespace BTech.DTOs
{
    public class CollegeUserMappingDto
    {
        public long Id { get; set; }

        public long UserId { get; set; }

        public long CollegeSettingId { get; set; }

        public string? CollegeName { get; set; }

        public string? CollegeCode { get; set; }

        public byte Status { get; set; }

        public DateTime AssignedAt { get; set; }

        public long? AssignedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }

        public DateTime? RemovedAt { get; set; }

        public long? RemovedBy { get; set; }
    }
}