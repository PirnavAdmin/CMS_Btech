using System.Text.Json.Serialization;

namespace BTech.DTOs.StudentPromotion
{
    public class PromoteStudentRequestDto
    {
        public long StudentId { get; set; }
        public long BranchId { get; set; }
        public long AcademicYearId { get; set; }
        public int CurrentSemester { get; set; }
        public int NextSemester { get; set; }

        // Frontend-selected target mapping. Optional for backward compatibility;
        // when supplied, these values are authoritative.
        public long? TargetAcademicYearId { get; set; }
        public long? TargetSemesterId { get; set; }
        public long? TargetSectionId { get; set; }

        // Semester 8/final-semester handling.
        public bool DegreeConferred { get; set; }
        public DateTime? DegreeConferredAt { get; set; }

        public string EligibilityStatus { get; set; } = "Eligible";
        public string? Remarks { get; set; }
        [JsonIgnore]
        public long? CreatedBy { get; set; }
    }
}
