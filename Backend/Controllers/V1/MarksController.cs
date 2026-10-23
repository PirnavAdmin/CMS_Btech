using System.Globalization;
using System.Security.Claims;
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
    private readonly ILogger<MarksController> _logger;

    public MarksController(IMarksService service, ILogger<MarksController> logger)
    {
        _service = service;
        _logger = logger;
    }

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

    [HttpPost("bulk/preview")]
    [Authorize(Roles = EntryRoles)]
    public async Task<IActionResult> BulkPreview([FromBody] BulkUploadPreviewRequest request)
        => await Execute(() => _service.BulkPreviewAsync(request, CollegeId(), IsSuperAdmin()),
            "Bulk marks validation completed.");

    [HttpPost("bulk/upload")]
    [Authorize(Roles = EntryRoles)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> BulkUpload(
        [FromForm] long examId,
        [FromForm] long? sectionId,
        [FromForm] bool upsertDrafts = false,
        IFormFile? file = null)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, message = "An Excel file is required." });

        try
        {
            var rows = await ReadExcelAsync(file);
            var request = new BulkMarksRequest
            {
                ExamId = examId,
                SectionId = sectionId,
                UpsertDrafts = upsertDrafts,
                Rows = rows
            };
            return Ok(new
            {
                success = true,
                message = "Bulk marks upload completed.",
                data = await _service.BulkUploadAsync(request, UserId(), CollegeId(), IsSuperAdmin())
            });
        }
        catch (Exception ex) { return Error(ex); }
    }

    [HttpPost("bulk/file-preview")]
    [Authorize(Roles = EntryRoles)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> BulkFilePreview(
        [FromForm] long examId,
        [FromForm] long? sectionId,
        IFormFile? file = null)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { success = false, message = "An Excel file is required." });

        try
        {
            var rows = await ReadExcelAsync(file);
            return Ok(new
            {
                success = true,
                message = "Bulk marks file validation completed.",
                data = await _service.BulkPreviewAsync(
                    new BulkUploadPreviewRequest { ExamId = examId, SectionId = sectionId, Rows = rows },
                    CollegeId(), IsSuperAdmin())
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
                examId, sectionId, subjectId, CollegeId(), IsSuperAdmin(), UserId()),
            "Pending marks approvals retrieved successfully.");

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

    [HttpPatch("approvals/{id:long}")]
    [Authorize(Roles = ApprovalRoles)]
    public async Task<IActionResult> Decide(long id, [FromBody] MarksApprovalDecisionRequest request)
        => await Execute(() => _service.DecideAsync(id, request, UserId(), CollegeId(), IsSuperAdmin()),
            "Marks approval decision saved successfully.");

    [HttpGet("{markId:long}/approval-history")]
    [Authorize(Roles = EntryRoles)]
    public async Task<IActionResult> ApprovalHistory(long markId)
        => await Execute(() => _service.ApprovalHistoryAsync(markId, CollegeId(), IsSuperAdmin(), UserId()),
            "Marks approval history retrieved successfully.");

    /// <summary>
    /// Downloads the same database-backed records returned by GET /api/v1/marks.
    /// Supported formats: xlsx, csv, json. All list filters and college scope are retained.
    /// </summary>
    [HttpGet("download")]
    public async Task<IActionResult> Download([FromQuery] MarkListFilter filter, [FromQuery] string format = "xlsx")
    {
        try
        {
            format = (format ?? "xlsx").Trim().ToLowerInvariant();
            if (format is not ("xlsx" or "csv" or "json"))
                return BadRequest(new { success = false, message = "Format must be xlsx, csv or json." });

            var marks = await _service.ListAsync(filter, CollegeId(), IsSuperAdmin());
            var stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
            var fileName = $"marks_{stamp}.{format}";

            if (format == "json")
            {
                var bytes = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(marks,
                    new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                return File(bytes, "application/json; charset=utf-8", fileName);
            }

            if (format == "csv")
            {
                var sb = new System.Text.StringBuilder();
                sb.AppendLine("MarkId,CollegeId,ExamId,ExamCode,ExamName,StudentId,StudentCode,StudentName,SubjectId,SubjectCode,SubjectName,SectionId,SectionName,MaxMarks,MarksObtained,Percentage,Grade,Remarks,WorkflowStatus,VersionNo,EnteredBy,EnteredAt,UpdatedBy,UpdatedAt");
                static string Csv(object? value)
                {
                    var text = Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
                    return "\"" + text.Replace("\"", "\"\"") + "\"";
                }
                foreach (var m in marks)
                    sb.AppendLine(string.Join(",", new object?[] { m.MarkId,m.CollegeId,m.ExamId,m.ExamCode,m.ExamName,
                        m.StudentId,m.StudentCode,m.StudentName,m.SubjectId,m.SubjectCode,m.SubjectName,m.SectionId,m.SectionName,
                        m.MaxMarks,m.MarksObtained,m.Percentage,m.Grade,m.Remarks,m.WorkflowStatus,m.VersionNo,m.EnteredBy,
                        m.EnteredAt,m.UpdatedBy,m.UpdatedAt }.Select(Csv)));
                return File(System.Text.Encoding.UTF8.GetPreamble().Concat(System.Text.Encoding.UTF8.GetBytes(sb.ToString())).ToArray(),
                    "text/csv; charset=utf-8", fileName);
            }

            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Marks");
            var headers = new[] { "MarkId","CollegeId","ExamId","ExamCode","ExamName","StudentId","StudentCode","StudentName",
                "SubjectId","SubjectCode","SubjectName","SectionId","SectionName","MaxMarks","MarksObtained","Percentage",
                "Grade","Remarks","WorkflowStatus","VersionNo","EnteredBy","EnteredAt","UpdatedBy","UpdatedAt" };
            for (var i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];
            var header = ws.Range(1, 1, 1, headers.Length);
            header.Style.Font.Bold = true;
            header.Style.Fill.BackgroundColor = XLColor.LightGray;
            var rowNo = 2;
            foreach (var m in marks)
            {
                object?[] values = [m.MarkId,m.CollegeId,m.ExamId,m.ExamCode,m.ExamName,m.StudentId,m.StudentCode,m.StudentName,
                    m.SubjectId,m.SubjectCode,m.SubjectName,m.SectionId,m.SectionName,m.MaxMarks,m.MarksObtained,m.Percentage,
                    m.Grade,m.Remarks,m.WorkflowStatus,m.VersionNo,m.EnteredBy,m.EnteredAt,m.UpdatedBy,m.UpdatedAt];
                for (var col = 0; col < values.Length; col++)
                    ws.Cell(rowNo, col + 1).Value = XLCellValue.FromObject(values[col]);
                rowNo++;
            }
            ws.SheetView.FreezeRows(1);
            ws.Columns().AdjustToContents();
            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        catch (Exception ex) { return Error(ex); }
    }

    // Alias retained for clients that call /export instead of /download.
    [HttpGet("export")]
    public Task<IActionResult> Export([FromQuery] MarkListFilter filter, [FromQuery] string format = "xlsx")
        => Download(filter, format);

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
            var name = cell.GetString().Trim();
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

            rows.Add(new MarkBulkRow
            {
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

    private async Task<IActionResult> Execute<T>(
        Func<Task<T>> action, string message, int status = StatusCodes.Status200OK,
        Func<T, object>? map = null)
    {
        try
        {
            _logger.LogInformation("Marks request started. Method={Method}, Path={Path}, ActorId={ActorId}, CollegeId={CollegeId}, CorrelationId={CorrelationId}",
                Request.Method, Request.Path, UserId(), CollegeId(), HttpContext.TraceIdentifier);
            var data = await action();
            _logger.LogInformation("Marks request completed. Method={Method}, Path={Path}, ActorId={ActorId}, Status={Status}, CorrelationId={CorrelationId}",
                Request.Method, Request.Path, UserId(), status, HttpContext.TraceIdentifier);
            return StatusCode(status, new
            {
                success = true,
                message,
                data = map is null ? data : map(data)
            });
        }
        catch (Exception ex) { return Error(ex); }
    }

    private IActionResult Error(Exception ex)
    {
        var (status, code, message) = ex switch
        {
            ArgumentException => (400, "VALIDATION_ERROR", ex.Message),
            KeyNotFoundException => (404, "NOT_FOUND", ex.Message),
            UnauthorizedAccessException => (403, "FORBIDDEN", ex.Message),
            MySqlException { Number: 30001 } => (400, "VALIDATION_ERROR", ex.Message),
            MySqlException { Number: 30002 } => (403, "FORBIDDEN", ex.Message),
            MySqlException { Number: 30003 } => (404, "NOT_FOUND", ex.Message),
            MySqlException { Number: 1205 or 1213 } => (409, "CONCURRENT_CHANGE", "Marks changed concurrently. Refresh and retry."),
            MySqlException { SqlState: "45000" } => (409, "WORKFLOW_CONFLICT", ex.Message),
            _ => (500, "MARKS_ERROR", "Unable to process marks request.")
        };
        if (status >= 500)
            _logger.LogError(ex, "Marks request failed. Path={Path}, ActorId={ActorId}, CorrelationId={CorrelationId}",
                Request.Path, UserId(), HttpContext.TraceIdentifier);
        else
            _logger.LogWarning("Marks request rejected. Path={Path}, ActorId={ActorId}, Code={Code}, CorrelationId={CorrelationId}",
                Request.Path, UserId(), code, HttpContext.TraceIdentifier);
        return StatusCode(status, new { success = false, message, code, correlationId = HttpContext.TraceIdentifier });
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
