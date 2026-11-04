using Dapper;
namespace BTech.UserAccess;
public sealed partial class UserAccessService
{
    public async Task<long[]> AssignedYears(long userId)
    {await using var c=await OpenAsync();return (await c.QueryAsync<long>("SELECT academic_year_id FROM user_academic_year_access WHERE user_id=@userId ORDER BY academic_year_id",new{userId})).ToArray();}
    public async Task<object> RolePermissions(long roleId,long collegeId)
    {
        await using var c=await OpenAsync();return await c.QueryAsync("SELECT module_key AS moduleKey,can_view AS canView,can_create AS canCreate,can_edit AS canEdit,can_delete AS canDelete,can_export AS canExport FROM role_permissions WHERE role_id=@roleId AND college_id=@collegeId",new{roleId,collegeId});
    }
    public async Task SaveRolePermissions(long roleId,ModuleAccessRequest request,long actor,string trace)
    {
        await using var c=await OpenAsync();await using var tx=await c.BeginTransactionAsync();
        await ValidateRoles(c,tx,request.CollegeId,[roleId]);
        if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM colleges WHERE college_id=@id AND status=1 AND deleted_at IS NULL",new{id=request.CollegeId},tx)!=1)throw new ArgumentException("Choose an active college.");
        if(request.Permissions.Count>100 || request.Permissions.Select(p=>p.ModuleKey.ToLowerInvariant()).Distinct().Count()!=request.Permissions.Count)throw new ArgumentException("Provide unique module keys (maximum 100).");
        foreach(var p in request.Permissions)
        {
            if(await c.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM permission_modules WHERE module_key=@key AND status=1",new{key=p.ModuleKey},tx)!=1)throw new ArgumentException("Unknown or inactive module: "+p.ModuleKey);
            await c.ExecuteAsync("""
                INSERT INTO role_permissions(role_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export,created_by)
                VALUES(@roleId,@collegeId,@ModuleKey,@CanView,@CanCreate,@CanEdit,@CanDelete,@CanExport,@actor)
                ON DUPLICATE KEY UPDATE can_view=VALUES(can_view),can_create=VALUES(can_create),can_edit=VALUES(can_edit),can_delete=VALUES(can_delete),can_export=VALUES(can_export),updated_by=@actor
                """,new{roleId,collegeId=request.CollegeId,p.ModuleKey,p.CanView,p.CanCreate,p.CanEdit,p.CanDelete,p.CanExport,actor},tx);
        }
        await Audit(c,tx,actor,null,request.CollegeId,"role_permissions_updated:"+roleId,trace);await tx.CommitAsync();
    }
}
