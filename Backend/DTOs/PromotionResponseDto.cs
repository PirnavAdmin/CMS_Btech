namespace BTech.DTOs.StudentPromotion
{
    public sealed class PromotionResponseDto
    {
        public long PromotionId { get; set; }

        public long StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public long BranchId { get; set; }

        public long AcademicYearId { get; set; }

        public int CurrentSemester { get; set; }

        public int NextSemester { get; set; }

        public string EligibilityStatus { get; set; } = string.Empty;

        public string PromotionStatus { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; }

        // Additional promotion information

        public long? FromAcademicYearId { get; set; }

        public string? FromAcademicYearName { get; set; }

        public long? ToAcademicYearId { get; set; }

        public string? ToAcademicYearName { get; set; }

        public long? FromCourseId { get; set; }

        public long? ToCourseId { get; set; }

        public long? FromBranchId { get; set; }

        public long? ToBranchId { get; set; }

        public string? Decision { get; set; }

        public string? PromotionEligibility { get; set; }

        public string? PromotionType { get; set; }

        public DateTime? PromotionDate { get; set; }

        public DateTime? EffectiveDate { get; set; }

        public long? TargetAcademicYearId { get; set; }
        public long? TargetSemesterId { get; set; }
        public long? TargetSectionId { get; set; }
        public bool IsGraduated { get; set; }
        public bool DegreeConferred { get; set; }
        public DateTime? DegreeConferredAt { get; set; }
        public List<CompletePromotionHistoryDto> History { get; set; } = new();
    }
}