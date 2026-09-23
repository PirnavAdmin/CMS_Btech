using BTech.Data;
using BTech.DTOs.Faculty;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services
{
    public class FacultyService : IFacultyService
    {
        private readonly ApplicationDbContext _context;

        public FacultyService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> UpdateFacultyAsync(
            long userId,
            FacultyUpdateDto request,
            string? updatedBy)
        {
            // 1. Faculty/User exists check
            var user = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.user_id == userId &&
                    u.DeletedAt == null);

            if (user == null)
                throw new Exception("Faculty not found.");

            // 2. Required validation
            if (string.IsNullOrWhiteSpace(request.FirstName))
                throw new Exception("First name is required.");

            if (string.IsNullOrWhiteSpace(request.Email))
                throw new Exception("Email is required.");

            if (string.IsNullOrWhiteSpace(request.PhoneNumber))
                throw new Exception("Phone number is required.");

            // 3. Duplicate Email check
            var emailExists = await _context.Users
                .AnyAsync(u =>
                    u.Email == request.Email &&
                    u.user_id != userId &&
                    u.DeletedAt == null);

            if (emailExists)
                throw new Exception("Email already exists.");

            // 4. Duplicate Mobile check
            var phoneExists = await _context.Users
                .AnyAsync(u =>
                    u.Mobile == request.PhoneNumber &&
                    u.user_id != userId &&
                    u.DeletedAt == null);

            if (phoneExists)
                throw new Exception("Phone number already exists.");

            // 5. Department validation
            var departmentExists = await _context.Departments
                .AnyAsync(d => d.DepartmentId == request.DepartmentId);

            if (!departmentExists)
                throw new Exception("Invalid department.");

            // 6. Update User
            user.FullName = $"{request.FirstName} {request.LastName}".Trim();
            user.Email = request.Email;
            user.Mobile = request.PhoneNumber;
            user.Status = (byte)request.Status;
            user.UpdatedAt = DateTime.UtcNow;

            if (long.TryParse(updatedBy, out var updatedById))
            {
                user.UpdatedBy = updatedById;
            }

            // 7. Find Employee Profile
            var profile = await _context.EmployeeProfiles
                .FirstOrDefaultAsync(e => e.UserId == userId);

            if (profile == null)
                throw new Exception("Faculty profile not found.");

            // 8. Update Employee Profile
            profile.DepartmentId = request.DepartmentId;
            profile.Designation = request.Designation;
            profile.Qualification = request.Qualification;
            profile.UpdatedAt = DateTime.UtcNow;

            if (long.TryParse(updatedBy, out var profileUpdatedById))
            {
                profile.UpdatedBy = profileUpdatedById;
            }

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<FacultyDetailsResponseDto?>
    GetFacultyDetailsAsync(long facultyId)
        {
            if (facultyId <= 0)
                throw new ArgumentException("Invalid faculty ID.");

            return await Task.FromResult<FacultyDetailsResponseDto?>(null);
        }

        public async Task<FacultyListResponseDto>
    GetFacultyListAsync(
        FacultyListRequestDto request)
        {
            if (request.PageNumber < 1)
            {
                request.PageNumber = 1;
            }

            if (request.PageSize < 1)
            {
                request.PageSize = 20;
            }

            if (request.PageSize > 100)
            {
                request.PageSize = 100;
            }

            if (request.CollegeId.HasValue &&
                request.CollegeId <= 0)
            {
                throw new ArgumentException("Invalid college ID.");
            }

            if (request.DepartmentId.HasValue &&
                request.DepartmentId <= 0)
            {
                throw new ArgumentException("Invalid department ID.");
            }

            request.Search =
                string.IsNullOrWhiteSpace(request.Search)
                    ? null
                    : request.Search.Trim();

            return await Task.FromResult(
                new FacultyListResponseDto());
        }

        public async Task<FacultyWorkloadResponseDto?>
    GetFacultyWorkloadAsync(long facultyId)
        {
            if (facultyId <= 0)
                throw new ArgumentException("Invalid faculty ID.");

            return await Task.FromResult<FacultyWorkloadResponseDto?>(null);
        }
    }
}