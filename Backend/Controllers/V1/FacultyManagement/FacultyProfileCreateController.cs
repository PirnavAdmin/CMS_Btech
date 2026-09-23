using BTech.Data;
using BTech.DTOs.Faculty;
using BTech.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/faculty-profile")]
[Authorize]
public class FacultyProfileCreateController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public FacultyProfileCreateController(ApplicationDbContext context) => _context = context;

    // POST: api/v1/faculty-profile/{facultyId}
    [HttpPost("{facultyId:long}")]
    public async Task<IActionResult> Create(long facultyId, [FromBody] FacultyProfileUpdateDto request)
    {
        if (facultyId <= 0)
            return BadRequest(new { success = false, message = "Invalid faculty ID." });

        if (await _context.FacultyProfiles.AnyAsync(x => x.FacultyId == facultyId && x.DeletedAt == null))
            return Conflict(new { success = false, message = "Faculty profile already exists." });

        var faculty = await _context.Faculties.AsNoTracking().FirstOrDefaultAsync(x => x.FacultyId == facultyId && x.DeletedAt == null);
        if (faculty == null)
            return NotFound(new { success = false, message = "Faculty not found." });

        var profile = new FacultyProfile
        {
            FacultyId = faculty.FacultyId,
            UserId = faculty.UserId,
            EmployeeProfileId = faculty.EmployeeProfileId,
            DateOfBirth = request.DateOfBirth,
            Gender = request.Gender,
            HouseNumber = request.HouseNumber,
            Address = request.Address,
            Pincode = request.Pincode,
            City = request.City,
            District = request.District,
            State = request.State,
            Country = request.Country ?? "India",
            PermanentHouseNumber = request.PermanentHouseNumber,
            PermanentAddress = request.PermanentAddress,
            PermanentPincode = request.PermanentPincode,
            PermanentCity = request.PermanentCity,
            PermanentDistrict = request.PermanentDistrict,
            PermanentState = request.PermanentState,
            PermanentCountry = request.PermanentCountry ?? "India",
            AboutMe = request.AboutMe,
            EmergencyContactName = request.EmergencyContactName,
            EmergencyContactNumber = request.EmergencyContactNumber,
            EmergencyContactRelation = request.EmergencyContactRelation,
            Status = request.Status == 0 ? (byte)1 : request.Status,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = GetCurrentUserId()
        };

        _context.FacultyProfiles.Add(profile);
        await _context.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new
        {
            success = true,
            message = "Faculty profile created successfully.",
            data = profile
        });
    }

    private long? GetCurrentUserId()
    {
        var value = User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value;
        return long.TryParse(value, out var id) ? id : null;
    }
}
