using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("college_user_mappings")]
    public class CollegeUserMapping
    {
        [Key]
        [Column("college_user_mapping_id")]
        public long Id { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("college_setting_id")]
        public long CollegeSettingId { get; set; }

        [Column("status")]
        public byte Status { get; set; } = 1;

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