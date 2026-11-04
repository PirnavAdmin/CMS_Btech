using MySqlConnector;

namespace BTech.Services;

/// <summary>Only authorization database operations may create this exception.</summary>
public sealed class AuthorizationDependencyException : Exception
{
    public string Dependency { get; }
    public string Server { get; }
    public string Database { get; }
    public uint Port { get; }
    public int MySqlCode { get; }
    public string? SqlState { get; }
    public string Code { get; }

    public AuthorizationDependencyException(MySqlException inner, string dependency, string connectionString)
        : base(ClientMessage(inner.Number), inner)
    {
        var target = new MySqlConnectionStringBuilder(connectionString);
        Dependency = dependency;
        Server = target.Server;
        Database = target.Database;
        Port = target.Port;
        MySqlCode = inner.Number;
        SqlState = inner.SqlState;
        Code = ErrorCode(inner.Number);
    }

    public static string ErrorCode(int number) => number switch
    {
        1146 or 1054 or 1267 or 1271 => "AUTHORIZATION_SCHEMA_INVALID",
        1045 or 1044 or 1142 or 1143 or 1227 => "AUTHORIZATION_DATABASE_ACCESS_DENIED",
        1049 => "AUTHORIZATION_DATABASE_NOT_FOUND",
        _ => "AUTHORIZATION_DATABASE_UNAVAILABLE"
    };

    private static string ClientMessage(int number) => number switch
    {
        1146 or 1054 => "Authorization schema is incomplete. Verify User_Access_Onboarding_Migration.sql is applied to the database used by this API. Use the correlation ID to find the missing table or column in server logs.",
        1267 or 1271 => "Authorization schema has incompatible collations. Use the correlation ID to inspect the failing query in server logs.",
        1045 or 1044 or 1142 or 1143 or 1227 => "The API database account cannot read required authorization data. Check its credentials and database grants using the correlation ID in server logs.",
        1049 => "The configured authorization database does not exist. Verify the running API's DefaultConnection database name.",
        _ => "Authorization data is temporarily unavailable. Check the API database connection and server logs using the correlation ID."
    };
}
