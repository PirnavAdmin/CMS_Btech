using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.DocumentManagement;

[ApiController]
[Authorize]
[Route("api/v1")]
public sealed class DocumentManagementController : ControllerBase
{
    private readonly DocumentManagementStore _store;
    private readonly ILogger<DocumentManagementController> _logger;

    public DocumentManagementController(IConfiguration configuration, IWebHostEnvironment environment, ILogger<DocumentManagementController> logger)
    {
        _store = new DocumentManagementStore(configuration, environment, logger);
        _logger = logger;
    }

    private DocumentActor Actor()
    {
        var userValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("user_id") ?? User.FindFirstValue("userId");
        if (!long.TryParse(userValue, out var userId) || userId <= 0)
            throw new DocumentApiException(401, "A valid user identifier is required in the token.");
        var collegeValue = User.FindFirstValue("college_id") ?? User.FindFirstValue("collegeId") ?? User.FindFirstValue("CollegeId");
        long? collegeId = null;
        if (collegeValue is not null)
        {
            if (!long.TryParse(collegeValue, out var parsed) || parsed <= 0)
                throw new DocumentApiException(401, "The token contains invalid college information.");
            collegeId = parsed;
        }
        // Active roles, college membership and ownership are rechecked from the database.
        return new DocumentActor(userId, collegeId);
    }

    private async Task<IActionResult> Execute(string action, Func<DocumentActor, CancellationToken, Task<object>> operation)
    {
        var timer = Stopwatch.StartNew();
        long? userId = null;
        try
        {
            var actor = Actor();
            userId = actor.UserId;
            using var scope = _logger.BeginScope(new Dictionary<string, object?>
            {
                ["CorrelationId"] = HttpContext.TraceIdentifier, ["UserId"] = actor.UserId,
                ["CollegeId"] = actor.CollegeId, ["DocumentAction"] = action
            });
            _logger.LogInformation("Document action started. Action={Action}, UserId={UserId}, TraceId={TraceId}", action, userId, HttpContext.TraceIdentifier);
            Response.Headers["Cache-Control"] = "no-store";
            var data = await operation(actor, HttpContext.RequestAborted);
            _logger.LogInformation("Document action completed. Action={Action}, UserId={UserId}, DurationMs={DurationMs}, TraceId={TraceId}", action, userId, timer.ElapsedMilliseconds, HttpContext.TraceIdentifier);
            return data is IActionResult result ? result : Ok(new { success = true, message = action + " completed successfully.", data });
        }
        catch (OperationCanceledException) when (HttpContext.RequestAborted.IsCancellationRequested)
        {
            _logger.LogInformation("Document request cancelled. Action={Action}, UserId={UserId}, TraceId={TraceId}", action, userId, HttpContext.TraceIdentifier);
            return StatusCode(499);
        }
        catch (DocumentApiException ex)
        {
            return Rejected(action, userId, ex.StatusCode, ex.Message);
        }
        catch (MySqlException ex)
        {
            if (ex.Number == 1644 && ex.Message.StartsWith("DOC", StringComparison.Ordinal) &&
                ex.Message.Length > 7 && ex.Message[6] == ':' && int.TryParse(ex.Message.AsSpan(3, 3), out var status) &&
                status is 400 or 401 or 403 or 404 or 409)
                return Rejected(action, userId, status, ex.Message[7..].Trim());
            if (ex.Number is 1062 or 1451 or 1452 or 1406)
                return Rejected(action, userId, 409, "The document conflicts with an existing or referenced record. Verify the submitted values.");
            _logger.LogError(ex, "Document database error. Action={Action}, UserId={UserId}, TraceId={TraceId}", action, userId, HttpContext.TraceIdentifier);
            return Failure("Document database operation failed. Check the server log and apply the document SQL update.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Document action failed. Action={Action}, UserId={UserId}, TraceId={TraceId}", action, userId, HttpContext.TraceIdentifier);
            return Failure("Document operation failed. Check the server log.");
        }
    }

    private IActionResult Rejected(string action, long? userId, int status, string message)
    {
        _logger.LogWarning("Document action rejected. Action={Action}, UserId={UserId}, StatusCode={StatusCode}, Reason={Reason}, TraceId={TraceId}", action, userId, status, message, HttpContext.TraceIdentifier);
        return StatusCode(status, new { success = false, message, correlationId = HttpContext.TraceIdentifier });
    }
    private IActionResult Failure(string message) => StatusCode(500, new { success = false, message, correlationId = HttpContext.TraceIdentifier });

    [HttpGet("documents/dashboard")]
    public Task<IActionResult> Dashboard() => Execute("Document dashboard", async (actor, ct) => await _store.GetDashboardAsync(actor, ct));

    [HttpGet("document-categories")]
    public Task<IActionResult> Categories([FromQuery] string? entityType = null, [FromQuery] bool includeInactive = false)
        => Execute("List document categories", async (actor, ct) => await _store.GetCategoriesAsync(actor, entityType, includeInactive, ct));

    [HttpPost("documents")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(DocumentFileValidator.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = DocumentFileValidator.MaxRequestBytes)]
    public Task<IActionResult> Upload([FromForm] DocumentUploadRequest request)
        => Execute("Upload document", async (actor, ct) => await _store.UploadAsync(actor, request, ct));

    [HttpGet("documents/{id:long}")]
    public Task<IActionResult> GetDocument(long id)
        => Execute("Get document", async (actor, ct) => await _store.GetDocumentAsync(actor, id, ct));

    [HttpGet("documents/{id:long}/download")]
    public Task<IActionResult> Download(long id) => Execute("Download document", async (actor, ct) =>
    {
        var result = await _store.GetDownloadAsync(actor, id, ct);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        var name = result.Document.OriginalFileName ?? result.Document.FileName;
        name = Path.GetFileName(name.Replace('\\', '/'));
        // File disposition is attachment. Never render client-supplied active content inline.
        return PhysicalFile(result.PhysicalPath, "application/octet-stream", name);
    });

    [HttpPatch("documents/{id:long}/approval")]
    public Task<IActionResult> Approval(long id, [FromBody] DocumentApprovalRequest request)
        => Execute("Document approval", async (actor, ct) => await _store.ApproveAsync(actor, id, request, ct));

    [HttpGet("documents/expired")]
    public Task<IActionResult> Expired([FromQuery] string? entityType = null)
        => Execute("Expired documents", async (actor, ct) => await _store.GetExpiredAsync(actor, entityType, ct));

    [HttpGet("documents/access")]
    public Task<IActionResult> Access([FromQuery] string entityType, [FromQuery] long entityId)
        => Execute("Document access check", async (actor, ct) => await _store.GetAccessAsync(actor, entityType, entityId, ct));

    [HttpPost("documents/validate")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(DocumentFileValidator.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = DocumentFileValidator.MaxRequestBytes)]
    public Task<IActionResult> ValidateUpload([FromForm] DocumentUploadRequest request)
        => Execute("Document validation", async (actor, ct) =>
        {
            var file = await _store.ValidateAsync(actor, request, ct);
            return new { valid = true, fileName = file.OriginalName, fileExtension = file.Extension, mimeType = file.MimeType,
                fileSize = file.Bytes.LongLength, maxFileSize = DocumentFileValidator.MaxFileBytes, expiryDate = request.ExpiryDate?.Date };
        });

    [HttpGet("documents/{id:long}/expiry")]
    public Task<IActionResult> Expiry(long id) => Execute("Document expiry check", async (actor, ct) =>
    {
        var doc = await _store.GetExpiryAsync(actor, id, ct);
        return new { doc.DocumentId, doc.IssueDate, doc.ExpiryDate, doc.IsExpired, doc.ExpiryStatus, doc.DaysToExpiry,
            doc.Status, doc.WorkflowStatus, checkedAtUtc = DateTime.UtcNow };
    });

    [HttpGet("documents/entity-access")]
    public Task<IActionResult> ListGrants([FromQuery] string entityType, [FromQuery] long entityId)
        => Execute("List document entity access", async (actor, ct) => await _store.ListGrantsAsync(actor, entityType, entityId, ct));

    [HttpPost("documents/entity-access")]
    public Task<IActionResult> SaveGrant([FromBody] DocumentEntityAccessRequest request)
        => Execute("Save document entity access", async (actor, ct) => await _store.SaveGrantAsync(actor, request, ct));

    [HttpDelete("documents/entity-access/{id:long}")]
    public Task<IActionResult> RevokeGrant(long id)
        => Execute("Revoke document entity access", async (actor, ct) => await _store.RevokeGrantAsync(actor, id, ct));
}
