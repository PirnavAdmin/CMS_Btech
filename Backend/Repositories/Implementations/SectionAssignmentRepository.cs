using System.Data;
using System.Data.Common;
using System.Text.Json;
using BTech.Data;
using BTech.DTOs.Sections;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Repositories.Implementations
{
    public class SectionAssignmentRepository : ISectionAssignmentRepository
    {
        private readonly ApplicationDbContext _context;

        public SectionAssignmentRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<ClassTeacherDto?> GetClassTeacherAsync(long sectionId) =>
            ExecuteSingleAsync(
                "sp_Section_GetClassTeacher",
                MapClassTeacher,
                ("p_section_id", sectionId));

        public async Task<IEnumerable<ClassTeacherCandidateDto>> GetClassTeacherCandidatesAsync(long sectionId)
        {
            var result = new List<ClassTeacherCandidateDto>();
            await ExecuteReaderAsync(
                "sp_Section_GetClassTeacherCandidates",
                async reader =>
                {
                    while (await reader.ReadAsync())
                    {
                        result.Add(new ClassTeacherCandidateDto
                        {
                            EmployeeProfileId = reader.GetInt64(reader.GetOrdinal("EmployeeProfileId")),
                            UserId = reader.GetInt64(reader.GetOrdinal("UserId")),
                            EmployeeUserId = reader.GetString(reader.GetOrdinal("EmployeeUserId")),
                            FullName = reader.GetString(reader.GetOrdinal("FullName")),
                            DepartmentName = GetNullableString(reader, "DepartmentName"),
                            Designation = GetNullableString(reader, "Designation"),
                            Email = GetNullableString(reader, "Email"),
                            Mobile = GetNullableString(reader, "Mobile")
                        });
                    }
                },
                ("p_section_id", sectionId));
            return result;
        }

        public Task<ClassTeacherDto?> AssignClassTeacherAsync(long sectionId, long employeeProfileId, long updatedBy) =>
            ExecuteSingleAsync(
                "sp_Section_AssignClassTeacher",
                MapClassTeacher,
                ("p_section_id", sectionId),
                ("p_employee_profile_id", employeeProfileId),
                ("p_updated_by", updatedBy));

        public async Task<bool> RemoveClassTeacherAsync(long sectionId, long updatedBy)
        {
            var result = await ExecuteScalarIntAsync(
                "sp_Section_RemoveClassTeacher",
                ("p_section_id", sectionId),
                ("p_updated_by", updatedBy));
            return result == 1;
        }

        public Task<SectionCapacityDto?> GetCapacityAsync(long sectionId) =>
            ExecuteSingleAsync(
                "sp_Section_GetCapacity",
                MapCapacity,
                ("p_section_id", sectionId));

        public async Task<IEnumerable<StudentCandidateDto>> GetStudentCandidatesAsync(long sectionId, string? search)
        {
            var result = new List<StudentCandidateDto>();
            await ExecuteReaderAsync(
                "sp_Section_GetStudentCandidates",
                async reader =>
                {
                    while (await reader.ReadAsync())
                    {
                        result.Add(new StudentCandidateDto
                        {
                            StudentId = reader.GetInt64(reader.GetOrdinal("StudentId")),
                            StudentCode = reader.GetString(reader.GetOrdinal("StudentCode")),
                            FullName = reader.GetString(reader.GetOrdinal("FullName")),
                            Email = GetNullableString(reader, "Email"),
                            Mobile = GetNullableString(reader, "Mobile"),
                            CollegeId = reader.GetInt64(reader.GetOrdinal("CollegeId")),
                            CourseId = GetNullableInt64(reader, "CourseId"),
                            BranchId = GetNullableInt64(reader, "BranchId"),
                            AcademicYearId = reader.GetInt64(reader.GetOrdinal("AcademicYearId"))
                        });
                    }
                },
                ("p_section_id", sectionId),
                ("p_search", search));
            return result;
        }

        public async Task<IEnumerable<SectionStudentDto>> GetStudentsAsync(long sectionId)
        {
            var result = new List<SectionStudentDto>();
            await ExecuteReaderAsync(
                "sp_Section_GetStudents",
                async reader =>
                {
                    while (await reader.ReadAsync())
                    {
                        result.Add(new SectionStudentDto
                        {
                            AssignmentId = reader.GetInt64(reader.GetOrdinal("AssignmentId")),
                            SectionId = sectionId,
                            StudentId = reader.GetInt64(reader.GetOrdinal("StudentId")),
                            StudentCode = reader.GetString(reader.GetOrdinal("StudentCode")),
                            FullName = reader.GetString(reader.GetOrdinal("FullName")),
                            Email = GetNullableString(reader, "Email"),
                            Mobile = GetNullableString(reader, "Mobile"),
                            AssignedAt = reader.GetDateTime(reader.GetOrdinal("AssignedAt")),
                            AssignedBy = GetNullableInt64(reader, "AssignedBy")
                        });
                    }
                },
                ("p_section_id", sectionId));
            return result;
        }

        public async Task<IEnumerable<SectionStudentDto>> GetAllStudentsAsync()
        {
            const string sql = @"
                SELECT
                    ssa.student_section_assignment_id AS AssignmentId,
                    ssa.section_id AS SectionId,
                    s.student_id AS StudentId,
                    s.student_code AS StudentCode,
                    s.full_name AS FullName,
                    s.email AS Email,
                    s.mobile AS Mobile,
                    ssa.assigned_at AS AssignedAt,
                    ssa.assigned_by AS AssignedBy
                FROM student_section_assignments ssa
                INNER JOIN students s
                    ON s.student_id = ssa.student_id
                   AND s.deleted_at IS NULL
                INNER JOIN sections sec
                    ON sec.section_id = ssa.section_id
                   AND sec.deleted_at IS NULL
                WHERE ssa.status = 1
                ORDER BY ssa.section_id, s.full_name, s.student_id;";

            var result = new List<SectionStudentDto>();
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = sql;
                command.CommandType = CommandType.Text;

                await using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    result.Add(new SectionStudentDto
                    {
                        AssignmentId = reader.GetInt64(reader.GetOrdinal("AssignmentId")),
                        SectionId = reader.GetInt64(reader.GetOrdinal("SectionId")),
                        StudentId = reader.GetInt64(reader.GetOrdinal("StudentId")),
                        StudentCode = reader.GetString(reader.GetOrdinal("StudentCode")),
                        FullName = reader.GetString(reader.GetOrdinal("FullName")),
                        Email = GetNullableString(reader, "Email"),
                        Mobile = GetNullableString(reader, "Mobile"),
                        AssignedAt = reader.GetDateTime(reader.GetOrdinal("AssignedAt")),
                        AssignedBy = GetNullableInt64(reader, "AssignedBy")
                    });
                }
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }

            return result;
        }

        public Task<AssignStudentsResultDto?> AssignStudentsAsync(long sectionId, IReadOnlyCollection<long> studentIds, long assignedBy)
        {
            var json = JsonSerializer.Serialize(studentIds.Distinct().ToArray());
            return ExecuteSingleAsync(
                "sp_Section_AssignStudents",
                reader => new AssignStudentsResultDto
                {
                    SectionId = reader.GetInt64(reader.GetOrdinal("SectionId")),
                    Capacity = reader.GetInt32(reader.GetOrdinal("Capacity")),
                    PreviouslyAssigned = reader.GetInt32(reader.GetOrdinal("PreviouslyAssigned")),
                    NewlyAssigned = reader.GetInt32(reader.GetOrdinal("NewlyAssigned")),
                    TotalAssigned = reader.GetInt32(reader.GetOrdinal("TotalAssigned")),
                    AvailableSeats = reader.GetInt32(reader.GetOrdinal("AvailableSeats"))
                },
                ("p_section_id", sectionId),
                ("p_student_ids_json", json),
                ("p_assigned_by", assignedBy));
        }

        public async Task<bool> RemoveStudentAsync(long sectionId, long studentId, long removedBy)
        {
            var result = await ExecuteScalarIntAsync(
                "sp_Section_RemoveStudent",
                ("p_section_id", sectionId),
                ("p_student_id", studentId),
                ("p_removed_by", removedBy));

            if (result == 1)
                return true;

            // The supplied frontend sends its assignment row ID after a
            // server refresh. Preserve the existing student-ID contract and
            // accept that assignment ID as a compatibility fallback.
            var resolvedStudentId = await ResolveStudentIdAsync(
                sectionId,
                studentId);

            if (!resolvedStudentId.HasValue || resolvedStudentId.Value == studentId)
                return false;

            result = await ExecuteScalarIntAsync(
                "sp_Section_RemoveStudent",
                ("p_section_id", sectionId),
                ("p_student_id", resolvedStudentId.Value),
                ("p_removed_by", removedBy));

            return result == 1;
        }

        private async Task<long?> ResolveStudentIdAsync(
            long sectionId,
            long assignmentId)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = @"
                    SELECT student_id
                    FROM student_section_assignments
                    WHERE student_section_assignment_id = @assignment_id
                      AND section_id = @section_id
                      AND status = 1
                    LIMIT 1;";
                command.CommandType = CommandType.Text;
                AddParameter(command, "@assignment_id", assignmentId);
                AddParameter(command, "@section_id", sectionId);

                var value = await command.ExecuteScalarAsync();
                return value == null || value == DBNull.Value
                    ? null
                    : Convert.ToInt64(value);
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        private async Task<T?> ExecuteSingleAsync<T>(
            string procedureName,
            Func<DbDataReader, T> mapper,
            params (string Name, object? Value)[] parameters)
        {
            T? result = default;
            await ExecuteReaderAsync(
                procedureName,
                async reader =>
                {
                    if (await reader.ReadAsync())
                        result = mapper(reader);
                },
                parameters);
            return result;
        }

        private async Task<int> ExecuteScalarIntAsync(
            string procedureName,
            params (string Name, object? Value)[] parameters)
        {
            var value = 0;
            await ExecuteReaderAsync(
                procedureName,
                async reader =>
                {
                    if (await reader.ReadAsync())
                        value = Convert.ToInt32(reader.GetValue(0));
                },
                parameters);
            return value;
        }

        private async Task ExecuteReaderAsync(
            string procedureName,
            Func<DbDataReader, Task> handler,
            params (string Name, object? Value)[] parameters)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = procedureName;
                command.CommandType = CommandType.StoredProcedure;

                foreach (var parameter in parameters)
                    AddParameter(command, parameter.Name, parameter.Value);

                await using var reader = await command.ExecuteReaderAsync();
                await handler(reader);
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        private static ClassTeacherDto MapClassTeacher(DbDataReader reader) => new()
        {
            SectionId = reader.GetInt64(reader.GetOrdinal("SectionId")),
            SectionName = reader.GetString(reader.GetOrdinal("SectionName")),
            EmployeeProfileId = GetNullableInt64(reader, "EmployeeProfileId"),
            UserId = GetNullableInt64(reader, "UserId"),
            EmployeeUserId = GetNullableString(reader, "EmployeeUserId"),
            FullName = GetNullableString(reader, "FullName"),
            DepartmentName = GetNullableString(reader, "DepartmentName"),
            Designation = GetNullableString(reader, "Designation"),
            Email = GetNullableString(reader, "Email"),
            Mobile = GetNullableString(reader, "Mobile")
        };

        private static SectionCapacityDto MapCapacity(DbDataReader reader) => new()
        {
            SectionId = reader.GetInt64(reader.GetOrdinal("SectionId")),
            SectionName = reader.GetString(reader.GetOrdinal("SectionName")),
            Capacity = reader.GetInt32(reader.GetOrdinal("Capacity")),
            AssignedStudents = reader.GetInt32(reader.GetOrdinal("AssignedStudents")),
            AvailableSeats = reader.GetInt32(reader.GetOrdinal("AvailableSeats")),
            IsFull = reader.GetBoolean(reader.GetOrdinal("IsFull"))
        };

        private static void AddParameter(DbCommand command, string name, object? value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        private static long? GetNullableInt64(DbDataReader reader, string column)
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetInt64(ordinal);
        }

        private static string? GetNullableString(DbDataReader reader, string column)
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }
    }
}
