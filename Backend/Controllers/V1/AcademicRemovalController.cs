using System.Data;
using BTech.Services;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController,Authorize]
public sealed class AcademicRemovalController(IConfiguration configuration) : ControllerBase
{
    [HttpDelete("api/v1/courses/{id:long}")]
    public Task<IActionResult> Course(long id)=>Remove("courses",id);
    [HttpDelete("api/semester/{id:long}")]
    public Task<IActionResult> Semester(long id)=>Remove("semesters",id);
    private async Task<IActionResult> Remove(string entity,long id)
    {
        if(id<=0)return BadRequest(new{success=false,message="A positive record ID is required."});
        var scope=CollegeDataScope.Resolve(HttpContext);var actor=CollegeDataScope.Actor(HttpContext);var ct=HttpContext.RequestAborted;
        await using var c=new MySqlConnection(configuration.GetConnectionString("DefaultConnection"));
        await c.OpenAsync(ct);await using var tx=await c.BeginTransactionAsync(IsolationLevel.ReadCommitted,ct);
        var ownerSql=entity=="courses"
            ?"SELECT college_id FROM courses WHERE course_id=@id AND deleted_at IS NULL FOR UPDATE"
            :"SELECT c.college_id FROM semesters s JOIN courses c ON c.course_id=s.course_id WHERE s.semester_id=@id AND s.is_archived=0 FOR UPDATE";
        var owner=await c.ExecuteScalarAsync<long?>(new CommandDefinition(ownerSql,new{id},tx,cancellationToken:ct));
        if(owner is null||scope.HasValue&&scope!=owner)return NotFound(new{success=false,message="Record not found."});
        var impact=await c.QuerySingleOrDefaultAsync(new CommandDefinition("sp_cms_dependency_impact",new{p_entity=entity,p_id=id},tx,commandType:CommandType.StoredProcedure,cancellationToken:ct));
        if(impact is not null&&!Convert.ToBoolean(impact.canDeactivate))
            return Conflict(new{success=false,code="ACTIVE_DEPENDENCIES",message="Reassign or deactivate dependent records before removal.",data=impact});
        var update=entity=="courses"
            ?"UPDATE courses SET status=0,deleted_at=UTC_TIMESTAMP(),deleted_by=@actor,updated_by=@actor WHERE course_id=@id AND deleted_at IS NULL"
            :"UPDATE semesters SET status=0,is_archived=1,updated_at=UTC_TIMESTAMP(),updated_by=@actor WHERE semester_id=@id AND is_archived=0";
        await c.ExecuteAsync(new CommandDefinition(update,new{id,actor},tx,cancellationToken:ct));
        await c.ExecuteAsync(new CommandDefinition("INSERT INTO backend_contract_audit(college_id,resource,record_id,action,actor_id,correlation_id) VALUES(@owner,@entity,@id,'SOFT_REMOVED',@actor,@trace)",new{owner,entity,id,actor,trace=HttpContext.TraceIdentifier},tx,cancellationToken:ct));
        await tx.CommitAsync(ct);
        return Ok(new{success=true,message="Record removed from the active directory; history retained.",data=new{id,status=0}});
    }
}
