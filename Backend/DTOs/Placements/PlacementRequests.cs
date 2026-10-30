using System.ComponentModel.DataAnnotations;
namespace BTech.DTOs.Placements;

// Date/time fields are UTC. CTC fields are annual currency amounts, not lakhs.
public sealed class SavePlacementDriveRequest
{
    [Range(1,long.MaxValue)] public long CompanyId { get; set; }
    [Range(1,long.MaxValue)] public long AcademicYearId { get; set; }
    [Required,MaxLength(50)] public string DriveCode { get; set; } = "";
    [Required,MaxLength(200)] public string DriveName { get; set; } = "";
    [Required,MaxLength(150)] public string JobTitle { get; set; } = "";
    [MaxLength(10000)] public string? JobDescription { get; set; }
    public string EmploymentType { get; set; } = "FULL_TIME";
    public string DriveType { get; set; } = "ON_CAMPUS";
    [MaxLength(250)] public string? JobLocation { get; set; }
    [Range(typeof(decimal),"0","999999999999.99")] public decimal? CtcMin { get; set; }
    [Range(typeof(decimal),"0","999999999999.99")] public decimal? CtcMax { get; set; }
    [Range(typeof(decimal),"0","9999999999.99")] public decimal? MonthlyStipend { get; set; }
    [Required,StringLength(3,MinimumLength=3)] public string CurrencyCode { get; set; } = "INR";
    [Range(1,int.MaxValue)] public int? Vacancies { get; set; }
    public DateTime DriveStartAt { get; set; }
    public DateTime? DriveEndAt { get; set; }
    public DateTime? ApplicationOpenAt { get; set; }
    public DateTime? ApplicationCloseAt { get; set; }
    [MaxLength(250)] public string? Venue { get; set; }
    [MaxLength(1000)] public string? MeetingUrl { get; set; }
    [Range(1,long.MaxValue)] public long? CoordinatorUserId { get; set; }
    [MaxLength(1000)] public string? Remarks { get; set; }
}
public sealed class PlacementStatusRequest
{
    [Required,MaxLength(30)] public string Status { get; set; } = "";
    [MaxLength(1000)] public string? Reason { get; set; }
}
public sealed class SavePlacementRuleRequest
{
    [Required,MaxLength(150)] public string RuleName { get; set; } = "";
    [Range(1,long.MaxValue)] public long? CourseId { get; set; }
    [Range(1,long.MaxValue)] public long? BranchId { get; set; }
    [Range(1900,9999)] public int? GraduationYear { get; set; }
    [Range(typeof(decimal),"0","10")] public decimal? MinCgpa { get; set; }
    [Range(typeof(decimal),"0","100")] public decimal? MinPercentage { get; set; }
    [Range(typeof(decimal),"0","100")] public decimal? MinTenthPercentage { get; set; }
    [Range(typeof(decimal),"0","100")] public decimal? MinTwelfthPercentage { get; set; }
    [Range(0,int.MaxValue)] public int? MaxActiveBacklogs { get; set; }
    [Range(0,int.MaxValue)] public int? MaxEducationGapYears { get; set; }
    public bool AllowAlreadyPlaced { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    public bool Status { get; set; } = true;
}
// Academic values are supplied/verified by authorized placement staff, never self-certified by students.
// Missing values required by a rule produce PENDING rather than ELIGIBLE.
public sealed class EvaluatePlacementEligibilityRequest
{
    [Range(1,long.MaxValue)] public long StudentId { get; set; }
    [Range(typeof(decimal),"0","10")] public decimal? StudentCgpa { get; set; }
    [Range(typeof(decimal),"0","100")] public decimal? StudentPercentage { get; set; }
    [Range(typeof(decimal),"0","100")] public decimal? TenthPercentage { get; set; }
    [Range(typeof(decimal),"0","100")] public decimal? TwelfthPercentage { get; set; }
    [Range(0,int.MaxValue)] public int? ActiveBacklogs { get; set; }
    [Range(0,int.MaxValue)] public int? EducationGapYears { get; set; }
    [Range(1900,9999)] public int? GraduationYear { get; set; }
}
// Bulk placement eligibility evaluation; each student's academic values are validated like single evaluation.
public sealed class BulkEvaluatePlacementEligibilityRequest
{
    [Required, MinLength(1)] public List<EvaluatePlacementEligibilityRequest> Students { get; set; } = new();
}

public sealed class CreatePlacementApplicationRequest
{
    [Range(1,long.MaxValue)] public long StudentId { get; set; }
    [MaxLength(1000)] public string? ResumePath { get; set; }
    [MaxLength(10000)] public string? CoverLetter { get; set; }
    [MaxLength(2000)] public string? Remarks { get; set; }
}
public sealed class UpdatePlacementApplicationRequest
{
    [MaxLength(1000)] public string? ResumePath { get; set; }
    [MaxLength(10000)] public string? CoverLetter { get; set; }
    [MaxLength(2000)] public string? Remarks { get; set; }
}
public sealed class SavePlacementInterviewRequest
{
    [Range(1,int.MaxValue)] public int RoundNumber { get; set; } = 1;
    [Required,MaxLength(150)] public string RoundName { get; set; } = "";
    public string RoundType { get; set; } = "TECHNICAL";
    public string InterviewMode { get; set; } = "OFFLINE";
    public DateTime ScheduledAt { get; set; }
    [Range(1,long.MaxValue)] public long? InterviewerUserId { get; set; }
    [MaxLength(150)] public string? InterviewerName { get; set; }
    [MaxLength(250)] public string? Venue { get; set; }
    [MaxLength(1000)] public string? MeetingUrl { get; set; }
}
public sealed class PlacementInterviewResultRequest
{
    [Required] public string InterviewResult { get; set; } = "PASSED";
    public DateTime CompletedAt { get; set; }
    [Range(typeof(decimal),"0","99999.99")] public decimal? Score { get; set; }
    [Range(typeof(decimal),"0.01","99999.99")] public decimal? MaxScore { get; set; }
    [MaxLength(10000)] public string? Feedback { get; set; }
}
public sealed class SavePlacementSelectionRequest
{
    [Required] public string SelectionStatus { get; set; } = "SELECTED";
    [MaxLength(150)] public string? OfferedJobTitle { get; set; }
    [Range(typeof(decimal),"0","999999999999.99")] public decimal? OfferedCtc { get; set; }
    [Range(typeof(decimal),"0","9999999999.99")] public decimal? MonthlyStipend { get; set; }
    [Required,StringLength(3,MinimumLength=3)] public string CurrencyCode { get; set; } = "INR";
    [MaxLength(250)] public string? JobLocation { get; set; }
    public DateTime? ExpectedJoiningDate { get; set; }
    [MaxLength(2000)] public string? Remarks { get; set; }
}
public sealed class PlacementOfferRequest
{
    [Required] public string OfferStatus { get; set; } = "ISSUED";
    [MaxLength(1000)] public string? OfferLetterPath { get; set; }
    public DateTime? OfferExpiresAt { get; set; }
    public DateTime? ExpectedJoiningDate { get; set; }
}
public sealed record PlacementActor(long UserId,long CollegeId);
public sealed record PlacementStudent(long StudentId,long CollegeId,long? CourseId,long? BranchId);
public sealed class PlacementApiException : Exception
{
    public int StatusCode { get; }
    public PlacementApiException(int statusCode,string message) : base(message) => StatusCode=statusCode;
}
