-- Read-only audit. Each result set should be empty. Does not repair or delete data.
USE cms_btech;
-- Overpaid fee balances.
SELECT sf.student_fee_id,sf.amount,COALESCE(SUM(fp.fee_amount),0) paid
FROM student_fees sf LEFT JOIN fee_payments fp ON fp.student_fee_id=sf.student_fee_id
GROUP BY sf.student_fee_id,sf.amount HAVING paid>sf.amount OR paid<0;
-- Fine payments must not exceed amount after waivers.
SELECT f.fine_id,f.net_amount,COALESCE(SUM(fp.fine_amount),0) paid
FROM fee_fines f LEFT JOIN fee_payments fp ON fp.fine_id=f.fine_id
GROUP BY f.fine_id,f.net_amount HAVING paid>f.net_amount OR paid<0;
-- Every payment should have exactly one receipt.
SELECT fp.payment_id,COUNT(r.receipt_id) receipt_count
FROM fee_payments fp LEFT JOIN fee_receipts r ON r.payment_id=fp.payment_id
GROUP BY fp.payment_id HAVING receipt_count<>1;
-- Invalid amounts, references, fine links and modes.
SELECT payment_id FROM fee_payments
WHERE fee_amount<0 OR fine_amount<0 OR total_amount<=0
 OR total_amount<>fee_amount+fine_amount
 OR payment_mode NOT IN ('CASH','UPI','CARD','BANK_TRANSFER','CHEQUE')
 OR (payment_mode<>'CASH' AND NULLIF(TRIM(transaction_reference),'') IS NULL)
 OR (fine_amount=0 AND fine_id IS NOT NULL) OR (fine_amount>0 AND fine_id IS NULL);
-- Broken or blank receipt identities.
SELECT r.receipt_id FROM fee_receipts r LEFT JOIN fee_payments fp ON fp.payment_id=r.payment_id
WHERE fp.payment_id IS NULL OR NULLIF(TRIM(r.receipt_number),'') IS NULL;
