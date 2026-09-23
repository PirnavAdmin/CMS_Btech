namespace BTech.DTOs.FacultyLeave;

public class FacultyLeaveRequestCreateRequest
{
    public long FacultyId { get; set; }
    public string PolicyId { get; set; } = string.Empty;
    public string LeaveTypeId { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public decimal Days { get; set; }
    public DateTime? AppliedOn { get; set; }
    public string? Reason { get; set; }
}

public class FacultyLeaveDecisionRequest
{
    public string? RejectionReason { get; set; }
}

public class FacultyLeaveTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string PayCategory { get; set; } = "Paid Leave";
    public string? Category { get; set; }
    public string? Description { get; set; }
    public string Status { get; set; } = "Active";
}

public class FacultyLeavePolicyRequest
{
    public string Name { get; set; } = string.Empty;
    public string AcademicYear { get; set; } = string.Empty;
    public string ApplicableTo { get; set; } = "Both";
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public List<FacultyLeavePolicyEntitlementRequest> Entitlements { get; set; } = new();
}

public class FacultyLeavePolicyEntitlementRequest
{
    public string LeaveTypeId { get; set; } = string.Empty;
    public decimal? Entitlement { get; set; }
    public decimal? MaxDays { get; set; }
    public bool CarryForward { get; set; }
    public decimal? MaxCarryForward { get; set; }
    public bool DocumentRequired { get; set; }
}
