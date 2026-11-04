using Dapper;
using MySqlConnector;

namespace BTech.Services.Invitations;

public sealed class MySqlAccountInvitationStore(IConfiguration config, ILogger<MySqlAccountInvitationStore>? logger=null) : IAccountInvitationStore
{
    private async Task<MySqlConnection> Open(string trace)
    {
        var c=new MySqlConnection(config.GetConnectionString("DefaultConnection"));
        try { await c.OpenAsync();await UserAccessSchema.RequireAsync(c,logger??Microsoft.Extensions.Logging.Abstractions.NullLogger<MySqlAccountInvitationStore>.Instance,trace);return c; } catch { await c.DisposeAsync();throw; }
    }
    private static Task Audit(MySqlConnection c,MySqlTransaction tx,long? actor,long target,long? college,string action,string trace)=>
        c.ExecuteAsync("INSERT INTO user_access_audits(actor_user_id,target_user_id,college_id,action,correlation_id) VALUES(@actor,@target,@college,@action,@trace)",new{actor,target,college,action,trace},tx);

    public async Task<InvitationAccount> ReserveAsync(long userId,string hash,string purpose,DateTime now,DateTime expiresAt,long? actor,string trace)
    {
        await using var c=await Open(trace);await using var tx=await c.BeginTransactionAsync();
        var user=await c.QuerySingleOrDefaultAsync<Account>("SELECT user_id AS UserId,college_id AS CollegeId,email AS Email,full_name AS FullName,status AS Status,must_change_password AS MustChangePassword FROM users WHERE user_id=@userId AND deleted_at IS NULL FOR UPDATE",new{userId},tx);
        if(user is null||user.Status!=1||string.IsNullOrWhiteSpace(user.Email))
            throw new InvalidOperationException("Setup email requires an active, non-deleted account with a saved email address.");
        if(purpose=="setup"&&!user.MustChangePassword)
            throw new InvalidOperationException("Password setup is already complete; use password-reset instead.");
        if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL AND (r.college_id IS NULL OR r.college_id=@collegeId)",new{userId,collegeId=user.CollegeId},tx)==0)
            throw new InvalidOperationException("Setup email requires an active role assignment.");
        var collegeName=await c.QuerySingleOrDefaultAsync<string>("SELECT college_name FROM colleges WHERE college_id=@college AND status=1 AND deleted_at IS NULL",new{college=user.CollegeId},tx);
        if(user.CollegeId.HasValue && collegeName is null) throw new InvalidOperationException("The assigned college is inactive or unavailable.");
        if(user.CollegeId.HasValue && await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id WHERE m.user_id=@userId AND m.status=1 AND m.removed_at IS NULL AND cs.status=1 AND cs.college_id=@collegeId",new{userId,collegeId=user.CollegeId},tx)==0)
            throw new InvalidOperationException("The account no longer has an active mapping to its saved college.");
        var roleNames=await c.QueryAsync<string>("SELECT r.role_name FROM roles r JOIN user_roles ur ON ur.role_id=r.role_id WHERE ur.user_id=@userId AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL",new{userId},tx);
        var recent=await c.QuerySingleOrDefaultAsync<Reservation>("SELECT delivery_status AS Status,created_at AS CreatedAt FROM user_access_invitations WHERE user_id=@userId",new{userId},tx);
        var retryAfter=recent is null || recent.Status=="pending" ? 0 : InvitationPolicy.RetryAfter(recent.CreatedAt,recent.Status,now);
        if(retryAfter>0)
            throw new BTech.UserAccess.UserAccountRequestException(429,"INVITATION_RATE_LIMITED","An invitation was recently attempted or is sending. Wait for Retry-After before retrying.",userId,user.CollegeId){RetryAfterSeconds=retryAfter};
        await c.ExecuteAsync("""
            INSERT INTO user_access_invitations(user_id,college_id,registered_at,token_hash,purpose,recipient_email,expires_at,delivery_status,created_at,attempt_count,last_attempt_at,correlation_id)
            VALUES(@userId,@collegeId,@now,@hash,@purpose,@email,@expiresAt,'sending',@now,1,@now,@trace)
            ON DUPLICATE KEY UPDATE token_hash=VALUES(token_hash),purpose=VALUES(purpose),recipient_email=VALUES(recipient_email),
              college_id=VALUES(college_id),
              expires_at=VALUES(expires_at),delivery_status='sending',created_at=VALUES(created_at),
              consumed_at=NULL,delivery_error_code=NULL,smtp_accepted_at=NULL,attempt_count=attempt_count+1,last_attempt_at=@now,correlation_id=@trace
            """,new{userId,collegeId=user.CollegeId,hash,purpose,email=user.Email,expiresAt,now,trace},tx);
        // Invalidate legacy ACCOUNT_SETUP links whenever issuing a new invitation.
        await c.ExecuteAsync("UPDATE otp_verifications SET status=0 WHERE user_id=@userId AND otp_type='ACCOUNT_SETUP' AND status=1",new{userId},tx);
        await Audit(c,tx,actor,userId,user.CollegeId,purpose=="reset"?"password_reset_email_prepared":"setup_email_prepared",trace);
        await tx.CommitAsync();return new(userId,user.CollegeId,user.Email,user.FullName,collegeName??"",string.Join(", ",roleNames));
    }
    public async Task<bool> FinishDeliveryAsync(InvitationAccount account,string hash,bool accepted,string? errorCode,DateTime now,long? actor,string trace)
    {
        await using var c=await Open(trace);await using var tx=await c.BeginTransactionAsync();
        var changed=accepted
            ? await c.ExecuteAsync("""
                UPDATE user_access_invitations i JOIN users u ON u.user_id=i.user_id
                SET i.delivery_status='sent',i.smtp_accepted_at=@now,i.delivery_error_code=NULL
                WHERE i.user_id=@id AND i.token_hash=@hash AND i.delivery_status='sending' AND i.consumed_at IS NULL
                  AND i.expires_at>@now AND u.status=1 AND u.deleted_at IS NULL
                  AND (u.college_id <=> @collegeId) AND (i.college_id <=> @collegeId)
                  AND BINARY u.email=BINARY @email AND BINARY i.recipient_email=BINARY @email
                """,new{id=account.UserId,collegeId=account.CollegeId,hash,now,email=account.Email},tx)
            : await c.ExecuteAsync("""
                UPDATE user_access_invitations SET delivery_status='failed',delivery_error_code=@errorCode,
                  expires_at=@now,consumed_at=@now
                WHERE user_id=@id AND token_hash=@hash AND consumed_at IS NULL
                """,new{id=account.UserId,hash,now,errorCode},tx);
        if(changed>0)await Audit(c,tx,actor,account.UserId,account.CollegeId,accepted?"setup_email_smtp_accepted":"setup_email_failed",trace);
        await tx.CommitAsync();return changed==1;
    }
    public async Task<(bool Success,string Message)> RedeemAsync(string email,string hash,string password,DateTime now,string trace)
    {
        await using var c=await Open(trace);await using var tx=await c.BeginTransactionAsync();
        var user=await c.QuerySingleOrDefaultAsync<Account>("SELECT user_id AS UserId,college_id AS CollegeId,email AS Email,full_name AS FullName,status AS Status,must_change_password AS MustChangePassword FROM users WHERE email=@email AND deleted_at IS NULL FOR UPDATE",new{email},tx);
        if(user is null||user.Status!=1)return(false,"Setup link is invalid or expired.");
        var invitation=await c.QuerySingleOrDefaultAsync<string>("""
            SELECT purpose FROM user_access_invitations WHERE user_id=@id AND token_hash=@hash
              AND delivery_status='sent' AND consumed_at IS NULL AND expires_at>@now
              AND BINARY recipient_email=BINARY @email
              AND (college_id IS NULL OR college_id <=> @collegeId) FOR UPDATE
            """,new{id=user.UserId,collegeId=user.CollegeId,hash,now,email},tx);
        if(invitation is null||(invitation=="setup"&&!user.MustChangePassword))return(false,"Setup link is invalid, expired, undelivered or already used.");
        if(user.CollegeId.HasValue && await c.ExecuteScalarAsync<int>("""
            SELECT COUNT(*) FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
            JOIN colleges c ON c.college_id=cs.college_id
            WHERE m.user_id=@id AND cs.college_id=@collegeId AND m.status=1 AND m.removed_at IS NULL
              AND cs.status=1 AND c.status=1 AND c.deleted_at IS NULL
            """,new{id=user.UserId,collegeId=user.CollegeId},tx)==0)
            return(false,"Setup link is unavailable for this account's current college association.");
        if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id WHERE ur.user_id=@id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL AND (r.college_id IS NULL OR r.college_id=@collegeId)",new{id=user.UserId,collegeId=user.CollegeId},tx)==0)
            return(false,"Setup link is unavailable for this account's current role assignments.");
        var changed=await c.ExecuteAsync("""
            UPDATE user_access_invitations SET consumed_at=@now WHERE user_id=@id AND token_hash=@hash
              AND delivery_status='sent' AND consumed_at IS NULL AND expires_at>@now
            """,new{id=user.UserId,hash,now},tx);
        if(changed!=1)return(false,"Setup link is no longer valid.");
        await c.ExecuteAsync("UPDATE users SET password_hash=@passwordHash,must_change_password=0,access_version=access_version+1,updated_by=@id WHERE user_id=@id",new{passwordHash=BCrypt.Net.BCrypt.HashPassword(password,12),id=user.UserId},tx);
        await c.ExecuteAsync("UPDATE refresh_tokens SET revoked_at=@now WHERE user_id=@id AND revoked_at IS NULL",new{now,id=user.UserId},tx);
        await Audit(c,tx,user.UserId,user.UserId,user.CollegeId,"password_setup_completed",trace);await tx.CommitAsync();
        return(true,"Password set successfully. Sign in using your email.");
    }
    private sealed class Account
    {
        public long UserId{get;set;}public long? CollegeId{get;set;}public string Email{get;set;}="";
        public string FullName{get;set;}="";public int Status{get;set;}public bool MustChangePassword{get;set;}
    }
    private sealed class Reservation {public string Status{get;set;}="";public DateTime CreatedAt{get;set;}}
}
