using System.Text.Json;
using BTech.Data;
using BTech.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers
{
    [ApiController]
    [Route("api/student-parents")]
    public class StudentParentController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public StudentParentController(ApplicationDbContext context) => _context = context;

        [HttpGet("{studentId:long}")]
        public async Task<IActionResult> GetParentDetails(long studentId)
        {
            if (studentId <= 0) return BadRequest(new { success = false, message = "Valid studentId is required." });
            var parent = await _context.StudentParents.AsNoTracking().FirstOrDefaultAsync(x => x.StudentId == studentId);
            if (parent == null)
            {
                var admission = await (from st in _context.Students.AsNoTracking()
                                       join sa in _context.StudentAdmissions.AsNoTracking() on st.AdmissionId equals sa.AdmissionId
                                       where st.StudentId == studentId && st.DeletedAt == null && !sa.IsDeleted
                                       select sa).FirstOrDefaultAsync();
                if (admission == null) return NotFound(new { success = false, message = "Parent information not found for this student." });
                parent = FromAdmission(studentId, admission);
            }
            return Ok(new { success = true, message = "Parent information retrieved successfully.", data = parent });
        }

        [HttpPut("{studentId:long}")]
        public async Task<IActionResult> UpdateParentDetails(long studentId, [FromBody] StudentParent request)
        {
            if (studentId <= 0) return BadRequest(new { success = false, message = "Valid studentId is required." });
            var studentExists = await _context.Students.AnyAsync(x => x.StudentId == studentId && x.DeletedAt == null);
            if (!studentExists) return NotFound(new { success = false, message = "Student not found." });

            var parent = await _context.StudentParents.FirstOrDefaultAsync(x => x.StudentId == studentId);
            if (parent == null)
            {
                parent = new StudentParent { StudentId = studentId, CreatedAt = DateTime.UtcNow };
                _context.StudentParents.Add(parent);
            }
            Copy(request, parent);
            parent.StudentId = studentId;
            parent.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Keep the linked admission parent/address fields consistent where a student originated from admission.
            var admission = await (from st in _context.Students
                                   join sa in _context.StudentAdmissions on st.AdmissionId equals sa.AdmissionId
                                   where st.StudentId == studentId && st.DeletedAt == null && !sa.IsDeleted
                                   select sa).FirstOrDefaultAsync();
            if (admission != null)
            {
                admission.FatherName = parent.FatherName;
                admission.MotherName = parent.MotherName;
                admission.GuardianName = parent.GuardianName;
                admission.Occupation = parent.Occupation ?? parent.FatherOccupation;
                admission.AnnualIncome = parent.AnnualIncome;
                admission.MotherEmail = parent.MotherEmail;
                admission.GuardianMobile = parent.GuardianMobile;
                admission.GuardianEmail = parent.GuardianEmail;
                admission.Address = parent.Address;
                admission.City = parent.City;
                admission.District = parent.District;
                admission.State = parent.State;
                admission.Pincode = parent.Pincode;
                admission.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, message = "Parent information updated successfully.", data = parent });
        }

        private static void Copy(StudentParent source, StudentParent target)
        {
            target.FatherName = source.FatherName; target.FatherMobile = source.FatherMobile; target.FatherEmail = source.FatherEmail; target.FatherOccupation = source.FatherOccupation;
            target.MotherName = source.MotherName; target.MotherMobile = source.MotherMobile; target.MotherEmail = source.MotherEmail; target.MotherOccupation = source.MotherOccupation;
            target.GuardianName = source.GuardianName; target.GuardianMobile = source.GuardianMobile; target.GuardianEmail = source.GuardianEmail;
            target.Occupation = source.Occupation; target.AnnualIncome = source.AnnualIncome;
            target.Address = source.Address; target.City = source.City; target.District = source.District; target.State = source.State; target.Pincode = source.Pincode;
            target.CurrentAddressJson = source.CurrentAddressJson; target.PermanentAddressJson = source.PermanentAddressJson;
        }

        private static StudentParent FromAdmission(long studentId, StudentAdmission a) => new()
        {
            StudentId = studentId, FatherName = a.FatherName, MotherName = a.MotherName, GuardianName = a.GuardianName,
            MotherEmail = a.MotherEmail, GuardianMobile = a.GuardianMobile, GuardianEmail = a.GuardianEmail,
            Occupation = a.Occupation, AnnualIncome = a.AnnualIncome, Address = a.Address, City = a.City, District = a.District, State = a.State, Pincode = a.Pincode,
            CreatedAt = a.CreatedAt, UpdatedAt = a.UpdatedAt
        };
    }
}
