using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("otp_verifications")]
    public class OtpVerification
    {
        [Key]
        [Column("otp_verification_id")]
        public long OtpVerificationId { get; set; }

        [Column("user_id")]
        public long? UserId { get; set; }

        [Required]
        [MaxLength(150)]
        [Column("identifier")]
        public string Identifier { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("otp_hash")]
        public string OtpHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("otp_type")]
        public string OtpType { get; set; } = "PASSWORD_RESET";

        [Required]
        [MaxLength(20)]
        [Column("delivery_method")]
        public string DeliveryMethod { get; set; } = "EMAIL";

        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [Column("verified_at")]
        public DateTime? VerifiedAt { get; set; }

        [Column("attempts")]
        public int Attempts { get; set; } = 0;

        [Column("max_attempts")]
        public int MaxAttempts { get; set; } = 5;

        [Column("status")]
        public sbyte Status { get; set; } = 1;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}