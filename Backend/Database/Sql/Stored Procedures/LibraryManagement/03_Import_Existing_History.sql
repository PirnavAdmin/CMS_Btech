-- Optional, rerunnable: record snapshots of pre-existing issues/fines.
-- Run after 02. This does not invent individual old payment transactions.
-- Existing records stay unchanged. Audit starts with a clearly labeled snapshot.
INSERT INTO library_history
(college_id,entity_type,entity_id,book_id,student_id,issue_id,action,details,performed_by)
SELECT i.college_id,'ISSUE',i.issue_id,i.book_id,i.student_id,i.issue_id,'IMPORTED_ISSUE',
       JSON_OBJECT('status',i.status,'issueDate',i.issue_date,'dueDate',i.due_date,
                   'returnDate',i.return_date,'returnedBy',i.returned_by,'remarks',i.remarks),i.issued_by
FROM library_issues i
WHERE NOT EXISTS (SELECT 1 FROM library_history h WHERE h.entity_type='ISSUE' AND h.entity_id=i.issue_id);

INSERT INTO library_history
(college_id,entity_type,entity_id,book_id,student_id,issue_id,fine_id,action,details,performed_by)
SELECT f.college_id,'FINE',f.fine_id,i.book_id,i.student_id,f.issue_id,f.fine_id,'IMPORTED_FINE',
       JSON_OBJECT('status',f.status,'fineAmount',f.fine_amount,'paidAmount',f.paid_amount,
                   'assessedDate',f.assessed_date,'paidDate',f.paid_date,'paymentMethod',f.payment_method),
       COALESCE(f.created_by,i.issued_by)
FROM library_fines f JOIN library_issues i ON i.issue_id=f.issue_id
WHERE NOT EXISTS (SELECT 1 FROM library_history h WHERE h.entity_type='FINE' AND h.entity_id=f.fine_id);
