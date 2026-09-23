using BTech.DTOs.StudentAcademicInformation;
using BTech.Models;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public sealed class StudentAcademicInformationService : IStudentAcademicInformationService
    {
        private readonly IStudentAcademicInformationRepository _repository;

        public StudentAcademicInformationService(IStudentAcademicInformationRepository repository)
        {
            _repository = repository;
        }

        public async Task<StudentAcademicInformationResponseDto?> GetByIdAsync(int academicId)
        {
            ValidateAcademicId(academicId);

            var result = await _repository.GetByIdAsync(academicId);
            return result == null ? null : Map(result);
        }

        public async Task<StudentAcademicInformationResponseDto?> UpdateAsync(
            int academicId,
            UpdateStudentAcademicInformationDto dto)
        {
            ValidateAcademicId(academicId);

            if (dto == null)
                throw new ArgumentException("Academic information is required.");

            ValidateRequired(dto.RollNumber, "Roll number");
            ValidateRequired(dto.RegistrationNumber, "Registration number");
            ValidateRequired(dto.AdmissionNumber, "Admission number");
            ValidateRequired(dto.Course, "Course");
            ValidateRequired(dto.Branch, "Branch");
            ValidateRequired(dto.Department, "Department");
            ValidateRequired(dto.Section, "Section");
            ValidateRequired(dto.AcademicYear, "Academic year");

            if (dto.Semester <= 0)
                throw new ArgumentException("Semester must be greater than 0.");

            var existing = await _repository.GetByIdAsync(academicId);
            if (existing == null)
                return null;

            var entity = new StudentAcademicInformation
            {
                AcademicId = academicId,
                RollNumber = dto.RollNumber.Trim(),
                RegistrationNumber = dto.RegistrationNumber.Trim(),
                AdmissionNumber = dto.AdmissionNumber.Trim(),
                Course = dto.Course.Trim(),
                Branch = dto.Branch.Trim(),
                Department = dto.Department.Trim(),
                Semester = dto.Semester,
                Section = dto.Section.Trim(),
                AcademicYear = dto.AcademicYear.Trim()
            };

            var updated = await _repository.UpdateAsync(entity);
            return updated == null ? null : Map(updated);
        }

        private static void ValidateAcademicId(int academicId)
        {
            if (academicId <= 0)
                throw new ArgumentException("Valid academic ID is required.");
        }

        private static void ValidateRequired(string? value, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException($"{fieldName} is required.");
        }

        private static StudentAcademicInformationResponseDto Map(StudentAcademicInformation entity) => new()
        {
            AcademicId = entity.AcademicId,
            RollNumber = entity.RollNumber,
            RegistrationNumber = entity.RegistrationNumber,
            AdmissionNumber = entity.AdmissionNumber,
            Course = entity.Course,
            Branch = entity.Branch,
            Department = entity.Department,
            Semester = entity.Semester,
            Section = entity.Section,
            AcademicYear = entity.AcademicYear
        };
    }
}
