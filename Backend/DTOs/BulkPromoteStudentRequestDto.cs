using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BTech.DTOs.StudentPromotion
{
    public class BulkPromoteStudentRequestDto
    {
        [Required]
        [MinLength(1)]
        public List<long> StudentIds { get; set; } = new();

        [Range(1, long.MaxValue)]
        public long BranchId { get; set; }

        [Range(1, long.MaxValue)]
        public long AcademicYearId { get; set; }

        [Range(1, int.MaxValue)]
        public int CurrentSemester { get; set; }

        [Range(1, int.MaxValue)]
        public int NextSemester { get; set; }

        // Optional overrides. The frontend payload does not need to send them.
        public long? TargetAcademicYearId { get; set; }
        public long? TargetSemesterId { get; set; }
        public long? TargetSectionId { get; set; }

        public bool DegreeConferred { get; set; }
        public DateTime? DegreeConferredAt { get; set; }

        [Required]
        public string EligibilityStatus { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        // Audit actor comes from the authenticated JWT, never from frontend JSON.
        [JsonIgnore]
        public long? CreatedBy { get; set; }
    }
}
