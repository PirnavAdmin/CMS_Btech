using Dapper;
using MySqlConnector;

namespace BTech.UserAccess;

// A user has one current invitation row. The existing resend route takes users.user_id,
// so invitationId deliberately equals userId, including an eligible not-yet-issued link.
public sealed record UserInvitation(long InvitationId,long UserId,long CollegeId,string FullName,
    string Email,string? Mobile,string CollegeName,string CollegeCode,string RoleName,
    string InvitationStatus,string EmailStatus,DateTime? CreatedAt,DateTime? LastEmailAttempt,
    DateTime? ExpiresAt,int AttemptCount,bool CanResend,bool SetupRequired)
{
    public int RetryAfterSeconds {get;init;}
    public DateTime? SmtpAcceptedAt {get;init;}
    public bool SmtpAccepted => SmtpAcceptedAt.HasValue;
    public string InboxDelivery => "Unverified";
    public string? DeliveryErrorCode {get;init;}
    public string? CorrelationId {get;init;}
}
public sealed record InvitationPage(UserInvitation[] Items,long TotalCount,int PageNumber,int PageSize);

public sealed class OnboardingConflictException(string code,string message,UserInvitation? invitation=null) : Exception(message)
{
    public string Code { get; } = code;
    public UserInvitation? Invitation { get; } = invitation;
}

public sealed partial class UserAccessService
{
    private const string InvitationSelect = """
        SELECT u.user_id AS UserId,u.college_id AS CollegeId,u.full_name AS FullName,u.email AS Email,u.mobile AS Mobile,
          u.status AS UserStatus,u.deleted_at AS DeletedAt,u.must_change_password AS SetupRequired,u.created_at AS CreatedAt,
          c.college_code AS CollegeCode,c.college_name AS CollegeName,
          COALESCE(c.status=1 AND c.deleted_at IS NULL,0) AS CollegeActive,
          EXISTS(SELECT 1 FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
            WHERE m.user_id=u.user_id AND m.status=1 AND m.removed_at IS NULL AND cs.status=1 AND cs.college_id=u.college_id) AS Mapped,
          (SELECT GROUP_CONCAT(DISTINCT r.role_name ORDER BY r.role_id SEPARATOR ', ') FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
            WHERE ur.user_id=u.user_id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL
              AND (r.college_id IS NULL OR r.college_id=u.college_id)) AS RoleName,
          i.user_id AS InvitationUserId,i.purpose AS Purpose,i.delivery_status AS DeliveryStatus,i.created_at AS IssuedAt,
          i.last_attempt_at AS LastEmailAttempt,i.expires_at AS ExpiresAt,i.consumed_at AS ConsumedAt,
          i.smtp_accepted_at AS SmtpAcceptedAt,i.attempt_count AS AttemptCount
          ,i.registered_at AS RegisteredAt,i.college_id AS InvitationCollegeId,i.delivery_error_code AS DeliveryErrorCode,i.correlation_id AS CorrelationId,
          EXISTS(SELECT 1 FROM user_access_audits a WHERE a.target_user_id=u.user_id AND a.action='password_setup_completed') AS SetupCompletedEvidence
        FROM users u LEFT JOIN colleges c ON c.college_id=u.college_id
        LEFT JOIN user_access_invitations i ON i.user_id=u.user_id
        WHERE EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
            WHERE ur.user_id=u.user_id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL
              AND REPLACE(UPPER(r.role_code),'_','')='COLLEGEADMIN' AND (r.college_id IS NULL OR r.college_id=u.college_id))
          AND NOT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
            WHERE ur.user_id=u.user_id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL
              AND REPLACE(UPPER(r.role_code),'_','')='SUPERADMIN')
        """;

    public async Task<InvitationPage> Invitations(string trace,int pageNumber=1,int pageSize=1000)
    {
        if(pageNumber<1 || pageSize<1 || pageSize>1000) throw new ArgumentException("Use a positive pageNumber and pageSize between 1 and 1000.");
        await using var c=await OpenAsync(trace);
        var rows=(await c.QueryAsync<InvitationRow>(InvitationSelect+" ORDER BY u.user_id DESC LIMIT @pageSize OFFSET @offset",
            new{pageSize,offset=((long)pageNumber-1)*pageSize})).ToList();
        var count=await c.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM ("+InvitationSelect+") invitations");
        return new(rows.Select(ToInvitation).ToArray(),count,pageNumber,pageSize);
    }

    private static UserInvitation ToInvitation(InvitationRow row)
    {
        var now=DateTime.UtcNow;
        var state=string.IsNullOrWhiteSpace(row.Email) || row.UserStatus!=1 || row.DeletedAt.HasValue || !row.CollegeActive || !row.Mapped || (row.InvitationCollegeId.HasValue && row.InvitationCollegeId!=row.CollegeId) ? "Unavailable"
            : !row.SetupRequired ? row.SetupCompletedEvidence ? "Accepted" : "Setup Complete"
            : row.InvitationUserId is null || row.Purpose!="setup" || row.DeliveryStatus=="pending" ? "Not Created"
            : row.DeliveryStatus=="sending" && row.IssuedAt>now.AddSeconds(-BTech.Services.Invitations.InvitationPolicy.SendingLeaseSeconds) ? "Sending"
            : row.DeliveryStatus is "failed" or "sending" ? "Email Failed"
            : row.ConsumedAt.HasValue || row.ExpiresAt<=now ? "Expired" : "Pending Invitation";
        var delivery=row.DeliveryStatus=="sent" && row.SmtpAcceptedAt.HasValue ? "Accepted"
            : row.DeliveryStatus=="failed" ? "Failed"
            : state=="Sending" ? "Sending" : row.InvitationUserId is null ? "Not Sent" : "Unknown";
        return new(row.UserId,row.UserId,row.CollegeId,row.FullName,row.Email??"",row.Mobile,row.CollegeName??"",row.CollegeCode??"",row.RoleName??"",
            state,delivery,Utc(row.RegisteredAt),Utc(row.LastEmailAttempt),Utc(row.ExpiresAt),row.AttemptCount,
            state is "Pending Invitation" or "Expired" or "Email Failed" or "Not Created",row.SetupRequired)
        { RetryAfterSeconds=row.IssuedAt.HasValue && row.DeliveryStatus!="pending" ? BTech.Services.Invitations.InvitationPolicy.RetryAfter(row.IssuedAt.Value,row.DeliveryStatus??"",now):0,
          SmtpAcceptedAt=Utc(row.SmtpAcceptedAt),DeliveryErrorCode=row.DeliveryErrorCode,CorrelationId=row.CorrelationId };
    }
    private static DateTime? Utc(DateTime? value)=>value.HasValue?DateTime.SpecifyKind(value.Value,DateTimeKind.Utc):null;

    private async Task CheckOnboardingConflict(MySqlConnection c,OnboardCollegeRequest request,string trace)
    {
        var code=request.CollegeCode.Trim();var email=request.AdminEmail.Trim();var mobile=request.AdminMobile?.Trim();
        var collegeExists=await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM colleges WHERE college_code=@code",new{code})>0;
        var users=await c.QueryAsync<IdentityConflict>("SELECT user_id AS UserId,college_id AS CollegeId,email AS Email,mobile AS Mobile FROM users WHERE email=@email OR (@mobile IS NOT NULL AND @mobile<>'' AND mobile=@mobile)",new{email,mobile});
        var identities=users.ToList();
        if(!collegeExists && identities.Count==0)return;
        UserInvitation? match=null;
        // Recovery is read-only and requires the same explicit account/college mapping,
        // code, email and nonblank mobile. Names are never used to infer ownership.
        if(collegeExists && !string.IsNullOrWhiteSpace(mobile) && identities.Count==1)
        {
            var row=await c.QuerySingleOrDefaultAsync<InvitationRow>(InvitationSelect+" AND u.user_id=@id AND c.college_code=@code",new{id=identities[0].UserId,code});
            if(row is not null && string.Equals(row.Email?.Trim(),email,StringComparison.OrdinalIgnoreCase) && row.Mobile?.Trim()==mobile)
            {
                var candidate=ToInvitation(row);
                if(candidate.CanResend)match=candidate;
            }
        }
        var errorCode=match is not null?"ONBOARDING_ALREADY_EXISTS":identities.Any(x=>string.Equals(x.Email?.Trim(),email,StringComparison.OrdinalIgnoreCase))?"ADMIN_EMAIL_CONFLICT":identities.Count>0?"ADMIN_MOBILE_CONFLICT":"COLLEGE_CODE_CONFLICT";
        var message=match is not null
            ? "An onboarding record already exists for this administrator or college. Review the existing invitation before continuing."
            : errorCode=="ADMIN_EMAIL_CONFLICT"?"This administrator email is already assigned to an account. Review its existing college and invitation; no association was changed and no email was sent."
            : errorCode=="ADMIN_MOBILE_CONFLICT"?"This mobile number already belongs to another account. No college or account was created."
            : "This college code already exists. Review the existing college; this operation cannot attach a new administrator to it. Use the existing-college invite workflow after an explicit access review.";
        _logger.LogInformation("Onboarding conflict resolved without writes or sending. CorrelationId={CorrelationId}, Code={Code}, RecoveryUserId={RecoveryUserId}",trace,errorCode,match?.UserId);
        throw new OnboardingConflictException(errorCode,message,match);
    }
    private sealed class IdentityConflict { public long UserId{get;set;} public long? CollegeId{get;set;} public string? Email{get;set;} public string? Mobile{get;set;} }
    private sealed class InvitationRow
    {
        public long UserId{get;set;} public long CollegeId{get;set;} public string FullName{get;set;}="";
        public string? Email{get;set;} public string? Mobile{get;set;} public int UserStatus{get;set;} public DateTime? DeletedAt{get;set;}
        public bool SetupRequired{get;set;} public DateTime CreatedAt{get;set;} public string? CollegeCode{get;set;} public string? CollegeName{get;set;}
        public bool CollegeActive{get;set;} public bool Mapped{get;set;} public string? RoleName{get;set;}
        public long? InvitationUserId{get;set;} public string? Purpose{get;set;} public string? DeliveryStatus{get;set;}
        public DateTime? IssuedAt{get;set;} public DateTime? LastEmailAttempt{get;set;} public DateTime? ExpiresAt{get;set;}
        public DateTime? ConsumedAt{get;set;} public DateTime? SmtpAcceptedAt{get;set;} public int AttemptCount{get;set;}
        public DateTime? RegisteredAt{get;set;} public long? InvitationCollegeId{get;set;}
        public bool SetupCompletedEvidence{get;set;} public string? DeliveryErrorCode{get;set;} public string? CorrelationId{get;set;}
    }
}
