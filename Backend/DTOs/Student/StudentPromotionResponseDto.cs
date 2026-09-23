namespace BTech.DTOs.Student
{
    public sealed class StudentPromotionResponseDto
    {
        public long PromotionId { get; set; }
        public long StudentId { get; set; }

        public long FromAcademicYearId { get; set; }
        public string? FromAcademicYearName { get; set; }

        public long ToAcademicYearId { get; set; }
        public string? ToAcademicYearName { get; set; }

        public long? FromCourseId { get; set; }
        public long? ToCourseId { get; set; }

        public long? FromBranchId { get; set; }
        public long? ToBranchId { get; set; }

        public string? PromotionStatus { get; set; }
        public string? Decision { get; set; }

        public string? PromotionEligibility { get; set; }
        public string? PromotionType { get; set; }

        public DateTime? PromotionDate { get; set; }
        public DateTime? EffectiveDate { get; set; }

        public string? Remarks { get; set; }
    }
}