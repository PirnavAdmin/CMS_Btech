using System.Data;
using System.Data.Common;
using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public class StudentAcademicDetailsRepository : IStudentAcademicDetailsRepository
    {
        private readonly ApplicationDbContext _context;

        public StudentAcademicDetailsRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<StudentAcademicDetails?> GetByAdmissionIdAsync(long admissionId)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            try
            {
                if (shouldClose)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();
                command.CommandText = "sp_StudentAdmission_GetAcademicDetails";
                command.CommandType = CommandType.StoredProcedure;
                AddParameter(command, "p_admission_id", admissionId);

                await using var reader = await command.ExecuteReaderAsync();
                return await reader.ReadAsync() ? Map(reader) : null;
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                throw new ArgumentException(ex.Message, ex);
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        public async Task<StudentAcademicDetails?> UpdateAsync(StudentAcademicDetails entity)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;

            try
            {
                if (shouldClose)
                    await connection.OpenAsync();

                await using var command = connection.CreateCommand();
                command.CommandText = "sp_StudentAdmission_UpdateAcademicDetails_v2";
                command.CommandType = CommandType.StoredProcedure;

                AddParameter(command, "p_admission_id", entity.AdmissionId);
                AddParameter(command, "p_board_id", entity.BoardId);
                AddParameter(command, "p_academic_year_id", entity.AcademicYearId);
                AddParameter(command, "p_academic_level_id", entity.AcademicLevelId);
                AddParameter(command, "p_group_id", entity.GroupId);
                AddParameter(command, "p_section_id", entity.SectionId);
                AddParameter(command, "p_medium", entity.Medium);
                AddParameter(command, "p_second_language", entity.SecondLanguage);
                AddParameter(command, "p_previous_school", entity.PreviousSchool);
                AddParameter(command, "p_previous_board", entity.PreviousBoard);
                AddParameter(command, "p_previous_year", entity.PreviousYear);
                AddParameter(command, "p_previous_percentage", entity.PreviousPercentage);
                AddParameter(command, "p_previous_hall_ticket", entity.PreviousHallTicket);
                AddParameter(command, "p_updated_by", entity.UpdatedBy);
                AddParameter(command, "p_college_id", entity.CollegeId);
                AddParameter(command, "p_department_id", entity.DepartmentId);
                AddParameter(command, "p_course_id", entity.CourseId);
                AddParameter(command, "p_branch_id", entity.BranchId);
                AddParameter(command, "p_semester_id", entity.SemesterId);
                AddParameter(command, "p_admission_type", entity.AdmissionType);
                AddParameter(command, "p_entry_type", entity.EntryType);
                AddParameter(command, "p_regulation", entity.Regulation);
                AddParameter(command, "p_batch", entity.Batch);


                await using var reader = await command.ExecuteReaderAsync();
                return await reader.ReadAsync() ? Map(reader) : null;
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                throw new ArgumentException(ex.Message, ex);
            }
            finally
            {
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        private static StudentAcademicDetails Map(DbDataReader reader)
        {
            return new StudentAcademicDetails
            {
                AdmissionId = GetInt64(reader, "AdmissionId") ?? 0,
                RegistrationNo = GetString(reader, "RegistrationNo"),
                AdmissionNo = GetString(reader, "AdmissionNo"),
                StudentName = GetString(reader, "StudentName") ?? string.Empty,
                CollegeId = GetInt64(reader, "CollegeId"),
                DepartmentId = GetInt64(reader, "DepartmentId"),
                CourseId = GetInt64(reader, "CourseId"),
                BranchId = GetInt64(reader, "BranchId"),
                SemesterId = GetInt64(reader, "SemesterId"),
                AdmissionType = GetString(reader, "AdmissionType"),
                EntryType = GetString(reader, "EntryType"),
                Regulation = GetString(reader, "Regulation"),
                Batch = GetString(reader, "Batch"),
                BoardId = GetInt64(reader, "BoardId"),
                AcademicYearId = GetInt64(reader, "AcademicYearId"),
                AcademicLevelId = GetInt64(reader, "AcademicLevelId"),
                GroupId = GetInt64(reader, "GroupId"),
                SectionId = GetInt64(reader, "SectionId"),
                Medium = GetString(reader, "Medium"),
                SecondLanguage = GetString(reader, "SecondLanguage"),
                PreviousSchool = GetString(reader, "PreviousSchool"),
                PreviousBoard = GetString(reader, "PreviousBoard"),
                PreviousYear = GetString(reader, "PreviousYear"),
                PreviousPercentage = GetDecimal(reader, "PreviousPercentage"),
                PreviousHallTicket = GetString(reader, "PreviousHallTicket"),
                UpdatedBy = GetInt64(reader, "UpdatedBy"),
                UpdatedAt = GetDateTime(reader, "UpdatedAt")
            };
        }

        private static void AddParameter(DbCommand command, string name, object? value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        private static int Ordinal(DbDataReader reader, string name) => reader.GetOrdinal(name);

        private static string? GetString(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name);
            return reader.IsDBNull(i) ? null : Convert.ToString(reader.GetValue(i));
        }

        private static long? GetInt64(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name);
            return reader.IsDBNull(i) ? null : Convert.ToInt64(reader.GetValue(i));
        }

        private static decimal? GetDecimal(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name);
            return reader.IsDBNull(i) ? null : Convert.ToDecimal(reader.GetValue(i));
        }

        private static DateTime? GetDateTime(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name);
            return reader.IsDBNull(i) ? null : Convert.ToDateTime(reader.GetValue(i));
        }
    }
}
