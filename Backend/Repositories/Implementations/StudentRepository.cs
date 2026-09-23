using System.Data;
using System.Data.Common;
using BTech.Data;
using BTech.DTOs.Student;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public sealed class StudentRepository : IStudentRepository
    {
        private readonly ApplicationDbContext _context;

        public StudentRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // GET ALL STUDENTS
        // =========================================================

        public Task<(IReadOnlyList<Student> Items, long TotalRecords)> GetAllAsync(
            sbyte? status,
            long? collegeId,
            long? courseId,
            long? branchId,
            long? academicYearId,
            int pageNumber,
            int pageSize) =>
            ExecutePagedAsync(
                "sp_student_get_all",
                ("p_status", status),
                ("p_college_id", collegeId),
                ("p_course_id", courseId),
                ("p_branch_id", branchId),
                ("p_academic_year_id", academicYearId),
                ("p_page_number", pageNumber),
                ("p_page_size", pageSize));

        // =========================================================
        // SEARCH STUDENTS
        // =========================================================

        public Task<(IReadOnlyList<Student> Items, long TotalRecords)> SearchAsync(
            string query,
            sbyte? status,
            long? collegeId,
            long? courseId,
            long? branchId,
            long? academicYearId,
            int pageNumber,
            int pageSize) =>
            ExecutePagedAsync(
                "sp_student_search",
                ("p_query", query),
                ("p_status", status),
                ("p_college_id", collegeId),
                ("p_course_id", courseId),
                ("p_branch_id", branchId),
                ("p_academic_year_id", academicYearId),
                ("p_page_number", pageNumber),
                ("p_page_size", pageSize));

        // =========================================================
        // GET STUDENT BY ID
        // =========================================================

        public Task<Student?> GetByIdAsync(long studentId) =>
            ExecuteSingleAsync(
                "sp_student_get_by_id",
                ("p_student_id", studentId));

        // =========================================================
        // CREATE STUDENT
        // =========================================================

        public async Task<Student> CreateAsync(Student student) =>
            await ExecuteSingleAsync(
                "sp_student_create",
                StudentParameters(student, includeId: false))
            ?? throw new InvalidOperationException(
                "Student could not be created.");

        // =========================================================
        // UPDATE STUDENT
        // =========================================================

        public Task<Student?> UpdateAsync(Student student) =>
            ExecuteSingleAsync(
                "sp_student_update",
                StudentParameters(student, includeId: true));

        // =========================================================
        // UPDATE STUDENT STATUS
        // =========================================================

        public Task<Student?> UpdateStatusAsync(
            long studentId,
            sbyte status,
            long? updatedBy) =>
            ExecuteSingleAsync(
                "sp_student_update_status",
                ("p_student_id", studentId),
                ("p_status", status),
                ("p_updated_by", updatedBy));

        // =========================================================
        // GET STUDENT DOCUMENTS
        // =========================================================

        public async Task<IReadOnlyList<StudentDocumentResponseDto>>
            GetDocumentsAsync(long studentId)
        {
            var documents =
                new List<StudentDocumentResponseDto>();

            var connection =
                _context.Database.GetDbConnection();

            var shouldClose =
                connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command =
                    connection.CreateCommand();

                command.CommandText =
                    "sp_student_documents_get_by_student_id";

                command.CommandType =
                    CommandType.StoredProcedure;

                AddParameter(
                    command,
                    "p_student_id",
                    studentId);

                await using var reader =
                    await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    documents.Add(
                        new StudentDocumentResponseDto
                        {
                            DocumentId =
                                Convert.ToInt64(
                                    reader["document_id"]),

                            StudentId =
                                Convert.ToInt64(
                                    reader["student_id"]),

                            DocumentType =
                                Convert.ToString(
                                    reader["document_type"])
                                ?? string.Empty,

                            FileName =
                                reader["file_name"] ==
                                DBNull.Value
                                    ? null
                                    : Convert.ToString(
                                        reader["file_name"]),

                            UploadedDate =
                                Convert.ToDateTime(
                                    reader["uploaded_date"])
                        });
                }
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }

            return documents;
        }

        // =========================================================
        // PROMOTE INDIVIDUAL STUDENT
        // =========================================================

        public async Task<StudentPromotionResponseDto?>
            PromoteAsync(
                long studentId,
                long? createdBy)
        {
            var connection =
                _context.Database.GetDbConnection();

            var shouldClose =
                connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command =
                    connection.CreateCommand();

                command.CommandText =
                    "sp_student_promote";

                command.CommandType =
                    CommandType.StoredProcedure;

                AddParameter(
                    command,
                    "p_student_id",
                    studentId);

                AddParameter(
                    command,
                    "p_created_by",
                    createdBy);

                await using var reader =
                    await command.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                    return null;

                return new StudentPromotionResponseDto
                {
                    PromotionId =
                        Convert.ToInt64(
                            reader["promotion_id"]),

                    StudentId =
                        Convert.ToInt64(
                            reader["student_id"]),

                    FromAcademicYearId =
                        Convert.ToInt64(
                            reader["from_academic_year_id"]),

                    FromAcademicYearName =
                        reader["from_academic_year_name"]
                        == DBNull.Value
                            ? null
                            : Convert.ToString(
                                reader[
                                    "from_academic_year_name"]),

                    ToAcademicYearId =
                        Convert.ToInt64(
                            reader["to_academic_year_id"]),

                    ToAcademicYearName =
                        reader["to_academic_year_name"]
                        == DBNull.Value
                            ? null
                            : Convert.ToString(
                                reader[
                                    "to_academic_year_name"]),

                    FromCourseId =
                        reader["from_course_id"]
                        == DBNull.Value
                            ? null
                            : Convert.ToInt64(
                                reader["from_course_id"]),

                    ToCourseId =
                        reader["to_course_id"]
                        == DBNull.Value
                            ? null
                            : Convert.ToInt64(
                                reader["to_course_id"]),

                    FromBranchId =
                        reader["from_branch_id"]
                        == DBNull.Value
                            ? null
                            : Convert.ToInt64(
                                reader["from_branch_id"]),

                    ToBranchId =
                        reader["to_branch_id"]
                        == DBNull.Value
                            ? null
                            : Convert.ToInt64(
                                reader["to_branch_id"]),

                    PromotionStatus =
                        reader["promotion_status"]
                        == DBNull.Value
                            ? null
                            : Convert.ToString(
                                reader["promotion_status"]),

                    Decision =
                        reader["decision"]
                        == DBNull.Value
                            ? null
                            : Convert.ToString(
                                reader["decision"]),

                    PromotionEligibility =
                        reader["promotion_eligibility"]
                        == DBNull.Value
                            ? null
                            : Convert.ToString(
                                reader[
                                    "promotion_eligibility"]),

                    PromotionType =
                        reader["promotion_type"]
                        == DBNull.Value
                            ? null
                            : Convert.ToString(
                                reader["promotion_type"]),

                    PromotionDate =
                        reader["promotion_date"]
                        == DBNull.Value
                            ? null
                            : Convert.ToDateTime(
                                reader["promotion_date"]),

                    EffectiveDate =
                        reader["effective_date"]
                        == DBNull.Value
                            ? null
                            : Convert.ToDateTime(
                                reader["effective_date"]),

                    Remarks =
                        reader["remarks"]
                        == DBNull.Value
                            ? null
                            : Convert.ToString(
                                reader["remarks"])
                };
            }
            catch (MySqlException ex)
                when (ex.SqlState == "45000")
            {
                throw new InvalidOperationException(
                    ex.Message,
                    ex);
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        // =========================================================
        // STUDENT CODE EXISTS
        // =========================================================

        public async Task<bool> StudentCodeExistsAsync(
            string studentCode,
            long? excludeStudentId = null)
        {
            var connection =
                _context.Database.GetDbConnection();

            var shouldClose =
                connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command =
                    connection.CreateCommand();

                command.CommandText =
                    "sp_student_code_exists";

                command.CommandType =
                    CommandType.StoredProcedure;

                AddParameter(
                    command,
                    "p_student_code",
                    studentCode);

                AddParameter(
                    command,
                    "p_exclude_student_id",
                    excludeStudentId);

                var value =
                    await command.ExecuteScalarAsync();

                return value != null &&
                       value != DBNull.Value &&
                       Convert.ToInt32(value) == 1;
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        // =========================================================
        // VALIDATE STUDENT REFERENCES
        // =========================================================

        public async Task<StudentReferenceValidation>
            ValidateReferencesAsync(
                long collegeId,
                long academicYearId,
                long? courseId,
                long? branchId)
        {
            var connection =
                _context.Database.GetDbConnection();

            var shouldClose =
                connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command =
                    connection.CreateCommand();

                command.CommandText =
                    "sp_student_validate_references";

                command.CommandType =
                    CommandType.StoredProcedure;

                AddParameter(
                    command,
                    "p_college_id",
                    collegeId);

                AddParameter(
                    command,
                    "p_academic_year_id",
                    academicYearId);

                AddParameter(
                    command,
                    "p_course_id",
                    courseId);

                AddParameter(
                    command,
                    "p_branch_id",
                    branchId);

                await using var reader =
                    await command.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                    throw new InvalidOperationException(
                        "Student references could not be validated.");

                return new StudentReferenceValidation
                {
                    CollegeExists =
                        Convert.ToBoolean(
                            reader["college_exists"]),

                    AcademicYearExists =
                        Convert.ToBoolean(
                            reader["academic_year_exists"]),

                    CourseExists =
                        Convert.ToBoolean(
                            reader["course_exists"]),

                    BranchExists =
                        Convert.ToBoolean(
                            reader["branch_exists"]),

                    CourseBelongsToCollege =
                        Convert.ToBoolean(
                            reader[
                                "course_belongs_to_college"]),

                    BranchBelongsToCourse =
                        Convert.ToBoolean(
                            reader[
                                "branch_belongs_to_course"])
                };
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        // =========================================================
        // PAGED EXECUTION
        // =========================================================

        private async Task<
            (IReadOnlyList<Student> Items,
             long TotalRecords)>
            ExecutePagedAsync(
                string procedure,
                params (string Name, object? Value)[] parameters)
        {
            var students =
                new List<Student>();

            long totalRecords = 0;

            var connection =
                _context.Database.GetDbConnection();

            var shouldClose =
                connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command =
                    connection.CreateCommand();

                command.CommandText =
                    procedure;

                command.CommandType =
                    CommandType.StoredProcedure;

                foreach (var parameter in parameters)
                {
                    AddParameter(
                        command,
                        parameter.Name,
                        parameter.Value);
                }

                await using var reader =
                    await command.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    students.Add(
                        MapStudent(reader));

                    totalRecords =
                        Convert.ToInt64(
                            reader["total_records"]);
                }
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }

            return (
                students,
                totalRecords);
        }

        // =========================================================
        // SINGLE STUDENT EXECUTION
        // =========================================================

        private async Task<Student?> ExecuteSingleAsync(
            string procedure,
            params (string Name, object? Value)[] parameters)
        {
            var connection =
                _context.Database.GetDbConnection();

            var shouldClose =
                connection.State != ConnectionState.Open;

            if (shouldClose)
                await connection.OpenAsync();

            try
            {
                await using var command =
                    connection.CreateCommand();

                command.CommandText =
                    procedure;

                command.CommandType =
                    CommandType.StoredProcedure;

                foreach (var parameter in parameters)
                {
                    AddParameter(
                        command,
                        parameter.Name,
                        parameter.Value);
                }

                await using var reader =
                    await command.ExecuteReaderAsync();

                return await reader.ReadAsync()
                    ? MapStudent(reader)
                    : null;
            }
            catch (MySqlException ex)
                when (ex.SqlState == "45000")
            {
                throw new InvalidOperationException(
                    ex.Message,
                    ex);
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        // =========================================================
        // STUDENT PARAMETERS
        // =========================================================

        private static (
            string Name,
            object? Value)[]
            StudentParameters(
                Student student,
                bool includeId)
        {
            var values =
                new List<(string, object?)>();

            if (includeId)
            {
                values.Add(
                    (
                        "p_student_id",
                        student.StudentId
                    ));
            }

            values.AddRange(
                new (string, object?)[]
                {
                    (
                        "p_college_id",
                        student.CollegeId
                    ),

                    (
                        "p_student_code",
                        student.StudentCode
                    ),

                    (
                        "p_full_name",
                        student.FullName
                    ),

                    (
                        "p_gender",
                        student.Gender
                    ),

                    (
                        "p_date_of_birth",
                        student.DateOfBirth?.Date
                    ),

                    (
                        "p_email",
                        student.Email
                    ),

                    (
                        "p_mobile",
                        student.Mobile
                    ),

                    (
                        "p_blood_group",
                        student.BloodGroup
                    ),

                    (
                        "p_address",
                        student.Address
                    ),

                    (
                        "p_course_id",
                        student.CourseId
                    ),

                    (
                        "p_branch_id",
                        student.BranchId
                    ),

                    (
                        "p_academic_year_id",
                        student.AcademicYearId
                    ),

                    (
                        "p_status",
                        student.Status
                    ),

                    (
                        includeId
                            ? "p_updated_by"
                            : "p_created_by",

                        includeId
                            ? student.UpdatedBy
                            : student.CreatedBy
                    )
                });

            return values.ToArray();
        }

        // =========================================================
        // ADD DATABASE PARAMETER
        // =========================================================

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

        // =========================================================
        // MAP STUDENT
        // =========================================================

        private static Student MapStudent(
            DbDataReader reader) => new()
            {
                StudentId =
                    GetInt64(
                        reader,
                        "student_id") ?? 0,

                CollegeId =
                    GetInt64(
                        reader,
                        "college_id") ?? 0,

                CollegeName =
                    GetString(
                        reader,
                        "college_name"),

                StudentCode =
                    GetString(
                        reader,
                        "student_code")
                    ?? string.Empty,

                FullName =
                    GetString(
                        reader,
                        "full_name")
                    ?? string.Empty,

                Gender =
                    GetString(
                        reader,
                        "gender"),

                DateOfBirth =
                    GetDateTime(
                        reader,
                        "date_of_birth"),

                Email =
                    GetString(
                        reader,
                        "email"),

                Mobile =
                    GetString(
                        reader,
                        "mobile"),

                BloodGroup =
                    GetString(
                        reader,
                        "blood_group"),

                Address =
                    GetString(
                        reader,
                        "address"),

                CourseId =
                    GetInt64(
                        reader,
                        "course_id"),

                CourseName =
                    GetString(
                        reader,
                        "course_name"),

                BranchId =
                    GetInt64(
                        reader,
                        "branch_id"),

                BranchName =
                    GetString(
                        reader,
                        "branch_name"),

                AcademicYearId =
                    GetInt64(
                        reader,
                        "academic_year_id") ?? 0,

                AcademicYearName =
                    GetString(
                        reader,
                        "academic_year_name"),

                Status =
                    Convert.ToByte(
                        reader["status"]),

                CreatedAt =
                    GetDateTime(
                        reader,
                        "created_at") ?? default,

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

        // =========================================================
        // SAFE STRING
        // =========================================================

        private static string? GetString(
            DbDataReader reader,
            string name)
        {
            var ordinal =
                reader.GetOrdinal(name);

            return reader.IsDBNull(ordinal)
                ? null
                : Convert.ToString(
                    reader.GetValue(ordinal));
        }

        // =========================================================
        // SAFE INT64
        // =========================================================

        private static long? GetInt64(
            DbDataReader reader,
            string name)
        {
            var ordinal =
                reader.GetOrdinal(name);

            return reader.IsDBNull(ordinal)
                ? null
                : Convert.ToInt64(
                    reader.GetValue(ordinal));
        }

        // =========================================================
        // SAFE DATETIME
        // =========================================================

        private static DateTime? GetDateTime(
            DbDataReader reader,
            string name)
        {
            var ordinal =
                reader.GetOrdinal(name);

            return reader.IsDBNull(ordinal)
                ? null
                : Convert.ToDateTime(
                    reader.GetValue(ordinal));
        }
    }
}