using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("user_roles")]
    public class UserRoleMapping
    {
        [Key]
        [Column("user_role_id")]
        public long UserRoleId { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("role_id")]
        public long RoleId { get; set; }

        [Column("status")]
        public byte Status { get; set; }

        [Column("assigned_at")]
        public DateTime AssignedAt { get; set; }

        [Column("assigned_by")]
        public long? AssignedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public long? UpdatedBy { get; set; }

        [Column("removed_at")]
        public DateTime? RemovedAt { get; set; }

        [Column("removed_by")]
        public long? RemovedBy { get; set; }
    }
}
