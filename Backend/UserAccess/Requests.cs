using System.ComponentModel.DataAnnotations;

namespace BTech.UserAccess;

public sealed class OnboardCollegeRequest : System.Text.Json.Serialization.IJsonOnDeserialized, IValidatableObject
{
    public string? AdminFullName { get; set; }
    public OnboardingCollegeDetails? College { get; set; }
    [Required, StringLength(50, MinimumLength=1)] public string CollegeCode { get; set; } = "";
    [Required, StringLength(200, MinimumLength=1)] public string CollegeName { get; set; } = "";
    [StringLength(50)] public string? CollegeType { get; set; }
    [Required, StringLength(150, MinimumLength=1)] public string AdminName { get; set; } = "";
    [Required, EmailAddress, StringLength(150)] public string AdminEmail { get; set; } = "";
    [RegularExpression(@"^\+?[0-9]{7,14}$")] public string? AdminMobile { get; set; }
    [StringLength(200)] public string? UniversityName { get; set; }
    [EmailAddress,StringLength(150)] public string? Email { get; set; }
    [StringLength(20)] public string? Mobile { get; set; }
    [StringLength(255)] public string? AddressLine1 { get; set; }
    [StringLength(100)] public string? City { get; set; }
    [StringLength(100)] public string? State { get; set; }
    [StringLength(10)] public string? Pincode { get; set; }
    [StringLength(100)] public string? Country { get; set; }
    [System.Text.Json.Serialization.JsonConverter(typeof(ModuleGrantsConverter))]
    public List<ModuleGrant>? Permissions { get; set; }
    public void OnDeserialized()
    {
        if(string.IsNullOrWhiteSpace(AdminName)) AdminName=AdminFullName??"";
        if(College is null)return;
        if(string.IsNullOrWhiteSpace(CollegeCode))CollegeCode=College.CollegeCode??College.Code??"";
        if(string.IsNullOrWhiteSpace(CollegeName))CollegeName=College.CollegeName??College.Name??"";
        CollegeType??=College.CollegeType??College.Type; UniversityName??=College.UniversityName;
        Email??=College.Email; Mobile??=College.Mobile; AddressLine1??=College.AddressLine1;
        City??=College.City;State??=College.State;Pincode??=College.Pincode;Country??=College.Country;
    }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if(!string.IsNullOrWhiteSpace(AdminFullName) && !string.Equals(AdminName.Trim(),AdminFullName.Trim(),StringComparison.OrdinalIgnoreCase))
            yield return new ValidationResult("adminName and adminFullName must identify the same administrator.",[nameof(AdminName),nameof(AdminFullName)]);
        var nestedCode=College?.CollegeCode??College?.Code;
        if(!string.IsNullOrWhiteSpace(nestedCode) && !string.Equals(CollegeCode.Trim(),nestedCode.Trim(),StringComparison.OrdinalIgnoreCase))
            yield return new ValidationResult("Flat and nested college codes must match.",[nameof(CollegeCode),nameof(College)]);
    }
}
public sealed class OnboardingCollegeDetails
{
    public string? CollegeCode{get;set;} public string? CollegeName{get;set;} public string? CollegeType{get;set;}
    public string? Code{get;set;} public string? Name{get;set;} public string? Type{get;set;}
    public string? UniversityName{get;set;} public string? Email{get;set;} public string? Mobile{get;set;}
    public string? AddressLine1{get;set;} public string? City{get;set;} public string? State{get;set;}
    public string? Pincode{get;set;} public string? Country{get;set;}
}
public sealed class InviteUserRequest
{
    [Range(1,long.MaxValue)] public long CollegeId { get; set; }
    [Required, StringLength(150, MinimumLength=1)] public string FullName { get; set; } = "";
    [Required, EmailAddress, StringLength(150)] public string Email { get; set; } = "";
    [Required, MinLength(1)] public long[] RoleIds { get; set; } = [];
    [RegularExpression(@"^\+?[0-9]{7,14}$")] public string? Mobile { get; set; }
    [System.Text.Json.Serialization.JsonConverter(typeof(ModuleGrantsConverter))]
    public List<ModuleGrant>? Permissions { get; set; }
}
public sealed class UpdateAccessUserRequest
{
    [Required, StringLength(150, MinimumLength=1)] public string FullName { get; set; } = "";
    [Required, MinLength(1)] public long[] RoleIds { get; set; } = [];
    [EmailAddress, StringLength(150)] public string? Email { get; set; }
    [RegularExpression(@"^\+?[0-9]{7,14}$")] public string? Mobile { get; set; }
    [Range(1,long.MaxValue)] public long? CollegeId { get; set; }
    [System.Text.Json.Serialization.JsonConverter(typeof(ModuleGrantsConverter))]
    public List<ModuleGrant>? Permissions { get; set; }
}
public sealed class StatusRequest { [Required, Range(0,1)] public int? Status { get; set; } }
public sealed class ModuleGrant
{
    [Required, StringLength(80)] public string ModuleKey { get; set; } = "";
    public bool CanView { get; set; }
    public bool CanCreate { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
    public bool CanExport { get; set; }
}
public sealed class ModuleAccessRequest
{
    [Range(1,long.MaxValue)] public long CollegeId { get; set; }
    [Required] public List<ModuleGrant> Permissions { get; set; } = [];
}
public sealed class YearAccessRequest
{
    [Required] public bool? Restricted { get; set; }
    [Required] public long[] AcademicYearIds { get; set; } = [];
}
public sealed class CompleteProfileRequest : BTech.DTOs.Profile.UpdateProfileRequestDto
{
    [StringLength(150)] public string? JobTitle { get; set; }
    [StringLength(500)] public string? AddressLine1 { get; set; }
    [StringLength(10)] public string? PostalCode { get; set; }
}
public sealed class AccessSetupException : Exception
{
    public AccessSetupException(string message) : base(message) { }
}

// Optional identifiers are consistency checks; the route userId is authoritative.
// Never use an employee/profile/college identifier as a fallback user lookup.
public sealed class PasswordSetupLinkRequest
{
    [Range(1,long.MaxValue)] public long? UserId { get; set; }
    [Range(1,long.MaxValue)] public long? CollegeId { get; set; }
}
