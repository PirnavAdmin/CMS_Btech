using BTech.DTOs.Placements;
namespace BTech.Services.Implementations;

// Pure workflow logic: alternative eligibility rules are OR; requirements within a rule are AND.
public static class PlacementWorkflowRules
{
    public static bool CanDriveTransition(string from,string to)=>from==to || ((from,to) switch
    {
        ("DRAFT","PUBLISHED" or "CANCELLED")=>true,
        ("PUBLISHED","REGISTRATION_OPEN" or "CANCELLED")=>true,
        ("REGISTRATION_OPEN","REGISTRATION_CLOSED" or "CANCELLED")=>true,
        ("REGISTRATION_CLOSED","ONGOING" or "CANCELLED")=>true,
        ("ONGOING","COMPLETED" or "CANCELLED")=>true,
        _=>false
    });
    public static bool CanApplicationTransition(string from,string to)=>from==to || ((from,to) switch
    {
        ("APPLIED","UNDER_REVIEW" or "ON_HOLD" or "WITHDRAWN")=>true,
        ("UNDER_REVIEW","SHORTLISTED" or "ON_HOLD" or "WITHDRAWN")=>true,
        ("SHORTLISTED","ON_HOLD" or "WITHDRAWN")=>true,
        ("INTERVIEW_SCHEDULED" or "IN_PROGRESS","ON_HOLD" or "WITHDRAWN")=>true,
        ("ON_HOLD","UNDER_REVIEW" or "SHORTLISTED" or "WITHDRAWN")=>true,
        _=>false
    });
    public static bool CanSelectionTransition(string? from,string to,string applicationStatus)
    {
        if(applicationStatus is not ("APPLIED" or "UNDER_REVIEW" or "SHORTLISTED" or "INTERVIEW_SCHEDULED" or "IN_PROGRESS" or "ON_HOLD"))return false;
        if(from is not null and not "ON_HOLD")return false;
        if(to is not ("SELECTED" or "REJECTED" or "ON_HOLD"))return false;
        return to!="SELECTED" || applicationStatus is "IN_PROGRESS" or "ON_HOLD";
    }
    // Offers and joining normally continue after a recruitment drive is completed.
    public static bool CanContinueOffer(string driveStatus,string applicationStatus)
        =>driveStatus!="CANCELLED" && applicationStatus=="SELECTED";
    public static bool CanOfferTransition(string from,string to)=>(from,to) switch
    {
        ("NOT_ISSUED","ISSUED")=>true,
        ("ISSUED","ACCEPTED" or "DECLINED" or "EXPIRED" or "REVOKED")=>true,
        ("ACCEPTED","REVOKED")=>true,
        _=>false
    };
    public sealed record EligibilityOutcome(long? RuleId,string Status,string Reason);
    public static EligibilityOutcome Evaluate(IReadOnlyList<PlacementRuleDto> rules,PlacementStudent student,EvaluatePlacementEligibilityRequest r,bool placed)
    {
        if(rules.Count==0)return new(null,"PENDING","No active eligibility rules are configured.");
        bool pending=false;var failures=new List<string>();
        foreach(var rule in rules)
        {
            var missing=new List<string>();var failed=new List<string>();
            if(rule.CourseId.HasValue && rule.CourseId!=student.CourseId)failed.Add("course mismatch");
            if(rule.BranchId.HasValue && rule.BranchId!=student.BranchId)failed.Add("branch mismatch");
            if(rule.GraduationYear.HasValue){if(!r.GraduationYear.HasValue)missing.Add("graduation year");else if(rule.GraduationYear!=r.GraduationYear)failed.Add("graduation year mismatch");}
            void Min(decimal? limit,decimal? value,string label){if(!limit.HasValue)return;if(!value.HasValue)missing.Add(label);else if(value<limit)failed.Add(label+" below minimum");}
            void Max(int? limit,int? value,string label){if(!limit.HasValue)return;if(!value.HasValue)missing.Add(label);else if(value>limit)failed.Add(label+" above maximum");}
            Min(rule.MinCgpa,r.StudentCgpa,"CGPA");Min(rule.MinPercentage,r.StudentPercentage,"percentage");
            Min(rule.MinTenthPercentage,r.TenthPercentage,"tenth percentage");Min(rule.MinTwelfthPercentage,r.TwelfthPercentage,"twelfth percentage");
            Max(rule.MaxActiveBacklogs,r.ActiveBacklogs,"active backlogs");Max(rule.MaxEducationGapYears,r.EducationGapYears,"education gap");
            if(rule.AllowAlreadyPlaced==0 && placed)failed.Add("student already placed");
            if(failed.Count==0 && missing.Count==0)return new(rule.EligibilityRuleId,"ELIGIBLE","All criteria matched: "+rule.RuleName);
            if(failed.Count==0)pending=true;
            failures.Add(rule.RuleName+": "+string.Join(", ",failed.Concat(missing.Select(x=>"missing "+x))));
        }
        var reason=string.Join("; ",failures);if(reason.Length>2000)reason=reason[..2000];
        return new(null,pending?"PENDING":"NOT_ELIGIBLE",reason);
    }
}
