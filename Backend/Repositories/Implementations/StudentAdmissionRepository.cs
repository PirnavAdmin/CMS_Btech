using System.Data;
using System.Data.Common;
using BTech.Data;
using BTech.Models;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace BTech.Repositories.Implementations
{
    public class StudentAdmissionRepository : IStudentAdmissionRepository
    {
        private readonly ApplicationDbContext _context;

        public StudentAdmissionRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<StudentAdmission?> CreateAsync(StudentAdmission entity) =>
            ExecuteWriteAsync("sp_StudentAdmission_Create", entity, false);

        public Task<StudentAdmission?> UpdateAsync(StudentAdmission entity) =>
            ExecuteWriteAsync("sp_StudentAdmission_Update", entity, true);

        public async Task<StudentAdmission?> GetByIdAsync(long admissionId)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose) await connection.OpenAsync();

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "sp_StudentAdmission_GetById";
                command.CommandType = CommandType.StoredProcedure;
                AddParameter(command, "p_admission_id", admissionId);

                await using var reader = await command.ExecuteReaderAsync();
                return await reader.ReadAsync() ? Map(reader) : null;
            }
            finally
            {
                if (shouldClose) await connection.CloseAsync();
            }
        }

        public async Task<(IReadOnlyList<StudentAdmission> Items, long TotalRecords)> GetAllAsync(
            string? search,
            string? admissionStatus,
            int pageNumber,
            int pageSize, long? courseId = null, long? departmentId = null, long? branchId = null, long? semesterId = null, long? academicYearId = null)
        {
            var items = new List<StudentAdmission>();
            long totalRecords = 0;
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose) await connection.OpenAsync();

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "sp_student_admission_list_v2";
                command.CommandType = CommandType.StoredProcedure;
                AddParameter(command, "p_search", search);
                AddParameter(command, "p_admission_status", admissionStatus);
                AddParameter(command, "p_page_number", pageNumber);
                AddParameter(command, "p_page_size", pageSize);
                AddParameter(command, "p_course_id", courseId);
                AddParameter(command, "p_department_id", departmentId);
                AddParameter(command, "p_branch_id", branchId);
                AddParameter(command, "p_semester_id", semesterId);
                AddParameter(command, "p_academic_year_id", academicYearId);


                await using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    if (totalRecords == 0)
                        totalRecords = Convert.ToInt64(reader["TotalRecords"]);
                    items.Add(Map(reader));
                }
            }
            finally
            {
                if (shouldClose) await connection.CloseAsync();
            }

            return (items, totalRecords);
        }

        public async Task SaveFormDataAsync(
            long admissionId,
            string formDataJson,
            long? updatedBy)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose) await connection.OpenAsync();

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "sp_student_admission_form_data_upsert";
                command.CommandType = CommandType.StoredProcedure;
                AddParameter(command, "p_admission_id", admissionId);
                AddParameter(command, "p_form_data", formDataJson);
                AddParameter(command, "p_updated_by", updatedBy);
                await command.ExecuteNonQueryAsync();
            }
            finally
            {
                if (shouldClose) await connection.CloseAsync();
            }
        }

        private async Task<StudentAdmission?> ExecuteWriteAsync(
            string procedureName,
            StudentAdmission entity,
            bool isUpdate)
        {
            var connection = _context.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose) await connection.OpenAsync();

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = procedureName;
                command.CommandType = CommandType.StoredProcedure;

                if (isUpdate)
                    AddParameter(command, "p_admission_id", entity.AdmissionId);

            AddParameter(command, "p_registration_no", entity.RegistrationNo);
            AddParameter(command, "p_registration_date", entity.RegistrationDate?.Date);
            AddParameter(command, "p_application_no", entity.ApplicationNo);
            AddParameter(command, "p_application_date", entity.ApplicationDate?.Date);
            AddParameter(command, "p_admission_no", entity.AdmissionNo);
            AddParameter(command, "p_admission_date", entity.AdmissionDate?.Date);
            AddParameter(command, "p_admission_type", entity.AdmissionType);
            AddParameter(command, "p_admission_quota", entity.AdmissionQuota);
            AddParameter(command, "p_medium", entity.Medium);
            AddParameter(command, "p_scholarship_status", entity.ScholarshipStatus);
            AddParameter(command, "p_first_name", entity.FirstName);
            AddParameter(command, "p_last_name", entity.LastName);
            AddParameter(command, "p_gender", entity.Gender);
            AddParameter(command, "p_date_of_birth", entity.DateOfBirth.Date);
            AddParameter(command, "p_blood_group", entity.BloodGroup);
            AddParameter(command, "p_student_photo", entity.StudentPhoto);
            AddParameter(command, "p_email", entity.Email);
            AddParameter(command, "p_student_email", entity.StudentEmail);
            AddParameter(command, "p_mobile_number", entity.MobileNumber);
            AddParameter(command, "p_aadhaar_number", entity.AadhaarNumber);
            AddParameter(command, "p_nationality", entity.Nationality);
            AddParameter(command, "p_religion", entity.Religion);
            AddParameter(command, "p_category", entity.Category);
            AddParameter(command, "p_father_name", entity.FatherName);
            AddParameter(command, "p_mother_name", entity.MotherName);
            AddParameter(command, "p_guardian_name", entity.GuardianName);
            AddParameter(command, "p_occupation", entity.Occupation);
            AddParameter(command, "p_annual_income", entity.AnnualIncome);
            AddParameter(command, "p_mother_email", entity.MotherEmail);
            AddParameter(command, "p_guardian_mobile", entity.GuardianMobile);
            AddParameter(command, "p_guardian_email", entity.GuardianEmail);
            AddParameter(command, "p_address", entity.Address);
            AddParameter(command, "p_city", entity.City);
            AddParameter(command, "p_district", entity.District);
            AddParameter(command, "p_state", entity.State);
            AddParameter(command, "p_pincode", entity.Pincode);
            AddParameter(command, "p_board_id", entity.BoardId);
            AddParameter(command, "p_academic_year_id", entity.AcademicYearId);
            AddParameter(command, "p_academic_level_id", entity.AcademicLevelId);
            AddParameter(command, "p_group_id", entity.GroupId);
            AddParameter(command, "p_section_id", entity.SectionId);
            AddParameter(command, "p_second_language", entity.SecondLanguage);
            AddParameter(command, "p_previous_school", entity.PreviousSchool);
            AddParameter(command, "p_previous_board", entity.PreviousBoard);
            AddParameter(command, "p_previous_year", entity.PreviousYear);
            AddParameter(command, "p_previous_percentage", entity.PreviousPercentage);
            AddParameter(command, "p_previous_hall_ticket", entity.PreviousHallTicket);
            AddParameter(command, "p_birth_certificate", entity.BirthCertificate);
            AddParameter(command, "p_transfer_certificate", entity.TransferCertificate);
            AddParameter(command, "p_study_certificate", entity.StudyCertificate);
            AddParameter(command, "p_aadhaar_document", entity.AadhaarDocument);
            AddParameter(command, "p_community_certificate", entity.CommunityCertificate);
            AddParameter(command, "p_income_certificate", entity.IncomeCertificate);
            AddParameter(command, "p_passport_photo", entity.PassportPhoto);
            AddParameter(command, "p_marks_memo", entity.MarksMemo);
            AddParameter(command, "p_caste_certificate", entity.CasteCertificate);
            AddParameter(command, "p_tenth_certificate", entity.TenthCertificate);
            AddParameter(command, "p_status", entity.Status);
            AddParameter(command, "p_admission_status", entity.AdmissionStatus);
            AddParameter(command, "p_interview_required", entity.InterviewRequired);
            AddParameter(command, "p_admission_fee_amount", entity.AdmissionFeeAmount);
            AddParameter(command, "p_remarks", entity.Remarks);
            AddParameter(command, "p_is_active", entity.IsActive);

                AddParameter(command, isUpdate ? "p_updated_by" : "p_created_by",
                    isUpdate ? entity.UpdatedBy : entity.CreatedBy);

                await using var reader = await command.ExecuteReaderAsync();
                return await reader.ReadAsync() ? Map(reader) : null;
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                throw new ArgumentException(ex.Message, ex);
            }
            finally
            {
                if (shouldClose) await connection.CloseAsync();
            }
        }


        private static void AddParameter(DbCommand command, string name, object? value)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        private static StudentAdmission Map(DbDataReader reader)
        {
            return new StudentAdmission
            {
                AdmissionId = GetInt64(reader, "AdmissionId") ?? 0,
                RegistrationNo = GetString(reader, "RegistrationNo"),
                RegistrationDate = GetDateTime(reader, "RegistrationDate"),
                ApplicationNo = GetString(reader, "ApplicationNo"),
                ApplicationDate = GetDateTime(reader, "ApplicationDate"),
                AdmissionNo = GetString(reader, "AdmissionNo"),
                AdmissionDate = GetDateTime(reader, "AdmissionDate"),
                AdmissionType = GetString(reader, "AdmissionType"),
                AdmissionQuota = GetString(reader, "AdmissionQuota"),
                Medium = GetString(reader, "Medium"),
                ScholarshipStatus = GetString(reader, "ScholarshipStatus"),
                FirstName = GetString(reader, "FirstName") ?? string.Empty,
                LastName = GetString(reader, "LastName"),
                Gender = GetString(reader, "Gender") ?? string.Empty,
                DateOfBirth = GetDateTime(reader, "DateOfBirth") ?? default,
                BloodGroup = GetString(reader, "BloodGroup"),
                StudentPhoto = GetString(reader, "StudentPhoto"),
                Email = GetString(reader, "Email"),
                StudentEmail = GetString(reader, "StudentEmail"),
                MobileNumber = GetString(reader, "MobileNumber"),
                AadhaarNumber = GetString(reader, "AadhaarNumber"),
                Nationality = GetString(reader, "Nationality"),
                Religion = GetString(reader, "Religion"),
                Category = GetString(reader, "Category"),
                FatherName = GetString(reader, "FatherName"),
                MotherName = GetString(reader, "MotherName"),
                GuardianName = GetString(reader, "GuardianName"),
                Occupation = GetString(reader, "Occupation"),
                AnnualIncome = GetDecimal(reader, "AnnualIncome"),
                MotherEmail = GetString(reader, "MotherEmail"),
                GuardianMobile = GetString(reader, "GuardianMobile"),
                GuardianEmail = GetString(reader, "GuardianEmail"),
                Address = GetString(reader, "Address"),
                City = GetString(reader, "City"),
                District = GetString(reader, "District"),
                State = GetString(reader, "State"),
                Pincode = GetString(reader, "Pincode"),
                BoardId = GetInt64(reader, "BoardId"),
                AcademicYearId = GetInt64(reader, "AcademicYearId"),
                AcademicLevelId = GetInt64(reader, "AcademicLevelId"),
                GroupId = GetInt64(reader, "GroupId"),
                SectionId = GetInt64(reader, "SectionId"),
                StudentId = GetInt64IfExists(reader, "StudentId"),
                AdmissionCollegeId = GetInt64IfExists(reader, "AdmissionCollegeId"),
                AdmissionCollegeName = GetStringIfExists(reader, "AdmissionCollegeName"),
                AdmissionDepartmentId = GetInt64IfExists(reader, "AdmissionDepartmentId"),
                AdmissionDepartmentName = GetStringIfExists(reader, "AdmissionDepartmentName"),
                AdmissionCourseId = GetInt64IfExists(reader, "AdmissionCourseId"),
                AdmissionCourseName = GetStringIfExists(reader, "AdmissionCourseName"),
                AdmissionBranchId = GetInt64IfExists(reader, "AdmissionBranchId"),
                AdmissionBranchName = GetStringIfExists(reader, "AdmissionBranchName"),
                AcademicYearName = GetStringIfExists(reader, "AcademicYearName"),
                SemesterId = GetInt64IfExists(reader, "SemesterId"),
                SemesterNumber = GetInt32IfExists(reader, "SemesterNumber"),
                SemesterName = GetStringIfExists(reader, "SemesterName"),
                SectionName = GetStringIfExists(reader, "SectionName"),
                EntryType = GetStringIfExists(reader, "EntryType"),
                Regulation = GetStringIfExists(reader, "Regulation"),
                Batch = GetStringIfExists(reader, "Batch"),
                SecondLanguage = GetString(reader, "SecondLanguage"),
                PreviousSchool = GetString(reader, "PreviousSchool"),
                PreviousBoard = GetString(reader, "PreviousBoard"),
                PreviousYear = GetString(reader, "PreviousYear"),
                PreviousPercentage = GetDecimal(reader, "PreviousPercentage"),
                PreviousHallTicket = GetString(reader, "PreviousHallTicket"),
                BirthCertificate = GetString(reader, "BirthCertificate"),
                TransferCertificate = GetString(reader, "TransferCertificate"),
                StudyCertificate = GetString(reader, "StudyCertificate"),
                AadhaarDocument = GetString(reader, "AadhaarDocument"),
                CommunityCertificate = GetString(reader, "CommunityCertificate"),
                IncomeCertificate = GetString(reader, "IncomeCertificate"),
                PassportPhoto = GetString(reader, "PassportPhoto"),
                MarksMemo = GetString(reader, "MarksMemo"),
                CasteCertificate = GetString(reader, "CasteCertificate"),
                TenthCertificate = GetString(reader, "TenthCertificate"),
                Status = GetString(reader, "Status"),
                AdmissionStatus =
                    GetString(reader, "AdmissionStatus") ?? "Draft",
                IsVerified = GetBool(reader, "IsVerified"),
                IsApproved = GetBool(reader, "IsApproved"),
                IsRejected = GetBool(reader, "IsRejected"),
                SubmittedAt = GetDateTime(reader, "SubmittedAt"),
                ReviewedAt = GetDateTime(reader, "ReviewedAt"),
                ApprovedAt = GetDateTime(reader, "ApprovedAt"),
                RejectedAt = GetDateTime(reader, "RejectedAt"),
                AdmittedAt = GetDateTime(reader, "AdmittedAt"),
                CancelledAt = GetDateTime(reader, "CancelledAt"),
                WithdrawnAt = GetDateTime(reader, "WithdrawnAt"),
                ReviewedBy = GetInt64(reader, "ReviewedBy"),
                ApprovedBy = GetInt64(reader, "ApprovedBy"),
                RejectedBy = GetInt64(reader, "RejectedBy"),
                CancelledBy = GetInt64(reader, "CancelledBy"),
                RejectionReason = GetString(reader, "RejectionReason"),
                CancellationReason = GetString(reader, "CancellationReason"),
                WithdrawalReason = GetString(reader, "WithdrawalReason"),
                DocumentsVerified = GetBool(reader, "DocumentsVerified"),
                DocumentsVerifiedBy = GetInt64(reader, "DocumentsVerifiedBy"),
                DocumentsVerifiedAt = GetDateTime(reader, "DocumentsVerifiedAt"),
                InterviewRequired = GetBool(reader, "InterviewRequired"),
                InterviewDate = GetDateTime(reader, "InterviewDate"),
                InterviewStatus = GetString(reader, "InterviewStatus") ?? "Not Required",
                InterviewRemarks = GetString(reader, "InterviewRemarks"),
                OfferDate = GetDateTime(reader, "OfferDate"),
                OfferExpiryDate = GetDateTime(reader, "OfferExpiryDate"),
                OfferAcceptedAt = GetDateTime(reader, "OfferAcceptedAt"),
                AdmissionFeeAmount = GetDecimal(reader, "AdmissionFeeAmount") ?? 0m,
                AdmissionFeePaid = GetBool(reader, "AdmissionFeePaid"),
                AdmissionFeePaidAt = GetDateTime(reader, "AdmissionFeePaidAt"),
                WaitlistNumber = GetInt32(reader, "WaitlistNumber"),
                WaitlistedAt = GetDateTime(reader, "WaitlistedAt"),
                Remarks = GetString(reader, "Remarks"),
                IsActive = GetBool(reader, "IsActive"),
                CreatedBy = GetInt64(reader, "CreatedBy"),
                CreatedAt = GetDateTime(reader, "CreatedAt") ?? default,
                UpdatedBy = GetInt64(reader, "UpdatedBy"),
                UpdatedAt = GetDateTime(reader, "UpdatedAt") ?? default,
                FrontendFormDataJson = GetStringIfExists(reader, "FrontendFormDataJson")
            };
        }

        private static int Ordinal(DbDataReader reader, string name) => reader.GetOrdinal(name);
        private static string? GetString(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name); return reader.IsDBNull(i) ? null : Convert.ToString(reader.GetValue(i));
        }
        private static long? GetInt64(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name); return reader.IsDBNull(i) ? null : Convert.ToInt64(reader.GetValue(i));
        }
        private static decimal? GetDecimal(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name); return reader.IsDBNull(i) ? null : Convert.ToDecimal(reader.GetValue(i));
        }
        private static DateTime? GetDateTime(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name); return reader.IsDBNull(i) ? null : Convert.ToDateTime(reader.GetValue(i));
        }
        private static bool GetBool(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name); return !reader.IsDBNull(i) && Convert.ToBoolean(reader.GetValue(i));
        }
        private static int? GetInt32(DbDataReader reader, string name)
        {
            var i = Ordinal(reader, name); return reader.IsDBNull(i) ? null : Convert.ToInt32(reader.GetValue(i));
        }
        private static string? GetStringIfExists(DbDataReader reader, string name)
        {
            try
            {
                return GetString(reader, name);
            }
            catch (IndexOutOfRangeException)
            {
                return null;
            }
        }
        private static long? GetInt64IfExists(DbDataReader reader, string name)
        {
            try
            {
                return GetInt64(reader, name);
            }
            catch (IndexOutOfRangeException)
            {
                return null;
            }
        }
        private static int? GetInt32IfExists(DbDataReader reader, string name)
        {
            try
            {
                return GetInt32(reader, name);
            }
            catch (IndexOutOfRangeException)
            {
                return null;
            }
        }
    }
}
