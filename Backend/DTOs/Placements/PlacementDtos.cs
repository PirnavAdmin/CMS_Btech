using System.ComponentModel.DataAnnotations;

namespace BTech.DTOs.Placements;

public sealed class PlacementDriveDto
{
    public long DriveId { get; set; }
    public long CollegeId { get; set; }
    public long CompanyId { get; set; }
    public long AcademicYearId { get; set; }
    public string DriveCode { get; set; } = string.Empty;
    public string DriveName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public string? JobDescription { get; set; }
    public string EmploymentType { get; set; } = string.Empty;
    public string DriveType { get; set; } = string.Empty;
    public string? JobLocation { get; set; }
    public decimal? CtcMin { get; set; }
    public decimal? CtcMax { get; set; }
    public decimal? MonthlyStipend { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public int? Vacancies { get; set; }
    public DateTime DriveStartAt { get; set; }
    public DateTime? DriveEndAt { get; set; }
    public DateTime? ApplicationOpenAt { get; set; }
    public DateTime? ApplicationCloseAt { get; set; }
    public string? Venue { get; set; }
    public string? MeetingUrl { get; set; }
    public long? CoordinatorUserId { get; set; }
    public string DriveStatus { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public long? DeletedBy { get; set; }
}

public sealed class PlacementRuleDto
{
    public long EligibilityRuleId { get; set; }
    public long DriveId { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public long? CourseId { get; set; }
    public long? BranchId { get; set; }
    public int? GraduationYear { get; set; }
    public decimal? MinCgpa { get; set; }
    public decimal? MinPercentage { get; set; }
    public decimal? MinTenthPercentage { get; set; }
    public decimal? MinTwelfthPercentage { get; set; }
    public int? MaxActiveBacklogs { get; set; }
    public int? MaxEducationGapYears { get; set; }
    public int AllowAlreadyPlaced { get; set; }
    public string? Description { get; set; }
    public int Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public long? DeletedBy { get; set; }
}

public sealed class PlacementEligibilityDto
{
    public long EligibilityId { get; set; }
    public long DriveId { get; set; }
    public long StudentId { get; set; }
    public long? MatchedRuleId { get; set; }
    public string EligibilityStatus { get; set; } = string.Empty;
    public decimal? StudentCgpa { get; set; }
    public decimal? StudentPercentage { get; set; }
    public int? ActiveBacklogs { get; set; }
    public string? CriteriaSnapshot { get; set; }
    public string? AcademicSnapshot { get; set; }
    public string? Reason { get; set; }
    public DateTime? EvaluatedAt { get; set; }
    public long? EvaluatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public long? DeletedBy { get; set; }
}

public sealed class BulkPlacementEligibilityItemDto
{
    public long StudentId { get; set; }
    public bool Saved { get; set; }
    public string EvaluationStatus { get; set; } = string.Empty;
    public string? EligibilityStatus { get; set; }
    public long? MatchedRuleId { get; set; }
    public string? Message { get; set; }
    public PlacementEligibilityDto? Eligibility { get; set; }
}

public sealed class BulkPlacementEligibilityResultDto
{
    public long DriveId { get; set; }
    public int TotalStudents { get; set; }
    public int EvaluatedCount { get; set; }
    public int EligibleCount { get; set; }
    public int NotEligibleCount { get; set; }
    public int PendingCount { get; set; }
    public int SkippedCount { get; set; }
    public List<BulkPlacementEligibilityItemDto> Results { get; set; } = new();
}

public sealed class PlacementApplicationDto
{
    public long ApplicationId { get; set; }
    public long DriveId { get; set; }
    public long StudentId { get; set; }
    public string? ApplicationNumber { get; set; }
    public string? ResumePath { get; set; }
    public string? CoverLetter { get; set; }
    public DateTime AppliedAt { get; set; }
    public string ApplicationStatus { get; set; } = string.Empty;
    public DateTime? WithdrawnAt { get; set; }
    public string? WithdrawalReason { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public long? DeletedBy { get; set; }
}

public sealed class PlacementInterviewDto
{
    public long InterviewId { get; set; }
    public long ApplicationId { get; set; }
    public int RoundNumber { get; set; }
    public string RoundName { get; set; } = string.Empty;
    public string RoundType { get; set; } = string.Empty;
    public string InterviewMode { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public long? InterviewerUserId { get; set; }
    public string? InterviewerName { get; set; }
    public string? Venue { get; set; }
    public string? MeetingUrl { get; set; }
    public decimal? Score { get; set; }
    public decimal? MaxScore { get; set; }
    public string InterviewStatus { get; set; } = string.Empty;
    public string InterviewResult { get; set; } = string.Empty;
    public string? Feedback { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public long? DeletedBy { get; set; }
}

public sealed class PlacementSelectionDto
{
    public long SelectionId { get; set; }
    public long ApplicationId { get; set; }
    public string SelectionStatus { get; set; } = string.Empty;
    public DateTime DecisionAt { get; set; }
    public long? DecidedBy { get; set; }
    public string? OfferedJobTitle { get; set; }
    public decimal? OfferedCtc { get; set; }
    public decimal? MonthlyStipend { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public string? JobLocation { get; set; }
    public string OfferStatus { get; set; } = string.Empty;
    public string? OfferLetterPath { get; set; }
    public DateTime? OfferIssuedAt { get; set; }
    public DateTime? OfferExpiresAt { get; set; }
    public DateTime? OfferRespondedAt { get; set; }
    public DateTime? ExpectedJoiningDate { get; set; }
    public DateTime? JoinedAt { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
    public long? DeletedBy { get; set; }
}

