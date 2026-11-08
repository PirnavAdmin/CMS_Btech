using System.Data;
using System.Data.Common;
using System.Text.Json;
using System.Text.Json.Nodes;
using BTech.Data;
using BTech.Services;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1.AdditionalModules;

// Schema is installed by the separate SQL script, never by an API request.
public sealed class AdditionalApiStore(ApplicationDbContext db)
{
    public HttpContext Context { private get; set; } = null!;
    private async Task<DbConnection> OpenAsync(CancellationToken ct)
    {
        var c = db.Database.GetDbConnection();
        if (c.State != ConnectionState.Open) await c.OpenAsync(ct);
        return c;
    }
    private long? Scope => CollegeDataScope.Resolve(Context);
    private static object Present(dynamic row) => new { id=(long)row.record_id, key=(string?)row.record_key,
        collegeId=(long)row.college_id, data=JsonSerializer.Deserialize<JsonElement>((string)row.payload),
        status=(string)row.status, createdAt=row.created_at, updatedAt=row.updated_at };
    public async Task<List<object?>> ListAsync(string resource, string? key, CancellationToken ct)
    {
        var c=await OpenAsync(ct);var scope=Scope;
        long? year=null;
        if(Context.Request.Query.TryGetValue("academicYearId",out var raw)) {
            if(!long.TryParse(raw,out var value)||value<=0)throw new ArgumentException("academicYearId must be positive.");year=value;
        }
        var rows=await c.QueryAsync(new CommandDefinition("""
            SELECT * FROM cms_supplemental_api_records
            WHERE resource=@resource AND (@key IS NULL OR record_key=@key) AND deleted_at IS NULL
              AND college_id IS NOT NULL AND (@scope IS NULL OR college_id=@scope)
              AND (@year IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(payload,'$.academicYearId'))=CAST(@year AS CHAR))
            ORDER BY record_id DESC
            """,new{resource,key,scope,year},cancellationToken:ct));
        return rows.Select(x=>(object?)Present(x)).ToList();
    }
    public async Task<object?> GetAsync(string resource,long id,CancellationToken ct)
    {
        var c=await OpenAsync(ct);var scope=Scope;
        var row=await c.QuerySingleOrDefaultAsync(new CommandDefinition("""
            SELECT * FROM cms_supplemental_api_records WHERE resource=@resource AND record_id=@id
            AND deleted_at IS NULL AND college_id IS NOT NULL AND (@scope IS NULL OR college_id=@scope)
            """,new{resource,id,scope},cancellationToken:ct));
        return row is null?null:Present(row);
    }
    private async Task Audit(DbConnection c,DbTransaction tx,string resource,long id,long college,string action,CancellationToken ct)
    {
        await c.ExecuteAsync(new CommandDefinition("""
            INSERT INTO backend_contract_audit(college_id,resource,record_id,action,actor_id,correlation_id)
            VALUES(@college,@resource,@id,@action,@actor,@trace)
            """,new{college,resource,id,action,actor=CollegeDataScope.Actor(Context),trace=Context.TraceIdentifier},tx,cancellationToken:ct));
    }
    public async Task<long> SaveAsync(string resource,long? id,string? key,JsonElement payload,string? status,CancellationToken ct)
    {
        var creating=!id.HasValue;
        var data=JsonNode.Parse(payload.GetRawText())!.AsObject();
        long? supplied=null;
        if(payload.TryGetProperty("collegeId",out var value)&&value.ValueKind!=JsonValueKind.Null) {
            if(!long.TryParse(value.ToString(),out var number)||number<=0)throw new ArgumentException("collegeId must be positive.");supplied=number;
        }
        var scope=CollegeDataScope.Resolve(Context,supplied,required:!id.HasValue);
        var c=await OpenAsync(ct);await using var tx=await c.BeginTransactionAsync(ct);
        if(id.HasValue) {
            var old=await c.QuerySingleOrDefaultAsync(new CommandDefinition("""
                SELECT college_id FROM cms_supplemental_api_records
                WHERE resource=@resource AND record_id=@id AND deleted_at IS NULL AND college_id IS NOT NULL
                  AND (@scope IS NULL OR college_id=@scope) FOR UPDATE
                """,new{resource,id,scope},tx,cancellationToken:ct));
            if(old is null)return 0;
            var oldCollege=(long)old.college_id;
            if(supplied.HasValue&&supplied!=oldCollege)throw new ContractException(409,"COLLEGE_IMMUTABLE","A record cannot be transferred to another college.");
            scope=oldCollege;
        }
        data["collegeId"]=scope!.Value;
        if(status is null&&payload.TryGetProperty("status",out var ps)&&ps.ValueKind==JsonValueKind.String)status=ps.GetString();
        var actor=CollegeDataScope.Actor(Context);var serialized=data.ToJsonString();
        if(id.HasValue)await c.ExecuteAsync(new CommandDefinition("""
            UPDATE cms_supplemental_api_records SET payload=@serialized,status=COALESCE(@status,status),
              record_key=COALESCE(@key,record_key),updated_by=@actor
            WHERE record_id=@id AND resource=@resource AND college_id=@scope AND deleted_at IS NULL
            """,new{serialized,status,key,actor,id,resource,scope},tx,cancellationToken:ct));
        else id=await c.ExecuteScalarAsync<long>(new CommandDefinition("""
            INSERT INTO cms_supplemental_api_records(resource,record_key,college_id,payload,status,created_by,updated_by)
            VALUES(@resource,@key,@scope,@serialized,COALESCE(@status,'Draft'),@actor,@actor); SELECT LAST_INSERT_ID();
            """,new{resource,key,scope,serialized,status,actor},tx,cancellationToken:ct));
        await Audit(c,tx,resource,id.Value,scope.Value,creating?"CREATED":"UPDATED",ct);
        await tx.CommitAsync(ct);return id.Value;
    }
    public async Task<bool> DeleteAsync(string resource,long id,CancellationToken ct)
    {
        var c=await OpenAsync(ct);var scope=Scope;await using var tx=await c.BeginTransactionAsync(ct);
        var college=await c.ExecuteScalarAsync<long?>(new CommandDefinition("""
            SELECT college_id FROM cms_supplemental_api_records WHERE resource=@resource AND record_id=@id
              AND deleted_at IS NULL AND college_id IS NOT NULL AND (@scope IS NULL OR college_id=@scope) FOR UPDATE
            """,new{resource,id,scope},tx,cancellationToken:ct));
        if(!college.HasValue)return false;
        await c.ExecuteAsync(new CommandDefinition("UPDATE cms_supplemental_api_records SET deleted_at=UTC_TIMESTAMP(),updated_by=@actor WHERE record_id=@id",new{id,actor=CollegeDataScope.Actor(Context)},tx,cancellationToken:ct));
        await Audit(c,tx,resource,id,college.Value,"DELETED",ct);await tx.CommitAsync(ct);return true;
    }
    public async Task<int> SetStatusAsync(string resource,long id,string status,CancellationToken ct)
    {
        // Workflows must use a domain service with valid transitions and side effects.
        await Task.CompletedTask;
        throw CollegeDataScope.NotImplemented(resource+" status change");
    }
}
