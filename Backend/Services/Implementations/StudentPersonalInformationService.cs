using BTech.DTOs.StudentProfile;
using BTech.Repositories.Interfaces;
using BTech.Services.Interfaces;

namespace BTech.Services.Implementations
{
    public sealed class StudentPersonalInformationService
        : IStudentPersonalInformationService
    {
        private readonly IStudentPersonalInformationRepository _repository;

        public StudentPersonalInformationService(
            IStudentPersonalInformationRepository repository)
        {
            _repository = repository;
        }

        public Task<StudentPersonalInformationResponseDto?> GetAsync(long studentId)
        {
            ValidateStudentId(studentId);
            return _repository.GetByStudentIdAsync(studentId);
        }

        public Task<StudentPersonalInformationResponseDto?> UpdateAsync(
            long studentId,
            UpdateStudentPersonalInformationRequestDto request,
            long changedBy,
            string? ipAddress,
            string? userAgent)
        {
            ValidateStudentId(studentId);

            if (changedBy <= 0)
                throw new ArgumentException("A valid logged-in user is required.");

            if (request.DateOfBirth.HasValue &&
                request.DateOfBirth.Value.Date > DateTime.UtcNow.Date)
            {
                throw new ArgumentException("Date of birth cannot be in the future.");
            }

            Trim(request);

            if (request.FullName != null && string.IsNullOrWhiteSpace(request.FullName))
                throw new ArgumentException("Full name cannot be empty.");

            if (request.Email != null && string.IsNullOrWhiteSpace(request.Email))
                throw new ArgumentException("Email cannot be empty.");

            if (request.Mobile != null && string.IsNullOrWhiteSpace(request.Mobile))
                throw new ArgumentException("Mobile cannot be empty.");

            if (!HasUpdateField(request))
                throw new ArgumentException("At least one personal-information field is required.");

            return _repository.UpdateAsync(
                studentId,
                request,
                changedBy,
                Limit(ipAddress, 45),
                Limit(userAgent, 500));
        }

        private static void ValidateStudentId(long studentId)
        {
            if (studentId <= 0)
                throw new ArgumentException("A valid student ID is required.");
        }

        private static void Trim(UpdateStudentPersonalInformationRequestDto request)
        {
            request.FullName = request.FullName?.Trim();
            request.Gender = request.Gender?.Trim();
            request.Email = request.Email?.Trim();
            request.Mobile = request.Mobile?.Trim();
            request.ProfilePhoto = request.ProfilePhoto?.Trim();
            request.AlternateEmail = request.AlternateEmail?.Trim();
            request.AlternateMobile = request.AlternateMobile?.Trim();
            request.BloodGroup = request.BloodGroup?.Trim();
            request.Nationality = request.Nationality?.Trim();
            request.Religion = request.Religion?.Trim();
            request.Category = request.Category?.Trim();
            request.Address = request.Address?.Trim();
            request.City = request.City?.Trim();
            request.District = request.District?.Trim();
            request.State = request.State?.Trim();
            request.Country = request.Country?.Trim();
            request.Pincode = request.Pincode?.Trim();
            request.ChangeReason = request.ChangeReason?.Trim();
        }

        private static bool HasUpdateField(UpdateStudentPersonalInformationRequestDto request) =>
            request.FullName != null ||
            request.Gender != null ||
            request.DateOfBirth.HasValue ||
            request.Email != null ||
            request.Mobile != null ||
            request.ProfilePhoto != null ||
            request.AlternateEmail != null ||
            request.AlternateMobile != null ||
            request.BloodGroup != null ||
            request.Nationality != null ||
            request.Religion != null ||
            request.Category != null ||
            request.Address != null ||
            request.City != null ||
            request.District != null ||
            request.State != null ||
            request.Country != null ||
            request.Pincode != null ||
            request.HouseNumber != null ||
            request.PermanentHouseNumber != null ||
            request.PermanentAddress != null ||
            request.PermanentPincode != null ||
            request.PermanentCity != null ||
            request.PermanentDistrict != null ||
            request.PermanentState != null ||
            request.PermanentCountry != null;

        private static string? Limit(string? value, int maximumLength) =>
            value != null && value.Length > maximumLength
                ? value[..maximumLength]
                : value;
    }
}
