namespace BTech.DTOs.StudentPromotion
{
    /// <summary>
    /// Complete historical promotion record for a student.
    /// Includes source/target academic placement, eligibility,
    /// decision, audit and result information stored in student_promotions.
    /// </summary>
    public sealed class CompletePromotionHistoryDto
    {
        public long PromotionId { get; set; }
        public long StudentId { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public long CollegeId { get; set; }

        public long FromAcademicYearId { get; set; }
        public string FromAcademicYearName { get; set; } = string.Empty;
        public long ToAcademicYearId { get; set; }
        public string ToAcademicYearName { get; set; } = string.Empty;

        public long? FromCourseId { get; set; }
        public string? FromCourseName { get; set; }
        public long? ToCourseId { get; set; }
        public string? ToCourseName { get; set; }

        public long? FromBranchId { get; set; }
        public string? FromBranchName { get; set; }
        public long? ToBranchId { get; set; }
        public string? ToBranchName { get; set; }

        public long? FromSectionId { get; set; }
        public string? FromSectionName { get; set; }
        public long? ToSectionId { get; set; }
        public string? ToSectionName { get; set; }

        public int? FromSemester { get; set; }
        public int? ToSemester { get; set; }

        public string PromotionStatus { get; set; } = string.Empty;
        public string? Decision { get; set; }
        public DateTime? DecisionDate { get; set; }
        public long? DecisionBy { get; set; }
        public string? DecisionByName { get; set; }
        public string? Remarks { get; set; }

        public decimal? AttendancePercentage { get; set; }
        public decimal? TotalMarks { get; set; }
        public decimal? ObtainedMarks { get; set; }
        public decimal? MarksPercentage { get; set; }
        public int? PassedSubjects { get; set; }
        public int? FailedSubjects { get; set; }
        public int? BacklogCount { get; set; }

        public string? PromotionEligibility { get; set; }
        public string? EligibilityRemarks { get; set; }
        public string? PromotionType { get; set; }
        public DateTime? PromotionDate { get; set; }
        public DateTime? EffectiveDate { get; set; }
        public string? PromotionReason { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsFinal { get; set; }
        public int? PromotionOrder { get; set; }
        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }
        public long? CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
        public string? UpdatedByName { get; set; }
    }
}
