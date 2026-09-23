using BTech.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/faculty")]
[Authorize]
public class FacultySummaryController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    public FacultySummaryController(ApplicationDbContext context) => _context = context;

    // GET: api/v1/faculty/summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var total = await _context.Faculties.CountAsync(x => x.DeletedAt == null);
        var active = await _context.Faculties.CountAsync(x => x.DeletedAt == null && x.Status == 1);
        var inactive = await _context.Faculties.CountAsync(x => x.DeletedAt == null && x.Status != 1);
        var hods = await _context.Faculties.CountAsync(x => x.DeletedAt == null && x.IsHod == 1);

        return Ok(new
        {
            success = true,
            message = "Faculty summary retrieved successfully.",
            data = new { totalFaculty = total, activeFaculty = active, inactiveFaculty = inactive, hodFaculty = hods }
        });
    }
}
