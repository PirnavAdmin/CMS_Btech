using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using BTech.DTOs.Subjects;
using BTech.Repositories.Implementations;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MySqlConnector;

namespace BTech.Controllers.V1.FacultyManagement;

[ApiController]
[Route("api/v1/subjects")]
[Route("api/v1/subject-management/subjects")]
[Authorize]
[TypeFilter(typeof(SubjectValidationFilter), Order = -3000)]
public class SubjectsController : ControllerBase
{
    private readonly SubjectManagementRepository _repository;
    private readonly ILogger<SubjectsController> _logger;
    public SubjectsController(SubjectManagementRepository repository, ILogger<SubjectsController> logger)
    { _repository = repository; _logger = logger; }
    private CancellationToken Cancellation => HttpContext.RequestAborted;
    private long? Actor => long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
        ?? User.FindFirstValue("user_id"), out var id) ? id : null;

    // The original route retains numeric status and snake_case keys for existing consumers.
    // The additional screen route returns status as Active/Inactive; both contain camelCase aliases.
    private Dictionary<string, object?> Present(Dictionary<string, object?> row)
    {
        if (Request.Path.StartsWithSegments("/api/v1/subject-management")) row["status"] = row["statusName"];
        return row;
    }
    [HttpGet]
    [HttpGet("search")]
    public Task<IActionResult> GetAll([FromQuery] SubjectSearchRequest request) => Execute(async () =>
    {
        var all = await _repository.ListAsync(request, null, Validate(request), Cancellation);
        var total = all.Count;
        var page = request.Page ?? 1;
        var size = request.PageSize ?? (request.Page.HasValue ? 25 : Math.Max(total, 1));
        var rows = all.Skip((int)Math.Min((long)(page - 1) * size, total)).Take(size).Select(Present).ToList();
        return Ok(new { success = true, message = "Subjects retrieved successfully.", data = rows,
            count = rows.Count, totalCount = total, page, pageSize = size, totalPages = (int)Math.Ceiling((double)total / size) });
    });

    [HttpGet("{subjectId:long}")]
    public Task<IActionResult> GetById(long subjectId) => Execute(async () =>
        Ok(new { success = true, message = "Subject retrieved successfully.", data = Present(await Find(subjectId)) }));

    // Explicit empty template keeps the create operation on the collection route:
    // POST /api/v1/subjects (and the existing subject-management alias).
    [HttpPost("")]
    public Task<IActionResult> Create([FromBody] CreateSubjectRequest request) => Execute(async () =>
    {
        _logger.LogInformation(
            "Creating subject {SubjectCode}; CourseId={CourseId}; BranchId={BranchId}; SemesterId={SemesterId}; Actor={Actor}; CorrelationId={CorrelationId}",
            request.SubjectCode?.Trim(), request.CourseId, request.BranchId, request.SemesterId, Actor, HttpContext.TraceIdentifier);

        var id = await _repository.SaveAsync(0, request, Actor, Cancellation);
        var row = Present(await Find(id));
        Response.Headers.Location = $"{Request.Path.ToString().TrimEnd('/')}/{id}";
        return StatusCode(201, new { success = true, message = "Subject created successfully.", subjectId = id, data = row });
    });

    [HttpPut("{subjectId:long}")]
    public Task<IActionResult> Update(long subjectId, [FromBody] UpdateSubjectRequest request) => Execute(async () =>
    {
        RequireId(subjectId);
        await _repository.SaveAsync(subjectId, request, Actor, Cancellation);
        return Ok(new { success = true, message = "Subject updated successfully.", data = Present(await Find(subjectId)) });
    });

    [HttpPatch("{subjectId:long}/status")]
    [HttpPut("{subjectId:long}/status")]
    public Task<IActionResult> Status(long subjectId, [FromBody] SubjectStatusRequest request) => Execute(async () =>
    {
        RequireId(subjectId);
        await _repository.StatusAsync(subjectId, request.Status!.Value, false, Actor, Cancellation);
        return Ok(new { success = true, message = "Subject status updated successfully.", data = Present(await Find(subjectId)) });
    });

    [HttpDelete("{subjectId:long}")]
    public Task<IActionResult> Delete(long subjectId) => Execute(async () =>
    {
        RequireId(subjectId);
        await _repository.StatusAsync(subjectId, 0, true, Actor, Cancellation);
        return Ok(new { success = true, message = "Subject deleted successfully.", subjectId });
    });

    [HttpGet("{subjectId:long}/dependencies")]
    public Task<IActionResult> Dependencies(long subjectId) => Execute(async () =>
    {
        await Find(subjectId);
        var rows = await _repository.DependenciesAsync(subjectId, Cancellation);
        return Ok(new { success = true, data = rows,
            canDeactivate = rows.All(x => Convert.ToInt64(x["activeCount"]) == 0),
            canDelete = rows.All(x => Convert.ToInt64(x["totalCount"]) == 0) });
    });

    [HttpGet("lookups")]
    public Task<IActionResult> Lookups([FromQuery] SubjectSearchRequest request) => Execute(async () =>
    {
        Validate(request);
        return Ok(new { success = true, data = await _repository.LookupsAsync(request, Cancellation) });
    });

    [HttpGet("summary")]
    public Task<IActionResult> Summary([FromQuery] SubjectSearchRequest request) => Execute(async () =>
    {
        var rows = await _repository.ListAsync(request, null, Validate(request), Cancellation);
        return Ok(new { success = true, data = new {
            total = rows.Count, active = rows.Count(x => Convert.ToInt32(x["statusValue"]) == 1),
            theory = rows.Count(x => Text(x,"subjectType").Contains("theory", StringComparison.OrdinalIgnoreCase)),
            lab = rows.Count(x => Regex.IsMatch(Text(x,"subjectType"),"lab|practical",RegexOptions.IgnoreCase)),
            credits = rows.Sum(x => Convert.ToDecimal(x["credits"] ?? 0)) } });
    });

    [HttpGet("export")]
    [HttpGet("download")]
    public Task<IActionResult> Export([FromQuery] SubjectSearchRequest request, [FromQuery] string format = "csv") => Execute(async () =>
    {
        if (!new[] { "csv", "xlsx" }.Contains(format.ToLowerInvariant()))
            throw new ArgumentException("Supported formats are csv and xlsx.", "format");
        var rows = await _repository.ListAsync(request, null, Validate(request), Cancellation);
        var columns = new (string Key, string Label)[] {
            ("subjectCode","Subject Code"),("subjectName","Subject Name"),("academicYear","Academic Year"),
            ("course","Course"),("branch","Branch"),("academicLevel","Academic Level"),("semester","Semester"),
            ("subjectType","Subject Type"),("electiveType","Elective Type"),("credits","Credits"),
            ("lectureHours","Lecture Hours"),("tutorialHours","Tutorial Hours"),("practicalHours","Practical Hours"),
            ("internalMarks","Internal Marks"),("externalMarks","External Marks"),("totalMarks","Total Marks"),("statusName","Status") };
        if (format.Equals("xlsx", StringComparison.OrdinalIgnoreCase))
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.AddWorksheet("Subjects");
            for (var col = 0; col < columns.Length; col++) sheet.Cell(1, col + 1).Value = columns[col].Label;
            for (var row = 0; row < rows.Count; row++)
                for (var col = 0; col < columns.Length; col++) sheet.Cell(row + 2, col + 1).Value = Text(rows[row], columns[col].Key);
            sheet.Row(1).Style.Font.Bold = true;
            sheet.SheetView.FreezeRows(1);
            sheet.Columns().AdjustToContents(1, Math.Min(rows.Count + 1, 200));
            using var stream = new MemoryStream(); workbook.SaveAs(stream);
            return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "subject-directory.xlsx");
        }
        static string Csv(string value)
        {
            if (value.TrimStart().StartsWithAnyFormulaCharacter()) value = "'" + value;
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }
        var csv = new StringBuilder();
        csv.AppendLine(string.Join(",", columns.Select(c => Csv(c.Label))));
        foreach (var row in rows) csv.AppendLine(string.Join(",", columns.Select(c => Csv(Text(row, c.Key)))));
        return File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray(), "text/csv; charset=utf-8", "subject-directory.csv");
    });

    private static string Text(Dictionary<string, object?> row, string key) => Convert.ToString(row.GetValueOrDefault(key), CultureInfo.InvariantCulture) ?? "";
    private static void RequireId(long id) { if (id <= 0) throw new ArgumentException("A positive subject ID is required.", "subjectId"); }
    private async Task<Dictionary<string, object?>> Find(long id)
    {
        RequireId(id);
        return (await _repository.ListAsync(new(), id, null, Cancellation)).FirstOrDefault()
            ?? throw new KeyNotFoundException("Subject not found.");
    }
    private static int? Validate(SubjectSearchRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Status) && SubjectStatusConverter.Parse(request.Status) is null)
            throw new ArgumentException("Status must be Active, Inactive, 1 or 0.", "status");
        if (string.IsNullOrWhiteSpace(request.Level)) return null;
        var match = Regex.Match(request.Level.Trim(), @"^(\d+)(?:(?:st|nd|rd|th)\s+Year)?$", RegexOptions.IgnoreCase);
        if (!match.Success || !int.TryParse(match.Groups[1].Value, out var level) || level < 1 || level > 50)
            throw new ArgumentException("Use a year number or a label such as 1st Year.", "level");
        return level;
    }
    private async Task<IActionResult> Execute(Func<Task<IActionResult>> action)
    {
        _logger.LogInformation("Subject request {Method} {Path}; Actor={Actor}; CorrelationId={CorrelationId}", Request.Method, Request.Path, Actor, HttpContext.TraceIdentifier);
        try { return await action(); }
        catch (MySqlException ex) when (ex.SqlState == "45000" || ex.Number is 1062 or 1451 or 1452 or 3819)
        {
            _logger.LogWarning("Subject validation rejected. DatabaseCode={Code}; CorrelationId={CorrelationId}", ex.Number, HttpContext.TraceIdentifier);
            var parts = ex.Message.Split('|', 2);
            var field = parts.Length == 2 ? parts[0] : ex.Number == 1062 ? "subjectCode" : "subject";
            var message = parts.Length == 2 ? parts[1] : ex.Number == 1062 ? "Subject code already exists." : "Subject data conflicts with a related record.";
            return Failure(ex.Number == 30001 ? 404 : ex.Number is 30002 or 1062 or 1451 ? 409 : 400, field, message);
        }
        catch (ArgumentException ex) { _logger.LogWarning("Subject validation: {Message}", ex.Message); return Failure(400, ex.ParamName ?? "subject", ex.Message); }
        catch (KeyNotFoundException ex) { return Failure(404, "subjectId", ex.Message); }
        catch (OperationCanceledException) when (Cancellation.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Subject request failed; CorrelationId={CorrelationId}", HttpContext.TraceIdentifier);
            return Failure(500, "subject", "Unable to complete the subject request. Check the server log using the correlation ID.");
        }
    }
    private ObjectResult Failure(int code, string field, string message) => StatusCode(code, new {
        success = false, message, errors = new Dictionary<string, string[]> { [field] = new[] { message } }, correlationId = HttpContext.TraceIdentifier });
}

public sealed class SubjectValidationFilter : IActionFilter
{
    private readonly ILogger<SubjectValidationFilter> _logger;
    public SubjectValidationFilter(ILogger<SubjectValidationFilter> logger) => _logger = logger;
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.ModelState.IsValid) return;
        var errors = context.ModelState.Where(x => x.Value?.Errors.Count > 0).ToDictionary(x => x.Key,
            x => x.Value!.Errors.Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid field value." : e.ErrorMessage).ToArray());
        _logger.LogWarning("Subject field validation failed; Fields={Fields}; CorrelationId={CorrelationId}", string.Join(",", errors.Keys), context.HttpContext.TraceIdentifier);
        context.Result = new BadRequestObjectResult(new { success = false, message = "Subject validation failed.", errors, correlationId = context.HttpContext.TraceIdentifier });
    }
    public void OnActionExecuted(ActionExecutedContext context) { }
}

internal static class SubjectExportText
{
    public static bool StartsWithAnyFormulaCharacter(this string value) => value.Length > 0 && "=+-@\t\r\n".Contains(value[0]);
}
