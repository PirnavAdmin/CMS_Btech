using Dapper;
using MySqlConnector;

namespace BTech.Services.Invitations;

/// <summary>Read-only prerequisite check against the connection used by this operation.</summary>
public static class UserAccessSchema
{
    public const string Migration = "Database/AdminManagement/User_Access_Invitation_Diagnostics_R10.sql";
    public static readonly IReadOnlyDictionary<string, string[]> Required = new Dictionary<string, string[]>
    {
        ["users"] = ["user_id", "profile_completed", "internal_identifier", "academic_year_restricted", "access_version"],
        ["user_module_permissions"] = ["user_id", "college_id", "module_key", "can_view", "can_create", "can_edit", "can_delete", "can_export", "updated_by"],
        ["user_academic_year_access"] = ["user_id", "college_id", "academic_year_id", "assigned_by"],
        ["user_access_audits"] = ["audit_id", "actor_user_id", "target_user_id", "college_id", "action", "correlation_id", "created_at"],
        ["user_access_profiles"] = ["user_id", "job_title", "address_line1", "city", "state", "postal_code"],
        ["user_access_invitations"] = ["user_id", "college_id", "registered_at", "token_hash", "purpose", "expires_at", "consumed_at", "delivery_status", "created_at", "recipient_email", "delivery_error_code", "smtp_accepted_at", "attempt_count", "last_attempt_at", "correlation_id"]
    };

    public static async Task RequireAsync(MySqlConnection connection, ILogger logger, string trace)
    {
        var rows = await connection.QueryAsync<Column>("""
            SELECT TABLE_NAME AS TableName, COLUMN_NAME AS ColumnName
            FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN @tables
            """, new { tables = Required.Keys.ToArray() });
        var found = rows.Select(x => x.TableName + "." + x.ColumnName).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missing = Required.SelectMany(t => t.Value.Select(c => t.Key + "." + c)).Where(c => !found.Contains(c)).ToArray();
        if (missing.Length == 0) return;
        var target = new MySqlConnectionStringBuilder(connection.ConnectionString);
        logger.LogError("Onboarding schema incomplete. CorrelationId={CorrelationId}, Server={Server}, Port={Port}, Database={Database}, MissingObjects={MissingObjects}, Migration={Migration}",
            trace, target.Server, target.Port, connection.Database, string.Join(",", missing), Migration);
        throw new UserAccessSchemaException();
    }

    private sealed class Column { public string TableName { get; set; } = ""; public string ColumnName { get; set; } = ""; }
}

public sealed class UserAccessSchemaException : Exception
{
    public UserAccessSchemaException() : base("Account setup requires the user-access database patch. Apply User_Access_Invitation_Diagnostics_R10.sql to this API's database, then retry the existing account. Use the correlation ID for server details.") { }
}
