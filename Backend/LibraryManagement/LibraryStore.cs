using System.Text.Json;
using Dapper;
using MySqlConnector;

namespace BTech.LibraryManagement;

// Every mutation and its history entry share one transaction. Controllers are
// auto-discovered; the module requires no changes to Program.cs or EF mappings.
internal sealed class LibraryStore
{
    private readonly string _connectionString;
    public LibraryStore(IConfiguration configuration) => _connectionString =
        configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection is required.");

    internal static void Require(bool condition, string message, int status = 400)
    { if (!condition) throw new LibraryApiException(status, message); }
    internal static string Text(string? value, string name)
    { Require(!string.IsNullOrWhiteSpace(value), $"{name} is required."); return value!.Trim(); }
    internal static string? Optional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    internal static void Money(decimal value)
    { Require(value >= 0 && value <= 99999999.99m && decimal.Round(value, 2) == value, "Amount must be nonnegative with at most two decimal places."); }
    private static void Date(DateTime value, string name)
    { Require(value.Year >= 1000 && value.Date <= DateTime.Today, $"{name} must be a valid date no later than today."); }

    public async Task<IReadOnlyList<dynamic>> Query(string sql, object args)
    {
        await using var db = new MySqlConnection(_connectionString);
        await db.OpenAsync();
        return (await db.QueryAsync(sql, args)).AsList();
    }
    public async Task<dynamic> One(string table, string key, long id, long collegeId)
    {
        // Table/key originate only from internal, fixed literals.
        var rows = await Query($"SELECT * FROM {table} WHERE {key}=@id AND college_id=@collegeId", new { id, collegeId });
        Require(rows.Count > 0, "Record not found.", 404);
        return rows[0];
    }
    private async Task<T> Write<T>(Func<MySqlConnection, MySqlTransaction, Task<T>> operation)
    {
        await using var db = new MySqlConnection(_connectionString);
        await db.OpenAsync();
        await using var tx = await db.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted);
        try { var result = await operation(db, tx); await tx.CommitAsync(); return result; }
        catch { await tx.RollbackAsync(); throw; }
    }
    private static async Task Audit(MySqlConnection db, MySqlTransaction tx, long collegeId,
        long actor, string entity, long id, string action, object details,
        long? bookId = null, long? studentId = null, long? issueId = null, long? fineId = null)
    {
        await db.ExecuteAsync("""
            INSERT INTO library_history (college_id,entity_type,entity_id,book_id,student_id,issue_id,fine_id,action,details,performed_by)
            VALUES (@collegeId,@entity,@id,@bookId,@studentId,@issueId,@fineId,@action,@json,@actor)
            """, new { collegeId, entity, id, bookId, studentId, issueId, fineId, action, json = JsonSerializer.Serialize(details), actor }, tx);
    }
    private static async Task<dynamic> Lock(MySqlConnection db, MySqlTransaction tx, string table, string key, long id, long collegeId)
    {
        var row = await db.QuerySingleOrDefaultAsync($"SELECT * FROM {table} WHERE {key}=@id AND college_id=@collegeId FOR UPDATE", new { id, collegeId }, tx);
        Require(row != null, "Record not found in this college.", 404);
        return row!;
    }

    public Task<long> SaveCategory(long? id, LibraryCategoryRequest r, long actor) => Write(async (db, tx) =>
    {
        r.CategoryCode = Text(r.CategoryCode, "CategoryCode"); r.CategoryName = Text(r.CategoryName, "CategoryName");
        if (id.HasValue) await Lock(db, tx, "library_categories", "category_id", id.Value, r.CollegeId);
        var duplicate = await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM library_categories WHERE college_id=@CollegeId AND (@id IS NULL OR category_id<>@id) AND (LOWER(TRIM(category_code))=LOWER(@CategoryCode) OR LOWER(TRIM(category_name))=LOWER(@CategoryName))", new { r.CollegeId, r.CategoryCode, r.CategoryName, id }, tx);
        Require(duplicate == 0, "Category code or name already exists.", 409);
        var args = new { r.CollegeId, r.CategoryCode, r.CategoryName, Description = Optional(r.Description), r.Status, actor, id };
        if (id.HasValue)
            await db.ExecuteAsync("UPDATE library_categories SET category_code=@CategoryCode,category_name=@CategoryName,description=@Description,status=@Status,updated_by=@actor WHERE category_id=@id AND college_id=@CollegeId", args, tx);
        else
            id = await db.ExecuteScalarAsync<long>("INSERT INTO library_categories (college_id,category_code,category_name,description,status,created_by) VALUES (@CollegeId,@CategoryCode,@CategoryName,@Description,@Status,@actor); SELECT LAST_INSERT_ID();", args, tx);
        await Audit(db, tx, r.CollegeId, actor, "CATEGORY", id!.Value, args.id.HasValue ? "UPDATED" : "CREATED", r);
        return id.Value;
    });
    public Task<long> SaveBook(long? id, LibraryBookRequest r, long actor) => Write(async (db, tx) =>
    {
        r.AccessionNo = Text(r.AccessionNo, "AccessionNo"); r.Title = Text(r.Title, "Title");
        r.Author = Text(r.Author, "Author"); r.Language = Text(r.Language, "Language"); r.Isbn = Optional(r.Isbn);
        if (r.Price.HasValue) Money(r.Price.Value);
        dynamic? old = null;
        if (id.HasValue) old = await Lock(db, tx, "library_books", "book_id", id.Value, r.CollegeId);
        var category = await Lock(db, tx, "library_categories", "category_id", r.CategoryId, r.CollegeId);
        Require(Convert.ToInt32(category.status) == 1, "Category must be active.");
        var duplicate = await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM library_books WHERE (@id IS NULL OR book_id<>@id) AND ((college_id=@CollegeId AND LOWER(TRIM(accession_no))=LOWER(@AccessionNo)) OR (@Isbn IS NOT NULL AND isbn=@Isbn))", new { r.CollegeId, r.AccessionNo, r.Isbn, id }, tx);
        Require(duplicate == 0, "Accession number or ISBN already exists.", 409);
        // Preserve copies already in circulation; never accept availableCopies from a client.
        int outstanding = old == null ? 0 : Convert.ToInt32(old.total_copies) - Convert.ToInt32(old.available_copies);
        Require(r.TotalCopies >= outstanding, "TotalCopies cannot be less than copies already issued.", 409);
        var available = r.TotalCopies - outstanding;
        var args = new { r.CollegeId, r.CategoryId, r.Isbn, r.AccessionNo, r.Title, r.Author,
            Publisher = Optional(r.Publisher), Edition = Optional(r.Edition), r.PublicationYear, r.Language,
            r.TotalCopies, available, ShelfLocation = Optional(r.ShelfLocation), r.Price,
            Description = Optional(r.Description), r.Status, actor, id };
        if (id.HasValue)
            await db.ExecuteAsync("""
                UPDATE library_books SET category_id=@CategoryId,isbn=@Isbn,accession_no=@AccessionNo,title=@Title,author=@Author,
                publisher=@Publisher,edition=@Edition,publication_year=@PublicationYear,language=@Language,total_copies=@TotalCopies,
                available_copies=@available,shelf_location=@ShelfLocation,price=@Price,description=@Description,status=@Status,updated_by=@actor
                WHERE book_id=@id AND college_id=@CollegeId
                """, args, tx);
        else
            id = await db.ExecuteScalarAsync<long>("""
                INSERT INTO library_books (college_id,category_id,isbn,accession_no,title,author,publisher,edition,publication_year,
                language,total_copies,available_copies,shelf_location,price,description,status,created_by)
                VALUES (@CollegeId,@CategoryId,@Isbn,@AccessionNo,@Title,@Author,@Publisher,@Edition,@PublicationYear,
                @Language,@TotalCopies,@available,@ShelfLocation,@Price,@Description,@Status,@actor); SELECT LAST_INSERT_ID();
                """, args, tx);
        await Audit(db, tx, r.CollegeId, actor, "BOOK", id!.Value, args.id.HasValue ? "UPDATED" : "CREATED", r, bookId: id);
        return id.Value;
    });
    public Task<long> SetStatus(string entity, long id, long collegeId, bool status, long actor) => Write(async (db, tx) =>
    {
        var isBook = entity == "BOOK";
        var table = isBook ? "library_books" : "library_categories";
        var key = isBook ? "book_id" : "category_id";
        await Lock(db, tx, table, key, id, collegeId);
        await db.ExecuteAsync($"UPDATE {table} SET status=@status,updated_by=@actor WHERE {key}=@id AND college_id=@collegeId", new { status, actor, id, collegeId }, tx);
        await Audit(db, tx, collegeId, actor, entity, id, "STATUS_CHANGED", new { status }, bookId: isBook ? id : null);
        return id;
    });
    public Task<long> Delete(string entity, long id, long collegeId, long actor) => Write(async (db, tx) =>
    {
        var isBook = entity == "BOOK";
        var table = isBook ? "library_books" : "library_categories";
        var key = isBook ? "book_id" : "category_id";
        var old = await Lock(db, tx, table, key, id, collegeId);
        var count = await db.ExecuteScalarAsync<int>(isBook
            ? "SELECT COUNT(*) FROM library_issues WHERE book_id=@id"
            : "SELECT COUNT(*) FROM library_books WHERE category_id=@id", new { id }, tx);
        Require(count == 0, isBook ? "Book has issue history. Deactivate it instead." : "Category contains books. Deactivate it instead.", 409);
        await Audit(db, tx, collegeId, actor, entity, id, "DELETED", (object)old, bookId: isBook ? id : null);
        await db.ExecuteAsync($"DELETE FROM {table} WHERE {key}=@id AND college_id=@collegeId", new { id, collegeId }, tx);
        return id;
    });
    public Task<long> Issue(LibraryIssueRequest r, long actor) => Write(async (db, tx) =>
    {
        Date(r.IssueDate, "IssueDate"); Require(r.DueDate.Date >= r.IssueDate.Date, "DueDate cannot be before IssueDate.");
        var book = await Lock(db, tx, "library_books", "book_id", r.BookId, r.CollegeId);
        var category = await Lock(db, tx, "library_categories", "category_id", Convert.ToInt64(book.category_id), r.CollegeId);
        Require(Convert.ToInt32(book.status) == 1 && Convert.ToInt32(category.status) == 1, "Book and category must be active.", 409);
        Require(Convert.ToInt32(book.available_copies) > 0, "No copies available.", 409);
        Require(await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM students WHERE student_id=@StudentId AND college_id=@CollegeId", r, tx) > 0, "Student not found in this college.", 404);
        var active = await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM library_issues WHERE book_id=@BookId AND student_id=@StudentId AND status IN ('ISSUED','OVERDUE')", r, tx);
        Require(active == 0, "Student already has an active issue for this book.", 409);
        var id = await db.ExecuteScalarAsync<long>("""
            INSERT INTO library_issues (college_id,book_id,student_id,issued_by,issue_date,due_date,remarks)
            VALUES (@CollegeId,@BookId,@StudentId,@actor,@issueDate,@dueDate,@Remarks); SELECT LAST_INSERT_ID();
            """, new { r.CollegeId, r.BookId, r.StudentId, actor, issueDate = r.IssueDate.Date, dueDate = r.DueDate.Date, r.Remarks }, tx);
        await db.ExecuteAsync("UPDATE library_books SET available_copies=available_copies-1,updated_by=@actor WHERE book_id=@BookId", new { actor, r.BookId }, tx);
        await Audit(db, tx, r.CollegeId, actor, "ISSUE", id, "ISSUED", r, r.BookId, r.StudentId, id);
        return id;
    });
    public Task<long> Return(long id, long collegeId, LibraryReturnRequest r, long actor) => Write(async (db, tx) =>
    {
        Date(r.ReturnDate, "ReturnDate");
        // Resolve the immutable book id first; then consistently lock book before issue.
        var bookId = await db.QuerySingleOrDefaultAsync<long?>("SELECT book_id FROM library_issues WHERE issue_id=@id AND college_id=@collegeId", new { id, collegeId }, tx);
        Require(bookId.HasValue, "Issue not found.", 404);
        var book = await Lock(db, tx, "library_books", "book_id", bookId!.Value, collegeId);
        var issue = await Lock(db, tx, "library_issues", "issue_id", id, collegeId);
        Require((string)issue.status is "ISSUED" or "OVERDUE", "Only active issues can be returned; this issue is already closed.", 409);
        Require(r.ReturnDate.Date >= ((DateTime)issue.issue_date).Date, "ReturnDate cannot be before IssueDate.");
        Require(Convert.ToInt32(book.available_copies) < Convert.ToInt32(book.total_copies), "Stock is inconsistent. Correct the stock before returning.", 409);
        await db.ExecuteAsync("UPDATE library_issues SET return_date=@date,returned_by=@actor,status='RETURNED',remarks=COALESCE(@Remarks,remarks) WHERE issue_id=@id", new { date = r.ReturnDate.Date, actor, r.Remarks, id }, tx);
        await db.ExecuteAsync("UPDATE library_books SET available_copies=available_copies+1,updated_by=@actor WHERE book_id=@bookId", new { actor, bookId }, tx);
        await Audit(db, tx, collegeId, actor, "ISSUE", id, "RETURNED", r, bookId, Convert.ToInt64(issue.student_id), id);
        return id;
    });
    public Task<long> AssessFine(LibraryFineRequest r, long actor) => Write(async (db, tx) =>
    {
        Money(r.FineAmount); Require(r.FineAmount > 0, "FineAmount must be positive.");
        Date(r.AssessedDate, "AssessedDate"); r.FineReason = Text(r.FineReason, "FineReason");
        var issue = await Lock(db, tx, "library_issues", "issue_id", r.IssueId, r.CollegeId);
        Require(r.AssessedDate.Date >= ((DateTime)issue.issue_date).Date, "AssessedDate cannot be before IssueDate.");
        Require((string)issue.status != "CANCELLED", "Cannot assess a fine on a cancelled issue.");
        Require(await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM library_fines WHERE issue_id=@IssueId", r, tx) == 0, "A fine already exists for this issue.", 409);
        var id = await db.ExecuteScalarAsync<long>("""
            INSERT INTO library_fines (college_id,issue_id,fine_reason,fine_amount,assessed_date,remarks,created_by)
            VALUES (@CollegeId,@IssueId,@FineReason,@FineAmount,@date,@Remarks,@actor); SELECT LAST_INSERT_ID();
            """, new { r.CollegeId, r.IssueId, r.FineReason, r.FineAmount, date = r.AssessedDate.Date, r.Remarks, actor }, tx);
        await Audit(db, tx, r.CollegeId, actor, "FINE", id, "ASSESSED", r, Convert.ToInt64(issue.book_id), Convert.ToInt64(issue.student_id), r.IssueId, id);
        return id;
    });
    public Task<long> PayFine(long id, long collegeId, LibraryFinePaymentRequest r, long actor) => Write(async (db, tx) =>
    {
        Money(r.Amount); Require(r.Amount > 0, "Amount must be positive."); Date(r.PaymentDate, "PaymentDate");
        r.PaymentMethod = Text(r.PaymentMethod, "PaymentMethod").ToUpperInvariant(); r.ReceiptNo = Text(r.ReceiptNo, "ReceiptNo");
        Require(new[] { "CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE" }.Contains(r.PaymentMethod), "Unsupported PaymentMethod.");
        var fine = await Lock(db, tx, "library_fines", "fine_id", id, collegeId);
        Require((string)fine.status is "UNPAID" or "PARTIALLY_PAID", "Fine is already paid or waived.", 409);
        Require(r.PaymentDate.Date >= ((DateTime)fine.assessed_date).Date, "PaymentDate cannot be before AssessedDate.");
        decimal paid = Convert.ToDecimal(fine.paid_amount) + r.Amount;
        Require(paid <= Convert.ToDecimal(fine.fine_amount), "Payment exceeds the outstanding balance.", 409);
        await db.ExecuteAsync("""
            INSERT INTO library_fine_payments (college_id,fine_id,amount,payment_method,receipt_no,payment_date,remarks,received_by)
            VALUES (@collegeId,@id,@Amount,@PaymentMethod,@ReceiptNo,@date,@Remarks,@actor)
            """, new { collegeId, id, r.Amount, r.PaymentMethod, r.ReceiptNo, date = r.PaymentDate.Date, r.Remarks, actor }, tx);
        var status = paid == Convert.ToDecimal(fine.fine_amount) ? "PAID" : "PARTIALLY_PAID";
        await db.ExecuteAsync("UPDATE library_fines SET paid_amount=@paid,status=@status,paid_date=@date,payment_method=@PaymentMethod,updated_by=@actor WHERE fine_id=@id", new { paid, status, date = r.PaymentDate.Date, r.PaymentMethod, actor, id }, tx);
        var issue = await db.QuerySingleAsync("SELECT book_id,student_id FROM library_issues WHERE issue_id=@issueId", new { issueId = (long)fine.issue_id }, tx);
        await Audit(db, tx, collegeId, actor, "FINE", id, "PAYMENT_RECEIVED", r, Convert.ToInt64(issue.book_id), Convert.ToInt64(issue.student_id), Convert.ToInt64(fine.issue_id), id);
        return id;
    });
    public Task<long> WaiveFine(long id, long collegeId, LibraryFineWaiverRequest r, long actor) => Write(async (db, tx) =>
    {
        r.Reason = Text(r.Reason, "Reason");
        var fine = await Lock(db, tx, "library_fines", "fine_id", id, collegeId);
        Require((string)fine.status is "UNPAID" or "PARTIALLY_PAID", "Fine is already paid or waived.", 409);
        await db.ExecuteAsync("UPDATE library_fines SET status='WAIVED',remarks=@Reason,updated_by=@actor WHERE fine_id=@id", new { r.Reason, actor, id }, tx);
        var issue = await db.QuerySingleAsync("SELECT book_id,student_id FROM library_issues WHERE issue_id=@issueId", new { issueId = (long)fine.issue_id }, tx);
        await Audit(db, tx, collegeId, actor, "FINE", id, "BALANCE_WAIVED", new { r.Reason, waivedAmount = Convert.ToDecimal(fine.fine_amount) - Convert.ToDecimal(fine.paid_amount) }, Convert.ToInt64(issue.book_id), Convert.ToInt64(issue.student_id), Convert.ToInt64(fine.issue_id), id);
        return id;
    });
}
