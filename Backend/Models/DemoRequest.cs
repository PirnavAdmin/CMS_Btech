using System.ComponentModel.DataAnnotations.Schema;

namespace BTech.Models
{
    [Table("demo_requests")]
    public class DemoRequest
    {
        public long DemoRequestId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Mobile { get; set; } = string.Empty;

        public string InstitutionName { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public string? City { get; set; }

        public string? State { get; set; }

        public int? NumberOfStudents { get; set; }

        public bool AgreeToContact { get; set; }

        public string Status { get; set; } = "PENDING";

        public DateTime? DemoDate { get; set; }

        public TimeSpan? DemoTime { get; set; }

        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public long? ReviewedBy { get; set; }

        public DateTime? ReviewedAt { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsDeleted { get; set; } = false;
    }
}