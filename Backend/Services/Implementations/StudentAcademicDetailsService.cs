using BTech.DTOs.StudentAcademicDetails;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public class StudentAcademicDetailsService : IStudentAcademicDetailsService
    {
        private readonly IStudentAcademicDetailsRepository _repository;

        public StudentAcademicDetailsService(IStudentAcademicDetailsRepository repository)
        {
            _repository = repository;
        }

        public async Task<StudentAcademicDetailsResponseDto?> GetAsync(long admissionId)
        {
            ValidateAdmissionId(admissionId);

            var result = await _repository.GetByAdmissionIdAsync(admissionId);
            return result == null ? null : Map(result);
        }

        public async Task<StudentAcademicDetailsResponseDto?> UpdateAsync(
            long admissionId,
            UpdateStudentAcademicDetailsDto dto,
            long? userId)
        {
            ValidateAdmissionId(admissionId);

            if (dto == null)
                throw new ArgumentException("Academic details are required.");

            if (dto.PreviousPercentage.HasValue &&
                (dto.PreviousPercentage.Value < 0 || dto.PreviousPercentage.Value > 100))
            {
                throw new ArgumentException("Previous percentage must be between 0 and 100.");
            }

            var entity = new StudentAcademicDetails
            {
                AdmissionId = admissionId,
                CollegeId = dto.CollegeId,
                DepartmentId = dto.DepartmentId,
                CourseId = dto.CourseId,
                BranchId = dto.BranchId,
                SemesterId = dto.SemesterId,
                AdmissionType = dto.AdmissionType,
                EntryType = dto.EntryType,
                Regulation = dto.Regulation,
                Batch = dto.Batch,
                BoardId = NormalizeId(dto.BoardId),
                AcademicYearId = NormalizeId(dto.AcademicYearId),
                AcademicLevelId = NormalizeId(dto.AcademicLevelId),
                GroupId = NormalizeId(dto.GroupId),
                SectionId = NormalizeId(dto.SectionId),
                Medium = Clean(dto.Medium),
                SecondLanguage = Clean(dto.SecondLanguage),
                PreviousSchool = Clean(dto.PreviousSchool),
                PreviousBoard = Clean(dto.PreviousBoard),
                PreviousYear = Clean(dto.PreviousYear),
                PreviousPercentage = dto.PreviousPercentage,
                PreviousHallTicket = Clean(dto.PreviousHallTicket),
                UpdatedBy = userId
            };

            var result = await _repository.UpdateAsync(entity);
            return result == null ? null : Map(result);
        }

        private static void ValidateAdmissionId(long admissionId)
        {
            if (admissionId <= 0)
                throw new ArgumentException("Valid AdmissionId is required.");
        }

        private static long? NormalizeId(long? value) =>
            value.HasValue && value.Value > 0 ? value : null;

        private static string? Clean(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static StudentAcademicDetailsResponseDto Map(StudentAcademicDetails entity)
        {
            return new StudentAcademicDetailsResponseDto
            {
                AdmissionId = entity.AdmissionId,
                RegistrationNo = entity.RegistrationNo,
                AdmissionNo = entity.AdmissionNo,
                StudentName = entity.StudentName,
                CollegeId = entity.CollegeId,
                DepartmentId = entity.DepartmentId,
                CourseId = entity.CourseId,
                BranchId = entity.BranchId,
                SemesterId = entity.SemesterId,
                AdmissionType = entity.AdmissionType,
                EntryType = entity.EntryType,
                Regulation = entity.Regulation,
                Batch = entity.Batch,
                BoardId = entity.BoardId,
                AcademicYearId = entity.AcademicYearId,
                AcademicLevelId = entity.AcademicLevelId,
                GroupId = entity.GroupId,
                SectionId = entity.SectionId,
                Medium = entity.Medium,
                SecondLanguage = entity.SecondLanguage,
                PreviousSchool = entity.PreviousSchool,
                PreviousBoard = entity.PreviousBoard,
                PreviousYear = entity.PreviousYear,
                PreviousPercentage = entity.PreviousPercentage,
                PreviousHallTicket = entity.PreviousHallTicket,
                UpdatedBy = entity.UpdatedBy,
                UpdatedAt = entity.UpdatedAt
            };
        }
    }
}
