using System.Data;
using System.Data.Common;
using System.Text.Json;
using BTech.Data;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1.AdditionalModules;

/// <summary>
/// Isolated extension storage for endpoints whose domain-specific persistence contract
/// is not present in this project snapshot. Existing tables/files are not modified.
/// </summary>
public sealed class AdditionalApiStore
{
    private readonly ApplicationDbContext _db;
    public AdditionalApiStore(ApplicationDbContext db) => _db = db;

    private async Task<DbConnection> OpenAsync(CancellationToken ct)
    {
        var c = _db.Database.GetDbConnection();
        if (c.State != ConnectionState.Open) await c.OpenAsync(ct);
        return c;
    }

    private async Task EnsureAsync(DbConnection c, CancellationToken ct)
    {
        await using var cmd = c.CreateCommand();
        cmd.CommandText = """
        CREATE TABLE IF NOT EXISTS cms_supplemental_api_records (
          record_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          resource VARCHAR(80) NOT NULL,
          record_key VARCHAR(200) NULL,
          payload JSON NOT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'Draft',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX ix_cms_supp_resource_key (resource, record_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """;
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static void Param(DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter(); p.ParameterName = name; p.Value = value ?? DBNull.Value; cmd.Parameters.Add(p);
    }
    public async Task<List<object?>> ListAsync(string resource, string? key, CancellationToken ct)
    {
        var c = await OpenAsync(ct); await EnsureAsync(c, ct);
        await using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT record_id, record_key, payload, status, created_at, updated_at FROM cms_supplemental_api_records WHERE resource=@r AND (@k IS NULL OR record_key=@k) ORDER BY record_id DESC";
        Param(cmd,"@r",resource); Param(cmd,"@k",key);
        var list = new List<object?>();
        await using var rd = await cmd.ExecuteReaderAsync(ct);
        while (await rd.ReadAsync(ct))
            list.Add(new { id=Convert.ToInt64(rd.GetValue(0)), key=rd.IsDBNull(1)?null:rd.GetString(1), data=JsonSerializer.Deserialize<JsonElement>(rd.GetString(2)), status=rd.GetString(3), createdAt=rd.GetValue(4), updatedAt=rd.GetValue(5) });
        return list;
    }
    public async Task<object?> GetAsync(string resource, long id, CancellationToken ct)
    {
        var c=await OpenAsync(ct); await EnsureAsync(c,ct);
        await using var cmd=c.CreateCommand(); cmd.CommandText="SELECT record_id, record_key, payload, status, created_at, updated_at FROM cms_supplemental_api_records WHERE resource=@r AND record_id=@id LIMIT 1";
        Param(cmd,"@r",resource); Param(cmd,"@id",id);
        await using var rd=await cmd.ExecuteReaderAsync(ct);
        if(!await rd.ReadAsync(ct)) return null;
        return new { id=Convert.ToInt64(rd.GetValue(0)), key=rd.IsDBNull(1)?null:rd.GetString(1), data=JsonSerializer.Deserialize<JsonElement>(rd.GetString(2)), status=rd.GetString(3), createdAt=rd.GetValue(4), updatedAt=rd.GetValue(5) };
    }
    public async Task<long> SaveAsync(string resource, long? id, string? key, JsonElement payload, string? status, CancellationToken ct)
    {
        var c=await OpenAsync(ct); await EnsureAsync(c,ct);
        await using var cmd=c.CreateCommand();
        if(id.HasValue) {
            cmd.CommandText="UPDATE cms_supplemental_api_records SET record_key=COALESCE(@k,record_key),payload=@p,status=COALESCE(@s,status) WHERE resource=@r AND record_id=@id";
            Param(cmd,"@id",id.Value); Param(cmd,"@k",key); Param(cmd,"@p",payload.GetRawText()); Param(cmd,"@s",status); Param(cmd,"@r",resource);
            var affected=await cmd.ExecuteNonQueryAsync(ct);
            if(Convert.ToInt32(affected)==0) return 0;
            return id.Value;
        }
        cmd.CommandText="INSERT INTO cms_supplemental_api_records(resource,record_key,payload,status) VALUES(@r,@k,@p,@s); SELECT LAST_INSERT_ID();";
        Param(cmd,"@r",resource); Param(cmd,"@k",key); Param(cmd,"@p",payload.GetRawText()); Param(cmd,"@s",status??"Draft");
        return Convert.ToInt64(await cmd.ExecuteScalarAsync(ct));
    }
    public async Task<bool> DeleteAsync(string resource,long id,CancellationToken ct)
    {
        var c=await OpenAsync(ct); await EnsureAsync(c,ct);
        await using var cmd=c.CreateCommand(); cmd.CommandText="DELETE FROM cms_supplemental_api_records WHERE resource=@r AND record_id=@id";
        Param(cmd,"@r",resource); Param(cmd,"@id",id); return Convert.ToInt32(await cmd.ExecuteNonQueryAsync(ct))>0;
    }
    public async Task<int> SetStatusAsync(string resource,long id,string status,CancellationToken ct)
    {
        var c=await OpenAsync(ct); await EnsureAsync(c,ct);
        await using var cmd=c.CreateCommand(); cmd.CommandText="UPDATE cms_supplemental_api_records SET status=@s WHERE resource=@r AND record_id=@id";
        Param(cmd,"@s",status); Param(cmd,"@r",resource); Param(cmd,"@id",id); return Convert.ToInt32(await cmd.ExecuteNonQueryAsync(ct));
    }
}
