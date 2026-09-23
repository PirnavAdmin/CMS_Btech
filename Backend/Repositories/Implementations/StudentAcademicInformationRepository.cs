using System.Data;
using System.Data.Common;
using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public sealed class StudentAcademicInformationRepository : IStudentAcademicInformationRepository
    {
        private readonly ApplicationDbContext _context;

        public StudentAcademicInformationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<StudentAcademicInformation?> GetByIdAsync(int academicId) =>
            ExecuteSingleAsync(
                "sp_StudentAcademicInformation_GetById",
                ("p_academic_id", academicId));

        public Task<StudentAcademicInformation?> UpdateAsync(StudentAcademicInformation academicDetails) =>
            ExecuteSingleAsync(
                "sp_StudentAcademicInformation_Update",
                ("p_academic_id", academicDetails.AcademicId),
                ("p_roll_number", academicDetails.RollNumber),
                ("p_registration_number", academicDetails.RegistrationNumber),
                ("p_admission_number", academicDetails.AdmissionNumber),
                ("p_course", academicDetails.Course),
                ("p_branch", academicDetails.Branch),
                ("p_department", academicDetails.Department),
                ("p_semester", academicDetails.Semester),
                ("p_section", academicDetails.Section),
                ("p_academic_year", academicDetails.AcademicYear));

        private async Task<StudentAcademicInformation?> ExecuteSingleAsync(
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
                if (shouldClose)
                    await connection.CloseAsync();
            }
        }

        private static void AddParameter(DbCommand command, string name, object? value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        private static StudentAcademicInformation Map(DbDataReader reader) => new()
        {
            AcademicId = Convert.ToInt32(reader["AcademicId"]),
            RollNumber = Convert.ToString(reader["RollNumber"]) ?? string.Empty,
            RegistrationNumber = Convert.ToString(reader["RegistrationNumber"]) ?? string.Empty,
            AdmissionNumber = Convert.ToString(reader["AdmissionNumber"]) ?? string.Empty,
            Course = Convert.ToString(reader["Course"]) ?? string.Empty,
            Branch = Convert.ToString(reader["Branch"]) ?? string.Empty,
            Department = Convert.ToString(reader["Department"]) ?? string.Empty,
            Semester = Convert.ToInt32(reader["Semester"]),
            Section = Convert.ToString(reader["Section"]) ?? string.Empty,
            AcademicYear = Convert.ToString(reader["AcademicYear"]) ?? string.Empty
        };
    }
}
