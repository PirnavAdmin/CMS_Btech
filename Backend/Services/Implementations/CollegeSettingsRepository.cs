using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace BTech.Repositories.Implementations;

public class CollegeSettingsRepository
    : ICollegeSettingsRepository
{
    private readonly ApplicationDbContext _context;

    public CollegeSettingsRepository(
        ApplicationDbContext context)
    {
        _context = context;
    }

    // =====================================================
    // GET ALL
    // SP: sp_college_settings_get_all
    // =====================================================

    public async Task<List<CollegeSetting>> GetAllAsync()
    {
        var result = new List<CollegeSetting>();

        var connection =
            _context.Database.GetDbConnection();

        await using var command =
            connection.CreateCommand();

        command.CommandText =
            "sp_college_settings_get_all";

        command.CommandType =
            CommandType.StoredProcedure;

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        await using var reader =
            await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            result.Add(MapSetting(reader));
        }

        return result;
    }

    // =====================================================
    // GET BY SETTINGS ID
    // SP: sp_college_settings_get_by_id
    // =====================================================

    public async Task<CollegeSetting?> GetByIdAsync(
        long id)
    {
        var connection =
            _context.Database.GetDbConnection();

        await using var command =
            connection.CreateCommand();

        command.CommandText =
            "sp_college_settings_get_by_id";

        command.CommandType =
            CommandType.StoredProcedure;

        AddParameter(
            command,
            "p_college_setting_id",
            id);

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapSetting(reader);
    }

    // =====================================================
    // GET BY MASTER COLLEGE ID
    // SP: sp_college_settings_get_by_college
    // =====================================================

    public async Task<CollegeSetting?> GetByCollegeIdAsync(
        long collegeId)
    {
        var connection =
            _context.Database.GetDbConnection();

        await using var command =
            connection.CreateCommand();

        command.CommandText =
            "sp_college_settings_get_by_college";

        command.CommandType =
            CommandType.StoredProcedure;

        // Correct parameter:
        // This is colleges.college_id, not college_setting_id.
        AddParameter(
            command,
            "p_college_id",
            collegeId);

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return null;
        }

        return MapSetting(reader);
    }

    // =====================================================
    // CREATE
    // SP: sp_college_settings_create
    // =====================================================

    public async Task<CollegeSetting> CreateAsync(
        CollegeSetting setting)
    {
        var connection =
            _context.Database.GetDbConnection();

        await using var command =
            connection.CreateCommand();

        command.CommandText =
            "sp_college_settings_create";

        command.CommandType =
            CommandType.StoredProcedure;

        // College name and code are obtained from the colleges
        // master by the stored procedure.
        AddParameter(
            command,
            "p_college_id",
            setting.CollegeId);

        AddParameter(
            command,
            "p_college_email",
            setting.CollegeEmail);

        AddParameter(
            command,
            "p_phone_number",
            setting.PhoneNumber);

        AddParameter(
            command,
            "p_website",
            setting.Website);

        AddParameter(
            command,
            "p_address_line1",
            setting.AddressLine1);

        AddParameter(
            command,
            "p_address_line2",
            setting.AddressLine2);

        AddParameter(
            command,
            "p_city",
            setting.City);

        AddParameter(
            command,
            "p_state",
            setting.State);

        AddParameter(
            command,
            "p_pincode",
            setting.Pincode);

        AddParameter(
            command,
            "p_academic_year",
            setting.AcademicYear);

        AddParameter(
            command,
            "p_semester",
            setting.Semester);

        AddParameter(
            command,
            "p_institution_type",
            setting.InstitutionType);

        AddParameter(
            command,
            "p_date_format",
            setting.DateFormat);

        AddParameter(
            command,
            "p_time_zone",
            setting.TimeZone);

        AddParameter(
            command,
            "p_status",
            setting.Status);

        AddParameter(
            command,
            "p_created_by",
            setting.CreatedBy);

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            throw new InvalidOperationException(
                "College settings could not be created.");
        }

        return MapSetting(reader);
    }

    // =====================================================
    // UPDATE
    // SP: sp_college_settings_update
    // =====================================================

    public async Task<CollegeSetting> UpdateAsync(
        CollegeSetting setting)
    {
        var connection =
            _context.Database.GetDbConnection();

        await using var command =
            connection.CreateCommand();

        command.CommandText =
            "sp_college_settings_update";

        command.CommandType =
            CommandType.StoredProcedure;

        AddParameter(
            command,
            "p_college_setting_id",
            setting.Id);

        // Correct master college foreign key
        AddParameter(
            command,
            "p_college_id",
            setting.CollegeId);

        AddParameter(
            command,
            "p_college_email",
            setting.CollegeEmail);

        AddParameter(
            command,
            "p_phone_number",
            setting.PhoneNumber);

        AddParameter(
            command,
            "p_website",
            setting.Website);

        AddParameter(
            command,
            "p_address_line1",
            setting.AddressLine1);

        AddParameter(
            command,
            "p_address_line2",
            setting.AddressLine2);

        AddParameter(
            command,
            "p_city",
            setting.City);

        AddParameter(
            command,
            "p_state",
            setting.State);

        AddParameter(
            command,
            "p_pincode",
            setting.Pincode);

        AddParameter(
            command,
            "p_academic_year",
            setting.AcademicYear);

        AddParameter(
            command,
            "p_semester",
            setting.Semester);

        AddParameter(
            command,
            "p_institution_type",
            setting.InstitutionType);

        AddParameter(
            command,
            "p_date_format",
            setting.DateFormat);

        AddParameter(
            command,
            "p_time_zone",
            setting.TimeZone);

        AddParameter(
            command,
            "p_status",
            setting.Status);

        AddParameter(
            command,
            "p_updated_by",
            setting.UpdatedBy);

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            throw new InvalidOperationException(
                "College settings could not be updated.");
        }

        return MapSetting(reader);
    }

    // =====================================================
    // DEACTIVATE
    // =====================================================

    public async Task<bool> DeactivateAsync(
        long collegeSettingId,
        long? updatedBy)
    {
        var connection =
            _context.Database.GetDbConnection();

        await using var command =
            connection.CreateCommand();

        command.CommandText =
            """
            UPDATE college_settings
            SET
                status = 0,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = @updated_by
            WHERE college_setting_id = @college_setting_id
            """;

        command.CommandType =
            CommandType.Text;

        AddParameter(
            command,
            "@college_setting_id",
            collegeSettingId);

        AddParameter(
            command,
            "@updated_by",
            updatedBy);

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        var affected =
            await command.ExecuteNonQueryAsync();

        return affected > 0;
    }

    // =====================================================
    // PARAMETER HELPER
    // =====================================================

    private static void AddParameter(
        DbCommand command,
        string name,
        object? value)
    {
        var parameter =
            command.CreateParameter();

        parameter.ParameterName = name;

        parameter.Value =
            value ?? DBNull.Value;

        command.Parameters.Add(parameter);
    }

    // =====================================================
    // DATABASE RESULT TO MODEL
    // =====================================================

    private static CollegeSetting MapSetting(
        DbDataReader reader)
    {
        return new CollegeSetting
        {
            Id =
                GetLong(
                    reader,
                    "CollegeSettingId"),

            // Master colleges.college_id
            CollegeId =
                GetLong(
                    reader,
                    "CollegeId"),

            CollegeName =
                GetString(
                    reader,
                    "CollegeName"),

            CollegeCode =
                GetString(
                    reader,
                    "CollegeCode"),

            CollegeEmail =
                GetNullableString(
                    reader,
                    "CollegeEmail"),

            PhoneNumber =
                GetNullableString(
                    reader,
                    "PhoneNumber"),

            Website =
                GetNullableString(
                    reader,
                    "Website"),

            AddressLine1 =
                GetNullableString(
                    reader,
                    "AddressLine1"),

            AddressLine2 =
                GetNullableString(
                    reader,
                    "AddressLine2"),

            City =
                GetNullableString(
                    reader,
                    "City"),

            State =
                GetNullableString(
                    reader,
                    "State"),

            Pincode =
                GetNullableString(
                    reader,
                    "Pincode"),

            AcademicYear =
                GetNullableString(
                    reader,
                    "AcademicYear"),

            Semester =
                GetNullableString(
                    reader,
                    "Semester"),

            InstitutionType =
                GetNullableString(
                    reader,
                    "InstitutionType"),

            DateFormat =
                GetNullableString(
                    reader,
                    "DateFormat"),

            TimeZone =
                GetNullableString(
                    reader,
                    "TimeZone"),

            Status =
                GetByte(
                    reader,
                    "Status"),

            CreatedAt =
                GetDateTime(
                    reader,
                    "CreatedAt"),

            CreatedBy =
                GetNullableLong(
                    reader,
                    "CreatedBy"),

            UpdatedAt =
                GetNullableDateTime(
                    reader,
                    "UpdatedAt"),

            UpdatedBy =
                GetNullableLong(
                    reader,
                    "UpdatedBy")
        };
    }

    // =====================================================
    // READER HELPERS
    // =====================================================

    private static object GetValue(
        DbDataReader reader,
        string column)
    {
        return reader[column];
    }

    private static long GetLong(
        DbDataReader reader,
        string column)
    {
        var value =
            GetValue(reader, column);

        return value == DBNull.Value
            ? 0
            : Convert.ToInt64(value);
    }

    private static long? GetNullableLong(
        DbDataReader reader,
        string column)
    {
        var value =
            GetValue(reader, column);

        return value == DBNull.Value
            ? null
            : Convert.ToInt64(value);
    }

    private static byte GetByte(
        DbDataReader reader,
        string column)
    {
        var value =
            GetValue(reader, column);

        return value == DBNull.Value
            ? (byte)0
            : Convert.ToByte(value);
    }

    private static string GetString(
        DbDataReader reader,
        string column)
    {
        var value =
            GetValue(reader, column);

        return value == DBNull.Value
            ? string.Empty
            : Convert.ToString(value)
              ?? string.Empty;
    }

    private static string? GetNullableString(
        DbDataReader reader,
        string column)
    {
        var value =
            GetValue(reader, column);

        return value == DBNull.Value
            ? null
            : Convert.ToString(value);
    }

    private static DateTime GetDateTime(
        DbDataReader reader,
        string column)
    {
        var value =
            GetValue(reader, column);

        return value == DBNull.Value
            ? DateTime.MinValue
            : Convert.ToDateTime(value);
    }

    private static DateTime? GetNullableDateTime(
        DbDataReader reader,
        string column)
    {
        var value =
            GetValue(reader, column);

        return value == DBNull.Value
            ? null
            : Convert.ToDateTime(value);
    }
}