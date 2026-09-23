using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace BTech.Repositories.Implementations
{
    public class CourseStructureRepository : ICourseStructureRepository
    {
        private readonly ApplicationDbContext _context;

        public CourseStructureRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // ============================================================
        // ADD
        // SP: sp_create_course_structure
        // ============================================================

        public async Task<CourseStructure?> AddAsync(
            CourseStructure entity)
        {
            var connection = _context.Database.GetDbConnection();

            await using var command = connection.CreateCommand();

            command.CommandText = "sp_create_course_structure";
            command.CommandType = CommandType.StoredProcedure;

            AddParameter(command, "p_course_id", entity.CourseId);
            AddParameter(command, "p_branch_id", entity.BranchId);
            AddParameter(command, "p_year_number", entity.YearNumber);
            AddParameter(command, "p_semester_number", entity.SemesterNumber);
            AddParameter(command, "p_semester_name", entity.SemesterName);
            AddParameter(command, "p_status", entity.Status);
            AddParameter(command, "p_created_by", entity.CreatedBy);

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

            return MapCourseStructure(reader);
        }


        // ============================================================
        // GET ALL
        // SP: sp_get_course_structures
        // ============================================================

        public async Task<IEnumerable<CourseStructure>> GetAllAsync()
        {
            var result = new List<CourseStructure>();

            var connection = _context.Database.GetDbConnection();

            await using var command = connection.CreateCommand();

            command.CommandText = "sp_get_course_structures";
            command.CommandType = CommandType.StoredProcedure;

            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader =
                await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                result.Add(
                    MapCourseStructure(reader));
            }

            return result;
        }


        // ============================================================
        // GET BY COURSE ID
        // Uses: sp_get_course_structures
        // ============================================================

        public async Task<IEnumerable<CourseStructure>>
            GetByCourseIdAsync(long courseId)
        {
            var result =
                await GetAllAsync();

            return result
                .Where(x => x.CourseId == courseId)
                .OrderBy(x => x.BranchId)
                .ThenBy(x => x.YearNumber)
                .ThenBy(x => x.SemesterNumber)
                .ToList();
        }


        // ============================================================
        // GET BY ID
        // SP: sp_get_course_structure_by_id
        // ============================================================

        public async Task<CourseStructure?> GetByIdAsync(
            long structureId)
        {
            var connection = _context.Database.GetDbConnection();

            await using var command = connection.CreateCommand();

            command.CommandText =
                "sp_get_course_structure_by_id";

            command.CommandType =
                CommandType.StoredProcedure;

            AddParameter(
                command,
                "p_structure_id",
                structureId);

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

            return MapCourseStructure(reader);
        }


        // ============================================================
        // UPDATE
        // SP: sp_update_course_structure
        // ============================================================

        public async Task<CourseStructure?> UpdateAsync(
            CourseStructure entity)
        {
            var connection = _context.Database.GetDbConnection();

            await using var command = connection.CreateCommand();

            command.CommandText =
                "sp_update_course_structure";

            command.CommandType =
                CommandType.StoredProcedure;

            AddParameter(
                command,
                "p_structure_id",
                entity.StructureId);

            AddParameter(
                command,
                "p_course_id",
                entity.CourseId);

            AddParameter(
                command,
                "p_branch_id",
                entity.BranchId);

            AddParameter(
                command,
                "p_year_number",
                entity.YearNumber);

            AddParameter(
                command,
                "p_semester_number",
                entity.SemesterNumber);

            AddParameter(
                command,
                "p_semester_name",
                entity.SemesterName);

            AddParameter(
                command,
                "p_status",
                entity.Status);

            AddParameter(
                command,
                "p_updated_by",
                entity.UpdatedBy);

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

            return MapCourseStructure(reader);
        }


        // ============================================================
        // DELETE
        // SP: sp_delete_course_structure
        // ============================================================

        public async Task<bool> DeleteAsync(
            long structureId,
            long? userId)
        {
            var connection = _context.Database.GetDbConnection();

            await using var command = connection.CreateCommand();

            command.CommandText =
                "sp_delete_course_structure";

            command.CommandType =
                CommandType.StoredProcedure;

            AddParameter(
                command,
                "p_structure_id",
                structureId);

            AddParameter(
                command,
                "p_deleted_by",
                userId);

            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return false;
            }

            var affectedRows =
                Convert.ToInt32(
                    reader["AffectedRows"]);

            return affectedRows > 0;
        }


        // ============================================================
        // ADD PARAMETER
        // ============================================================

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


        // ============================================================
        // MAP COURSE STRUCTURE
        // ============================================================

        private static CourseStructure MapCourseStructure(
            DbDataReader reader)
        {
            var courseStructure =
                new CourseStructure
                {
                    StructureId =
                        GetLong(
                            reader,
                            "StructureId"),

                    CourseId =
                        GetLong(
                            reader,
                            "CourseId"),

                    BranchId =
                        GetNullableLong(
                            reader,
                            "BranchId"),

                    YearNumber =
                        GetInt(
                            reader,
                            "YearNumber"),

                    SemesterNumber =
                        GetInt(
                            reader,
                            "SemesterNumber"),

                    SemesterName =
                        GetNullableString(
                            reader,
                            "SemesterName"),

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


            // ========================================================
            // COURSE NAVIGATION OBJECT
            // ========================================================

            var courseCode =
                GetNullableString(
                    reader,
                    "CourseCode");

            var courseName =
                GetNullableString(
                    reader,
                    "CourseName");

            if (!string.IsNullOrWhiteSpace(courseCode) ||
                !string.IsNullOrWhiteSpace(courseName))
            {
                courseStructure.Course =
                    new Course
                    {
                        CourseId =
                            courseStructure.CourseId,

                        CourseCode =
                            courseCode ?? string.Empty,

                        CourseName =
                            courseName ?? string.Empty
                    };
            }


            // ========================================================
            // BRANCH NAVIGATION OBJECT
            // ========================================================

            var branchCode =
                GetNullableString(
                    reader,
                    "BranchCode");

            var branchName =
                GetNullableString(
                    reader,
                    "BranchName");

            if (!string.IsNullOrWhiteSpace(branchCode) ||
                !string.IsNullOrWhiteSpace(branchName))
            {
                courseStructure.Branch =
                    new Branch
                    {
                        BranchId =
                            courseStructure.BranchId ?? 0,

                        CourseId =
                            courseStructure.CourseId,

                        BranchCode =
                            branchCode ?? string.Empty,

                        BranchName =
                            branchName ?? string.Empty
                    };
            }


            return courseStructure;
        }


        // ============================================================
        // SAFE DATABASE VALUE METHODS
        // ============================================================

        private static long GetLong(
            DbDataReader reader,
            string column)
        {
            var value = reader[column];

            if (value == DBNull.Value)
            {
                return 0;
            }

            return Convert.ToInt64(value);
        }


        private static long? GetNullableLong(
            DbDataReader reader,
            string column)
        {
            var value = reader[column];

            if (value == DBNull.Value)
            {
                return null;
            }

            return Convert.ToInt64(value);
        }


        private static int GetInt(
            DbDataReader reader,
            string column)
        {
            var value = reader[column];

            if (value == DBNull.Value)
            {
                return 0;
            }

            return Convert.ToInt32(value);
        }


        private static byte GetByte(
            DbDataReader reader,
            string column)
        {
            var value = reader[column];

            if (value == DBNull.Value)
            {
                return 0;
            }

            return Convert.ToByte(value);
        }


        private static string? GetNullableString(
            DbDataReader reader,
            string column)
        {
            var value = reader[column];

            if (value == DBNull.Value)
            {
                return null;
            }

            return Convert.ToString(value);
        }


        private static DateTime GetDateTime(
            DbDataReader reader,
            string column)
        {
            var value = reader[column];

            if (value == DBNull.Value)
            {
                return DateTime.MinValue;
            }

            return Convert.ToDateTime(value);
        }


        private static DateTime? GetNullableDateTime(
            DbDataReader reader,
            string column)
        {
            var value = reader[column];

            if (value == DBNull.Value)
            {
                return null;
            }

            return Convert.ToDateTime(value);
        }
    }
}