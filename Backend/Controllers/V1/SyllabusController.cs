using System.Security.Claims;
using BTech.DTOs.Syllabus;
using BTech.Middleware;
using BTech.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BTech.Controllers.V1;

[ApiController]
[Authorize]
[Route("api/v1/syllabi")]
public sealed class SyllabusController(ISyllabusService service) : ControllerBase
{
    [HttpGet]
    public Task<IActionResult> List([FromQuery] SyllabusFilter filter) =>
        Execute(async () => Envelope(await service.List(Access(filter.CollegeId), filter)));

    [HttpGet("published")]
    public Task<IActionResult> Published([FromQuery] SyllabusFilter filter) =>
        Execute(async () => Envelope(await service.List(Access(filter.CollegeId, portal: true), filter)));

    [HttpGet("{id:long}")]
    public Task<IActionResult> Get(long id, [FromQuery] long? collegeId) =>
        Execute(async () => Envelope(await service.Get(Access(collegeId), id)));

    [HttpPost]
    public Task<IActionResult> Create(SyllabusInput input) =>
        Execute(async () => Envelope(new { syllabusId = await service.Save(Access(input.CollegeId), null, input) }, 201));

    [HttpPatch("{id:long}")]
    public Task<IActionResult> Update(long id, SyllabusInput input) =>
        Execute(async () => Envelope(new { syllabusId = await service.Save(Access(input.CollegeId), id, input) }));

    [HttpPost("{id:long}/publish")]
    public Task<IActionResult> Publish(long id, [FromQuery] long? collegeId) => Execute(async () =>
    {
        await service.Publish(Access(collegeId), id);
        return Envelope(new { syllabusId = id, status = "Published" });
    });

    [HttpPost("{id:long}/archive")]
    public Task<IActionResult> Archive(long id, [FromQuery] long? collegeId) => Execute(async () =>
    {
        await service.Archive(Access(collegeId), id);
        return Envelope(new { syllabusId = id, status = "Archived" });
    });

    [HttpGet("{id:long}/versions")]
    public Task<IActionResult> Versions(long id, [FromQuery] long? collegeId) =>
        Execute(async () => Envelope(await service.History(Access(collegeId), id, versions: true)));

    [HttpGet("{id:long}/activity")]
    public Task<IActionResult> Activity(long id, [FromQuery] long? collegeId) =>
        Execute(async () => Envelope(await service.History(Access(collegeId), id, versions: false)));

    [HttpPost("{id:long}/documents")]
    [Consumes("multipart/form-data")]
    public Task<IActionResult> Upload(long id, IFormFile? file, [FromQuery] long? collegeId, CancellationToken cancellationToken) =>
        Execute(async () => Envelope(new { documentId = await service.Upload(Access(collegeId), id, null, file, cancellationToken) }, 201));

    [HttpPut("{id:long}/documents/{documentId:long}/replace")]
    [Consumes("multipart/form-data")]
    public Task<IActionResult> Replace(long id, long documentId, IFormFile? file, [FromQuery] long? collegeId, CancellationToken cancellationToken) =>
        Execute(async () => Envelope(new { documentId = await service.Upload(Access(collegeId), id, documentId, file, cancellationToken) }));

    [HttpGet("/api/v1/syllabus-documents/{documentId:long}/download")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public Task<IActionResult> Download(long documentId, [FromQuery] long? collegeId) => Execute(async () =>
    {
        var document = await service.Download(Access(collegeId, ModulePermissionMiddleware.IsSyllabusPortalDownload(Request)), documentId);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(document.Content, document.ContentType, document.FileName);
    });

    private SyllabusAccess Access(long? requested, bool portal = false)
    {
        var assigned = HttpContext.Items[ModulePermissionMiddleware.CurrentCollegeItem] as long?;
        var superAdmin = HttpContext.Items[ModulePermissionMiddleware.SuperAdminItem] is true;
        if (!superAdmin && requested.HasValue && requested != assigned)
            throw new BadHttpRequestException("Cross-college access is not permitted.", 403);
        var college = superAdmin ? requested ?? assigned : assigned;
        if (college is null or <= 0) throw new BadHttpRequestException("Select a college.");

        var roles = HttpContext.Items[ModulePermissionMiddleware.ActiveRolesItem] as HashSet<string>;
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
        return new SyllabusAccess(college.Value, userId, portal,
            roles?.Contains("STUDENT") == true, roles?.Contains("FACULTY") == true);
    }

    private IActionResult Envelope(object data, int status = 200) => StatusCode(status, new { success = true, data });

    private async Task<IActionResult> Execute(Func<Task<IActionResult>> operation)
    {
        try { return await operation(); }
        catch (BadHttpRequestException ex)
        {
            return StatusCode(ex.StatusCode, new { success = false, message = ex.Message });
        }
    }
}
