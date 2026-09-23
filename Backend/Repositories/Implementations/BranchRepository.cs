using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace BTech.Repositories.Implementations
{
    public class BranchRepository : IBranchRepository
    {
        private readonly ApplicationDbContext _context;

        public BranchRepository(
            ApplicationDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // CREATE
        // SP: sp_branch_create
        // =====================================================

        public async Task<Branch?> AddAsync(
            Branch entity)
        {
            var connection =
                _context.Database.GetDbConnection();

            await using var command =
                connection.CreateCommand();

            command.CommandText =
                "sp_branch_create";

            command.CommandType =
                CommandType.StoredProcedure;

            AddParameter(
                command,
                "p_course_id",
                entity.CourseId);

            AddParameter(
                command,
                "p_branch_code",
                entity.BranchCode);

            AddParameter(
                command,
                "p_branch_name",
                entity.BranchName);

            AddParameter(
                command,
                "p_short_name",
                entity.ShortName);

            AddParameter(
                command,
                "p_specialization",
                entity.Specialization);

            AddParameter(
                command,
                "p_department_id",
                entity.DepartmentId);

            AddParameter(
                command,
                "p_branch_type",
                entity.BranchType);

            AddParameter(
                command,
                "p_duration",
                entity.Duration);

            AddParameter(
                command,
                "p_total_semesters",
                entity.TotalSemesters);

            AddParameter(
                command,
                "p_intake_capacity",
                entity.IntakeCapacity);

            AddParameter(
                command,
                "p_starting_academic_year_id",
                entity.StartingAcademicYearId);

            AddParameter(
                command,
                "p_description",
                entity.Description);

            AddParameter(
                command,
                "p_status",
                entity.Status);

            AddParameter(
                command,
                "p_created_by",
                entity.CreatedBy);

            if (connection.State !=
                ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return null;
            }

            return MapBranch(reader);
        }


        // =====================================================
        // GET ALL
        // SP: sp_branch_get_all
        // =====================================================

        public async Task<IEnumerable<Branch>>
            GetAllAsync()
        {
            var branches =
                new List<Branch>();

            var connection =
                _context.Database.GetDbConnection();

            await using var command =
                connection.CreateCommand();

            command.CommandText =
                "sp_branch_get_all";

            command.CommandType =
                CommandType.StoredProcedure;

            if (connection.State !=
                ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader =
                await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                branches.Add(
                    MapBranch(reader));
            }

            return branches;
        }


        // =====================================================
        // GET BY ID
        // SP: sp_branch_get_by_id
        // =====================================================

        public async Task<Branch?>
            GetByIdAsync(
                long branchId)
        {
            var connection =
                _context.Database.GetDbConnection();

            await using var command =
                connection.CreateCommand();

            command.CommandText =
                "sp_branch_get_by_id";

            command.CommandType =
                CommandType.StoredProcedure;

            AddParameter(
                command,
                "p_branch_id",
                branchId);

            if (connection.State !=
                ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return null;
            }

            return MapBranch(reader);
        }


        // =====================================================
        // GET BY COURSE ID
        // SP: sp_branch_get_by_course
        // =====================================================

        public async Task<IEnumerable<Branch>>
            GetByCourseIdAsync(
                long courseId)
        {
            var branches =
                new List<Branch>();

            var connection =
                _context.Database.GetDbConnection();

            await using var command =
                connection.CreateCommand();

            command.CommandText =
                "sp_branch_get_by_course";

            command.CommandType =
                CommandType.StoredProcedure;

            AddParameter(
                command,
                "p_course_id",
                courseId);

            if (connection.State !=
                ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader =
                await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                branches.Add(
                    MapBranch(reader));
            }

            return branches;
        }


        // =====================================================
        // UPDATE
        // SP: sp_branch_update
        // =====================================================

        public async Task<Branch?>
            UpdateAsync(
                Branch entity)
        {
            var connection =
                _context.Database.GetDbConnection();

            await using var command =
                connection.CreateCommand();

            command.CommandText =
                "sp_branch_update";

            command.CommandType =
                CommandType.StoredProcedure;

            AddParameter(
                command,
                "p_branch_id",
                entity.BranchId);

            AddParameter(
                command,
                "p_course_id",
                entity.CourseId);

            AddParameter(
                command,
                "p_branch_code",
                entity.BranchCode);

            AddParameter(
                command,
                "p_branch_name",
                entity.BranchName);

            AddParameter(
                command,
                "p_short_name",
                entity.ShortName);

            AddParameter(
                command,
                "p_specialization",
                entity.Specialization);

            AddParameter(
                command,
                "p_department_id",
                entity.DepartmentId);

            AddParameter(
                command,
                "p_branch_type",
                entity.BranchType);

            AddParameter(
                command,
                "p_duration",
                entity.Duration);

            AddParameter(
                command,
                "p_total_semesters",
                entity.TotalSemesters);

            AddParameter(
                command,
                "p_intake_capacity",
                entity.IntakeCapacity);

            AddParameter(
                command,
                "p_starting_academic_year_id",
                entity.StartingAcademicYearId);

            AddParameter(
                command,
                "p_description",
                entity.Description);

            AddParameter(
                command,
                "p_status",
                entity.Status);

            AddParameter(
                command,
                "p_updated_by",
                entity.UpdatedBy);

            if (connection.State !=
                ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return null;
            }

            return MapBranch(reader);
        }


        // =====================================================
        // DELETE / DEACTIVATE
        // SP: sp_branch_delete
        // =====================================================

        public async Task<bool>
            DeleteAsync(
                long branchId,
                long? userId)
        {
            var connection =
                _context.Database.GetDbConnection();

            await using var command =
                connection.CreateCommand();

            command.CommandText =
                "sp_branch_delete";

            command.CommandType =
                CommandType.StoredProcedure;

            AddParameter(
                command,
                "p_branch_id",
                branchId);

            AddParameter(
                command,
                "p_deleted_by",
                userId);

            if (connection.State !=
                ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return false;
            }

            var value = reader["AffectedRows"];
            return value != DBNull.Value && Convert.ToInt32(value) > 0;
        }


        // =====================================================
        // ADD PARAMETER
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

            command.Parameters.Add(parameter);
        }


        // =====================================================
        // MAP DATABASE RESULT → BRANCH
        // =====================================================

        private static Branch
            MapBranch(
                DbDataReader reader)
        {
            return new Branch
            {
                BranchId =
                    GetLong(
                        reader,
                        "branch_id",
                        "BranchId"),

                CourseId =
                    GetLong(
                        reader,
                        "course_id",
                        "CourseId"),

                // ---------------------------------------------
                // COURSE INFORMATION
                // ---------------------------------------------

                Course =
                    new Course
                    {
                        CourseCode =
                            GetString(
                                reader,
                                "course_code",
                                "CourseCode"),

                        CourseName =
                            GetString(
                                reader,
                                "course_name",
                                "CourseName")
                    },

                // ---------------------------------------------
                // BRANCH INFORMATION
                // ---------------------------------------------

                BranchCode =
                    GetString(
                        reader,
                        "branch_code",
                        "BranchCode"),

                BranchName =
                    GetString(
                        reader,
                        "branch_name",
                        "BranchName"),

                ShortName =
                    GetNullableString(
                        reader,
                        "short_name",
                        "ShortName"),

                Specialization =
                    GetNullableString(
                        reader,
                        "specialization",
                        "Specialization"),

                // ---------------------------------------------
                // DEPARTMENT
                // ---------------------------------------------

                DepartmentId =
                    GetNullableLong(
                        reader,
                        "department_id",
                        "DepartmentId"),

                Department =
                    new Department
                    {
                        DepartmentName =
                            GetString(
                                reader,
                                "department_name",
                                "DepartmentName")
                    },

                // ---------------------------------------------
                // OTHER BRANCH DETAILS
                // ---------------------------------------------

                BranchType =
                    GetNullableString(
                        reader,
                        "branch_type",
                        "BranchType"),

                Duration =
                    GetNullableInt(
                        reader,
                        "duration",
                        "Duration"),

                TotalSemesters =
                    GetNullableInt(
                        reader,
                        "total_semesters",
                        "TotalSemesters"),

                IntakeCapacity =
                    GetNullableInt(
                        reader,
                        "intake_capacity",
                        "IntakeCapacity"),

                StartingAcademicYearId =
                    GetNullableLong(
                        reader,
                        "starting_academic_year_id",
                        "StartingAcademicYearId"),

                Description =
                    GetNullableString(
                        reader,
                        "description",
                        "Description"),

                Status =
                    GetByte(
                        reader,
                        "status",
                        "Status"),

                CreatedAt =
                    GetDateTime(
                        reader,
                        "created_at",
                        "CreatedAt"),

                CreatedBy =
                    GetNullableLong(
                        reader,
                        "created_by",
                        "CreatedBy"),

                UpdatedAt =
                    GetNullableDateTime(
                        reader,
                        "updated_at",
                        "UpdatedAt"),

                UpdatedBy =
                    GetNullableLong(
                        reader,
                        "updated_by",
                        "UpdatedBy"),

                DeletedAt =
                    GetNullableDateTime(
                        reader,
                        "deleted_at",
                        "DeletedAt"),

                DeletedBy =
                    GetNullableLong(
                        reader,
                        "deleted_by",
                        "DeletedBy")
            };
        }


        // =====================================================
        // GET VALUE
        // Supports both snake_case and PascalCase
        // =====================================================

        private static object
            GetValue(
                DbDataReader reader,
                string column1,
                string column2)
        {
            try
            {
                return reader[column1];
            }
            catch (IndexOutOfRangeException)
            {
                return reader[column2];
            }
        }


        // =====================================================
        // LONG
        // =====================================================

        private static long
            GetLong(
                DbDataReader reader,
                string column1,
                string column2)
        {
            var value =
                GetValue(
                    reader,
                    column1,
                    column2);

            return value == DBNull.Value
                ? 0
                : Convert.ToInt64(value);
        }


        // =====================================================
        // NULLABLE LONG
        // =====================================================

        private static long?
            GetNullableLong(
                DbDataReader reader,
                string column1,
                string column2)
        {
            var value =
                GetValue(
                    reader,
                    column1,
                    column2);

            return value == DBNull.Value
                ? null
                : Convert.ToInt64(value);
        }


        // =====================================================
        // NULLABLE INT
        // =====================================================

        private static int?
            GetNullableInt(
                DbDataReader reader,
                string column1,
                string column2)
        {
            var value =
                GetValue(
                    reader,
                    column1,
                    column2);

            return value == DBNull.Value
                ? null
                : Convert.ToInt32(value);
        }


        // =====================================================
        // BYTE
        // =====================================================

        private static byte
            GetByte(
                DbDataReader reader,
                string column1,
                string column2)
        {
            var value =
                GetValue(
                    reader,
                    column1,
                    column2);

            return value == DBNull.Value
                ? (byte)0
                : Convert.ToByte(value);
        }


        // =====================================================
        // STRING
        // =====================================================

        private static string
            GetString(
                DbDataReader reader,
                string column1,
                string column2)
        {
            var value =
                GetValue(
                    reader,
                    column1,
                    column2);

            return value == DBNull.Value
                ? string.Empty
                : Convert.ToString(value)
                    ?? string.Empty;
        }


        // =====================================================
        // NULLABLE STRING
        // =====================================================

        private static string?
            GetNullableString(
                DbDataReader reader,
                string column1,
                string column2)
        {
            var value =
                GetValue(
                    reader,
                    column1,
                    column2);

            return value == DBNull.Value
                ? null
                : Convert.ToString(value);
        }


        // =====================================================
        // DATETIME
        // =====================================================

        private static DateTime
            GetDateTime(
                DbDataReader reader,
                string column1,
                string column2)
        {
            var value =
                GetValue(
                    reader,
                    column1,
                    column2);

            return value == DBNull.Value
                ? DateTime.MinValue
                : Convert.ToDateTime(value);
        }


        // =====================================================
        // NULLABLE DATETIME
        // =====================================================

        private static DateTime?
            GetNullableDateTime(
                DbDataReader reader,
                string column1,
                string column2)
        {
            var value =
                GetValue(
                    reader,
                    column1,
                    column2);

            return value == DBNull.Value
                ? null
                : Convert.ToDateTime(value);
        }
    }
}
