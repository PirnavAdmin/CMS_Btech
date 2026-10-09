using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace BTech.LibraryManagement;

[ApiController]
[Authorize]
[Route("api/v1/library")]
public sealed class LibraryManagementController : ControllerBase
{
    private readonly LibraryStore _store;
    private readonly ILogger<LibraryManagementController> _logger;
    public LibraryManagementController(IConfiguration configuration, ILogger<LibraryManagementController> logger)
    { _store = new LibraryStore(configuration); _logger = logger; }

    private long College(long requested)
    {
        LibraryStore.Require(requested > 0, "collegeId must be positive.");
        var claim = User.FindFirst("college_id")?.Value ?? User.FindFirst("CollegeId")?.Value ?? User.FindFirst("collegeId")?.Value;
        var superAdmin = User.Claims.Any(c => (c.Type == ClaimTypes.Role || c.Type == "role")
            && string.Equals(c.Value, "SuperAdmin", StringComparison.OrdinalIgnoreCase));
        if (!superAdmin)
            LibraryStore.Require(long.TryParse(claim, out var assigned) && assigned > 0 && assigned == requested,
                "Access to this college is forbidden. A matching collegeId claim is required.", 403);
        return requested;
    }
    private long Actor()
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value ?? User.FindFirst("user_id")?.Value;
        LibraryStore.Require(long.TryParse(value, out var id) && id > 0, "A valid user identifier is required in the token.", 401);
        return id;
    }
    private async Task<IActionResult> Run(string action, Func<Task<object>> operation, int status = 200)
    {
        try
        {
            var data = await operation();
            _logger.LogInformation("Library action {Action} completed by {UserId}. TraceId={TraceId}", action, User.FindFirst(ClaimTypes.NameIdentifier)?.Value, HttpContext.TraceIdentifier);
            return StatusCode(status, new { success = true, message = action + " completed successfully.", data });
        }
        catch (LibraryApiException ex)
        {
            _logger.LogWarning("Library action {Action} rejected: {Reason}. TraceId={TraceId}", action, ex.Message, HttpContext.TraceIdentifier);
            return StatusCode(ex.StatusCode, new { success = false, message = ex.Message });
        }
        catch (MySqlException ex) when (ex.Number is 1062 or 1451 or 1452 or 3819 or 1213 or 1205)
        {
            _logger.LogWarning(ex, "Library database validation failed for {Action}. TraceId={TraceId}", action, HttpContext.TraceIdentifier);
            var message = ex.Number switch
            {
                1062 => "A duplicate category, accession number, ISBN, fine or receipt already exists.",
                1451 => "This record is referenced by other records and cannot be deleted.",
                1452 => "A referenced college, user, student, category or issue does not exist.",
                3819 => "A database validation constraint was violated.",
                _ => "Another operation is in progress. Retry this request."
            };
            return Conflict(new { success = false, message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Library action {Action} failed. TraceId={TraceId}", action, HttpContext.TraceIdentifier);
            return StatusCode(500, new { success = false, message = "Library operation failed. Check the server log and library SQL setup.", correlationId = HttpContext.TraceIdentifier });
        }
    }
    private static void Page(int page, int pageSize) => LibraryStore.Require(page >= 1 && pageSize is >= 1 and <= 200 && page <= 1000000, "page must be 1–1000000 and pageSize must be 1–200.");

    [HttpGet("categories")]
    public Task<IActionResult> Categories([FromQuery] long collegeId, [FromQuery] string? search = null, [FromQuery] bool? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("List categories", async () =>
    {
        College(collegeId); Page(page, pageSize);
        return await _store.Query("""
            SELECT * FROM library_categories WHERE college_id=@collegeId AND (@status IS NULL OR status=@status)
            AND (@search IS NULL OR category_name LIKE @term OR category_code LIKE @term)
            ORDER BY category_id DESC LIMIT @pageSize OFFSET @offset
            """, new { collegeId, status, search = LibraryStore.Optional(search), term = "%" + search?.Trim() + "%", pageSize, offset = (page - 1) * pageSize });
    });
    [HttpGet("categories/{id:long}")]
    public Task<IActionResult> Category(long id, [FromQuery] long collegeId) => Run("Get category", async () => (object)await _store.One("library_categories", "category_id", id, College(collegeId)));
    [HttpPost("categories")]
    public Task<IActionResult> CreateCategory([FromBody] LibraryCategoryRequest r) => Run("Create category", async () =>
    { College(r.CollegeId); return (object)await _store.One("library_categories", "category_id", await _store.SaveCategory(null, r, Actor()), r.CollegeId); }, 201);
    [HttpPut("categories/{id:long}")]
    public Task<IActionResult> UpdateCategory(long id, [FromBody] LibraryCategoryRequest r) => Run("Update category", async () =>
    { College(r.CollegeId); return (object)await _store.One("library_categories", "category_id", await _store.SaveCategory(id, r, Actor()), r.CollegeId); });
    [HttpPatch("categories/{id:long}/status")]
    public Task<IActionResult> CategoryStatus(long id, [FromQuery] long collegeId, [FromBody] LibraryStatusRequest r) => Run("Change category status", async () => new { id = await _store.SetStatus("CATEGORY", id, College(collegeId), r.Status, Actor()), r.Status });
    [HttpDelete("categories/{id:long}")]
    public Task<IActionResult> DeleteCategory(long id, [FromQuery] long collegeId) => Run("Delete category", async () => new { id = await _store.Delete("CATEGORY", id, College(collegeId), Actor()) });

    [HttpGet("books")]
    public Task<IActionResult> Books([FromQuery] long collegeId, [FromQuery] long? categoryId = null, [FromQuery] string? search = null, [FromQuery] bool? status = null, [FromQuery] bool availableOnly = false, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("List books", async () =>
    {
        College(collegeId); Page(page, pageSize);
        return await _store.Query("""
            SELECT b.*,c.category_name FROM library_books b JOIN library_categories c ON c.category_id=b.category_id
            WHERE b.college_id=@collegeId AND (@categoryId IS NULL OR b.category_id=@categoryId)
            AND (@status IS NULL OR b.status=@status) AND (@availableOnly=0 OR (b.available_copies>0 AND b.status=1 AND c.status=1))
            AND (@search IS NULL OR b.title LIKE @term OR b.author LIKE @term OR b.isbn LIKE @term OR b.accession_no LIKE @term)
            ORDER BY b.book_id DESC LIMIT @pageSize OFFSET @offset
            """, new { collegeId, categoryId, status, availableOnly, search = LibraryStore.Optional(search), term = "%" + search?.Trim() + "%", pageSize, offset = (page - 1) * pageSize });
    });
    [HttpGet("books/{id:long}")]
    public Task<IActionResult> Book(long id, [FromQuery] long collegeId) => Run("Get book", async () => (object)await _store.One("library_books", "book_id", id, College(collegeId)));
    [HttpPost("books")]
    public Task<IActionResult> CreateBook([FromBody] LibraryBookRequest r) => Run("Create book", async () =>
    { College(r.CollegeId); return (object)await _store.One("library_books", "book_id", await _store.SaveBook(null, r, Actor()), r.CollegeId); }, 201);
    [HttpPut("books/{id:long}")]
    public Task<IActionResult> UpdateBook(long id, [FromBody] LibraryBookRequest r) => Run("Update book", async () =>
    { College(r.CollegeId); return (object)await _store.One("library_books", "book_id", await _store.SaveBook(id, r, Actor()), r.CollegeId); });
    [HttpPatch("books/{id:long}/status")]
    public Task<IActionResult> BookStatus(long id, [FromQuery] long collegeId, [FromBody] LibraryStatusRequest r) => Run("Change book status", async () => new { id = await _store.SetStatus("BOOK", id, College(collegeId), r.Status, Actor()), r.Status });
    [HttpDelete("books/{id:long}")]
    public Task<IActionResult> DeleteBook(long id, [FromQuery] long collegeId) => Run("Delete book", async () => new { id = await _store.Delete("BOOK", id, College(collegeId), Actor()) });

    private async Task<object> IssueList(long collegeId, long? studentId, long? bookId, string? status, bool returnsOnly, int page, int pageSize)
    {
        College(collegeId); Page(page, pageSize); status = LibraryStore.Optional(status)?.ToUpperInvariant();
        LibraryStore.Require(status == null || new[] { "ISSUED", "RETURNED", "OVERDUE", "LOST", "CANCELLED" }.Contains(status), "Invalid issue status.");
        return await _store.Query("""
            SELECT i.*,b.title,b.accession_no,
            CASE WHEN i.status='ISSUED' AND i.due_date<CURDATE() THEN 'OVERDUE' ELSE i.status END AS effective_status,
            CASE WHEN i.status IN ('ISSUED','OVERDUE','RETURNED') THEN GREATEST(DATEDIFF(COALESCE(i.return_date,CURDATE()),i.due_date),0) ELSE 0 END AS overdue_days
            FROM library_issues i JOIN library_books b ON b.book_id=i.book_id
            WHERE i.college_id=@collegeId AND (@studentId IS NULL OR i.student_id=@studentId) AND (@bookId IS NULL OR i.book_id=@bookId)
            AND (@returnsOnly=0 OR i.status='RETURNED')
            AND (@status IS NULL OR (CASE WHEN i.status='ISSUED' AND i.due_date<CURDATE() THEN 'OVERDUE' ELSE i.status END)=@status)
            ORDER BY i.issue_id DESC LIMIT @pageSize OFFSET @offset
            """, new { collegeId, studentId, bookId, status, returnsOnly, pageSize, offset = (page - 1) * pageSize });
    }
    [HttpGet("issues")]
    public Task<IActionResult> Issues([FromQuery] long collegeId, [FromQuery] long? studentId = null, [FromQuery] long? bookId = null, [FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("List issues", () => IssueList(collegeId, studentId, bookId, status, false, page, pageSize));
    [HttpGet("issues/{id:long}")]
    public Task<IActionResult> Issue(long id, [FromQuery] long collegeId) => Run("Get issue", async () => (object)await _store.One("library_issues", "issue_id", id, College(collegeId)));
    [HttpPost("issues")]
    public Task<IActionResult> CreateIssue([FromBody] LibraryIssueRequest r) => Run("Issue book", async () =>
    { College(r.CollegeId); return (object)await _store.One("library_issues", "issue_id", await _store.Issue(r, Actor()), r.CollegeId); }, 201);
    [HttpPost("issues/{id:long}/return")]
    public Task<IActionResult> Return(long id, [FromQuery] long collegeId, [FromBody] LibraryReturnRequest r) => Run("Return book", async () =>
    { College(collegeId); await _store.Return(id, collegeId, r, Actor()); return (object)await _store.One("library_issues", "issue_id", id, collegeId); });
    [HttpGet("returns")]
    public Task<IActionResult> Returns([FromQuery] long collegeId, [FromQuery] long? studentId = null, [FromQuery] long? bookId = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("List returns", () => IssueList(collegeId, studentId, bookId, null, true, page, pageSize));

    [HttpGet("fines")]
    public Task<IActionResult> Fines([FromQuery] long collegeId, [FromQuery] long? studentId = null, [FromQuery] long? issueId = null, [FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("List fines", async () =>
    {
        College(collegeId); Page(page, pageSize); status = LibraryStore.Optional(status)?.ToUpperInvariant();
        LibraryStore.Require(status == null || new[] { "UNPAID", "PARTIALLY_PAID", "PAID", "WAIVED" }.Contains(status), "Invalid fine status.");
        return await _store.Query("""
            SELECT f.*,i.student_id,i.book_id,CASE WHEN f.status='WAIVED' THEN 0 ELSE f.fine_amount-f.paid_amount END AS balance
            FROM library_fines f JOIN library_issues i ON i.issue_id=f.issue_id
            WHERE f.college_id=@collegeId AND (@studentId IS NULL OR i.student_id=@studentId)
            AND (@issueId IS NULL OR f.issue_id=@issueId) AND (@status IS NULL OR f.status=@status)
            ORDER BY f.fine_id DESC LIMIT @pageSize OFFSET @offset
            """, new { collegeId, studentId, issueId, status, pageSize, offset = (page - 1) * pageSize });
    });
    [HttpGet("fines/{id:long}")]
    public Task<IActionResult> Fine(long id, [FromQuery] long collegeId) => Run("Get fine", async () =>
    {
        College(collegeId); var fine = await _store.One("library_fines", "fine_id", id, collegeId);
        return new { fine, balance = (string)fine.status == "WAIVED" ? 0m : Convert.ToDecimal(fine.fine_amount) - Convert.ToDecimal(fine.paid_amount), payments = await _store.Query("SELECT * FROM library_fine_payments WHERE fine_id=@id AND college_id=@collegeId ORDER BY payment_id", new { id, collegeId }) };
    });
    [HttpPost("fines")]
    public Task<IActionResult> CreateFine([FromBody] LibraryFineRequest r) => Run("Assess fine", async () =>
    { College(r.CollegeId); return (object)await _store.One("library_fines", "fine_id", await _store.AssessFine(r, Actor()), r.CollegeId); }, 201);
    [HttpPost("fines/{id:long}/payments")]
    public Task<IActionResult> PayFine(long id, [FromQuery] long collegeId, [FromBody] LibraryFinePaymentRequest r) => Run("Pay fine", async () =>
    { College(collegeId); await _store.PayFine(id, collegeId, r, Actor()); return (object)await _store.One("library_fines", "fine_id", id, collegeId); }, 201);
    [HttpGet("fines/{id:long}/payments")]
    public Task<IActionResult> Payments(long id, [FromQuery] long collegeId) => Run("List fine payments", async () =>
    { await _store.One("library_fines", "fine_id", id, College(collegeId)); return await _store.Query("SELECT * FROM library_fine_payments WHERE fine_id=@id AND college_id=@collegeId ORDER BY payment_id", new { id, collegeId }); });
    [HttpPatch("fines/{id:long}/waive")]
    public Task<IActionResult> WaiveFine(long id, [FromQuery] long collegeId, [FromBody] LibraryFineWaiverRequest r) => Run("Waive fine balance", async () =>
    { College(collegeId); await _store.WaiveFine(id, collegeId, r, Actor()); return (object)await _store.One("library_fines", "fine_id", id, collegeId); });

    private async Task<object> HistoryList(long collegeId, long? studentId, long? bookId, long? issueId, long? fineId, string? action, int page, int pageSize)
    {
        College(collegeId); Page(page, pageSize);
        return await _store.Query("""
            SELECT * FROM library_history WHERE college_id=@collegeId AND (@studentId IS NULL OR student_id=@studentId)
            AND (@bookId IS NULL OR book_id=@bookId) AND (@issueId IS NULL OR issue_id=@issueId)
            AND (@fineId IS NULL OR fine_id=@fineId) AND (@action IS NULL OR action=@action)
            ORDER BY history_id DESC LIMIT @pageSize OFFSET @offset
            """, new { collegeId, studentId, bookId, issueId, fineId, action = LibraryStore.Optional(action)?.ToUpperInvariant(), pageSize, offset = (page - 1) * pageSize });
    }
    [HttpGet("history")]
    public Task<IActionResult> History([FromQuery] long collegeId, [FromQuery] long? studentId = null, [FromQuery] long? bookId = null, [FromQuery] long? issueId = null, [FromQuery] long? fineId = null, [FromQuery] string? action = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("List library history", () => HistoryList(collegeId, studentId, bookId, issueId, fineId, action, page, pageSize));
    [HttpGet("students/{studentId:long}/history")]
    public Task<IActionResult> StudentHistory(long studentId, [FromQuery] long collegeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("Get student library history", () => HistoryList(collegeId, studentId, null, null, null, null, page, pageSize));
    [HttpGet("books/{id:long}/history")]
    public Task<IActionResult> BookHistory(long id, [FromQuery] long collegeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("Get book history", () => HistoryList(collegeId, null, id, null, null, null, page, pageSize));
    [HttpGet("issues/{id:long}/history")]
    public Task<IActionResult> IssueHistory(long id, [FromQuery] long collegeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Run("Get issue history", () => HistoryList(collegeId, null, null, id, null, null, page, pageSize));
}
