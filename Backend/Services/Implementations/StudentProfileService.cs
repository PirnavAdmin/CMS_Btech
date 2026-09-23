using BTech.DTOs;
using BTech.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using UserRoleManagement.API.Data;

namespace BTech.Services.Implementations
{
    public class StudentProfileService : IStudentProfileService
    {
        private readonly AppDbContext _context;

        public StudentProfileService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<StudentProfileDto?> GetStudentProfileAsync(long userId)
        {
            // Get user
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.user_id == userId);

            if (user == null)
            {
                return null;
            }

            // Get college name
            string? collegeName = null;

            if (user.college_id.HasValue)
            {
                collegeName = await _context.Colleges
                    .AsNoTracking()
                    .Where(x => x.CollegeId == user.college_id.Value)
                    .Select(x => x.CollegeName)
                    .FirstOrDefaultAsync();
            }

            // Return student profile
            return new StudentProfileDto
            {
                UserId = user.user_id,

                EmployeeUserId = user.EmployeeUserId,

                FullName = user.FullName,

                Email = user.Email,

                Mobile = user.Mobile,

                CollegeId = user.college_id,

                CollegeName = collegeName,

                // Future Attendance Module
                AttendanceSummary = new AttendanceSummaryDto
                {
                    Percentage = 0,

                    TotalClasses = 0,

                    PresentClasses = 0,

                    AbsentClasses = 0,

                    Status = "Not Available"
                }
            };
        }
    }
}