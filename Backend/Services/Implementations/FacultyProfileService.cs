using BTech.Data;
using BTech.DTOs.Faculty;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services
{
    public class FacultyProfileService : IFacultyProfileService
    {
        private readonly ApplicationDbContext _context;

        public FacultyProfileService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<FacultyProfileResponseDto?> GetFacultyProfileAsync(
            long facultyId)
        {
            var profile = await _context.FacultyProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.FacultyId == facultyId &&
                    x.DeletedAt == null);

            if (profile == null)
                return null;

            return new FacultyProfileResponseDto
            {
                FacultyProfileId = profile.FacultyProfileId,
                FacultyId = profile.FacultyId,
                UserId = profile.UserId,

                DateOfBirth = profile.DateOfBirth,
                Gender = profile.Gender,

                HouseNumber = profile.HouseNumber,
                Address = profile.Address,
                Pincode = profile.Pincode,
                City = profile.City,
                District = profile.District,
                State = profile.State,
                Country = profile.Country,

                PermanentHouseNumber = profile.PermanentHouseNumber,
                PermanentAddress = profile.PermanentAddress,
                PermanentPincode = profile.PermanentPincode,
                PermanentCity = profile.PermanentCity,
                PermanentDistrict = profile.PermanentDistrict,
                PermanentState = profile.PermanentState,
                PermanentCountry = profile.PermanentCountry,

                AboutMe = profile.AboutMe,
                ProfileImagePath = profile.ProfileImagePath,

                EmergencyContactName = profile.EmergencyContactName,
                EmergencyContactNumber = profile.EmergencyContactNumber,
                EmergencyContactRelation = profile.EmergencyContactRelation,

                Status = profile.Status
            };
        }

        public async Task<bool> UpdateFacultyProfileAsync(
            long facultyId,
            FacultyProfileUpdateDto request,
            string? updatedBy)
        {
            var profile = await _context.FacultyProfiles
                .FirstOrDefaultAsync(x =>
                    x.FacultyId == facultyId &&
                    x.DeletedAt == null);

            if (profile == null)
                throw new Exception("Faculty profile not found.");

            profile.DateOfBirth = request.DateOfBirth;
            profile.Gender = request.Gender;

            profile.HouseNumber = request.HouseNumber;
            profile.Address = request.Address;
            profile.Pincode = request.Pincode;
            profile.City = request.City;
            profile.District = request.District;
            profile.State = request.State;
            profile.Country = request.Country;

            profile.PermanentHouseNumber = request.PermanentHouseNumber;
            profile.PermanentAddress = request.PermanentAddress;
            profile.PermanentPincode = request.PermanentPincode;
            profile.PermanentCity = request.PermanentCity;
            profile.PermanentDistrict = request.PermanentDistrict;
            profile.PermanentState = request.PermanentState;
            profile.PermanentCountry = request.PermanentCountry;

            profile.AboutMe = request.AboutMe;

            profile.EmergencyContactName =
                request.EmergencyContactName;

            profile.EmergencyContactNumber =
                request.EmergencyContactNumber;

            profile.EmergencyContactRelation =
                request.EmergencyContactRelation;

            profile.Status = request.Status;
            profile.UpdatedAt = DateTime.UtcNow;

            if (long.TryParse(updatedBy, out var updatedById))
            {
                profile.UpdatedBy = updatedById;
            }

            await _context.SaveChangesAsync();

            return true;
        }
    }
}