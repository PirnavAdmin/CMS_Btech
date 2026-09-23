using System.Data;
using System.Data.Common;
using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories.Implementations
{
    public sealed class CourseRepository : ICourseRepository
    {
        private readonly ApplicationDbContext _context;

        public CourseRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Course>> GetAllAsync(
            string? search,
            sbyte? status,
            long? collegeId,
            long? departmentId)
        {
            var courses = new List<Course>();

            await WithCommandAsync("sp_course_get_all", async command =>
            {
                AddParameter(command, "p_search", search);
                AddParameter(command, "p_status", status);
                AddParameter(command, "p_college_id", collegeId);
                AddParameter(command, "p_department_id", departmentId);

                await using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    courses.Add(MapCourse(reader));
            });

            return courses;
        }

        public Task<Course?> GetByIdAsync(long courseId) =>
            ExecuteSingleAsync(
                "sp_course_get_by_id",
                ("p_course_id", courseId));

        public async Task<Course> AddAsync(Course course) =>
            await ExecuteSingleAsync(
                "sp_course_create",
                CourseParameters(course, includeId: false))
            ?? throw new InvalidOperationException(
                "Course could not be created.");

        public Task<Course?> UpdateAsync(Course course) =>
            ExecuteSingleAsync(
                "sp_course_update",
                CourseParameters(course, includeId: true));

        public Task<Course?> UpdateStatusAsync(
            long courseId,
            sbyte status,
            long? updatedBy) =>
            ExecuteSingleAsync(
                "sp_course_update_status",
                ("p_course_id", courseId),
                ("p_status", status),
                ("p_updated_by", updatedBy));

        public async Task<bool> ExistsCodeAsync(
            string courseCode,
            long? excludeId = null)
        {
            var exists = false;

            await WithCommandAsync("sp_course_code_exists", async command =>
            {
                AddParameter(command, "p_course_code", courseCode);
                AddParameter(command, "p_exclude_id", excludeId);
                var value = await command.ExecuteScalarAsync();
                exists = value != null &&
                         value != DBNull.Value &&
                         Convert.ToInt32(value) == 1;
            });

            return exists;
        }

        private async Task<Course?> ExecuteSingleAsync(
            string procedure,
            params (string Name, object? Value)[] parameters)
        {
            Course? result = null;

            await WithCommandAsync(procedure, async command =>
            {
                foreach (var parameter in parameters)
                    AddParameter(command, parameter.Name, parameter.Value);

                await using var reader = await command.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                    result = MapCourse(reader);
            });

            return result;
        }

        private async Task WithCommandAsync(
            string procedure,
            Func<DbCommand, Task> action)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = procedure;
                command.CommandType = CommandType.StoredProcedure;
                await action(command);
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        private static void AddParameter(
            DbCommand command,
            string name,
            object? value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        private static (string Name, object? Value)[] CourseParameters(
            Course course,
            bool includeId)
        {
            var values = new List<(string, object?)>();

            if (includeId)
                values.Add(("p_course_id", course.CourseId));

            values.AddRange(new (string, object?)[]
            {
                ("p_college_id", course.CollegeId),
                ("p_department_id", course.DepartmentId),
                ("p_course_code", course.CourseCode),
                ("p_course_name", course.CourseName),
                ("p_course_short_name", course.CourseShortName),
                ("p_course_type", course.CourseType),
                ("p_duration_years", course.DurationYears),
                ("p_total_semesters", course.TotalSemesters),
                ("p_eligibility", course.Eligibility),
                ("p_description", course.Description),
                ("p_status", course.Status),
                (includeId ? "p_updated_by" : "p_created_by",
                    includeId ? course.UpdatedBy : course.CreatedBy)
            });

            return values.ToArray();
        }

        private static Course MapCourse(DbDataReader reader) => new()
        {
            CourseId = reader.GetInt64(reader.GetOrdinal("course_id")),
            CollegeId = reader.GetInt64(reader.GetOrdinal("college_id")),
            CollegeName = GetString(reader, "college_name"),
            DepartmentId = GetInt64(reader, "department_id"),
            DepartmentName = GetString(reader, "department_name"),
            CourseCode = reader.GetString(reader.GetOrdinal("course_code")),
            CourseName = reader.GetString(reader.GetOrdinal("course_name")),
            CourseShortName = GetString(reader, "course_short_name"),
            CourseType = GetString(reader, "course_type"),
            DurationYears = Convert.ToInt32(reader["duration_years"]),
            TotalSemesters = Convert.ToInt32(reader["total_semesters"]),
            Eligibility = GetString(reader, "eligibility"),
            Description = GetString(reader, "description"),
            Status = Convert.ToByte(reader["status"]),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
            CreatedBy = GetInt64(reader, "created_by"),
            UpdatedAt = GetDateTime(reader, "updated_at"),
            UpdatedBy = GetInt64(reader, "updated_by"),
            DeletedAt = GetDateTime(reader, "deleted_at"),
            DeletedBy = GetInt64(reader, "deleted_by")
        };

        private static string? GetString(DbDataReader reader, string name)
        {
            var ordinal = reader.GetOrdinal(name);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }

        private static long? GetInt64(DbDataReader reader, string name)
        {
            var ordinal = reader.GetOrdinal(name);
            return reader.IsDBNull(ordinal) ? null : reader.GetInt64(ordinal);
        }

        private static DateTime? GetDateTime(DbDataReader reader, string name)
        {
            var ordinal = reader.GetOrdinal(name);
            return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
        }
    }
}
