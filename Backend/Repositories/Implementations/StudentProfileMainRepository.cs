using System.Data;
using Dapper;
using MySqlConnector;
using BTech.DTOs.StudentProfileMain;
using BTech.Repositories.Interfaces;

namespace BTech.Repositories
{
    public class StudentProfileMainRepository : IStudentProfileMainRepository
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<StudentProfileMainRepository> _logger;

        public StudentProfileMainRepository(
            IConfiguration configuration,
            ILogger<StudentProfileMainRepository> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        private MySqlConnection CreateConnection()
        {
            var connectionString =
                _configuration.GetConnectionString("DefaultConnection");

            return new MySqlConnection(connectionString);
        }

        public async Task<IEnumerable<StudentProfileListDto>> GetAllAsync(
            long collegeId,
            string? search,
            long? departmentId,
            long? courseId,
            long? branchId,
            long? academicYearId,
            int? semester,
            long? sectionId,
            int? status)
        {
            try
            {
                using var connection = CreateConnection();

                var parameters = new DynamicParameters();

                parameters.Add("p_college_id", collegeId);
                parameters.Add("p_search", search);
                parameters.Add("p_department_id", departmentId);
                parameters.Add("p_course_id", courseId);
                parameters.Add("p_branch_id", branchId);
                parameters.Add("p_academic_year_id", academicYearId);
                parameters.Add("p_semester", semester);
                parameters.Add("p_section_id", sectionId);
                parameters.Add("p_status", status);

                var result = await connection.QueryAsync<StudentProfileListDto>(
                    "sp_student_profile_get_all",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving student profiles. CollegeId: {CollegeId}",
                    collegeId);

                throw;
            }
        }

        public async Task<StudentProfilePreviewDto?> GetPreviewAsync(
            long studentId,
            long collegeId)
        {
            try
            {
                using var connection = CreateConnection();

                var parameters = new DynamicParameters();

                parameters.Add("p_student_id", studentId);
                parameters.Add("p_college_id", collegeId);

                var row = await connection.QueryFirstOrDefaultAsync<StudentProfilePreviewFlatDto>(
                    "sp_student_profile_get_preview",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (row == null)
                {
                    return null;
                }

                return new StudentProfilePreviewDto
                {
                    FormData = string.IsNullOrWhiteSpace(row.FrontendFormDataJson) ? null : System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(row.FrontendFormDataJson),
                    Header = new StudentProfileHeaderDto
                    {
                        StudentId = row.StudentId,
                        StudentName = row.StudentName,
                        ProfilePhoto = row.ProfilePhoto,
                        Status = row.Status
                    },

                    Summary = new StudentProfileSummaryDto
                    {
                        RegistrationNumber = row.RegistrationNumber,
                        AdmissionNumber = row.AdmissionNumber,
                        RollNumber = row.RollNumber,
                        ProfileCompletionPercentage =
                            row.ProfileCompletionPercentage,
                        StudentStatus = row.StudentStatus,
                        FeeStatus = row.FeeStatus,
                        AttendanceStatus = row.AttendanceStatus,
                        ResultStatus = row.ResultStatus
                    },

                    AcademicInformation = new StudentAcademicInformationDto
                    {
                        CourseId = row.CourseId,
                        Course = row.Course,
                        DepartmentId = row.DepartmentId,
                        Department = row.Department,
                        BranchId = row.BranchId,
                        Branch = row.Branch,
                        AcademicYearId = row.AcademicYearId,
                        AcademicYear = row.AcademicYear,
                        Semester = row.Semester,
                        SectionId = row.SectionId,
                        Section = row.Section,
                        RollNumber = row.RollNumber,
                        RegistrationNumber = row.RegistrationNumber
                    },

                    PersonalInformation = new StudentPersonalInformationDto
                    {
                        FullName = row.PersonalFullName,
                        Gender = row.Gender,
                        DateOfBirth = row.DateOfBirth,
                        Mobile = row.Mobile,
                        Email = row.Email,
                        BloodGroup = row.BloodGroup,
                        Address = row.Address
                    },

                    ParentGuardianInformation =
                        new StudentParentGuardianInformationDto
                        {
                            FatherName = row.FatherName,
                            MotherName = row.MotherName,
                            ParentMobile = row.ParentMobile,
                            ParentEmail = row.ParentEmail,
                            FatherOccupation = row.FatherOccupation,
                            MotherOccupation = row.MotherOccupation
                        }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error retrieving student profile preview. StudentId: {StudentId}, CollegeId: {CollegeId}",
                    studentId,
                    collegeId);

                throw;
            }
        }

        public async Task<bool> UpdateAsync(
            long studentId,
            long collegeId,
            UpdateStudentProfileDto request,
            long changedBy,
            string? ipAddress,
            string? userAgent)
        {
            try
            {
                await using var connection = CreateConnection();
                var updated = await connection.QueryFirstOrDefaultAsync<int?>(
                    "sp_student_profile_full_update_v2",
                    new
                    {
                        p_student_id = studentId,
                        p_college_id = collegeId,
                        p_full_name = request.FullName,
                        p_gender = request.Gender,
                        p_date_of_birth = request.DateOfBirth,
                        p_email = request.Email,
                        p_mobile = request.Mobile,
                        p_blood_group = request.BloodGroup,
                        p_address = request.Address,
                        p_father_name = request.FatherName,
                        p_father_mobile = request.FatherMobile,
                        p_father_email = request.FatherEmail,
                        p_father_occupation = request.FatherOccupation,
                        p_mother_name = request.MotherName,
                        p_mother_mobile = request.MotherMobile,
                        p_mother_email = request.MotherEmail,
                        p_mother_occupation = request.MotherOccupation,
                        p_change_reason = request.ChangeReason,
                        p_changed_by = changedBy,
                        p_ip_address = ipAddress,
                        p_user_agent = userAgent,
                        p_form_data = request.Student?.GetRawText(),
                        p_profile_photo = request.ProfilePhoto ?? request.Photo
                    },
                    commandType: CommandType.StoredProcedure);

                return updated == 1;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error updating student profile. StudentId: {StudentId}, CollegeId: {CollegeId}",
                    studentId,
                    collegeId);
                throw;
            }
        }
    }
}
