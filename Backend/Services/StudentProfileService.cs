using BTech.Data;
using BTech.DTOs.StudentProfile;
using BTech.Services.Interfaces;
using BTech.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BTech.Services
{
    public class LegacyStudentProfileService : ILegacyStudentProfileService
    {
        private readonly ApplicationDbContext _context;

        public LegacyStudentProfileService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<StudentProfileDto?> GetByStudentIdAsync(long studentId)
        {
            var student = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.StudentId == studentId &&
                    x.DeletedAt == null);

            if (student == null)
                return null;

            return new StudentProfileDto
            {
                StudentId = student.StudentId,
                StudentName = student.FullName,
                Gender = student.Gender,
                DateOfBirth = student.DateOfBirth,
                Email = student.Email,
                Mobile = student.Mobile,
                BloodGroup = student.BloodGroup,
                Address = student.Address,
                CourseId = student.CourseId,
                BranchId = student.BranchId,
                AcademicYearId = student.AcademicYearId,

                // Future Fees Module integration point
                FeeSummary = null
            };
        }
    }
}