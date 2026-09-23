using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("admission_status_history")]
    public class AdmissionStatusHistory
    {
        // =========================================================
        // PRIMARY KEY
        // =========================================================

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("AdmissionStatusHistoryId")]
        public long AdmissionStatusHistoryId { get; set; }


        // =========================================================
        // ADMISSION
        // =========================================================

        [Required]
        [Column("AdmissionId")]
        public long AdmissionId { get; set; }


        // =========================================================
        // STATUS
        // =========================================================

        [Column("PreviousStatus")]
        [MaxLength(50)]
        public string? PreviousStatus { get; set; }


        [Required]
        [Column("NewStatus")]
        [MaxLength(50)]
        public string NewStatus { get; set; } = string.Empty;


        [Required]
        [Column("ActionType")]
        [MaxLength(50)]
        public string ActionType { get; set; } = string.Empty;


        // =========================================================
        // DETAILS
        // =========================================================

        [Column("Remarks")]
        public string? Remarks { get; set; }


        [Column("RejectionReason")]
        [MaxLength(500)]
        public string? RejectionReason { get; set; }


        // =========================================================
        // CHANGED BY
        // =========================================================

        [Column("ChangedBy")]
        public long? ChangedBy { get; set; }


        [Required]
        [Column("ChangedAt")]
        public DateTime ChangedAt { get; set; }


        // =========================================================
        // STATUS FLAGS
        // =========================================================

        [Column("IsApproved")]
        public bool IsApproved { get; set; }


        [Column("IsRejected")]
        public bool IsRejected { get; set; }


        // =========================================================
        // AUDIT
        // =========================================================

        [Column("IsActive")]
        public bool IsActive { get; set; }


        [Column("IsDeleted")]
        public bool IsDeleted { get; set; }


        [Column("CreatedBy")]
        public long? CreatedBy { get; set; }


        [Required]
        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; }


        [Column("UpdatedBy")]
        public long? UpdatedBy { get; set; }


        [Required]
        [Column("UpdatedAt")]
        public DateTime UpdatedAt { get; set; }


        [Column("DeletedBy")]
        public long? DeletedBy { get; set; }


        [Column("DeletedAt")]
        public DateTime? DeletedAt { get; set; }


        // =========================================================
        // IMPORTANT
        // =========================================================
        // DO NOT add:
        //
        // StudentAdmission StudentAdmission
        //
        // DO NOT add:
        //
        // User ChangedByUser
        //
        // These navigation properties are intentionally removed.
        //
        // The relationships are configured explicitly in
        // ApplicationDbContext.
        // =========================================================
    }
}