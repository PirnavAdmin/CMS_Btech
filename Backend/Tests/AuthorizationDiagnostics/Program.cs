using BTech.Services;
using Dapper;
using MySqlConnector;

// Run from Backend on the API host with the SAME environment/configuration as
// the service. Opens a connection and performs bounded read-only probes only.
var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DefaultConnection is missing. Run from Backend with the API service's environment.");
var target = new MySqlConnectionStringBuilder(connectionString);
Console.WriteLine($"Environment={builder.Environment.EnvironmentName}; Server={target.Server}; Port={target.Port}; Database={target.Database}");
try
{
    await using var connection = new MySqlConnection(connectionString);
    await connection.OpenAsync();
    Console.WriteLine("PASS: database connection opened.");
    var names = new[] { "users", "roles", "user_roles", "permission_modules", "role_permissions",
        "colleges", "college_settings", "college_user_mappings", "academicyears", "user_module_permissions",
        "user_academic_year_access", "user_access_audits", "user_access_profiles", "user_access_invitations" };
    var failed = false;
    foreach (var table in names)
    {
        try
        {
            // Names are a fixed internal allowlist. Zero-row probe verifies SELECT
            // access without returning account data or authentication secrets.
            await connection.ExecuteScalarAsync<int?>($"SELECT 1 FROM `{table}` LIMIT 0");
            Console.WriteLine($"PASS: {table} exists and permits SELECT.");
        }
        catch (MySqlException ex)
        {
            failed = true;
            Console.WriteLine($"FAIL: {table}; MySqlCode={ex.Number}; SqlState={ex.SqlState}; Category={AuthorizationDependencyException.ErrorCode(ex.Number)}");
        }
    }
    try
    {
        await connection.ExecuteScalarAsync<int?>("SELECT profile_completed,internal_identifier,academic_year_restricted,access_version,must_change_password FROM users LIMIT 0");
        Console.WriteLine("PASS: account-readiness columns are selectable.");
        var catalogCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM permission_modules WHERE status=1");
        Console.WriteLine($"Active permission catalog rows={catalogCount}");
        if (catalogCount == 0) { failed = true; Console.WriteLine("FAIL: permission catalog is empty/disabled. Restore the intended catalog; do not auto-grant permissions."); }
    }
    catch (MySqlException ex)
    {
        failed = true;
        Console.WriteLine($"FAIL: readiness/catalog probe; MySqlCode={ex.Number}; SqlState={ex.SqlState}; Category={AuthorizationDependencyException.ErrorCode(ex.Number)}");
    }
    Environment.ExitCode = failed ? 1 : 0;
}
catch (MySqlException ex)
{
    Console.WriteLine($"FAIL: database connection; MySqlCode={ex.Number}; SqlState={ex.SqlState}; Category={AuthorizationDependencyException.ErrorCode(ex.Number)}");
    Environment.ExitCode = 1;
}
