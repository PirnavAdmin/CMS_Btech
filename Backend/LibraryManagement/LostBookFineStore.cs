using Dapper;
using MySqlConnector;
using System.Data;
namespace BTech.LibraryManagement;
internal sealed class LostBookFineStore
{
 private readonly string _cs;
 public LostBookFineStore(IConfiguration config) => _cs=config.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("DefaultConnection required");
 private static void Check(bool ok,string message,int status=400) {if(!ok) throw new LibraryApiException(status,message);}
 private static void Amount(decimal amount) => Check(amount>0 && amount<=99999999.99m && decimal.Round(amount,2)==amount,"Invalid monetary amount.");
 private async Task<T> Tx<T>(Func<MySqlConnection,MySqlTransaction,Task<T>> fn) {await using var db=new MySqlConnection(_cs);await db.OpenAsync();await using var tx=await db.BeginTransactionAsync(IsolationLevel.ReadCommitted);try{var result=await fn(db,tx);await tx.CommitAsync();return result;}catch{await tx.RollbackAsync();throw;}}
 public async Task<object> MarkLost(long id,long college,long actor,string? remarks)=>await Tx<object>(async(db,tx)=>{
  var issue=await db.QuerySingleOrDefaultAsync("SELECT * FROM library_issues WHERE issue_id=@id AND college_id=@college FOR UPDATE",new{id,college},tx);
  Check(issue!=null,"Issue not found.",404);Check((string)issue.status=="ISSUED" || (string)issue.status=="OVERDUE","Only an active issue can be marked lost.",409);
  var book=await db.QuerySingleAsync("SELECT * FROM library_books WHERE book_id=@bookId AND college_id=@college FOR UPDATE",new{bookId=(long)issue.book_id,college},tx);
  // Issued copies are already excluded from available_copies. Remove the lost copy from total_copies only.
  Check((int)book.total_copies>(int)book.available_copies,"Inventory is inconsistent; cannot mark lost.",409);
  await db.ExecuteAsync("UPDATE library_issues SET status='LOST',remarks=COALESCE(@remarks,remarks) WHERE issue_id=@id",new{id,remarks},tx);
  await db.ExecuteAsync("UPDATE library_books SET lost_copies=lost_copies+1 WHERE book_id=@bookId",new{bookId=(long)issue.book_id},tx);
  await Audit(db,tx,college,actor,"LOST_MARKED",id,new{remarks,bookId=(long)issue.book_id},(long)issue.book_id,(long)issue.student_id,id);
  return new{issueId=id,status="LOST",bookId=(long)issue.book_id};
 });
 public async Task<long> Create(CreateLostBookFineRequest r,long actor)=>await Tx(async(db,tx)=>{
  Amount(r.FineAmount);
  var issue=await db.QuerySingleOrDefaultAsync("SELECT * FROM library_issues WHERE issue_id=@IssueId AND college_id=@CollegeId FOR UPDATE",r,tx);
  Check(issue!=null,"Issue not found.",404);Check((string)issue.status=="LOST","Issue must first be marked LOST.",409);
  Check(await db.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM library_lost_book_fines WHERE issue_id=@IssueId",r,tx)==0,"A lost-book fine already exists for this issue.",409);
  long id=await db.ExecuteScalarAsync<long>("INSERT INTO library_lost_book_fines(college_id,issue_id,student_id,book_id,fine_amount,remarks,created_by) VALUES(@CollegeId,@IssueId,@studentId,@bookId,@FineAmount,@Remarks,@actor); SELECT LAST_INSERT_ID();",new{r.CollegeId,r.IssueId,studentId=(long)issue.student_id,bookId=(long)issue.book_id,r.FineAmount,r.Remarks,actor},tx);
  await Audit(db,tx,r.CollegeId,actor,"LOST_FINE_CREATED",id,new{r.FineAmount,r.Remarks},(long)issue.book_id,(long)issue.student_id,r.IssueId);
  return id;
 });
 public async Task<long> Update(long id,UpdateLostBookFineRequest r,long actor)=>await Tx(async(db,tx)=>{
  Amount(r.FineAmount);Check(!string.IsNullOrWhiteSpace(r.Reason),"Reason is required.");
  var fine=await db.QuerySingleOrDefaultAsync("SELECT * FROM library_lost_book_fines WHERE fine_id=@id AND college_id=@college FOR UPDATE",new{id,college=r.CollegeId},tx);
  Check(fine!=null,"Fine not found.",404);Check(r.FineAmount >= (decimal)fine.paid_amount,"Fine cannot be lower than payments already received.",409);
  await db.ExecuteAsync("UPDATE library_lost_book_fines SET fine_amount=@amount,payment_status=CASE WHEN paid_amount=0 THEN 'Pending' WHEN paid_amount=@amount THEN 'Paid' ELSE 'Partially Paid' END,updated_by=@actor WHERE fine_id=@id",new{id,amount=r.FineAmount,actor},tx);
  await db.ExecuteAsync("INSERT INTO library_lost_book_fine_adjustments(fine_id,college_id,old_amount,new_amount,reason,changed_by) VALUES(@id,@college,@old,@new,@reason,@actor)",new{id,college=r.CollegeId,old=(decimal)fine.fine_amount,@new=r.FineAmount,reason=r.Reason,actor},tx);
  await Audit(db,tx,r.CollegeId,actor,"LOST_FINE_UPDATED",id,new{oldAmount=(decimal)fine.fine_amount,newAmount=r.FineAmount,r.Reason},(long)fine.book_id,(long)fine.student_id,(long)fine.issue_id);
  return id;
 });
 public async Task<long> Pay(long id,LostBookFinePaymentRequest r,long actor)=>await Tx(async(db,tx)=>{
  Amount(r.Amount);Check(!string.IsNullOrWhiteSpace(r.ReceiptNo),"ReceiptNo required.");Check(!string.IsNullOrWhiteSpace(r.PaymentMethod),"PaymentMethod required.");
  var fine=await db.QuerySingleOrDefaultAsync("SELECT * FROM library_lost_book_fines WHERE fine_id=@id AND college_id=@college FOR UPDATE",new{id,college=r.CollegeId},tx);
  Check(fine!=null,"Fine not found.",404);Check(r.Amount<=(decimal)fine.fine_amount-(decimal)fine.paid_amount,"Payment exceeds outstanding balance.",409);
  long paymentId=await db.ExecuteScalarAsync<long>("INSERT INTO library_lost_book_fine_payments(fine_id,college_id,amount,payment_method,receipt_no,remarks,received_by) VALUES(@id,@college,@amount,@method,@receipt,@remarks,@actor); SELECT LAST_INSERT_ID();",new{id,college=r.CollegeId,amount=r.Amount,method=r.PaymentMethod,receipt=r.ReceiptNo,remarks=r.Remarks,actor},tx);
  await db.ExecuteAsync("UPDATE library_lost_book_fines SET paid_amount=paid_amount+@amount,payment_status=CASE WHEN paid_amount+@amount=fine_amount THEN 'Paid' ELSE 'Partially Paid' END,updated_by=@actor WHERE fine_id=@id",new{id,amount=r.Amount,actor},tx);
  await Audit(db,tx,r.CollegeId,actor,"LOST_FINE_PAYMENT",id,new{paymentId,r.Amount,r.ReceiptNo},(long)fine.book_id,(long)fine.student_id,(long)fine.issue_id);
  return paymentId;
 });
 private static Task Audit(MySqlConnection db,MySqlTransaction tx,long college,long actor,string action,long entityId,object details,long bookId,long studentId,long issueId)=>db.ExecuteAsync("INSERT INTO library_history(college_id,entity_type,entity_id,book_id,student_id,issue_id,action,details,performed_by) VALUES(@college,'LOST_FINE',@entityId,@bookId,@studentId,@issueId,@action,@details,@actor)",new{college,entityId,bookId,studentId,issueId,action,details=System.Text.Json.JsonSerializer.Serialize(details),actor},tx);
 public async Task<dynamic> Detail(long id,long college) {await using var db=new MySqlConnection(_cs);var row=await db.QuerySingleOrDefaultAsync(Select+" WHERE f.college_id=@college AND f.fine_id=@id",new{id,college});Check(row!=null,"Fine not found.",404);return row!;}
 private const string Select="SELECT f.fine_id AS fineId,f.issue_id AS issueId,f.student_id AS studentId,s.student_code AS studentCode,s.full_name AS studentName,f.book_id AS bookId,b.title AS bookTitle,b.accession_no AS accessionNumber,f.fine_amount AS fineAmount,f.paid_amount AS paidAmount,(f.fine_amount-f.paid_amount) AS balanceAmount,f.payment_status AS paymentStatus,f.remarks,f.created_at AS createdAt FROM library_lost_book_fines f JOIN students s ON s.student_id=f.student_id AND s.college_id=f.college_id JOIN library_books b ON b.book_id=f.book_id AND b.college_id=f.college_id";
 public async Task<object> List(long college,string? search,string? status,int page,int size) {Check(page>=1 && size>=1 && size<=200,"Invalid pagination.");status=string.IsNullOrWhiteSpace(status)?null:status.Trim().Replace("_"," ");Check(status==null || new[]{"Pending","Partially Paid","Paid"}.Contains(status,StringComparer.OrdinalIgnoreCase),"Invalid payment status.");await using var db=new MySqlConnection(_cs);var where=" WHERE f.college_id=@college AND (@status IS NULL OR f.payment_status=@status) AND (@search IS NULL OR s.full_name LIKE @term OR s.student_code LIKE @term OR b.title LIKE @term OR b.accession_no LIKE @term OR CAST(f.issue_id AS CHAR) LIKE @term)";var args=new{college,status,search=string.IsNullOrWhiteSpace(search)?null:search.Trim(),term="%"+search?.Trim()+"%",size,offset=(page-1)*size};var total=await db.ExecuteScalarAsync<long>("SELECT COUNT(*) FROM library_lost_book_fines f JOIN students s ON s.student_id=f.student_id AND s.college_id=f.college_id JOIN library_books b ON b.book_id=f.book_id AND b.college_id=f.college_id"+where,args);var items=await db.QueryAsync(Select+where+" ORDER BY f.fine_id DESC LIMIT @size OFFSET @offset",args);return new{items,totalRecords=total,pageNumber=page,pageSize=size};}
 public async Task<object> Payments(long id,long college) {await Detail(id,college);await using var db=new MySqlConnection(_cs);return (await db.QueryAsync("SELECT payment_id AS paymentId,amount,payment_method AS paymentMethod,receipt_no AS receiptNo,remarks,paid_at AS paidAt,received_by AS receivedBy FROM library_lost_book_fine_payments WHERE fine_id=@id AND college_id=@college ORDER BY payment_id DESC",new{id,college})).AsList();}
 public async Task<object> Report(long college,string? status) {await using var db=new MySqlConnection(_cs);status=string.IsNullOrWhiteSpace(status)?null:status.Trim().Replace("_"," ");Check(status==null || new[]{"Pending","Partially Paid","Paid"}.Contains(status,StringComparer.OrdinalIgnoreCase),"Invalid status.");return await db.QuerySingleAsync("SELECT COUNT(*) AS totalFines,COALESCE(SUM(fine_amount),0) AS assessedAmount,COALESCE(SUM(paid_amount),0) AS collectedAmount,COALESCE(SUM(fine_amount-paid_amount),0) AS outstandingAmount,SUM(payment_status='Pending') AS pendingCount,SUM(payment_status='Partially Paid') AS partiallyPaidCount,SUM(payment_status='Paid') AS paidCount FROM library_lost_book_fines WHERE college_id=@college AND (@status IS NULL OR payment_status=@status)",new{college,status});}
}
