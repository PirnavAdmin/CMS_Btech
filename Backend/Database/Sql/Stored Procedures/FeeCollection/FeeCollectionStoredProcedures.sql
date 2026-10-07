-- ============================================================
-- FEE COLLECTION API STORED PROCEDURES
-- DB: cms_btech
-- Uses existing fee_assignments, student_fees, fee_payments,
-- fee_fines, fee_receipts and related master tables.
-- ============================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_fc_dashboard$$
CREATE PROCEDURE sp_fc_dashboard(
 IN p_college_id BIGINT, IN p_super_admin TINYINT,
 IN p_academic_year_id BIGINT, IN p_course_id BIGINT, IN p_branch_id BIGINT,
 IN p_semester_id BIGINT, IN p_from_date DATE, IN p_to_date DATE)
BEGIN
  SELECT
    COALESCE((SELECT SUM(fa.net_amount) FROM fee_assignments fa JOIN students s ON s.student_id=fa.student_id
      JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id
      WHERE fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id)
        AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
        AND (p_course_id IS NULL OR s.course_id=p_course_id)
        AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)
        AND (p_semester_id IS NULL OR fs.semester_id=p_semester_id)),0) AS TotalPayable,
    COALESCE((SELECT SUM(fa.assigned_amount) FROM fee_assignments fa JOIN students s ON s.student_id=fa.student_id
      WHERE fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id)
        AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
        AND (p_course_id IS NULL OR s.course_id=p_course_id)
        AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)),0) AS TotalAssigned,
    COALESCE((SELECT SUM(fa.concession_amount) FROM fee_assignments fa JOIN students s ON s.student_id=fa.student_id
      WHERE fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id)
        AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
        AND (p_course_id IS NULL OR s.course_id=p_course_id)
        AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)),0) AS TotalConcession,
    COALESCE((SELECT SUM(fp.total_amount) FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id
      JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
      WHERE (p_super_admin=1 OR s.college_id=p_college_id)
        AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
        AND (p_course_id IS NULL OR s.course_id=p_course_id)
        AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)
        AND (p_from_date IS NULL OR fp.payment_date>=p_from_date)
        AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(p_to_date,INTERVAL 1 DAY))),0) AS TotalCollected,
    COALESCE((SELECT SUM(sf.amount)-COALESCE((SELECT SUM(fp2.fee_amount) FROM fee_payments fp2 WHERE fp2.student_fee_id=sf.student_fee_id),0)
      FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
      JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id
      WHERE sf.status='ACTIVE' AND fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id)
        AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
        AND (p_course_id IS NULL OR s.course_id=p_course_id) AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)
        AND (p_semester_id IS NULL OR fs.semester_id=p_semester_id)),0)
      + COALESCE((SELECT SUM(f.net_amount)-COALESCE((SELECT SUM(fp3.fine_amount) FROM fee_payments fp3 WHERE fp3.fine_id=f.fine_id),0)
        FROM fee_fines f JOIN student_fees sf2 ON sf2.student_fee_id=f.student_fee_id JOIN fee_assignments fa2 ON fa2.fee_assignment_id=sf2.fee_assignment_id
        JOIN students s2 ON s2.student_id=fa2.student_id WHERE f.status='ACTIVE' AND (p_super_admin=1 OR s2.college_id=p_college_id)),0) AS TotalPending,
    COALESCE((SELECT SUM(f.net_amount) FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id
      JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
      WHERE f.status='ACTIVE' AND f.due_date<CURDATE() AND (p_super_admin=1 OR s.college_id=p_college_id)),0) AS TotalOverdue,
    COALESCE((SELECT SUM(f.amount) FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id WHERE (p_super_admin=1 OR s.college_id=p_college_id)),0) AS TotalFineAssessed,
    COALESCE((SELECT SUM(fp.fine_amount) FROM fee_payments fp JOIN students s ON s.student_id=(SELECT fa.student_id FROM fee_assignments fa JOIN student_fees sf ON sf.fee_assignment_id=fa.fee_assignment_id WHERE sf.student_fee_id=fp.student_fee_id LIMIT 1) WHERE (p_super_admin=1 OR s.college_id=p_college_id)),0) AS TotalFineCollected,
    COALESCE((SELECT SUM(f.net_amount) FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id WHERE f.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id)),0)
      - COALESCE((SELECT SUM(fp.fine_amount) FROM fee_payments fp JOIN fee_fines f ON f.fine_id=fp.fine_id JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id WHERE (p_super_admin=1 OR s.college_id=p_college_id)),0) AS TotalFinePending,
    (SELECT COUNT(DISTINCT s.student_id) FROM students s JOIN fee_assignments fa ON fa.student_id=s.student_id JOIN student_fees sf ON sf.fee_assignment_id=fa.fee_assignment_id WHERE fa.status='ACTIVE' AND sf.status='ACTIVE' AND sf.amount>COALESCE((SELECT SUM(fp.fee_amount) FROM fee_payments fp WHERE fp.student_fee_id=sf.student_fee_id),0) AND (p_super_admin=1 OR s.college_id=p_college_id)) AS StudentsWithPending,
    (SELECT COUNT(DISTINCT s.student_id) FROM students s JOIN fee_assignments fa ON fa.student_id=s.student_id JOIN student_fees sf ON sf.fee_assignment_id=fa.fee_assignment_id WHERE sf.status='ACTIVE' AND sf.due_date<CURDATE() AND sf.amount>COALESCE((SELECT SUM(fp.fee_amount) FROM fee_payments fp WHERE fp.student_fee_id=sf.student_fee_id),0) AND (p_super_admin=1 OR s.college_id=p_college_id)) AS StudentsOverdue,
    (SELECT COUNT(*) FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_from_date IS NULL OR fp.payment_date>=p_from_date) AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(p_to_date,INTERVAL 1 DAY))) AS PaymentsCount,
    (SELECT COUNT(*) FROM fee_receipts r JOIN fee_payments fp ON fp.payment_id=r.payment_id JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_from_date IS NULL OR fp.payment_date>=p_from_date) AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(p_to_date,INTERVAL 1 DAY))) AS ReceiptsCount;

  SELECT DATE(fp.payment_date) Date,SUM(fp.total_amount) Amount,COUNT(*) PaymentCount
  FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
  WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_from_date IS NULL OR fp.payment_date>=p_from_date) AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(p_to_date,INTERVAL 1 DAY))
  GROUP BY DATE(fp.payment_date) ORDER BY Date;

  SELECT fc.fee_category_id FeeCategoryId,fc.category_name CategoryName,
    COALESCE(SUM(fa.net_amount),0) Assigned,
    COALESCE((SELECT SUM(fp.total_amount) FROM fee_payments fp JOIN student_fees sf2 ON sf2.student_fee_id=fp.student_fee_id JOIN fee_assignments fa2 ON fa2.fee_assignment_id=sf2.fee_assignment_id JOIN fee_structures fs2 ON fs2.fee_structure_id=fa2.fee_structure_id WHERE fs2.fee_category_id=fc.fee_category_id AND fa2.status='ACTIVE' AND (p_super_admin=1 OR EXISTS(SELECT 1 FROM students sx WHERE sx.student_id=fa2.student_id AND sx.college_id=p_college_id))),0) Collected,
    COALESCE(SUM(fa.net_amount),0)-COALESCE((SELECT SUM(fp.total_amount) FROM fee_payments fp JOIN student_fees sf2 ON sf2.student_fee_id=fp.student_fee_id JOIN fee_assignments fa2 ON fa2.fee_assignment_id=sf2.fee_assignment_id JOIN fee_structures fs2 ON fs2.fee_structure_id=fa2.fee_structure_id WHERE fs2.fee_category_id=fc.fee_category_id AND (p_super_admin=1 OR EXISTS(SELECT 1 FROM students sx WHERE sx.student_id=fa2.student_id AND sx.college_id=p_college_id))),0) Pending
  FROM fee_categories fc LEFT JOIN fee_structures fs ON fs.fee_category_id=fc.fee_category_id LEFT JOIN fee_assignments fa ON fa.fee_structure_id=fs.fee_structure_id
  LEFT JOIN students s ON s.student_id=fa.student_id
  WHERE (fa.fee_assignment_id IS NULL OR (fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id)))
  GROUP BY fc.fee_category_id,fc.category_name ORDER BY fc.category_name;

  SELECT fp.payment_mode PaymentMode,SUM(fp.total_amount) Amount,COUNT(*) PaymentCount
  FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
  WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_from_date IS NULL OR fp.payment_date>=p_from_date) AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(p_to_date,INTERVAL 1 DAY))
  GROUP BY fp.payment_mode ORDER BY Amount DESC;
END$$

DROP PROCEDURE IF EXISTS sp_fc_pending$$
CREATE PROCEDURE sp_fc_pending(
 IN p_college_id BIGINT,IN p_super_admin TINYINT,IN p_student_id BIGINT,IN p_academic_year_id BIGINT,
 IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,IN p_overdue_only TINYINT,
 IN p_search VARCHAR(150),IN p_due_from DATE,IN p_due_to DATE,IN p_offset INT,IN p_limit INT)
BEGIN
  SELECT sf.student_fee_id StudentFeeId,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,
    c.course_name CourseName,b.branch_name BranchName,fs.semester_id SemesterId,sf.fee_code FeeCode,fc.category_name FeeCategory,
    sf.installment_number InstallmentNumber,fa.assigned_amount AssignedAmount,fa.concession_amount ConcessionAmount,
    sf.amount PayableAmount,COALESCE((SELECT SUM(fp.fee_amount) FROM fee_payments fp WHERE fp.student_fee_id=sf.student_fee_id),0) PaidAmount,
    COALESCE((SELECT SUM(f.net_amount)-COALESCE((SELECT SUM(fp2.fine_amount) FROM fee_payments fp2 WHERE fp2.fine_id=f.fine_id),0) FROM fee_fines f WHERE f.student_fee_id=sf.student_fee_id AND f.status='ACTIVE'),0) FinePending,
    GREATEST(sf.amount-COALESCE((SELECT SUM(fp3.fee_amount) FROM fee_payments fp3 WHERE fp3.student_fee_id=sf.student_fee_id),0),0) +
    COALESCE((SELECT SUM(f2.net_amount)-COALESCE((SELECT SUM(fp4.fine_amount) FROM fee_payments fp4 WHERE fp4.fine_id=f2.fine_id),0) FROM fee_fines f2 WHERE f2.student_fee_id=sf.student_fee_id AND f2.status='ACTIVE'),0) BalanceAmount,
    sf.due_date DueDate,(sf.due_date<CURDATE()) Overdue,
    GREATEST(DATEDIFF(CURDATE(),sf.due_date),0) DaysOverdue
  FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
    JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id JOIN fee_categories fc ON fc.fee_category_id=fs.fee_category_id
    LEFT JOIN courses c ON c.course_id=s.course_id LEFT JOIN branches b ON b.branch_id=s.branch_id
  WHERE sf.status='ACTIVE' AND fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id)
    AND (p_student_id IS NULL OR s.student_id=p_student_id) AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
    AND (p_course_id IS NULL OR s.course_id=p_course_id) AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)
    AND (p_semester_id IS NULL OR fs.semester_id=p_semester_id) AND (p_overdue_only=0 OR sf.due_date<CURDATE())
    AND (p_due_from IS NULL OR sf.due_date>=p_due_from) AND (p_due_to IS NULL OR sf.due_date<=p_due_to)
    AND (p_search IS NULL OR p_search='' OR s.student_code LIKE CONCAT('%',p_search,'%') OR s.full_name LIKE CONCAT('%',p_search,'%') OR sf.fee_code LIKE CONCAT('%',p_search,'%'))
    AND sf.amount>COALESCE((SELECT SUM(fp5.fee_amount) FROM fee_payments fp5 WHERE fp5.student_fee_id=sf.student_fee_id),0)
  ORDER BY sf.due_date,s.full_name,s.student_id LIMIT p_offset,p_limit;

  SELECT COUNT(*) FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id
  WHERE sf.status='ACTIVE' AND fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id)
    AND (p_student_id IS NULL OR s.student_id=p_student_id) AND (p_academic_year_id IS NULL OR s.academic_year_id=p_academic_year_id)
    AND (p_course_id IS NULL OR s.course_id=p_course_id) AND (p_branch_id IS NULL OR s.branch_id=p_branch_id)
    AND (p_semester_id IS NULL OR fs.semester_id=p_semester_id) AND (p_overdue_only=0 OR sf.due_date<CURDATE())
    AND (p_due_from IS NULL OR sf.due_date>=p_due_from) AND (p_due_to IS NULL OR sf.due_date<=p_due_to)
    AND (p_search IS NULL OR p_search='' OR s.student_code LIKE CONCAT('%',p_search,'%') OR s.full_name LIKE CONCAT('%',p_search,'%') OR sf.fee_code LIKE CONCAT('%',p_search,'%'))
    AND sf.amount>COALESCE((SELECT SUM(fp5.fee_amount) FROM fee_payments fp5 WHERE fp5.student_fee_id=sf.student_fee_id),0);
END$$

DROP PROCEDURE IF EXISTS sp_fc_payment_create$$
CREATE PROCEDURE sp_fc_payment_create(
 IN p_student_fee_id BIGINT,IN p_fee_amount DECIMAL(12,2),IN p_fine_amount DECIMAL(12,2),IN p_fine_id BIGINT,
 IN p_payment_mode VARCHAR(30),IN p_transaction_reference VARCHAR(150),IN p_remarks VARCHAR(500),
 IN p_payment_date DATETIME,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 DECLARE v_student_id BIGINT; DECLARE v_fee_amount DECIMAL(12,2); DECLARE v_paid DECIMAL(12,2); DECLARE v_fine_net DECIMAL(12,2); DECLARE v_fine_paid DECIMAL(12,2);
 DECLARE v_payment_id BIGINT; DECLARE v_receipt_id BIGINT; DECLARE v_payment_code VARCHAR(100); DECLARE v_receipt_number VARCHAR(100);

 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT s.student_id,sf.amount INTO v_student_id,v_fee_amount
 FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE sf.student_fee_id=p_student_fee_id AND sf.status='ACTIVE' AND fa.status='ACTIVE'
   AND (p_super_admin=1 OR s.college_id=p_college_id) FOR UPDATE;
 IF v_student_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student fee not found or access denied.'; END IF;

 SELECT COALESCE(SUM(fee_amount),0) INTO v_paid FROM fee_payments WHERE student_fee_id=p_student_fee_id;
 IF p_fee_amount<=0 OR p_fee_amount>GREATEST(v_fee_amount-v_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fee payment exceeds the pending fee balance.'; END IF;

 IF p_fine_id IS NOT NULL THEN
   SELECT net_amount INTO v_fine_net FROM fee_fines WHERE fine_id=p_fine_id AND student_fee_id=p_student_fee_id AND status='ACTIVE' FOR UPDATE;
   IF v_fine_net IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine not found or does not belong to the selected fee.'; END IF;
   SELECT COALESCE(SUM(fine_amount),0) INTO v_fine_paid FROM fee_payments WHERE fine_id=p_fine_id;
   IF p_fine_amount<=0 OR p_fine_amount>GREATEST(v_fine_net-v_fine_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine payment exceeds the pending fine balance.'; END IF;
 ELSEIF p_fine_amount<>0 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FineId is required when FineAmount is greater than zero.';
 END IF;

 IF UPPER(p_payment_mode)<>'CASH' AND NULLIF(TRIM(p_transaction_reference),'') IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Transaction reference is required for non-cash payments.'; END IF;

 SET v_payment_code=CONCAT('PAY-',DATE_FORMAT(COALESCE(p_payment_date,NOW()),'%Y%m%d'),'-',REPLACE(UUID(),'-',''));
 INSERT INTO fee_payments(payment_code,student_fee_id,fine_id,fee_amount,fine_amount,payment_date,payment_mode,transaction_reference,remarks,created_by,updated_by)
 VALUES(v_payment_code,p_student_fee_id,p_fine_id,p_fee_amount,p_fine_amount,COALESCE(p_payment_date,NOW()),UPPER(p_payment_mode),NULLIF(TRIM(p_transaction_reference),''),p_remarks,p_actor_id,p_actor_id);
 SET v_payment_id=LAST_INSERT_ID();

 SET v_receipt_number=CONCAT('REC-',DATE_FORMAT(COALESCE(p_payment_date,NOW()),'%Y%m%d'),'-',LPAD(v_payment_id,8,'0'));
 INSERT INTO fee_receipts(receipt_number,payment_id,issued_at,issued_by,remarks,created_by,updated_by)
 VALUES(v_receipt_number,v_payment_id,COALESCE(p_payment_date,NOW()),p_actor_id,p_remarks,p_actor_id,p_actor_id);
 SET v_receipt_id=LAST_INSERT_ID();
 COMMIT;

 SELECT fp.payment_id PaymentId,fp.payment_code PaymentCode,fp.student_fee_id StudentFeeId,sf.fee_code FeeCode,s.student_id StudentId,
   s.student_code StudentCode,s.full_name StudentName,fp.fee_amount FeeAmount,fp.fine_amount FineAmount,fp.total_amount TotalAmount,
   fp.payment_date PaymentDate,fp.payment_mode PaymentMode,fp.transaction_reference TransactionReference,fp.fine_id FineId,
   r.receipt_id ReceiptId,r.receipt_number ReceiptNumber
 FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 JOIN fee_receipts r ON r.payment_id=fp.payment_id WHERE fp.payment_id=v_payment_id;
END$$

DROP PROCEDURE IF EXISTS sp_fc_history$$
CREATE PROCEDURE sp_fc_history(
 IN p_college_id BIGINT,IN p_super_admin TINYINT,IN p_student_id BIGINT,IN p_payment_id BIGINT,IN p_search VARCHAR(150),
 IN p_payment_mode VARCHAR(30),IN p_from_date DATETIME,IN p_to_date DATETIME,IN p_offset INT,IN p_limit INT)
BEGIN
 SELECT fp.payment_id PaymentId,fp.payment_code PaymentCode,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,
   sf.fee_code FeeCode,fc.category_name FeeCategory,fp.fee_amount FeeAmount,fp.fine_amount FineAmount,fp.total_amount TotalAmount,
   fp.payment_mode PaymentMode,fp.transaction_reference TransactionReference,fp.payment_date PaymentDate,r.receipt_id ReceiptId,r.receipt_number ReceiptNumber
 FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id
 JOIN students s ON s.student_id=fa.student_id JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id JOIN fee_categories fc ON fc.fee_category_id=fs.fee_category_id
 LEFT JOIN fee_receipts r ON r.payment_id=fp.payment_id
 WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_student_id IS NULL OR s.student_id=p_student_id) AND (p_payment_id IS NULL OR fp.payment_id=p_payment_id)
   AND (p_payment_mode IS NULL OR fp.payment_mode=p_payment_mode) AND (p_from_date IS NULL OR fp.payment_date>=p_from_date)
   AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(DATE(p_to_date),INTERVAL 1 DAY)) AND (p_search IS NULL OR p_search='' OR s.student_code LIKE CONCAT('%',p_search,'%') OR s.full_name LIKE CONCAT('%',p_search,'%') OR fp.payment_code LIKE CONCAT('%',p_search,'%') OR r.receipt_number LIKE CONCAT('%',p_search,'%'))
 ORDER BY fp.payment_date DESC,fp.payment_id DESC LIMIT p_offset,p_limit;
 SELECT COUNT(*) FROM fee_payments fp JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_student_id IS NULL OR s.student_id=p_student_id) AND (p_payment_id IS NULL OR fp.payment_id=p_payment_id)
   AND (p_payment_mode IS NULL OR fp.payment_mode=p_payment_mode) AND (p_from_date IS NULL OR fp.payment_date>=p_from_date) AND (p_to_date IS NULL OR fp.payment_date<DATE_ADD(DATE(p_to_date),INTERVAL 1 DAY))
   AND (p_search IS NULL OR p_search='' OR s.student_code LIKE CONCAT('%',p_search,'%') OR s.full_name LIKE CONCAT('%',p_search,'%') OR fp.payment_code LIKE CONCAT('%',p_search,'%'));
END$$

DROP PROCEDURE IF EXISTS sp_fc_fines$$
CREATE PROCEDURE sp_fc_fines(
 IN p_college_id BIGINT,IN p_super_admin TINYINT,IN p_student_id BIGINT,IN p_student_fee_id BIGINT,IN p_status VARCHAR(20),IN p_pending_only TINYINT,IN p_offset INT,IN p_limit INT)
BEGIN
 SELECT f.fine_id FineId,f.fine_code FineCode,f.student_fee_id StudentFeeId,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,
   sf.fee_code FeeCode,f.fine_type FineType,f.reason Reason,f.amount Amount,f.waived_amount WaivedAmount,f.net_amount NetAmount,
   COALESCE((SELECT SUM(fp.fine_amount) FROM fee_payments fp WHERE fp.fine_id=f.fine_id),0) PaidAmount,
   GREATEST(f.net_amount-COALESCE((SELECT SUM(fp.fine_amount) FROM fee_payments fp WHERE fp.fine_id=f.fine_id),0),0) PendingAmount,
   f.assessed_on AssessedOn,f.due_date DueDate,f.status Status
 FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_student_id IS NULL OR s.student_id=p_student_id) AND (p_student_fee_id IS NULL OR f.student_fee_id=p_student_fee_id)
   AND (p_status IS NULL OR f.status=p_status) AND (p_pending_only=0 OR f.net_amount>COALESCE((SELECT SUM(fp2.fine_amount) FROM fee_payments fp2 WHERE fp2.fine_id=f.fine_id),0))
 ORDER BY f.assessed_on DESC,f.fine_id DESC LIMIT p_offset,p_limit;
 SELECT COUNT(*) FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE (p_super_admin=1 OR s.college_id=p_college_id) AND (p_student_id IS NULL OR s.student_id=p_student_id) AND (p_student_fee_id IS NULL OR f.student_fee_id=p_student_fee_id)
   AND (p_status IS NULL OR f.status=p_status) AND (p_pending_only=0 OR f.net_amount>COALESCE((SELECT SUM(fp2.fine_amount) FROM fee_payments fp2 WHERE fp2.fine_id=f.fine_id),0));
END$$

DROP PROCEDURE IF EXISTS sp_fc_fine_create$$
CREATE PROCEDURE sp_fc_fine_create(
 IN p_student_fee_id BIGINT,IN p_fine_type VARCHAR(30),IN p_reason VARCHAR(500),IN p_amount DECIMAL(12,2),
 IN p_assessed_on DATE,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 DECLARE v_student_id BIGINT; DECLARE v_due_date DATE; DECLARE v_code VARCHAR(100);
 SELECT s.student_id,sf.due_date INTO v_student_id,v_due_date
 FROM student_fees sf JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE sf.student_fee_id=p_student_fee_id AND sf.status='ACTIVE' AND fa.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id);
 IF v_student_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student fee not found or access denied.'; END IF;
 IF p_amount<=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine amount must be greater than zero.'; END IF;
 SET v_code=CONCAT('FINE-',DATE_FORMAT(COALESCE(p_assessed_on,CURDATE()),'%Y%m%d'),'-',REPLACE(UUID(),'-',''));
 INSERT INTO fee_fines(fine_code,student_fee_id,fine_type,reason,amount,assessed_on,due_date,status,created_by,updated_by)
 VALUES(v_code,p_student_fee_id,UPPER(p_fine_type),TRIM(p_reason),p_amount,COALESCE(p_assessed_on,CURDATE()),v_due_date,'ACTIVE',p_actor_id,p_actor_id);
 SELECT f.fine_id FineId,f.fine_code FineCode,f.student_fee_id StudentFeeId,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,sf.fee_code FeeCode,
   f.fine_type FineType,f.reason Reason,f.amount Amount,f.waived_amount WaivedAmount,f.net_amount NetAmount,0 PaidAmount,f.net_amount PendingAmount,
   f.assessed_on AssessedOn,f.due_date DueDate,f.status Status
 FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE f.fine_id=LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS sp_fc_fine_waive$$
CREATE PROCEDURE sp_fc_fine_waive(
 IN p_fine_id BIGINT,IN p_waived_amount DECIMAL(12,2),IN p_reason VARCHAR(500),
 IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 DECLARE v_net DECIMAL(12,2); DECLARE v_paid DECIMAL(12,2); DECLARE v_student_id BIGINT;
 SELECT f.net_amount,s.student_id INTO v_net,v_student_id FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE f.fine_id=p_fine_id AND f.status='ACTIVE' AND (p_super_admin=1 OR s.college_id=p_college_id) FOR UPDATE;
 IF v_student_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fine not found or access denied.'; END IF;
 SELECT COALESCE(SUM(fine_amount),0) INTO v_paid FROM fee_payments WHERE fine_id=p_fine_id;
 IF p_waived_amount<=0 OR p_waived_amount>GREATEST(v_net-v_paid,0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Waiver exceeds the remaining fine amount.'; END IF;
 UPDATE fee_fines SET waived_amount=waived_amount+p_waived_amount,updated_by=p_actor_id,updated_at=CURRENT_TIMESTAMP WHERE fine_id=p_fine_id;
 SELECT f.fine_id FineId,f.fine_code FineCode,f.student_fee_id StudentFeeId,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,sf.fee_code FeeCode,
   f.fine_type FineType,f.reason Reason,f.amount Amount,f.waived_amount WaivedAmount,f.net_amount NetAmount,v_paid PaidAmount,
   GREATEST(f.net_amount-v_paid,0) PendingAmount,f.assessed_on AssessedOn,f.due_date DueDate,f.status Status
 FROM fee_fines f JOIN student_fees sf ON sf.student_fee_id=f.student_fee_id JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 WHERE f.fine_id=p_fine_id;
END$$

DROP PROCEDURE IF EXISTS sp_fc_receipt_get$$
CREATE PROCEDURE sp_fc_receipt_get(
 IN p_receipt_id BIGINT,IN p_payment_id BIGINT,IN p_college_id BIGINT,IN p_super_admin TINYINT)
BEGIN
 SELECT r.receipt_id ReceiptId,r.receipt_number ReceiptNumber,r.payment_id PaymentId,fp.payment_code PaymentCode,r.issued_at IssuedAt,
   u.full_name IssuedByName,s.student_id StudentId,s.student_code StudentCode,s.full_name StudentName,
   sf.fee_code FeeCode,fc.category_name FeeCategory,fp.fee_amount FeeAmount,fp.fine_amount FineAmount,fp.total_amount TotalAmount,
   fp.payment_mode PaymentMode,fp.transaction_reference TransactionReference,r.remarks Remarks
 FROM fee_receipts r JOIN fee_payments fp ON fp.payment_id=r.payment_id JOIN student_fees sf ON sf.student_fee_id=fp.student_fee_id
 JOIN fee_assignments fa ON fa.fee_assignment_id=sf.fee_assignment_id JOIN students s ON s.student_id=fa.student_id
 JOIN fee_structures fs ON fs.fee_structure_id=fa.fee_structure_id JOIN fee_categories fc ON fc.fee_category_id=fs.fee_category_id
 LEFT JOIN employee_profiles e ON e.employee_profile_id=r.issued_by LEFT JOIN users u ON u.user_id=e.user_id
 WHERE (p_receipt_id IS NULL OR r.receipt_id=p_receipt_id) AND (p_payment_id IS NULL OR r.payment_id=p_payment_id)
   AND (p_super_admin=1 OR s.college_id=p_college_id);
END$$

DELIMITER ;
