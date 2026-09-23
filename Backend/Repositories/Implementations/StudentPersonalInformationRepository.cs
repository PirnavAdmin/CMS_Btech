using System.Data;
using System.Data.Common;
using BTech.Data;
using BTech.DTOs.StudentProfile;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public sealed class StudentPersonalInformationRepository
        : IStudentPersonalInformationRepository
    {
        private readonly ApplicationDbContext _context;

        public StudentPersonalInformationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<StudentPersonalInformationResponseDto?> GetByStudentIdAsync(
            long studentId) =>
            ExecuteAsync(
                "sp_student_profile_personal_get",
                ("p_student_id", studentId));

        public Task<StudentPersonalInformationResponseDto?> UpdateAsync(
            long studentId,
            UpdateStudentPersonalInformationRequestDto request,
            long changedBy,
            string? ipAddress,
            string? userAgent) =>
            ExecuteAsync(
                "sp_student_profile_personal_update_v2",
                ("p_student_id", studentId),
                ("p_full_name", request.FullName),
                ("p_gender", request.Gender),
                ("p_date_of_birth", request.DateOfBirth?.Date),
                ("p_email", request.Email),
                ("p_mobile", request.Mobile),
                ("p_profile_photo", request.ProfilePhoto),
                ("p_alternate_email", request.AlternateEmail),
                ("p_alternate_mobile", request.AlternateMobile),
                ("p_blood_group", request.BloodGroup),
                ("p_nationality", request.Nationality),
                ("p_religion", request.Religion),
                ("p_category", request.Category),
                ("p_address", request.Address),
                ("p_city", request.City),
                ("p_district", request.District),
                ("p_state", request.State),
                ("p_country", request.Country),
                ("p_pincode", request.Pincode),
                ("p_change_reason", request.ChangeReason),
                ("p_changed_by", changedBy),
                ("p_ip_address", ipAddress),
                ("p_user_agent", userAgent),
                ("p_house_number", request.HouseNumber),
                ("p_permanent_house_number", request.PermanentHouseNumber),
                ("p_permanent_address", request.PermanentAddress),
                ("p_permanent_pincode", request.PermanentPincode),
                ("p_permanent_city", request.PermanentCity),
                ("p_permanent_district", request.PermanentDistrict),
                ("p_permanent_state", request.PermanentState),
                ("p_permanent_country", request.PermanentCountry));

        private async Task<StudentPersonalInformationResponseDto?> ExecuteAsync(
            string procedure,
            params (string Name, object? Value)[] parameters)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            try
            {
                if (shouldClose)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();
                command.CommandText = procedure;
                command.CommandType = CommandType.StoredProcedure;

                foreach (var parameter in parameters)
                    AddParameter(command, parameter.Name, parameter.Value);

                await using var reader = await command.ExecuteReaderAsync();
                return await reader.ReadAsync() ? Map(reader) : null;
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                throw new ArgumentException(ex.Message, ex);
            }
            finally
            {
                if (shouldClose && connection.State == ConnectionState.Open)
                    await connection.CloseAsync();
            }
        }

        private static StudentPersonalInformationResponseDto Map(DbDataReader reader)
        {
            return new StudentPersonalInformationResponseDto
            {
                StudentId = Convert.ToInt64(reader["student_id"]),
                StudentCode = Convert.ToString(reader["student_code"]) ?? string.Empty,
                FullName = Convert.ToString(reader["full_name"]) ?? string.Empty,
                Gender = GetString(reader, "gender"),
                DateOfBirth = GetDateTime(reader, "date_of_birth"),
                Email = GetString(reader, "email"),
                Mobile = GetString(reader, "mobile"),
                ProfilePhoto = GetString(reader, "profile_photo"),
                AlternateEmail = GetString(reader, "alternate_email"),
                AlternateMobile = GetString(reader, "alternate_mobile"),
                BloodGroup = GetString(reader, "blood_group"),
                Nationality = GetString(reader, "nationality"),
                Religion = GetString(reader, "religion"),
                Category = GetString(reader, "category"),
                Address = GetString(reader, "address"),
                HouseNumber = GetString(reader, "house_number"),
                PermanentHouseNumber = GetString(reader, "permanent_house_number"),
                PermanentAddress = GetString(reader, "permanent_address"),
                PermanentPincode = GetString(reader, "permanent_pincode"),
                PermanentCity = GetString(reader, "permanent_city"),
                PermanentDistrict = GetString(reader, "permanent_district"),
                PermanentState = GetString(reader, "permanent_state"),
                PermanentCountry = GetString(reader, "permanent_country"),

                City = GetString(reader, "city"),
                District = GetString(reader, "district"),
                State = GetString(reader, "state"),
                Country = GetString(reader, "country"),
                Pincode = GetString(reader, "pincode"),
                ProfileStatus = GetString(reader, "profile_status") ?? "Incomplete",
                IsProfileCompleted = Convert.ToBoolean(reader["is_profile_completed"]),
                IsVerified = Convert.ToBoolean(reader["is_verified"]),
                ProfileCompletionPercentage = Convert.ToDecimal(reader["profile_completion_percentage"]),
                CollegeId = Convert.ToInt64(reader["college_id"]),
                CourseId = GetInt64(reader, "course_id"),
                CourseName = GetString(reader, "course_name"),
                BranchId = GetInt64(reader, "branch_id"),
                BranchName = GetString(reader, "branch_name"),
                AcademicYearId = Convert.ToInt64(reader["academic_year_id"]),
                AcademicYearName = GetString(reader, "academic_year_name"),
                UpdatedAt = GetDateTime(reader, "updated_at")
            };
        }

        private static string? GetString(DbDataReader reader, string column) =>
            reader[column] == DBNull.Value ? null : Convert.ToString(reader[column]);

        private static DateTime? GetDateTime(DbDataReader reader, string column) =>
            reader[column] == DBNull.Value ? null : Convert.ToDateTime(reader[column]);

        private static long? GetInt64(DbDataReader reader, string column) =>
            reader[column] == DBNull.Value ? null : Convert.ToInt64(reader[column]);

        private static void AddParameter(DbCommand command, string name, object? value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }
    }
}
