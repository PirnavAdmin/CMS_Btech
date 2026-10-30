-- Select your existing database first: USE cms_btech;
-- MySQL 8.0. Stop the backend while applying; back up first.
-- Add policy ownership/scope, preserve existing IDs, statuses, dates and entitlements.
-- Ownership comes from actual leave requests/scoped entitlements; creator is fallback only.
-- Unknown or conflicting ownership fails instead of assuming every policy belongs to college 1.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
DELIMITER $$
DROP FUNCTION IF EXISTS fn_flp_academic_year_key$$
CREATE FUNCTION fn_flp_academic_year_key(p_year VARCHAR(50)) RETURNS VARCHAR(9)
DETERMINISTIC NO SQL
BEGIN
 DECLARE v VARCHAR(50);
 DECLARE v_start INT;
 DECLARE v_end INT;
 SET v=REGEXP_REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p_year),'–','-'),'—','-'),'/','-'),'[[:space:]]','');
 IF v IS NULL OR NOT REGEXP_LIKE(v,'^[0-9]{4}-([0-9]{2}|[0-9]{4})$') THEN RETURN NULL; END IF;
 SET v_start=CAST(SUBSTRING_INDEX(v,'-',1) AS UNSIGNED);
 SET v_end=CAST(SUBSTRING_INDEX(v,'-',-1) AS UNSIGNED);
 IF CHAR_LENGTH(SUBSTRING_INDEX(v,'-',-1))=2 THEN
   SET v_end=FLOOR(v_start/100)*100+v_end;
   IF v_end<v_start THEN SET v_end=v_end+100; END IF;
 END IF;
 IF v_start<1000 OR v_end<=v_start OR v_end>9999 THEN RETURN NULL; END IF;
 RETURN CONCAT(v_start,'-',v_end);
END$$
DROP FUNCTION IF EXISTS fn_flp_employee_type$$
CREATE FUNCTION fn_flp_employee_type(p_type VARCHAR(50)) RETURNS VARCHAR(30)
DETERMINISTIC NO SQL
BEGIN
 DECLARE v VARCHAR(50);
 SET v=LOWER(REGEXP_REPLACE(TRIM(p_type),'[[:space:]_-]',''));
 RETURN CASE
 WHEN v IN ('both','all') THEN 'Both'
 WHEN v IN ('teaching','teachingfaculty','teachingstaff') THEN 'Teaching'
 WHEN v IN ('nonteaching','nonteachingfaculty','nonteachingstaff') THEN 'Non-Teaching'
 ELSE NULL END;
END$$

DROP PROCEDURE IF EXISTS sp_flp_scope_upgrade_20261001$$
CREATE PROCEDURE sp_flp_scope_upgrade_20261001()
BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='faculty_leave_policies' AND column_name='college_id') THEN
   ALTER TABLE faculty_leave_policies ADD COLUMN college_id BIGINT NULL AFTER policy_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='faculty_leave_policies' AND column_name='department_id') THEN
   ALTER TABLE faculty_leave_policies ADD COLUMN department_id BIGINT NULL AFTER applicable_to;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='faculty_leave_policies' AND column_name='branch_id') THEN
   ALTER TABLE faculty_leave_policies ADD COLUMN branch_id BIGINT NULL AFTER department_id;
 END IF;
 IF EXISTS(SELECT 1 FROM faculty_leave_policies WHERE fn_flp_academic_year_key(academic_year) IS NULL
     OR fn_flp_employee_type(applicable_to) IS NULL OR from_date>to_date) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid academic year, employee type or dates in an existing leave policy. Correct it before applying this patch.';
 END IF;
 DROP TEMPORARY TABLE IF EXISTS tmp_flp_ownership;
 CREATE TEMPORARY TABLE tmp_flp_ownership AS
 SELECT p.policy_id,COUNT(DISTINCT evidence.college_id) AS owner_count,MIN(evidence.college_id) AS evidence_college,
        MAX(u.college_id) AS creator_college
 FROM faculty_leave_policies p
 LEFT JOIN (
   SELECT r.policy_id,f.college_id FROM faculty_leave_requests r JOIN faculty f ON f.faculty_id=r.faculty_id
   UNION
   SELECT e.policy_id,t.college_id FROM faculty_leave_policy_entitlements e
   JOIN faculty_leave_types t ON t.leave_type_id=e.leave_type_id WHERE t.college_id IS NOT NULL
 ) evidence ON evidence.policy_id=p.policy_id
 LEFT JOIN users u ON u.user_id=p.created_by
 GROUP BY p.policy_id;
 IF EXISTS(SELECT 1 FROM faculty_leave_policies p JOIN tmp_flp_ownership e ON e.policy_id=p.policy_id
   WHERE p.college_id IS NULL AND (e.owner_count>1 OR (e.owner_count=0 AND e.creator_college IS NULL))) THEN
   DROP TEMPORARY TABLE tmp_flp_ownership;
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A legacy policy has ambiguous college ownership. No policy was reassigned; inspect its requests, types and creator.';
 END IF;
 IF EXISTS(SELECT 1 FROM faculty_leave_policies p JOIN tmp_flp_ownership e ON e.policy_id=p.policy_id
   LEFT JOIN colleges c ON c.college_id=COALESCE(p.college_id,CASE WHEN e.owner_count=1 THEN e.evidence_college ELSE e.creator_college END)
   WHERE c.college_id IS NULL OR (p.college_id IS NOT NULL AND e.owner_count>0 AND (e.owner_count>1 OR e.evidence_college<>p.college_id))) THEN
   DROP TEMPORARY TABLE tmp_flp_ownership;
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Existing policy college conflicts with its related records, or the inferred college is missing. Repair stopped.';
 END IF;
 CREATE TABLE IF NOT EXISTS faculty_leave_policy_scope_audit (
   policy_id VARCHAR(100) NOT NULL PRIMARY KEY,
   inferred_college_id BIGINT NOT NULL,
   evidence_source VARCHAR(50) NOT NULL,
   applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
 INSERT INTO faculty_leave_policy_scope_audit(policy_id,inferred_college_id,evidence_source)
 SELECT p.policy_id,CASE WHEN e.owner_count=1 THEN e.evidence_college ELSE e.creator_college END,
   CASE WHEN e.owner_count=1 THEN 'leave_requests_or_scoped_entitlements' ELSE 'creator_college' END
 FROM faculty_leave_policies p JOIN tmp_flp_ownership e ON e.policy_id=p.policy_id
 WHERE p.college_id IS NULL
 ON DUPLICATE KEY UPDATE policy_id=VALUES(policy_id);
 UPDATE faculty_leave_policies p JOIN tmp_flp_ownership e ON e.policy_id=p.policy_id
 SET p.college_id=CASE WHEN e.owner_count=1 THEN e.evidence_college ELSE e.creator_college END,
     p.updated_at=p.updated_at
 WHERE p.college_id IS NULL;
 DROP TEMPORARY TABLE tmp_flp_ownership;
 ALTER TABLE faculty_leave_policies MODIFY COLUMN college_id BIGINT NOT NULL;
 IF NOT EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='faculty_leave_policies' AND index_name='ix_flp_college_status_dates') THEN
   ALTER TABLE faculty_leave_policies ADD KEY ix_flp_college_status_dates(college_id,status,from_date,to_date);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='faculty_leave_policies' AND constraint_name='fk_flp_college') THEN
   ALTER TABLE faculty_leave_policies ADD CONSTRAINT fk_flp_college FOREIGN KEY(college_id) REFERENCES colleges(college_id);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='faculty_leave_policies' AND constraint_name='fk_flp_department') THEN
   ALTER TABLE faculty_leave_policies ADD CONSTRAINT fk_flp_department FOREIGN KEY(department_id) REFERENCES departments(department_id);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='faculty_leave_policies' AND constraint_name='fk_flp_branch') THEN
   ALTER TABLE faculty_leave_policies ADD CONSTRAINT fk_flp_branch FOREIGN KEY(branch_id) REFERENCES branches(branch_id);
 END IF;
END$$
CALL sp_flp_scope_upgrade_20261001()$$
DROP PROCEDURE sp_flp_scope_upgrade_20261001$$

-- Shared overlap query used by both activation and edits to an already active policy.
-- NULL branch/department means the entire corresponding scope; Both includes both employee types.
-- Date boundaries are inclusive. Year aliases such as 2026-27 and 2026-2027 are equivalent.
DROP PROCEDURE IF EXISTS sp_faculty_leave_policy_find_conflicts$$
CREATE PROCEDURE sp_faculty_leave_policy_find_conflicts(
 IN p_policy_id VARCHAR(100), IN p_college_id BIGINT, IN p_academic_year VARCHAR(50),
 IN p_applicable_to VARCHAR(50), IN p_department_id BIGINT, IN p_branch_id BIGINT,
 IN p_from_date DATE, IN p_to_date DATE)
BEGIN
 DECLARE v_year VARCHAR(9);
 DECLARE v_type VARCHAR(30);
 DECLARE v_department BIGINT;
 SET v_year=fn_flp_academic_year_key(p_academic_year);
 SET v_type=fn_flp_employee_type(p_applicable_to);
 SET v_department=COALESCE(p_department_id,(SELECT department_id FROM branches WHERE branch_id=p_branch_id));
 IF p_college_id IS NULL OR p_college_id<=0 OR v_year IS NULL OR v_type IS NULL
    OR p_from_date IS NULL OR p_to_date IS NULL OR p_from_date>p_to_date THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Valid policy college, academic year, employee type and effective dates are required.';
 END IF;
 SELECT p.policy_id AS Id,p.name AS Name,p.college_id AS CollegeId,
   p.academic_year AS AcademicYear,fn_flp_academic_year_key(p.academic_year) AS AcademicYearKey,
   fn_flp_employee_type(p.applicable_to) AS ApplicableTo,
   p.department_id AS DepartmentId,COALESCE(p.department_id,b.department_id) AS EffectiveDepartmentId,
   d.department_name AS DepartmentName,p.branch_id AS BranchId,b.branch_name AS BranchName,
   p.from_date AS FromDate,p.to_date AS ToDate,p.status AS Status
 FROM faculty_leave_policies p
 LEFT JOIN branches b ON b.branch_id=p.branch_id
 LEFT JOIN departments d ON d.department_id=COALESCE(p.department_id,b.department_id)
 WHERE p.college_id=p_college_id AND p.status='Active'
   AND (p_policy_id IS NULL OR p.policy_id<>p_policy_id)
   AND fn_flp_academic_year_key(p.academic_year)=v_year
   AND (fn_flp_employee_type(p.applicable_to)='Both' OR v_type='Both' OR fn_flp_employee_type(p.applicable_to)=v_type)
   AND p.from_date<=p_to_date AND p.to_date>=p_from_date
   AND (p.branch_id IS NULL OR p_branch_id IS NULL OR p.branch_id=p_branch_id)
   AND (COALESCE(p.department_id,b.department_id) IS NULL OR v_department IS NULL
        OR COALESCE(p.department_id,b.department_id)=v_department)
 ORDER BY p.from_date,p.name,p.policy_id;
END$$
DELIMITER ;

SELECT p.policy_id,p.name,p.college_id,p.academic_year,p.applicable_to,p.department_id,p.branch_id,
 p.from_date,p.to_date,p.status FROM faculty_leave_policies p ORDER BY p.college_id,p.from_date;
SELECT * FROM faculty_leave_policy_scope_audit ORDER BY policy_id;
