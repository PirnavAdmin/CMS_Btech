using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("registration_requests")]
    public class RegistrationRequest
    {
        [Key]
        [Column("registration_request_id")]
        public long RegistrationRequestId { get; set; }

        [Required]
        [Column("full_name")]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [Column("email")]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Column("mobile")]
        [MaxLength(15)]
        public string Mobile { get; set; } = string.Empty;

        [Required]
        [Column("password_hash")]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [Column("status")]
        [MaxLength(20)]
        public string Status { get; set; } = "PENDING";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("reviewed_at")]
        public DateTime? ReviewedAt { get; set; }

        [Column("reviewed_by")]
        public long? ReviewedBy { get; set; }

        [Column("approved_user_id")]
        public long? ApprovedUserId { get; set; }
    }
}