-- Fee validation patch for the supplied October 8 schema.
-- Additive routines only: no tables, data or original routines removed.
-- Run in your selected cms_btech database in MySQL Workbench.
USE cms_btech;
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_fc_payment_create_validated$$
CREATE PROCEDURE sp_fc_payment_create_validated(
 IN p_student_fee_id BIGINT,IN p_fee_amount DECIMAL(32,10),IN p_fine_amount DECIMAL(32,10),IN p_fine_id BIGINT,
 IN p_payment_mode VARCHAR(30),IN p_transaction_reference VARCHAR(150),IN p_remarks VARCHAR(500),
 IN p_payment_date DATETIME,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 DECLARE v_student_id BIGINT; DECLARE v_receipt_count INT; DECLARE v_fee_amount DECIMAL(32,10); DECLARE v_paid DECIMAL(32,10); DECLARE v_fine_net DECIMAL(12,2); DECLARE v_fine_paid DECIMAL(32,10);
 DECLARE v_payment_id BIGINT; DECLARE v_receipt_id BIGINT; DECLARE v_payment_code VARCHAR(100); DECLARE v_receipt_number VARCHAR(100);

 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

 IF p_actor_id IS NULL OR p_actor_id<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A valid actor is required.'; END IF;
 IF p_super_admin IS NULL OR p_super_admin NOT IN (0,1) OR (p_super_admin=0 AND (p_college_id IS NULL OR p_college_id<=0)) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A valid college scope is required.';
 END IF;

 IF p_student_fee_id IS NULL OR p_student_fee_id<=0 OR p_fee_amount IS NULL OR p_fine_amount IS NULL
    OR p_fee_amount<=0 OR p_fine_amount<0 OR p_fee_amount+p_fine_amount>9999999999.99
    OR p_fee_amount<>ROUND(p_fee_amount,2) OR p_fine_amount<>ROUND(p_fine_amount,2) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Payment amounts must fit DECIMAL(12,2), with a positive fee and nonnegative fine.';
 END IF;
 SET p_payment_mode=UPPER(TRIM(p_payment_mode));
 SET p_transaction_reference=NULLIF(TRIM(p_transaction_reference),'');
 IF p_payment_mode IS NULL OR p_payment_mode NOT IN ('CASH','UPI','CARD','BANK_TRANSFER','CHEQUE') THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid payment mode.';
 END IF;
 IF (p_fine_amount=0 AND p_fine_id IS NOT NULL) OR (p_fine_amount>0 AND (p_fine_id IS NULL OR p_fine_id<=0)) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FineId and FineAmount must be supplied together.';
 END IF;
 START TRANSACTION;
 SELECT s.student_id,sf.amount INTO v_student_id,v_fee_amount
 FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE sf.student_fee_id=p_student_fee_id AND sf.status='ACTIVE' AND fa.status='ACTIVE'
   AND (p_super_admin=1 OR s.college_id=p_college_id) FOR UPDATE;
 IF v_student_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student fee not found or access denied.'; END IF;

 SELECT COALESCE(SUM(fee_amount),0) INTO v_paid FROM fee_payments WHERE student_fee_id=p_student_fee_id;
 IF v_paid<0 OR v_paid>v_fee_amount THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Stored fee balance is inconsistent; reconcile existing payments.'; END IF;
 IF p_fee_amount<=0 OR p_fee_amount>GREATEST(v_fee_amount-v_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fee payment exceeds the pending fee balance.'; END IF;

 IF p_fine_id IS NOT NULL THEN
   SELECT net_amount INTO v_fine_net FROM fee_fines WHERE fine_id=p_fine_id AND student_fee_id=p_student_fee_id AND status='ACTIVE' FOR UPDATE;
   IF v_fine_net IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine not found or does not belong to the selected fee.'; END IF;
   SELECT COALESCE(SUM(fine_amount),0) INTO v_fine_paid FROM fee_payments WHERE fine_id=p_fine_id;
   IF v_fine_paid<0 OR v_fine_paid>v_fine_net THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Stored fine balance is inconsistent; reconcile existing payments.'; END IF;
   IF p_fine_amount<=0 OR p_fine_amount>GREATEST(v_fine_net-v_fine_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine payment exceeds the pending fine balance.'; END IF;
 ELSEIF p_fine_amount<>0 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FineId is required when FineAmount is greater than zero.';
 END IF;

 IF UPPER(p_payment_mode)<>'CASH' AND NULLIF(TRIM(p_transaction_reference),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Transaction reference is required for non-cash payments.'; END IF;

 SET v_payment_code=CONCAT('PAY-',DATE_FORMAT(COALESCE(p_payment_date,NOW()),'%Y%m%d'),'-',REPLACE(UUID(),'-',''));
 INSERT INTO fee_payments(payment_code,student_fee_id,fine_id,fee_amount,fine_amount,payment_date,payment_mode,transaction_reference,remarks,created_by,updated_by)
 VALUES(v_payment_code,p_student_fee_id,p_fine_id,p_fee_amount,p_fine_amount,COALESCE(p_payment_date,NOW()),UPPER(p_payment_mode),NULLIF(TRIM(p_transaction_reference),''),p_remarks,p_actor_id,p_actor_id);
 SET v_payment_id=LAST_INSERT_ID();

 SET v_receipt_number=CONCAT('REC-',DATE_FORMAT(COALESCE(p_payment_date,NOW()),'%Y%m%d'),'-',LPAD(v_payment_id,GREATEST(8,CHAR_LENGTH(CAST(v_payment_id AS CHAR))),'0'));
 INSERT INTO fee_receipts(receipt_number,payment_id,issued_at,issued_by,remarks,created_by,updated_by)
 VALUES(v_receipt_number,v_payment_id,COALESCE(p_payment_date,NOW()),p_actor_id,p_remarks,p_actor_id,p_actor_id);
 SET v_receipt_id=LAST_INSERT_ID();

 SELECT COUNT(*) INTO v_receipt_count FROM fee_receipts r JOIN fee_payments fp ON fp.payment_id=r.payment_id
 WHERE fp.payment_id=v_payment_id AND r.receipt_id=v_receipt_id
   AND r.receipt_number=v_receipt_number AND fp.total_amount=p_fee_amount+p_fine_amount;
 IF v_receipt_count<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Receipt validation failed; payment rolled back.'; END IF;
 COMMIT;

 SELECT fp.payment_id PaymentId,fp.payment_code PaymentCode,fp.student_fee_id StudentFeeId,sf.fee_code FeeCode,s.student_id StudentId,
   s.student_code StudentCode,s.full_name StudentName,fp.fee_amount FeeAmount,fp.fine_amount FineAmount,fp.total_amount TotalAmount,
   fp.payment_date PaymentDate,fp.payment_mode PaymentMode,fp.transaction_reference TransactionReference,fp.fine_id FineId,
   r.receipt_id ReceiptId,r.receipt_number ReceiptNumber
 FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 JOIN fee_receipts r ON r.payment_id=fp.payment_id WHERE fp.payment_id=v_payment_id;
END$$

DROP PROCEDURE IF EXISTS sp_fc_fine_waive_validated$$
CREATE PROCEDURE sp_fc_fine_waive_validated(
 IN p_fine_id BIGINT,IN p_waived_amount DECIMAL(32,10),IN p_reason VARCHAR(500),
 IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 DECLARE v_net DECIMAL(12,2); DECLARE v_paid DECIMAL(32,10); DECLARE v_student_id BIGINT; DECLARE v_student_fee_id BIGINT; DECLARE v_locked_fee BIGINT;

 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

 IF p_actor_id IS NULL OR p_actor_id<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A valid actor is required.'; END IF;
 IF p_super_admin IS NULL OR p_super_admin NOT IN (0,1) OR (p_super_admin=0 AND (p_college_id IS NULL OR p_college_id<=0)) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A valid college scope is required.';
 END IF;

 IF p_fine_id IS NULL OR p_fine_id<=0 OR p_waived_amount IS NULL OR p_waived_amount<=0
    OR p_waived_amount>9999999999.99 OR p_waived_amount<>ROUND(p_waived_amount,2)
    OR NULLIF(TRIM(p_reason),'') IS NULL THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A positive two-decimal waiver and a reason are required.';
 END IF;
 -- Discover the parent, then lock fee -> fine in the same order as payments.
 SELECT student_fee_id INTO v_student_fee_id FROM fee_fines WHERE fine_id=p_fine_id;
 IF v_student_fee_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine not found.'; END IF;
 START TRANSACTION;
 SELECT sf.student_fee_id INTO v_locked_fee FROM student_fees sf
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id
 JOIN students s ON s.student_id=fa.student_id
 WHERE sf.student_fee_id=v_student_fee_id AND sf.status='ACTIVE' AND fa.status='ACTIVE'
   AND (p_super_admin=1 OR s.college_id=p_college_id) FOR UPDATE;
 IF v_locked_fee IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student fee not found or access denied.'; END IF;
 SELECT f.net_amount,s.student_id INTO v_net,v_student_id FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE f.fine_id=p_fine_id AND f.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id) FOR UPDATE;
 IF v_student_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine not found or access denied.'; END IF;
 SELECT COALESCE(SUM(fine_amount),0) INTO v_paid FROM fee_payments WHERE fine_id=p_fine_id;
 IF v_paid<0 OR v_paid>v_net THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Stored fine balance is inconsistent; reconcile existing payments.'; END IF;
 IF p_waived_amount<=0 OR p_waived_amount>GREATEST(v_net-v_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Waiver exceeds the remaining fine amount.'; END IF;
 UPDATE fee_fines SET waived_amount=waived_amount+p_waived_amount,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP WHERE fine_id=p_fine_id;
 COMMIT;
 SELECT f.fine_id FineId,f.fine_code FineCode,f.student_fee_id StudentFeeId,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,sf.fee_code FeeCode,
   f.fine_type FineType,f.reason Reason,f.amount Amount,f.waived_amount WaivedAmount,f.net_amount NetAmount,v_paid PaidAmount,
   GREATEST(f.net_amount-v_paid,0) PendingAmount,f.assessed_on AssessedOn,f.due_date DueDate,f.status Status
 FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE f.fine_id=p_fine_id;
END$$

DROP PROCEDURE IF EXISTS sp_fc_fine_create_validated$$
CREATE PROCEDURE sp_fc_fine_create_validated(
 IN p_student_fee_id BIGINT,IN p_fine_type VARCHAR(30),IN p_reason VARCHAR(500),IN p_amount DECIMAL(32,10),
 IN p_assessed_on DATE,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 DECLARE v_student_id BIGINT; DECLARE v_due_date DATE; DECLARE v_code VARCHAR(100);

 IF p_actor_id IS NULL OR p_actor_id<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A valid actor is required.'; END IF;
 IF p_super_admin IS NULL OR p_super_admin NOT IN (0,1) OR (p_super_admin=0 AND (p_college_id IS NULL OR p_college_id<=0)) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A valid college scope is required.';
 END IF;

 IF p_amount IS NULL OR p_amount<=0 OR p_amount>9999999999.99 OR p_amount<>ROUND(p_amount,2)
    OR NULLIF(TRIM(p_reason),'') IS NULL OR p_fine_type IS NULL
    OR UPPER(TRIM(p_fine_type)) NOT IN ('LATE_PAYMENT','OTHER') THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Valid fine amount, type and reason are required.';
 END IF;
 SELECT s.student_id,sf.due_date INTO v_student_id,v_due_date
 FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE sf.student_fee_id=p_student_fee_id AND sf.status='ACTIVE' AND fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id);
 IF v_student_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student fee not found or access denied.'; END IF;
 IF p_amount<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine amount must be greater than zero.'; END IF;
 SET v_code=CONCAT('FINE-',DATE_FORMAT(COALESCE(p_assessed_on,CURDATE()),'%Y%m%d'),'-',REPLACE(UUID(),'-',''));
 INSERT INTO fee_fines(fine_code,student_fee_id,fine_type,reason,amount,assessed_on,due_date,status,created_by,updated_by)
 VALUES(v_code,p_student_fee_id,UPPER(TRIM(p_fine_type)),TRIM(p_reason),p_amount,COALESCE(p_assessed_on,CURDATE()),GREATEST(v_due_date,COALESCE(p_assessed_on,CURDATE())),'ACTIVE',p_actor_id,p_actor_id);
 SELECT f.fine_id FineId,f.fine_code FineCode,f.student_fee_id StudentFeeId,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,sf.fee_code FeeCode,
   f.fine_type FineType,f.reason Reason,f.amount Amount,f.waived_amount WaivedAmount,f.net_amount NetAmount,0 PaidAmount,f.net_amount PendingAmount,
   f.assessed_on AssessedOn,f.due_date DueDate,f.status Status
 FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE f.fine_id=LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS sp_fc_receipt_get_validated$$
CREATE PROCEDURE sp_fc_receipt_get_validated(
 IN p_receipt_id BIGINT,IN p_payment_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 IF (p_receipt_id IS NULL AND p_payment_id IS NULL) OR (p_receipt_id IS NOT NULL AND p_receipt_id<=0)
    OR (p_payment_id IS NOT NULL AND p_payment_id<=0) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A positive receipt ID or payment ID is required.';
 END IF;
 SELECT r.receipt_id ReceiptId,r.receipt_number ReceiptNumber,r.payment_id PaymentId,fp.payment_code PaymentCode,r.issued_at IssuedAt,
   u.full_name IssuedByName,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,
   sf.fee_code FeeCode,fc.category_name FeeCategory,fp.fee_amount FeeAmount,fp.fine_amount FineAmount,fp.total_amount TotalAmount,
   fp.payment_mode PaymentMode,fp.transaction_reference TransactionReference,r.remarks Remarks
 FROM fee_receipts r JOIN fee_payments fp ON fp.payment_id=r.payment_id JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id JOIN fee_categories fc ON fc.fee_category_id=fs.fee_category_id
 LEFT JOIN users u ON u.user_id=r.issued_by
 WHERE (p_receipt_id IS NULL OR r.receipt_id=p_receipt_id) AND (p_payment_id IS NULL OR r.payment_id=p_payment_id)
   AND (p_super_admin=1 OR s.college_id=p_college_id);
END$$

DELIMITER ;
