using System.Security.Cryptography;
using Dapper;
using MySqlConnector;
using BTech.Services;
using BTech.Services.Interfaces;
using BTech.Services.Invitations;

namespace BTech.UserAccess;

public sealed partial class UserAccessService
{
    private readonly string _connectionString;
    private readonly ILogger<UserAccessService> _logger;
    private readonly IAccountSetupService _accountSetup;
    private readonly AccountInvitationService _invitations;
    public UserAccessService(IConfiguration config, IAccountSetupService accountSetup, AccountInvitationService invitations, ILogger<UserAccessService> logger)
    {
        _connectionString = config.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("DefaultConnection is missing.");
        _logger = logger;
        _accountSetup = accountSetup;
        _invitations = invitations;
    }
    public async Task<MySqlConnection> OpenAsync(string trace="unavailable")
    {
        var c = new MySqlConnection(_connectionString);
        try { await c.OpenAsync(); await UserAccessSchema.RequireAsync(c,_logger,trace); return c; } catch { await c.DisposeAsync(); throw; }
    }
    private static Task Audit(MySqlConnection c, MySqlTransaction tx, long? actor, long? target, long? college, string action, string trace) =>
        c.ExecuteAsync("INSERT INTO user_access_audits(actor_user_id,target_user_id,college_id,action,correlation_id) VALUES(@actor,@target,@college,@action,@trace)", new { actor, target, college, action, trace }, tx);

    private static async Task<long> InsertUser(MySqlConnection c, MySqlTransaction tx, string name, string email, long collegeId, long actor, string? mobile=null)
    {
        // No shared/default password. The random value is never returned or emailed.
        var hash = BCrypt.Net.BCrypt.HashPassword(Convert.ToHexString(RandomNumberGenerator.GetBytes(32)),12);
        await c.ExecuteAsync("""
            INSERT INTO users(college_id,employee_user_id,full_name,email,password_hash,must_change_password,status,
              profile_completed,internal_identifier,created_by,mobile)
            VALUES(@collegeId,@internalId,@name,@email,@hash,1,1,0,1,@actor,@mobile);
            """,new { collegeId, internalId="SYS_"+Guid.NewGuid().ToString("N"), name=name.Trim(), email=email.Trim(),hash,actor,mobile=string.IsNullOrWhiteSpace(mobile)?null:mobile.Trim() },tx);
        return await c.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID()",transaction:tx);
    }
    private static async Task ValidateRoles(MySqlConnection c, MySqlTransaction tx, long collegeId, long[] ids)
    {
        if (ids.Length==0 || ids.Length>50 || ids.Any(id=>id<=0) || ids.Distinct().Count()!=ids.Length) throw new ArgumentException("Provide unique active role IDs.");
        var roles = (await c.QueryAsync<RoleRow>("SELECT role_id AS Id,role_code AS Code FROM roles WHERE role_id IN @ids AND status=1 AND deleted_at IS NULL AND (college_id IS NULL OR college_id=@collegeId)",new{ids,collegeId},tx)).ToList();
        if (roles.Count!=ids.Length || roles.Any(r=>CanonicalRoleCode.Normalize(r.Code)=="SUPER_ADMIN")) throw new ArgumentException("Choose active college-compatible roles. This workflow cannot assign SUPER_ADMIN.");
    }
    private static async Task AssignRoles(MySqlConnection c, MySqlTransaction tx,long userId,long[] ids,long actor)
    {
        await c.ExecuteAsync("UPDATE user_roles SET status=0,removed_at=UTC_TIMESTAMP(),updated_by=@actor WHERE user_id=@userId AND status=1",new{actor,userId},tx);
        foreach(var roleId in ids) await c.ExecuteAsync("""
            INSERT INTO user_roles(user_id,role_id,status,assigned_by) VALUES(@userId,@roleId,1,@actor)
            ON DUPLICATE KEY UPDATE status=1,removed_at=NULL,assigned_by=@actor,updated_by=@actor;
            """,new{userId,roleId,actor},tx);
    }
    private static async Task EnsureMapping(MySqlConnection c,MySqlTransaction tx,long userId,long collegeId,long actor)
    {
        // Serialize all onboarding/role-edit mapping changes for this account.
        // When a user becomes College Admin, old mappings must be reviewed;
        // never reactivate a second college as a side effect of an invitation.
        var primary = await c.ExecuteScalarAsync<long?>(
            "SELECT college_id FROM users WHERE user_id=@userId AND status=1 AND deleted_at IS NULL FOR UPDATE",new{userId},tx);
        var isCollegeAdmin = await c.ExecuteScalarAsync<int>("""
            SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
            WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL
              AND UPPER(r.role_code)='COLLEGE_ADMIN' AND r.status=1 AND r.deleted_at IS NULL
            """,new{userId},tx)>0;
        if(isCollegeAdmin)
        {
            if(primary!=collegeId) throw new InvalidOperationException("College Admin account college differs from the requested assignment.");
            var other = await c.ExecuteScalarAsync<int>("""
                SELECT COUNT(*) FROM college_user_mappings m
                JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
                WHERE m.user_id=@userId AND m.status=1 AND m.removed_at IS NULL AND cs.college_id<>@collegeId
                """,new{userId,collegeId},tx);
            if(other>0) throw new InvalidOperationException("College Admin already has a different active college assignment. Resolve it before continuing.");
        }
        // Lock the college so concurrent invitations cannot create duplicate settings.
        if(await c.ExecuteScalarAsync<long?>("SELECT college_id FROM colleges WHERE college_id=@collegeId AND status=1 AND deleted_at IS NULL FOR UPDATE",new{collegeId},tx) is null)
            throw new ArgumentException("Choose an active college.");
        var settingId=await c.ExecuteScalarAsync<long?>("SELECT college_setting_id FROM college_settings WHERE college_id=@collegeId AND status=1 LIMIT 1",new{collegeId},tx);
        if(settingId is null)
        {
            if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM college_settings WHERE college_id=@collegeId",new{collegeId},tx)>0)
                throw new InvalidOperationException("The college configuration is inactive. Activate its existing settings before inviting an administrator.");
            await c.ExecuteAsync("INSERT INTO college_settings(college_id,college_name,college_code,college_email,status,created_by) SELECT college_id,college_name,college_code,email,1,@actor FROM colleges WHERE college_id=@collegeId",new{collegeId,actor},tx);
            settingId=await c.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID()",transaction:tx);
        }
        await c.ExecuteAsync("INSERT INTO college_user_mappings(user_id,college_setting_id,status,assigned_by) VALUES(@userId,@settingId,1,@actor) ON DUPLICATE KEY UPDATE status=1,removed_at=NULL,removed_by=NULL,updated_by=@actor",new{userId,settingId,actor},tx);
    }
    private static Task RegisterInvitation(MySqlConnection c,MySqlTransaction tx,long userId,long collegeId,string email,string trace)
    {
        // Registration is part of the account transaction, before any SMTP call.
        // The random hash has no issued token and pending registrations cannot redeem.
        var hash=Convert.ToHexString(SHA256.HashData(RandomNumberGenerator.GetBytes(32))).ToLowerInvariant();
        return c.ExecuteAsync("""
            INSERT INTO user_access_invitations(user_id,college_id,registered_at,token_hash,purpose,recipient_email,
                expires_at,delivery_status,created_at,attempt_count,correlation_id)
            VALUES(@userId,@collegeId,UTC_TIMESTAMP(),@hash,'setup',@email,UTC_TIMESTAMP(),'pending',UTC_TIMESTAMP(),0,@trace)
            """,new{userId,collegeId,hash,email=email.Trim(),trace},tx);
    }
    public async Task<object> Onboard(OnboardCollegeRequest request,long actor,string trace)
    {
        long collegeId,userId;
        try
        {
        await using(var c=await OpenAsync(trace))
        {
            await CheckOnboardingConflict(c,request,trace);
            _invitations.ValidateConfiguration();
            await using var tx=await c.BeginTransactionAsync();
            var roleId=await c.ExecuteScalarAsync<long?>("SELECT role_id FROM roles WHERE role_code='COLLEGE_ADMIN' AND college_id IS NULL AND status=1 AND deleted_at IS NULL LIMIT 1",transaction:tx);
            if(roleId is null) throw new AccessSetupException("An active global COLLEGE_ADMIN role is required. Configure it before onboarding.");
            await c.ExecuteAsync("""
                INSERT INTO colleges(college_code,college_name,college_type,university_name,email,mobile,address_line1,city,state,pincode,country,status,created_by)
                VALUES(@code,@name,@type,@UniversityName,@email,@Mobile,@AddressLine1,@City,@State,@Pincode,@Country,1,@actor)
                """,new{code=request.CollegeCode.Trim(),name=request.CollegeName.Trim(),type=request.CollegeType,
                request.UniversityName,email=string.IsNullOrWhiteSpace(request.Email)?request.AdminEmail.Trim():request.Email.Trim(),
                request.Mobile,request.AddressLine1,request.City,request.State,request.Pincode,request.Country,actor},tx);
            collegeId=await c.ExecuteScalarAsync<long>("SELECT LAST_INSERT_ID()",transaction:tx);
            userId=await InsertUser(c,tx,request.AdminName,request.AdminEmail,collegeId,actor,request.AdminMobile);
            await AssignRoles(c,tx,userId,[roleId.Value],actor);
            await EnsureMapping(c,tx,userId,collegeId,actor);
            await RegisterInvitation(c,tx,userId,collegeId,request.AdminEmail,trace);
            if(request.Permissions is not null) await SaveModules(c,tx,userId,collegeId,request.Permissions,actor);
            await Audit(c,tx,actor,userId,collegeId,"college_onboarded",trace); await tx.CommitAsync();
        }
        }
        catch(MySqlException ex) when(ex.Number==1062)
        {
            // A concurrent creation can win after the first check. Re-read only;
            // never retry the insert, infer a new association or send email here.
            await using var existing=await OpenAsync(trace);
            await CheckOnboardingConflict(existing,request,trace);
            throw new OnboardingConflictException("ONBOARDING_IDENTITY_CONFLICT","An onboarding identifier is already in use. Review existing colleges and accounts; no invitation was sent.");
        }
        try
        {
            // College, account, role and mapping are committed before SMTP is attempted.
            await _accountSetup.SendSetupLinkAsync(userId, "College Administrator");
        }
        catch(AccountInvitationDeliveryException ex) { ex.AccountCreated=true;throw; }
        catch(Exception ex)
        {
            _logger.LogError("Post-create invitation could not start. CorrelationId={CorrelationId}, UserId={UserId}, ErrorType={ErrorType}, MySqlCode={MySqlCode}", trace,userId,ex.GetType().Name,(ex as MySqlException)?.Number);
            throw new AccountInvitationDeliveryException(new(userId,collegeId,request.AdminEmail.Trim()),"not_started",false){AccountCreated=true};
        }
        return new { collegeId,userId,email=request.AdminEmail.Trim(),profileCompleted=false,
            accountSaved=true,emailStatus="SENT",setupRequired=true,invitationStatus="sent",smtpAccepted=true,smtpAcceptanceStatus="Confirmed",inboxDelivery="Unverified",nextAction="Check the administrator's email." };
    }
    public async Task<object> Invite(InviteUserRequest request,long actor,string trace)
    {
        _invitations.ValidateConfiguration();
        long userId;
        await using(var c=await OpenAsync(trace))
        {
            await using var tx=await c.BeginTransactionAsync();
            if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM colleges WHERE college_id=@id AND status=1 AND deleted_at IS NULL",new{id=request.CollegeId},tx)!=1) throw new ArgumentException("Choose an active college.");
            await ValidateRoles(c,tx,request.CollegeId,request.RoleIds);
            userId=await InsertUser(c,tx,request.FullName,request.Email,request.CollegeId,actor,request.Mobile);
            await AssignRoles(c,tx,userId,request.RoleIds,actor);
            await EnsureMapping(c,tx,userId,request.CollegeId,actor);
            await RegisterInvitation(c,tx,userId,request.CollegeId,request.Email,trace);
            if(request.Permissions is not null) await SaveModules(c,tx,userId,request.CollegeId,request.Permissions,actor);
            await Audit(c,tx,actor,userId,request.CollegeId,"user_invited",trace);await tx.CommitAsync();
        }
        try { await _accountSetup.SendSetupLinkAsync(userId, "College user"); }
        catch(AccountInvitationDeliveryException ex) { ex.AccountCreated=true;throw; }
        catch(Exception ex)
        {
            _logger.LogError("Post-create invitation could not start. CorrelationId={CorrelationId}, UserId={UserId}, ErrorType={ErrorType}, MySqlCode={MySqlCode}", trace,userId,ex.GetType().Name,(ex as MySqlException)?.Number);
            throw new AccountInvitationDeliveryException(new(userId,request.CollegeId,request.Email.Trim()),"not_started",false){AccountCreated=true};
        }
        return new {userId,accountSaved=true,emailStatus="SENT",setupRequired=true,invitationStatus="sent",smtpAccepted=true,smtpAcceptanceStatus="Confirmed",inboxDelivery="Unverified",profileCompleted=false};
    }
    public async Task<object> Resend(long userId,long actor,string trace,bool reset,long? expectedCollegeId=null)
    {
        if(userId<=0 || expectedCollegeId is <=0)
            throw new UserAccountRequestException(400,"INVALID_USER_ID_OR_COLLEGE_ID",
                "Use a positive users.user_id and optional positive collegeId.",userId,expectedCollegeId);
        bool setupRequired;
        long? targetCollege;
        await using(var c=await OpenAsync(trace))
        {
            await using var tx=await c.BeginTransactionAsync();
            // Target always queries users.user_id, never employee_profiles or an
            // employee login identifier. This operation is Super Admin-only.
            var row=await Target(c,tx,userId,actor);
            targetCollege=row.CollegeId;
            if(expectedCollegeId.HasValue && targetCollege!=expectedCollegeId)
                throw new UserAccountRequestException(403,"USER_COLLEGE_SCOPE_MISMATCH",
                    "This account does not belong to the requested college scope.",userId,expectedCollegeId);
            if(row.Status!=1 || string.IsNullOrWhiteSpace(row.Email))
                throw new UserAccountRequestException(409,"USER_NOT_ELIGIBLE_FOR_SETUP_EMAIL",
                    "The account must be active, non-deleted and have a current email address.",userId,targetCollege);
            if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM colleges WHERE college_id=@collegeId AND status=1 AND deleted_at IS NULL",new{collegeId=targetCollege},tx)!=1)
                throw new UserAccountRequestException(409,"COLLEGE_NOT_ACTIVE",
                    "The account's assigned college must be active before a setup email can be sent.",userId,targetCollege);
            if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id WHERE m.user_id=@userId AND m.status=1 AND m.removed_at IS NULL AND cs.status=1 AND cs.college_id=@targetCollege",new{userId,targetCollege},tx)==0)
                throw new UserAccountRequestException(409,"USER_COLLEGE_ASSIGNMENT_UNAVAILABLE","The account has no active mapping to its assigned college. Review its existing access; no association was inferred and no email was sent.",userId,targetCollege);
            setupRequired=row.MustChangePassword;
            if(!reset && !setupRequired)
                throw new UserAccountRequestException(409,"INITIAL_SETUP_ALREADY_COMPLETED",
                    "Initial setup is complete. Use reset-password for a password reset link.",userId,targetCollege);
            _invitations.ValidateConfiguration();
            await Audit(c,tx,actor,userId,targetCollege,setupRequired?"initial_setup_link_requested":"password_reset_requested",trace);
            await tx.CommitAsync();
        }
        _logger.LogInformation("Password link account resolved. CorrelationId={CorrelationId}, Lookup=users.user_id, UserId={UserId}, CollegeId={CollegeId}, InitialSetupRequired={InitialSetupRequired}",
            trace,userId,targetCollege,setupRequired);
        // An existing password hash and Active status do not imply setup is complete.
        // The live must_change_password flag determines the correct invitation type.
        if(setupRequired) await _accountSetup.SendSetupLinkAsync(userId,"College user");
        else await _accountSetup.SendPasswordResetLinkAsync(userId,"College user");
        return new{userId,accountSaved=true,emailStatus="SENT",invitationStatus="sent",smtpAccepted=true,smtpAcceptanceStatus="Confirmed",inboxDelivery="Unverified",
            linkPurpose=setupRequired?"setup":"reset",setupRequired};
    }
    private static async Task<Account> Target(MySqlConnection c,MySqlTransaction tx,long userId,long actor)
    {
        if(userId==actor) throw new ArgumentException("Use self-service profile/password routes for your own account.");
        var row=await c.QuerySingleOrDefaultAsync<Account>("SELECT user_id AS UserId,college_id AS CollegeId,email AS Email,status AS Status,must_change_password AS MustChangePassword FROM users WHERE user_id=@userId AND deleted_at IS NULL FOR UPDATE",new{userId},tx);
        if(row is null) throw new UserAccountRequestException(404,"USER_ACCOUNT_NOT_FOUND",
            "No non-deleted users account exists for this userId. Use data.items[].userId from GET /api/v1/admin/users, not employeeProfileId, collegeId or an employee login identifier.",userId);
        var codes=await c.QueryAsync<string>("SELECT r.role_code FROM roles r JOIN user_roles ur ON ur.role_id=r.role_id WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL",new{userId},tx);
        if(codes.Any(code=>CanonicalRoleCode.Normalize(code)=="SUPER_ADMIN")) throw new ArgumentException("Super Admin accounts cannot be modified through college user management.");
        if(row.CollegeId is null) throw new ArgumentException("Target user requires a college assignment.");return row;
    }
    private sealed class RoleRow { public long Id{get;set;} public string Code{get;set;}=""; }
    private sealed class Account { public long UserId{get;set;} public long? CollegeId{get;set;} public string? Email{get;set;} public int Status{get;set;} public bool MustChangePassword{get;set;} }
}
