using System.Data;
using System.Data.Common;
using BTech.Data;
using BTech.DTOs.College;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories.Implementations
{
    /// <summary>
    /// All College database operations use MySQL stored procedures.
    /// </summary>
    public class CollegeRepository : ICollegeRepository
    {
        private readonly ApplicationDbContext _context;

        public CollegeRepository(
            ApplicationDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // GET BY ID
        // =====================================================

        public Task<College?> GetByIdAsync(
            long collegeId)
        {
            return ExecuteSingleAsync(
                "sp_College_GetById",
                ("p_college_id", collegeId));
        }

        // =====================================================
        // GET BY CODE
        // =====================================================

        public Task<College?> GetByCodeAsync(
            string collegeCode)
        {
            return ExecuteSingleAsync(
                "sp_College_GetByCode",
                ("p_college_code", collegeCode));
        }

        // =====================================================
        // GET ALL
        // =====================================================

        public async Task<IEnumerable<College>> GetAllAsync(
            string? search = null,
            sbyte? status = null)
        {
            var items =
                new List<College>();

            await WithCommandAsync(
                "sp_College_GetAll",
                async command =>
                {
                    AddParameter(
                        command,
                        "p_search",
                        search);

                    AddParameter(
                        command,
                        "p_status",
                        status);

                    await using var reader =
                        await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        items.Add(
                            MapCollege(reader));
                    }
                });

            return items;
        }

        // =====================================================
        // SEARCH
        // =====================================================

        public async Task<(
            IEnumerable<College> Items,
            int TotalCount)> SearchAsync(
                CollegeSearchFilterDto filter)
        {
            var items =
                new List<College>();

            var totalCount = 0;

            await WithCommandAsync(
                "sp_College_Search",
                async command =>
                {
                    AddParameter(
                        command,
                        "p_query",
                        filter.Query);

                    AddParameter(
                        command,
                        "p_college_type",
                        filter.CollegeType);

                    AddParameter(
                        command,
                        "p_university_name",
                        filter.UniversityName);

                    AddParameter(
                        command,
                        "p_city",
                        filter.City);

                    AddParameter(
                        command,
                        "p_state",
                        filter.State);

                    AddParameter(
                        command,
                        "p_status",
                        filter.Status);

                    AddParameter(
                        command,
                        "p_page_number",
                        filter.PageNumber);

                    AddParameter(
                        command,
                        "p_page_size",
                        filter.PageSize);

                    AddParameter(
                        command,
                        "p_sort_by",
                        filter.SortBy);

                    AddParameter(
                        command,
                        "p_sort_direction",
                        filter.SortDirection);

                    await using var reader =
                        await command.ExecuteReaderAsync();

                    while (await reader.ReadAsync())
                    {
                        items.Add(
                            MapCollege(reader));
                    }

                    if (await reader.NextResultAsync() &&
                        await reader.ReadAsync())
                    {
                        totalCount =
                            Convert.ToInt32(
                                reader["total_count"]);
                    }
                });

            return (
                items,
                totalCount);
        }

        // =====================================================
        // CREATE
        // =====================================================

        public async Task<College> AddAsync(
            College college)
        {
            var created =
                await ExecuteSingleAsync(
                    "sp_College_Create",
                    CollegeParameters(
                        college,
                        false));

            return created ??
                throw new InvalidOperationException(
                    "College could not be created.");
        }

        // =====================================================
        // UPDATE
        // =====================================================

        public async Task UpdateAsync(
            College college)
        {
            var updated =
                await ExecuteSingleAsync(
                    "sp_College_Update",
                    CollegeParameters(
                        college,
                        true));

            if (updated == null)
            {
                throw new InvalidOperationException(
                    $"College with ID {college.CollegeId} was not found.");
            }

            CopyValues(
                updated,
                college);
        }

        // =====================================================
        // UPDATE STATUS
        // =====================================================

        public Task<College?> UpdateStatusAsync(
            long collegeId,
            sbyte status,
            long? updatedBy)
        {
            return ExecuteSingleAsync(
                "sp_College_UpdateStatus",
                ("p_college_id", collegeId),
                ("p_status", status),
                ("p_updated_by", updatedBy));
        }

        // =====================================================
        // SOFT DELETE
        // SP: sp_College_Delete
        // =====================================================

        public async Task<bool> DeleteAsync(
            long collegeId,
            long? deletedBy)
        {
            var deleted = false;

            await WithCommandAsync(
                "sp_College_Delete",
                async command =>
                {
                    AddParameter(
                        command,
                        "p_college_id",
                        collegeId);

                    AddParameter(
                        command,
                        "p_deleted_by",
                        deletedBy);

                    var result =
                        await command.ExecuteScalarAsync();

                    deleted =
                        result != null &&
                        result != DBNull.Value &&
                        Convert.ToInt32(result) == 1;
                });

            return deleted;
        }

        // =====================================================
        // CHECK COLLEGE CODE
        // =====================================================

        public async Task<bool> ExistsCodeAsync(
            string collegeCode,
            long? excludeId = null)
        {
            var exists = false;

            await WithCommandAsync(
                "sp_College_CodeExists",
                async command =>
                {
                    AddParameter(
                        command,
                        "p_college_code",
                        collegeCode);

                    AddParameter(
                        command,
                        "p_exclude_id",
                        excludeId);

                    var value =
                        await command.ExecuteScalarAsync();

                    exists =
                        value != null &&
                        value != DBNull.Value &&
                        Convert.ToInt32(value) == 1;
                });

            return exists;
        }

        // =====================================================
        // EXECUTE PROCEDURE RETURNING ONE COLLEGE
        // =====================================================

        private async Task<College?> ExecuteSingleAsync(
            string procedure,
            params (
                string Name,
                object? Value)[] parameters)
        {
            College? result = null;

            await WithCommandAsync(
                procedure,
                async command =>
                {
                    foreach (var parameter in parameters)
                    {
                        AddParameter(
                            command,
                            parameter.Name,
                            parameter.Value);
                    }

                    await using var reader =
                        await command.ExecuteReaderAsync();

                    if (await reader.ReadAsync())
                    {
                        result =
                            MapCollege(reader);
                    }
                });

            return result;
        }

        // =====================================================
        // COMMAND HELPER
        // =====================================================

        private async Task WithCommandAsync(
            string procedure,
            Func<DbCommand, Task> action)
        {
            var connection =
                _context.Database.GetDbConnection();

            var shouldClose =
                connection.State !=
                ConnectionState.Open;

            if (shouldClose)
            {
                await connection.OpenAsync();
            }

            try
            {
                await using var command =
                    connection.CreateCommand();

                command.CommandText =
                    procedure;

                command.CommandType =
                    CommandType.StoredProcedure;

                await action(command);
            }
            finally
            {
                if (shouldClose)
                {
                    await connection.CloseAsync();
                }
            }
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

            parameter.ParameterName =
                name;

            parameter.Value =
                value ?? DBNull.Value;

            command.Parameters.Add(
                parameter);
        }

        // =====================================================
        // COLLEGE CREATE/UPDATE PARAMETERS
        // =====================================================

        private static (
            string Name,
            object? Value)[] CollegeParameters(
                College college,
                bool includeId)
        {
            var values =
                new List<(string, object?)>();

            if (includeId)
            {
                values.Add(
                    (
                        "p_college_id",
                        college.CollegeId
                    ));
            }

            values.AddRange(
                new (string, object?)[]
                {
                    (
                        "p_college_code",
                        college.CollegeCode
                    ),
                    (
                        "p_college_name",
                        college.CollegeName
                    ),
                    (
                        "p_college_type",
                        college.CollegeType
                    ),
                    (
                        "p_university_name",
                        college.UniversityName
                    ),
                    (
                        "p_email",
                        college.Email
                    ),
                    (
                        "p_mobile",
                        college.Mobile
                    ),
                    (
                        "p_phone",
                        college.Phone
                    ),
                    (
                        "p_principal",
                        college.Principal
                    ),
                    (
                        "p_principal_email",
                        college.PrincipalEmail
                    ),
                    (
                        "p_principal_contact",
                        college.PrincipalContact
                    ),
                    (
                        "p_alternate_contact_number",
                        college.AlternateContactNumber
                    ),
                    (
                        "p_accreditation_status",
                        college.AccreditationStatus
                    ),
                    (
                        "p_accreditation_body",
                        college.AccreditationBody
                    ),
                    (
                        "p_accreditation_grade",
                        college.AccreditationGrade
                    ),
                    (
                        "p_accreditation_number",
                        college.AccreditationNumber
                    ),
                    (
                        "p_valid_from",
                        college.ValidFrom
                    ),
                    (
                        "p_valid_until",
                        college.ValidUntil
                    ),
                    (
                        "p_address_line1",
                        college.AddressLine1
                    ),
                    (
                        "p_address_line2",
                        college.AddressLine2
                    ),
                    (
                        "p_city",
                        college.City
                    ),
                    (
                        "p_area",
                        college.Area
                    ),
                    (
                        "p_district",
                        college.District
                    ),
                    (
                        "p_state",
                        college.State
                    ),
                    (
                        "p_country",
                        college.Country
                    ),
                    (
                        "p_pincode",
                        college.Pincode
                    ),
                    (
                        "p_website",
                        college.Website
                    ),
                    (
                        "p_academic_year_id",
                        college.AcademicYearId
                    ),
                    (
                        "p_timezone",
                        college.Timezone
                    ),
                    (
                        "p_currency_code",
                        college.CurrencyCode
                    ),
                    (
                        "p_logo_path",
                        college.LogoPath
                    ),
                    (
                        "p_status",
                        college.Status
                    ),
                    (
                        includeId
                            ? "p_updated_by"
                            : "p_created_by",

                        includeId
                            ? college.UpdatedBy
                            : college.CreatedBy
                    )
                });

            return values.ToArray();
        }

        // =====================================================
        // DATABASE RESULT TO COLLEGE MODEL
        // =====================================================

        private static College MapCollege(
            DbDataReader reader)
        {
            return new College
            {
                CollegeId =
                    reader.GetInt64(
                        reader.GetOrdinal(
                            "college_id")),

                CollegeCode =
                    reader.GetString(
                        reader.GetOrdinal(
                            "college_code")),

                CollegeName =
                    reader.GetString(
                        reader.GetOrdinal(
                            "college_name")),

                CollegeType =
                    GetString(
                        reader,
                        "college_type"),

                UniversityName =
                    GetString(
                        reader,
                        "university_name"),

                Email =
                    GetString(
                        reader,
                        "email"),

                Mobile =
                    GetString(
                        reader,
                        "mobile"),

                Phone =
                    GetString(
                        reader,
                        "phone"),

                Principal =
                    GetString(
                        reader,
                        "principal"),

                PrincipalEmail =
                    GetString(
                        reader,
                        "principal_email"),

                PrincipalContact =
                    GetString(
                        reader,
                        "principal_contact"),

                AlternateContactNumber =
                    GetString(
                        reader,
                        "alternate_contact_number"),

                AccreditationStatus =
                    GetString(
                        reader,
                        "accreditation_status"),

                AccreditationBody =
                    GetString(
                        reader,
                        "accreditation_body"),

                AccreditationGrade =
                    GetString(
                        reader,
                        "accreditation_grade"),

                AccreditationNumber =
                    GetString(
                        reader,
                        "accreditation_number"),

                ValidFrom =
                    GetDateOnly(
                        reader,
                        "valid_from"),

                ValidUntil =
                    GetDateOnly(
                        reader,
                        "valid_until"),

                AddressLine1 =
                    GetString(
                        reader,
                        "address_line1"),

                AddressLine2 =
                    GetString(
                        reader,
                        "address_line2"),

                City =
                    GetString(
                        reader,
                        "city"),

                Area =
                    GetString(
                        reader,
                        "area"),

                District =
                    GetString(
                        reader,
                        "district"),

                State =
                    GetString(
                        reader,
                        "state"),

                Country =
                    GetString(
                        reader,
                        "country"),

                Pincode =
                    GetString(
                        reader,
                        "pincode"),

                Website =
                    GetString(
                        reader,
                        "website"),

                AcademicYearId =
                    GetInt64(
                        reader,
                        "academic_year_id"),

                Timezone =
                    GetString(
                        reader,
                        "timezone")
                    ?? "Asia/Kolkata",

                CurrencyCode =
                    GetString(
                        reader,
                        "currency_code")
                    ?? "INR",

                LogoPath =
                    GetString(
                        reader,
                        "logo_path"),

                Status =
                    Convert.ToSByte(
                        reader["status"]),

                CreatedAt =
                    reader.GetDateTime(
                        reader.GetOrdinal(
                            "created_at")),

                CreatedBy =
                    GetInt64(
                        reader,
                        "created_by"),

                UpdatedAt =
                    GetDateTime(
                        reader,
                        "updated_at"),

                UpdatedBy =
                    GetInt64(
                        reader,
                        "updated_by"),

                DeletedAt =
                    GetDateTime(
                        reader,
                        "deleted_at"),

                DeletedBy =
                    GetInt64(
                        reader,
                        "deleted_by")
            };
        }

        private static string? GetString(
            DbDataReader reader,
            string name)
        {
            return reader.IsDBNull(
                reader.GetOrdinal(name))
                ? null
                : reader.GetString(
                    reader.GetOrdinal(name));
        }

        private static long? GetInt64(
            DbDataReader reader,
            string name)
        {
            return reader.IsDBNull(
                reader.GetOrdinal(name))
                ? null
                : reader.GetInt64(
                    reader.GetOrdinal(name));
        }

        private static DateTime? GetDateTime(
            DbDataReader reader,
            string name)
        {
            return reader.IsDBNull(
                reader.GetOrdinal(name))
                ? null
                : reader.GetDateTime(
                    reader.GetOrdinal(name));
        }

        private static DateOnly? GetDateOnly(
            DbDataReader reader,
            string name)
        {
            var ordinal =
                reader.GetOrdinal(name);

            return reader.IsDBNull(ordinal)
                ? null
                : DateOnly.FromDateTime(
                    reader.GetDateTime(ordinal));
        }

        private static void CopyValues(
            College source,
            College target)
        {
            foreach (
                var property in typeof(College)
                    .GetProperties()
                    .Where(property =>
                        property.CanRead &&
                        property.CanWrite))
            {
                property.SetValue(
                    target,
                    property.GetValue(source));
            }
        }
    }
}
