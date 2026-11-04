using Dapper;
using MySqlConnector;
namespace BTech.UserAccess;

public sealed partial class UserAccessService
{
    public async Task Update(long userId,UpdateAccessUserRequest request,long actor,string trace)
    {
        await using var c=await OpenAsync(trace);await using var tx=await c.BeginTransactionAsync();var row=await Target(c,tx,userId,actor);
        if(request.CollegeId.HasValue && request.CollegeId!=row.CollegeId)
            throw new UserAccountRequestException(409,"USER_COLLEGE_SCOPE_MISMATCH","Edit this user within the assigned college. College transfers require an explicit access review.",userId,request.CollegeId);
        await ValidateRoles(c,tx,row.CollegeId!.Value,request.RoleIds);
        await c.ExecuteAsync("UPDATE users SET full_name=@name,email=COALESCE(@email,email),mobile=COALESCE(@mobile,mobile),updated_by=@actor,access_version=access_version+1 WHERE user_id=@userId",new{name=request.FullName.Trim(),email=request.Email?.Trim(),mobile=string.IsNullOrWhiteSpace(request.Mobile)?null:request.Mobile.Trim(),actor,userId},tx);
        // A link sent to the previous address must never be redeemable after an email edit.
        if(request.Email is not null && !string.Equals(row.Email,request.Email.Trim(),StringComparison.Ordinal))
            await c.ExecuteAsync("UPDATE user_access_invitations SET consumed_at=UTC_TIMESTAMP(),delivery_status='failed',delivery_error_code='ACCOUNT_EMAIL_CHANGED' WHERE user_id=@userId AND consumed_at IS NULL",new{userId},tx);
        await AssignRoles(c,tx,userId,request.RoleIds,actor);
        await EnsureMapping(c,tx,userId,row.CollegeId.Value,actor);
        if(request.Permissions is not null) await SaveModules(c,tx,userId,row.CollegeId.Value,request.Permissions,actor);
        await Audit(c,tx,actor,userId,row.CollegeId,"user_updated",trace);await tx.CommitAsync();
    }
    public async Task Status(long userId,int status,long actor,string trace)
    {
        await using var c=await OpenAsync(trace);await using var tx=await c.BeginTransactionAsync();var row=await Target(c,tx,userId,actor);
        await c.ExecuteAsync("UPDATE users SET status=@status,updated_by=@actor WHERE user_id=@userId",new{status,actor,userId},tx);
        if(status==0)
        {
            await c.ExecuteAsync("UPDATE users SET access_version=access_version+1 WHERE user_id=@userId",new{userId},tx);
            await c.ExecuteAsync("UPDATE refresh_tokens SET revoked_at=UTC_TIMESTAMP() WHERE user_id=@userId AND revoked_at IS NULL",new{userId},tx);
            await c.ExecuteAsync("UPDATE user_access_invitations SET consumed_at=UTC_TIMESTAMP() WHERE user_id=@userId AND consumed_at IS NULL",new{userId},tx);
        }
        await Audit(c,tx,actor,userId,row.CollegeId,status==1?"user_activated":"user_deactivated",trace);await tx.CommitAsync();
    }
    public async Task Modules(long userId,ModuleAccessRequest request,long actor,string trace)
    {
        await using var c=await OpenAsync(trace);await using var tx=await c.BeginTransactionAsync();var row=await Target(c,tx,userId,actor);
        if(row.CollegeId!=request.CollegeId) throw new ArgumentException("User permissions must use the assigned college.");
        await SaveModules(c,tx,userId,request.CollegeId,request.Permissions,actor);
        await Audit(c,tx,actor,userId,row.CollegeId,"user_module_permissions_replaced",trace);await tx.CommitAsync();
    }
    private static async Task SaveModules(MySqlConnection c,MySqlTransaction tx,long userId,long collegeId,List<ModuleGrant> permissions,long actor)
    {
        if(permissions.Count>100 || permissions.Any(p=>string.IsNullOrWhiteSpace(p.ModuleKey) || p.ModuleKey.Length>80) || permissions.Select(p=>p.ModuleKey.ToLowerInvariant()).Distinct().Count()!=permissions.Count) throw new ArgumentException("Provide unique module keys (maximum 100).");
        foreach(var permission in permissions)
            if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM permission_modules WHERE module_key=@key AND status=1",new{key=permission.ModuleKey},tx)!=1) throw new ArgumentException("Unknown or inactive module: "+permission.ModuleKey);
        await c.ExecuteAsync("DELETE FROM user_module_permissions WHERE user_id=@userId AND college_id=@collegeId",new{userId,collegeId},tx);
        foreach(var p in permissions) await c.ExecuteAsync("""
            INSERT INTO user_module_permissions(user_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export,updated_by)
            VALUES(@userId,@collegeId,@ModuleKey,@CanView,@CanCreate,@CanEdit,@CanDelete,@CanExport,@actor)
            """,new{userId,collegeId,p.ModuleKey,p.CanView,p.CanCreate,p.CanEdit,p.CanDelete,p.CanExport,actor},tx);
    }
    public async Task Years(long userId,YearAccessRequest request,long actor,string trace)
    {
        await using var c=await OpenAsync(trace);await using var tx=await c.BeginTransactionAsync();var row=await Target(c,tx,userId,actor);
        if(request.AcademicYearIds.Length>100 || request.AcademicYearIds.Any(id=>id<=0) || request.AcademicYearIds.Distinct().Count()!=request.AcademicYearIds.Length) throw new ArgumentException("Provide unique positive academic year IDs (maximum 100).");
        if(request.Restricted == false && request.AcademicYearIds.Length>0) throw new ArgumentException("Unrestricted access must have an empty academicYearIds list.");
        foreach(var id in request.AcademicYearIds)
            if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM academicyears WHERE academic_year_id=@id AND college_id=@collegeId AND deleted_at IS NULL",new{id,collegeId=row.CollegeId},tx)!=1) throw new ArgumentException("Academic year does not belong to the user's college.");
        await c.ExecuteAsync("DELETE FROM user_academic_year_access WHERE user_id=@userId",new{userId},tx);
        foreach(var id in request.AcademicYearIds) await c.ExecuteAsync("INSERT INTO user_academic_year_access(user_id,college_id,academic_year_id,assigned_by) VALUES(@userId,@collegeId,@id,@actor)",new{userId,collegeId=row.CollegeId,id,actor},tx);
        await c.ExecuteAsync("UPDATE users SET academic_year_restricted=@restricted,updated_by=@actor WHERE user_id=@userId",new{restricted=request.Restricted,actor,userId},tx);
        await Audit(c,tx,actor,userId,row.CollegeId,"academic_year_access_replaced",trace);await tx.CommitAsync();
    }
    public async Task<object> GetAccess(long userId)
    {
        await using var c=await OpenAsync();
        var user=await c.QuerySingleOrDefaultAsync("SELECT user_id AS userId,college_id AS collegeId,profile_completed AS profileCompleted,must_change_password AS setupRequired,academic_year_restricted AS academicYearRestricted FROM users WHERE user_id=@userId AND deleted_at IS NULL",new{userId});
        if(user is null) throw new KeyNotFoundException("User not found.");
        var permissions=await c.QueryAsync("SELECT college_id AS collegeId,module_key AS moduleKey,can_view AS canView,can_create AS canCreate,can_edit AS canEdit,can_delete AS canDelete,can_export AS canExport FROM user_module_permissions WHERE user_id=@userId",new{userId});
        var years=await c.QueryAsync<long>("SELECT academic_year_id FROM user_academic_year_access WHERE user_id=@userId ORDER BY academic_year_id",new{userId});
        var invitation=await c.QuerySingleOrDefaultAsync("SELECT delivery_status AS deliveryStatus,delivery_error_code AS deliveryErrorCode,smtp_accepted_at AS smtpAcceptedAt,attempt_count AS attemptCount,last_attempt_at AS lastAttemptAt,correlation_id AS correlationId,created_at AS createdAt,expires_at AS expiresAt,consumed_at AS consumedAt FROM user_access_invitations WHERE user_id=@userId",new{userId});
        return new{user,permissions,academicYearIds=years,invitation};
    }
    public async Task<object> Audits(long userId,int pageNumber,int pageSize)
    {
        if(pageNumber<1 || pageSize<1 || pageSize>200) throw new ArgumentException("Use a positive pageNumber and pageSize between 1 and 200.");
        await using var c=await OpenAsync();return await c.QueryAsync("""
            SELECT audit_id AS auditId,actor_user_id AS actorUserId,target_user_id AS targetUserId,
              college_id AS collegeId,action,correlation_id AS correlationId,created_at AS createdAt
            FROM user_access_audits WHERE target_user_id=@userId ORDER BY audit_id DESC LIMIT @pageSize OFFSET @offset
            """,new{userId,pageSize,offset=((long)pageNumber-1)*pageSize});
    }
    public async Task<byte[]> Export(long actor,string trace)
    {
        await using var c=await OpenAsync(trace);await using var tx=await c.BeginTransactionAsync();
        var rows=await c.QueryAsync<ExportRow>("SELECT user_id AS UserId,college_id AS CollegeId,full_name AS FullName,email AS Email,status AS Status FROM users WHERE deleted_at IS NULL ORDER BY user_id LIMIT 10000",transaction:tx);
        static string Cell(string? value)
        {
            value??="";if(value.TrimStart().Length>0 && "=+-@".Contains(value.TrimStart()[0])) value="'"+value;
            return "\""+value.Replace("\"","\"\"")+"\"";
        }
        var csv="User ID,College ID,Name,Email,Status\r\n"+string.Join("\r\n",rows.Select(x=>$"{x.UserId},{x.CollegeId},{Cell(x.FullName)},{Cell(x.Email)},{x.Status}"));
        await Audit(c,tx,actor,null,null,"users_exported",trace);await tx.CommitAsync();return System.Text.Encoding.UTF8.GetBytes(csv);
    }
    private sealed class ExportRow { public long UserId{get;set;} public long? CollegeId{get;set;} public string? FullName{get;set;} public string? Email{get;set;} public int Status{get;set;} }
}
