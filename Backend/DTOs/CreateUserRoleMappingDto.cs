namespace UserRoleManagement.API.DTOs
{
    public class UserRoleMappingDto
    {
        public long UserRoleId { get; set; }

        public long UserId { get; set; }

        public long RoleId { get; set; }

        public byte Status { get; set; }

        public DateTime AssignedAt { get; set; }

        public long? AssignedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? UpdatedBy { get; set; }

        public DateTime? RemovedAt { get; set; }

        public long? RemovedBy { get; set; }
    }
}