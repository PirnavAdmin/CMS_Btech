using BTech.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/faculty")]
[Authorize]
public class FacultyProfilePhotoController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public FacultyProfilePhotoController(ApplicationDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    // POST: api/v1/faculty/{facultyId}/profile-photo
    [HttpPost("{facultyId:long}/profile-photo")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> Upload(long facultyId, IFormFile file)
    {
        if (facultyId <= 0)
            return BadRequest(new { success = false, message = "Invalid faculty ID." });

        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, message = "Profile photo file is required." });

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(extension))
            return BadRequest(new { success = false, message = "Only JPG, JPEG, PNG and WEBP files are allowed." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { success = false, message = "Profile photo must be 5 MB or smaller." });

        var faculty = await _context.Faculties.FirstOrDefaultAsync(x => x.FacultyId == facultyId && x.DeletedAt == null);
        if (faculty == null)
            return NotFound(new { success = false, message = "Faculty not found." });

        var profile = await _context.FacultyProfiles.FirstOrDefaultAsync(x => x.FacultyId == facultyId && x.DeletedAt == null);
        if (profile == null)
            return NotFound(new { success = false, message = "Faculty profile not found. Create the profile first." });

        var root = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
            root = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

        var relativeDirectory = Path.Combine("uploads", "faculty-profile-photos");
        var directory = Path.Combine(root, relativeDirectory);
        Directory.CreateDirectory(directory);

        var fileName = $"faculty_{facultyId}_{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(directory, fileName);
        await using (var stream = new FileStream(fullPath, FileMode.CreateNew))
            await file.CopyToAsync(stream);

        profile.ProfileImagePath = "/" + Path.Combine(relativeDirectory, fileName).Replace('\\', '/');
        profile.UpdatedAt = DateTime.UtcNow;
        profile.UpdatedBy = GetCurrentUserId();
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Faculty profile photo uploaded successfully.",
            data = new { facultyId, profileImagePath = profile.ProfileImagePath }
        });
    }

    private long? GetCurrentUserId()
    {
        var value = User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value;
        return long.TryParse(value, out var id) ? id : null;
    }
}
