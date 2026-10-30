using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("shortage_notifications")]
    public class ShortageNotification
    {
        [Key]
        [Column("notification_id")]
        public long NotificationId { get; set; }

        [Column("shortage_id")]
        public long ShortageId { get; set; }

        [Column("student_id")]
        public long? StudentId { get; set; }

        [Column("notification_type")]
        public string NotificationType { get; set; } = string.Empty;

        [Column("message")]
        public string? Message { get; set; }

        [Column("status")]
        public string Status { get; set; } = "PENDING";

        [Column("sent_at")]
        public DateTime? SentAt { get; set; }

        [Column("sent_by")]
        public long? SentBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("created_by")]
        public long? CreatedBy { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("updated_by")]
        public long? UpdatedBy { get; set; }
    }
}