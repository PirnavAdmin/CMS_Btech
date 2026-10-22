using System.Globalization;
using System.Security.Claims;
using System.Text;
using BTech.DTOs.MarksManagement;
using BTech.Services.Interfaces;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.Controllers.V1;

[ApiController]
[Route("api/v1/marks")]
[Authorize]
public sealed class MarksController : ControllerBase
{
    private const string EntryRoles = "SUPER_ADMIN,COLLEGE_ADMIN,PRINCIPAL,HOD,FACULTY";
    private const string ApprovalRoles = "SUPER_ADMIN,COLLEGE_ADMIN,PRINCIPAL,HOD";
    private readonly IMarksService _service;

    public MarksController(IMarksService service) => _service = service;

    [HttpPost]
    [Authorize(Roles = EntryRoles)]
    public async Task<IActionResult> Add([FromBody] MarkEntryRequest request)
        => await Execute(() => _service.AddAsync(request, UserId(), CollegeId(), IsSuperAdmin()),
            "Mark entered successfully.", StatusCodes.Status201Created, x => new { mark = x });

    [HttpPut("{markId:long}")]
    [Authorize(Roles = EntryRoles)]
    public async Task<IActionResult> Edit(long markId, [FromBody] MarkEditRequest request)
        => await Execute(() => _service.EditAsync(markId, request, UserId(), CollegeId(), IsSuperAdmin()),
            "Mark updated successfully.");

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] MarkListFilter filter)
        => await Execute(() => _service.ListAsync(filter, CollegeId(), IsSuperAdmin()),
            "Marks retrieved successfully.");

    [HttpGet("{markId:long}")]
    public async Task<IActionResult> Get(long markId)
        => await Execute(() => _service.GetAsync(markId, CollegeId(), IsSuperAdmin()),
            "Mark retrieved successfully.");

    [HttpGet("download")]
    public Task<IActionResult> Download([FromQuery] MarkListFilter filter)
        => ExportCsv(filter, "marks-download.csv");

    [HttpGet("export")]
    public Task<IActionResult> Export([FromQuery] MarkListFilter filter)
        => ExportCsv(filter, "marks-export.csv");

    [HttpPost("bulk/preview")]
    [Authorize(Roles = EntryRoles)]
    public async Task<IActionResult> BulkPreview([FromBody] BulkUploadPreviewRequest request)
        => await Execute(() => _service.BulkPreviewAsync(request, CollegeId(), IsSuperAdmin()),
            "Bulk marks validation completed.");

    [HttpPost("bulk/upload")]
    [Authorize(Roles = EntryRoles)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> BulkUpload(
        [FromForm] long? examId,
        [FromForm] long? sectionId,
        [FromForm] bool upsertDrafts = false,
        IFormFile? file = null)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, message = "An Excel file is required." });

        try
        {
            var rows = await ReadExcelAsync(file);
            var scope = ResolveBulkScope(rows, examId, sectionId);
            var request = new BulkMarksRequest
            {
                ExamId = scope.ExamId,
                SectionId = scope.SectionId,
                UpsertDrafts = upsertDrafts,
                Rows = rows
            };
            var result = await _service.BulkUploadAsync(request, UserId(), CollegeId(), IsSuperAdmin());
            result.ExamId = scope.ExamId;
            result.SectionId = scope.SectionId;
            return Ok(new
            {
                success = true,
                message = "Bulk marks upload completed.",
                data = result
            });
        }
        catch (Exception ex) { return Error(ex); }
    }

    [HttpPost("bulk/file-preview")]
    [Authorize(Roles = EntryRoles)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> BulkFilePreview(
        [FromForm] long? examId,
        [FromForm] long? sectionId,
        IFormFile? file = null)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, message = "An Excel file is required." });

        try
        {
            var rows = await ReadExcelAsync(file);
            var scope = ResolveBulkScope(rows, examId, sectionId);
            var result = await _service.BulkPreviewAsync(
                new BulkUploadPreviewRequest { ExamId = scope.ExamId, SectionId = scope.SectionId, Rows = rows },
                CollegeId(), IsSuperAdmin());
            result.ExamId = scope.ExamId;
            result.SectionId = scope.SectionId;
            return Ok(new
            {
                success = true,
                message = "Bulk marks file validation completed.",
                data = result
            });
        }
        catch (Exception ex) { return Error(ex); }
    }

    [HttpGet("reports/summary")]
    public async Task<IActionResult> SummaryReport([FromQuery] MarksReportFilter filter)
        => await Execute(() => _service.GetSummaryReportAsync(filter, CollegeId(), IsSuperAdmin()),
            "Marks summary report retrieved successfully.");

    [HttpGet("reports/student")]
    public async Task<IActionResult> StudentReport([FromQuery] MarksReportFilter filter)
        => await Execute(() => _service.GetStudentReportAsync(filter, CollegeId(), IsSuperAdmin()),
            "Student marks report retrieved successfully.");

    [HttpGet("reports/subjects")]
    public async Task<IActionResult> SubjectReport([FromQuery] MarksReportFilter filter)
        => await Execute(() => _service.GetSubjectReportAsync(filter, CollegeId(), IsSuperAdmin()),
            "Subject marks report retrieved successfully.");

    [HttpGet("approvals/pending")]
    [Authorize(Roles = ApprovalRoles)]
    public async Task<IActionResult> PendingApprovals(
        [FromQuery] long examId, [FromQuery] long? sectionId = null, [FromQuery] long? subjectId = null)
        => await Execute(() => _service.PendingApprovalsAsync(
                examId, sectionId, subjectId, CollegeId(), IsSuperAdmin()),
            "Pending marks approvals retrieved successfully.");

    [HttpPatch("approvals/{id:long}")]
    [Authorize(Roles = ApprovalRoles)]
    public async Task<IActionResult> UpdateApproval(long id, [FromBody] MarksApprovalUpdateRequest request)
        => await Execute(async () =>
        {
            if (id <= 0) throw new ArgumentException("Approval ID must be greater than zero.");
            if (request is null) throw new ArgumentException("Approval update is required.");

            var pending = await _service.PendingApprovalsAsync(
                request.ExamId, request.SectionId, request.SubjectId, CollegeId(), IsSuperAdmin());
            var approval = pending.SingleOrDefault(item => item.ApprovalId == id && item.MarkId == request.MarkId);
            if (approval is null) throw new KeyNotFoundException("Pending marks approval not found.");

            var workflow = new MarksWorkflowRequest
            {
                ExamId = request.ExamId,
                MarkIds = [approval.MarkId],
                SectionId = request.SectionId,
                SubjectId = request.SubjectId,
                Remarks = request.Remarks
            };
            return request.ApprovalStatus.Trim().ToUpperInvariant() switch
            {
                "APPROVED" => await _service.ApproveAsync(workflow, UserId(), CollegeId(), IsSuperAdmin()),
                "REJECTED" => await _service.RejectAsync(workflow, UserId(), CollegeId(), IsSuperAdmin()),
                _ => throw new ArgumentException("ApprovalStatus must be APPROVED or REJECTED.")
            };
        }, "Marks approval updated successfully.");

    [HttpPost("workflow/submit")]
    [Authorize(Roles = EntryRoles)]
    public async Task<IActionResult> Submit([FromBody] MarksWorkflowRequest request)
        => await Execute(() => _service.SubmitAsync(request, UserId(), CollegeId(), IsSuperAdmin()),
            "Marks submitted for approval successfully.");

    [HttpPost("workflow/approve")]
    [Authorize(Roles = ApprovalRoles)]
    public async Task<IActionResult> Approve([FromBody] MarksWorkflowRequest request)
        => await Execute(() => _service.ApproveAsync(request, UserId(), CollegeId(), IsSuperAdmin()),
            "Marks approved successfully.");

    [HttpPost("workflow/reject")]
    [Authorize(Roles = ApprovalRoles)]
    public async Task<IActionResult> Reject([FromBody] MarksWorkflowRequest request)
        => await Execute(() => _service.RejectAsync(request, UserId(), CollegeId(), IsSuperAdmin()),
            "Marks rejected and returned for correction.");

    [HttpGet("{markId:long}/approval-history")]
    [Authorize(Roles = ApprovalRoles)]
    public async Task<IActionResult> ApprovalHistory(long markId)
        => await Execute(() => _service.ApprovalHistoryAsync(markId, CollegeId(), IsSuperAdmin()),
            "Marks approval history retrieved successfully.");

    private static async Task<List<MarkBulkRow>> ReadExcelAsync(IFormFile file)
    {
        if (file.Length > 10 * 1024 * 1024)
            throw new ArgumentException("Excel file size cannot exceed 10 MB.");

        var extension = Path.GetExtension(file.FileName);
        if (!string.Equals(extension, ".xlsx", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Only .xlsx Excel files are supported.");

        await using var stream = file.OpenReadStream();
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.FirstOrDefault()
                 ?? throw new ArgumentException("Excel workbook has no worksheet.");

        var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var firstRow = ws.FirstRowUsed()
            ?? throw new ArgumentException("Excel file is empty.");

        foreach (var cell in firstRow.CellsUsed())
        {
            var name = NormalizeHeader(cell.GetString());
            if (!string.IsNullOrWhiteSpace(name))
                headerMap[name] = cell.Address.ColumnNumber;
        }

        string[] Required = ["StudentCode", "SubjectCode", "MarksObtained"];
        foreach (var required in Required)
            if (!headerMap.ContainsKey(required))
                throw new ArgumentException($"Excel column '{required}' is required.");

        var rows = new List<MarkBulkRow>();
        foreach (var row in ws.RowsUsed().Skip(1))
        {
            if (row.CellsUsed().All(c => string.IsNullOrWhiteSpace(c.GetString())))
                continue;

            decimal marks;
            var marksText = row.Cell(headerMap["MarksObtained"]).GetString().Trim();
            if (!decimal.TryParse(marksText, NumberStyles.Number, CultureInfo.InvariantCulture, out marks))
                throw new ArgumentException($"Excel row {row.RowNumber()}: MarksObtained must be numeric.");

            decimal? max = null;
            if (headerMap.TryGetValue("MaxMarks", out var maxCol))
            {
                var maxText = row.Cell(maxCol).GetString().Trim();
                if (!string.IsNullOrWhiteSpace(maxText))
                {
                    if (!decimal.TryParse(maxText, NumberStyles.Number, CultureInfo.InvariantCulture, out var maxValue))
                        throw new ArgumentException($"Excel row {row.RowNumber()}: MaxMarks must be numeric.");
                    max = maxValue;
                }
            }

            string? Optional(string key)
                => headerMap.TryGetValue(key, out var col)
                    ? row.Cell(col).GetString().Trim() is { Length: > 0 } value ? value : null
                    : null;

            long? OptionalId(params string[] keys)
            {
                var column = keys.Select(key => headerMap.TryGetValue(key, out var index) ? index : 0)
                    .FirstOrDefault(index => index > 0);
                if (column == 0) return null;
                var text = row.Cell(column).GetString().Trim();
                if (string.IsNullOrWhiteSpace(text)) return null;
                if (!long.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value) || value <= 0)
                    throw new ArgumentException($"Excel row {row.RowNumber()}: {keys[0]} must be a positive number.");
                return value;
            }

            rows.Add(new MarkBulkRow
            {
                ExamId = OptionalId("ExamId", "ExaminationId"),
                SectionId = OptionalId("SectionId"),
                StudentCode = row.Cell(headerMap["StudentCode"]).GetString().Trim(),
                SubjectCode = row.Cell(headerMap["SubjectCode"]).GetString().Trim(),
                MarksObtained = marks,
                MaxMarks = max,
                Grade = Optional("Grade"),
                Remarks = Optional("Remarks")
            });
        }

        if (rows.Count == 0) throw new ArgumentException("Excel file contains no data rows.");
        return rows;
    }

    private static string NormalizeHeader(string value)
        => new(value.Where(char.IsLetterOrDigit).ToArray());

    private static (long ExamId, long? SectionId) ResolveBulkScope(
        IReadOnlyCollection<MarkBulkRow> rows, long? requestedExamId, long? requestedSectionId)
    {
        var hasExamIds = rows.Any(row => row.ExamId.HasValue);
        if (hasExamIds && rows.Any(row => !row.ExamId.HasValue))
            throw new ArgumentException("Every row must include an ExamId.");

        var examIds = rows.Where(row => row.ExamId.HasValue).Select(row => row.ExamId!.Value).Distinct().ToArray();
        if (examIds.Length > 1 || requestedExamId.HasValue && examIds.Length == 1 && requestedExamId != examIds[0])
            throw new ArgumentException("Each upload file must contain rows for one examination.");
        var examId = examIds.SingleOrDefault(requestedExamId ?? 0);
        if (examId <= 0)
            throw new ArgumentException("Include a positive ExamId value in every file row.");

        var sectionIds = rows.Where(row => row.SectionId.HasValue).Select(row => row.SectionId!.Value).Distinct().ToArray();
        if (sectionIds.Length > 1 || requestedSectionId.HasValue && sectionIds.Length == 1 && requestedSectionId != sectionIds[0])
            throw new ArgumentException("Each upload file must contain rows for one section.");

        return (examId, sectionIds.Length == 1 ? sectionIds[0] : requestedSectionId);
    }

    private async Task<IActionResult> Execute<T>(
        Func<Task<T>> action, string message, int status = StatusCodes.Status200OK,
        Func<T, object>? map = null)
    {
        try
        {
            var data = await action();
            return StatusCode(status, new
            {
                success = true,
                message,
                data = map is null ? data : map(data)
            });
        }
        catch (Exception ex) { return Error(ex); }
    }

    private async Task<IActionResult> ExportCsv(MarkListFilter filter, string fileName)
    {
        try
        {
            var rows = await _service.ListAsync(filter, CollegeId(), IsSuperAdmin());
            var lines = new List<string>
            {
                "MarkId,ExamId,ExamCode,ExamName,StudentId,StudentCode,StudentName,SubjectId,SubjectCode,SubjectName,SectionId,SectionName,MarksObtained,MaxMarks,Percentage,Grade,Remarks,WorkflowStatus,VersionNo,EnteredAt"
            };
            lines.AddRange(rows.Select(row => string.Join(",", new object?[]
            {
                row.MarkId, row.ExamId, row.ExamCode, row.ExamName, row.StudentId,
                row.StudentCode, row.StudentName, row.SubjectId, row.SubjectCode,
                row.SubjectName, row.SectionId, row.SectionName, row.MarksObtained,
                row.MaxMarks, row.Percentage, row.Grade, row.Remarks,
                row.WorkflowStatus, row.VersionNo, row.EnteredAt
            }.Select(CsvValue))));
            return File(Encoding.UTF8.GetBytes(string.Join("\r\n", lines)), "text/csv; charset=utf-8", fileName);
        }
        catch (Exception ex) { return Error(ex); }
    }

    private static string CsvValue(object? value)
    {
        var text = Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
        if (value is string)
        {
            var firstContent = text.TrimStart(' ', '\t', '\r', '\n');
            if (firstContent.StartsWith('=') || firstContent.StartsWith('+')
                || firstContent.StartsWith('-') || firstContent.StartsWith('@'))
                text = "'" + text;
        }
        return "\"" + text.Replace("\"", "\"\"") + "\"";
    }

    private IActionResult Error(Exception ex)
    {
        if (ex is ArgumentException)
            return BadRequest(new { success = false, message = ex.Message });
        if (ex is KeyNotFoundException)
            return NotFound(new { success = false, message = ex.Message });
        if (ex is UnauthorizedAccessException)
            return Unauthorized(new { success = false, message = ex.Message });
        if (ex is MySqlException my && my.SqlState == "45000")
            return Conflict(new { success = false, message = my.Message });
        return StatusCode(500, new { success = false, message = "Unable to process marks request." });
    }

    private long? UserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? User.FindFirstValue("user_id");
        return long.TryParse(raw, out var id) ? id : null;
    }

    private long? CollegeId()
    {
        var raw = User.FindFirstValue("collegeId");
        return long.TryParse(raw, out var id) && id > 0 ? id : null;
    }

    private bool IsSuperAdmin() => User.IsInRole("SUPER_ADMIN");
}
