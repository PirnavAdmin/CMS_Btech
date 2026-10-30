-- Subject Management update for dump 27 mine.sql (MySQL 8.0).
-- Run on the database restored from the supplied dump. No existing table or data is dropped.
-- Other module routines are NOT replaced. The dump already contains all 38 timetable procedures.
-- Re-runnable: existing columns, subject records and mappings are retained.
USE cms_btech;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_sm_install_columns$$
CREATE PROCEDURE sp_sm_install_columns()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='elective_type') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN elective_type VARCHAR(20) NOT NULL DEFAULT ''Non-Elective''';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='lecture_hours') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN lecture_hours DECIMAL(5,2) NOT NULL DEFAULT 0';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='tutorial_hours') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN tutorial_hours DECIMAL(5,2) NOT NULL DEFAULT 0';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='practical_hours') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN practical_hours DECIMAL(5,2) NOT NULL DEFAULT 0';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='internal_marks') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN internal_marks DECIMAL(7,2) NOT NULL DEFAULT 0';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='external_marks') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN external_marks DECIMAL(7,2) NOT NULL DEFAULT 0';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='primary_semester_id') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN primary_semester_id BIGINT NULL';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='deleted_at') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN deleted_at DATETIME NULL';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                AND table_name='subjects' AND column_name='deleted_by') THEN
   SET @sm_ddl='ALTER TABLE subjects ADD COLUMN deleted_by BIGINT NULL';
   PREPARE sm_statement FROM @sm_ddl; EXECUTE sm_statement; DEALLOCATE PREPARE sm_statement;
 END IF;
END$$
CALL sp_sm_install_columns()$$
DROP PROCEDURE sp_sm_install_columns$$
DELIMITER ;

-- A merged read view includes mappings created by the existing subject-assignments API.
CREATE OR REPLACE VIEW vw_sm_subject_mappings AS
SELECT ss.subject_id, ss.semester_id, sem.course_id, sem.branch_id, sem.academic_year_id,
       sem.semester_name, sem.semester_number, ss.status AS mapping_status
FROM subject_semesters ss JOIN semesters sem ON sem.semester_id=ss.semester_id
UNION ALL
SELECT a.subject_id, a.semester_id, sem.course_id, sem.branch_id, sem.academic_year_id,
       sem.semester_name, sem.semester_number, a.status AS mapping_status
FROM subject_semester_assignments a JOIN semesters sem ON sem.semester_id=a.semester_id
WHERE NOT EXISTS (SELECT 1 FROM subject_semesters ss
                  WHERE ss.subject_id=a.subject_id AND ss.semester_id=a.semester_id);

-- Counts are returned to callers before a deactivation/deletion or mapping change.
CREATE OR REPLACE VIEW vw_sm_subject_dependencies AS
SELECT subject_id, 'Faculty allocations' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN status=1 AND deleted_at IS NULL THEN 1 ELSE 0 END) AS active_count
FROM faculty_subject_allocations WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Faculty allocation history' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN 0=1 THEN 1 ELSE 0 END) AS active_count
FROM faculty_allocation_history WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Timetable entries' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) AS active_count
FROM timetable_entries WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Timetable requirements' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) AS active_count
FROM timetable_subject_requirements WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Legacy timetables' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN status NOT IN ('CANCELLED','ARCHIVED') THEN 1 ELSE 0 END) AS active_count
FROM timetables WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Credit configurations' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) AS active_count
FROM credit_configurations WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Student credit registrations' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN status=1 AND registration_status NOT IN ('CANCELLED','DROPPED') THEN 1 ELSE 0 END) AS active_count
FROM student_credit_registrations WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Elective group subjects' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN status=1 THEN 1 ELSE 0 END) AS active_count
FROM elective_group_subjects WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Elective allocations' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN allocation_status IN ('ALLOCATED','CONFIRMED') THEN 1 ELSE 0 END) AS active_count
FROM elective_allocations WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Elective approvals' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN approval_status IN ('PENDING','APPROVED') THEN 1 ELSE 0 END) AS active_count
FROM elective_approvals WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Student elective selections' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN selection_status IN ('PENDING','APPROVED','ALLOCATED') THEN 1 ELSE 0 END) AS active_count
FROM student_elective_selections WHERE subject_id IS NOT NULL GROUP BY subject_id
UNION ALL
SELECT subject_id, 'Student attendance' AS kind, COUNT(*) AS total_count,
       SUM(CASE WHEN session_status='OPEN' THEN 1 ELSE 0 END) AS active_count
FROM student_attendance WHERE subject_id IS NOT NULL GROUP BY subject_id;

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_sm_subject_list$$
CREATE PROCEDURE sp_sm_subject_list(
 IN p_id BIGINT, IN p_search VARCHAR(255), IN p_college_id BIGINT,
 IN p_academic_year_id BIGINT, IN p_course_id BIGINT, IN p_branch_id BIGINT,
 IN p_semester_id BIGINT, IN p_level INT, IN p_subject_type VARCHAR(50),
 IN p_elective_type VARCHAR(20), IN p_status TINYINT)
BEGIN
 SELECT s.*, s.subject_id AS id, s.subject_id AS subjectId,
        s.subject_code AS subjectCode, s.subject_name AS subjectName,
        s.subject_type AS subjectType, s.elective_type AS electiveType,
        s.lecture_hours AS lectureHours, s.tutorial_hours AS tutorialHours,
        s.practical_hours AS practicalHours, s.internal_marks AS internalMarks,
        s.external_marks AS externalMarks, s.internal_marks+s.external_marks AS totalMarks,
        s.status AS statusValue, IF(s.status=1,'Active','Inactive') AS statusName,
        m.semester_id AS semesterId, m.semester_name AS semester,
        m.semester_name AS semesterName, m.semester_number AS semesterNumber,
        m.course_id AS courseId, c.course_name AS course, c.course_name AS courseName,
        m.branch_id AS branchId, b.branch_name AS branch, b.branch_name AS branchName,
        m.academic_year_id AS academicYearId, ay.academic_year_name AS academicYear,
        c.college_id AS collegeId, COALESCE(b.department_id,c.department_id) AS departmentId,
        d.department_name AS department,
        (SELECT COUNT(*) FROM vw_sm_subject_mappings ma WHERE ma.subject_id=s.subject_id AND ma.mapping_status=1) AS mappingCount
 FROM subjects s
 LEFT JOIN vw_sm_subject_mappings m ON m.subject_id=s.subject_id AND m.semester_id=(
    SELECT mm.semester_id FROM vw_sm_subject_mappings mm
    JOIN courses mc ON mc.course_id=mm.course_id
    WHERE mm.subject_id=s.subject_id AND mm.mapping_status=1
      AND (p_college_id IS NULL OR mc.college_id=p_college_id)
      AND (p_academic_year_id IS NULL OR mm.academic_year_id=p_academic_year_id)
      AND (p_course_id IS NULL OR mm.course_id=p_course_id)
      AND (p_branch_id IS NULL OR mm.branch_id=p_branch_id)
      AND (p_semester_id IS NULL OR mm.semester_id=p_semester_id)
      AND (p_level IS NULL OR CEIL(mm.semester_number/2)=p_level)
    ORDER BY (mm.semester_id=s.primary_semester_id) DESC, mm.semester_id LIMIT 1)
 LEFT JOIN courses c ON c.course_id=m.course_id
 LEFT JOIN branches b ON b.branch_id=m.branch_id
 LEFT JOIN departments d ON d.department_id=COALESCE(b.department_id,c.department_id)
 LEFT JOIN academicyears ay ON ay.academic_year_id=m.academic_year_id
 WHERE s.deleted_at IS NULL AND (p_id IS NULL OR s.subject_id=p_id)
   AND (p_search IS NULL OR s.subject_code LIKE CONCAT('%',p_search,'%') OR s.subject_name LIKE CONCAT('%',p_search,'%'))
   AND (p_status IS NULL OR s.status=p_status)
   AND (p_subject_type IS NULL OR s.subject_type=p_subject_type)
   AND (p_elective_type IS NULL OR s.elective_type=p_elective_type)
   AND ((p_college_id IS NULL AND p_academic_year_id IS NULL AND p_course_id IS NULL
          AND p_branch_id IS NULL AND p_semester_id IS NULL AND p_level IS NULL) OR m.semester_id IS NOT NULL)
 ORDER BY s.subject_name,s.subject_id;

 SELECT m.subject_id AS subjectId,m.semester_id AS semesterId,m.course_id AS courseId,
        m.branch_id AS branchId,m.academic_year_id AS academicYearId,
        m.semester_name AS semester,m.semester_number AS semesterNumber,m.mapping_status AS status,
        c.course_name AS course,b.branch_name AS branch,ay.academic_year_name AS academicYear
 FROM vw_sm_subject_mappings m
 JOIN subjects s ON s.subject_id=m.subject_id AND s.deleted_at IS NULL
 JOIN courses c ON c.course_id=m.course_id
 JOIN branches b ON b.branch_id=m.branch_id
 JOIN academicyears ay ON ay.academic_year_id=m.academic_year_id
 WHERE (p_id IS NULL OR m.subject_id=p_id) AND (p_college_id IS NULL OR c.college_id=p_college_id)
 ORDER BY m.subject_id,m.semester_id;
END$$

DROP PROCEDURE IF EXISTS sp_sm_subject_dependencies$$
CREATE PROCEDURE sp_sm_subject_dependencies(IN p_id BIGINT)
BEGIN
 SELECT kind,total_count AS totalCount,active_count AS activeCount
 FROM vw_sm_subject_dependencies WHERE subject_id=p_id ORDER BY kind;
END$$

DROP PROCEDURE IF EXISTS sp_sm_subject_save$$
CREATE PROCEDURE sp_sm_subject_save(
 IN p_id BIGINT, IN p_code VARCHAR(50), IN p_name VARCHAR(255),
 IN p_year BIGINT, IN p_course BIGINT, IN p_branch BIGINT, IN p_semester BIGINT,
 IN p_credits DECIMAL(5,2), IN p_type VARCHAR(50), IN p_description VARCHAR(1000),
 IN p_elective VARCHAR(20), IN p_lecture DECIMAL(5,2), IN p_tutorial DECIMAL(5,2),
 IN p_practical DECIMAL(5,2), IN p_internal DECIMAL(7,2), IN p_external DECIMAL(7,2),
 IN p_status TINYINT, IN p_actor BIGINT)
BEGIN
 DECLARE v_id BIGINT DEFAULT NULL;
 DECLARE v_old_sem BIGINT DEFAULT NULL;
 DECLARE v_old_status TINYINT DEFAULT NULL;
 DECLARE v_year BIGINT DEFAULT NULL;
 DECLARE v_dummy BIGINT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 IF p_id>0 THEN
   SELECT subject_id,primary_semester_id,status INTO v_id,v_old_sem,v_old_status
   FROM subjects WHERE subject_id=p_id AND deleted_at IS NULL FOR UPDATE;
   IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001,MESSAGE_TEXT='subjectId|Subject not found.'; END IF;
   IF v_old_sem IS NULL THEN
     SELECT MIN(semester_id) INTO v_old_sem FROM vw_sm_subject_mappings WHERE subject_id=p_id AND mapping_status=1;
   END IF;
 END IF;
 IF p_code IS NULL OR TRIM(p_code)='' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='subjectCode|Subject code is required.'; END IF;
 IF p_name IS NULL OR TRIM(p_name)='' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='subjectName|Subject name is required.'; END IF;
 IF p_status IS NOT NULL AND p_status NOT IN (0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='status|Use Active, Inactive, 1 or 0.'; END IF;
 IF p_elective IS NOT NULL AND p_elective NOT IN ('Elective','Non-Elective') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='electiveType|Use Elective or Non-Elective.'; END IF;
 IF COALESCE(p_credits,0)<0 OR COALESCE(p_lecture,0)<0 OR COALESCE(p_tutorial,0)<0 OR COALESCE(p_practical,0)<0 OR COALESCE(p_internal,0)<0 OR COALESCE(p_external,0)<0 THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='configuration|Credits, hours and marks must be non-negative.';
 END IF;
 IF EXISTS(SELECT 1 FROM subjects WHERE subject_code=UPPER(TRIM(p_code)) AND subject_id<>COALESCE(p_id,0)) THEN
   SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002,MESSAGE_TEXT='subjectCode|Subject code already exists (including archived subjects).';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM courses WHERE course_id=p_course AND deleted_at IS NULL) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='courseId|Select an existing course.';
 END IF;
 SELECT course_id INTO v_dummy FROM courses WHERE course_id=p_course FOR SHARE;
 IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=p_branch AND course_id=p_course AND deleted_at IS NULL) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='branchId|Branch must belong to the selected course.';
 END IF;
 SELECT branch_id INTO v_dummy FROM branches WHERE branch_id=p_branch FOR SHARE;
 SELECT academic_year_id INTO v_year FROM semesters
 WHERE semester_id=p_semester AND course_id=p_course AND branch_id=p_branch FOR SHARE;
 IF v_year IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='semesterId|Semester must belong to the selected course and branch.'; END IF;
 IF p_year IS NOT NULL AND p_year<>v_year THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='academicYearId|Semester does not belong to the selected academic year.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM academicyears WHERE academic_year_id=v_year AND deleted_at IS NULL) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='academicYearId|The semester academic year is unavailable.';
 END IF;
 IF COALESCE(p_status,v_old_status,1)=1 AND (v_id IS NULL OR COALESCE(v_old_status,0)=0 OR NOT(v_old_sem<=>p_semester)) THEN
   IF EXISTS(SELECT 1 FROM courses WHERE course_id=p_course AND status<>1)
      OR EXISTS(SELECT 1 FROM branches WHERE branch_id=p_branch AND status<>1)
      OR EXISTS(SELECT 1 FROM semesters WHERE semester_id=p_semester AND (status<>1 OR is_archived=1)) THEN
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='semesterId|Choose an active course, branch and non-archived semester.';
   END IF;
 END IF;
 IF v_id IS NOT NULL AND NOT(v_old_sem<=>p_semester)
    AND EXISTS(SELECT 1 FROM vw_sm_subject_dependencies WHERE subject_id=v_id AND total_count>0) THEN
   SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002,MESSAGE_TEXT='semesterId|Subject has related records; its academic mapping cannot be moved.';
 END IF;
 IF v_id IS NOT NULL AND v_old_status=1 AND p_status=0
    AND EXISTS(SELECT 1 FROM vw_sm_subject_dependencies WHERE subject_id=v_id AND active_count>0) THEN
   SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002,MESSAGE_TEXT='status|Subject has active dependencies. Review the dependencies endpoint.';
 END IF;
 IF v_id IS NULL THEN
   INSERT INTO subjects(subject_code,subject_name,credits,subject_type,description,status,
     elective_type,lecture_hours,tutorial_hours,practical_hours,internal_marks,external_marks,
     primary_semester_id,created_by,updated_by)
   VALUES(UPPER(TRIM(p_code)),TRIM(p_name),COALESCE(p_credits,0),NULLIF(TRIM(p_type),''),
     NULLIF(TRIM(p_description),''),COALESCE(p_status,1),COALESCE(p_elective,'Non-Elective'),
     COALESCE(p_lecture,0),COALESCE(p_tutorial,0),COALESCE(p_practical,0),COALESCE(p_internal,0),COALESCE(p_external,0),
     p_semester,p_actor,p_actor);
   SET v_id=LAST_INSERT_ID();
 ELSE
   UPDATE subjects SET subject_code=UPPER(TRIM(p_code)),subject_name=TRIM(p_name),
     credits=COALESCE(p_credits,credits),subject_type=IF(p_type IS NULL,subject_type,NULLIF(TRIM(p_type),'')),
     description=IF(p_description IS NULL,description,NULLIF(TRIM(p_description),'')),
     elective_type=COALESCE(p_elective,elective_type),lecture_hours=COALESCE(p_lecture,lecture_hours),
     tutorial_hours=COALESCE(p_tutorial,tutorial_hours),practical_hours=COALESCE(p_practical,practical_hours),
     internal_marks=COALESCE(p_internal,internal_marks),external_marks=COALESCE(p_external,external_marks),
     status=COALESCE(p_status,status),primary_semester_id=p_semester,updated_by=p_actor,updated_at=CURRENT_TIMESTAMP
   WHERE subject_id=v_id;
   IF NOT(v_old_sem<=>p_semester) THEN
     UPDATE subject_semesters SET status=0,updated_by=p_actor,updated_at=CURRENT_TIMESTAMP
       WHERE subject_id=v_id AND semester_id=v_old_sem;
     UPDATE subject_semester_assignments SET status=0,updated_by=p_actor,updated_at=CURRENT_TIMESTAMP
       WHERE subject_id=v_id AND semester_id=v_old_sem;
   END IF;
 END IF;
 INSERT INTO subject_course_branches(subject_id,course_id,branch_id,status,created_by,updated_by)
 VALUES(v_id,p_course,p_branch,1,p_actor,p_actor)
 ON DUPLICATE KEY UPDATE status=1,updated_by=p_actor,updated_at=CURRENT_TIMESTAMP;
 INSERT INTO subject_semesters(subject_id,course_id,branch_id,semester_id,status,created_by,updated_by)
 VALUES(v_id,p_course,p_branch,p_semester,1,p_actor,p_actor)
 ON DUPLICATE KEY UPDATE status=1,updated_by=p_actor,updated_at=CURRENT_TIMESTAMP;
 INSERT INTO subject_semester_assignments(subject_id,semester_id,status,created_by,updated_by)
 VALUES(v_id,p_semester,1,p_actor,p_actor)
 ON DUPLICATE KEY UPDATE status=1,updated_by=p_actor,updated_at=CURRENT_TIMESTAMP;
 -- Leave other mappings intact; deactivate a course/branch mapping only when it has no active semester.
 UPDATE subject_course_branches cb SET cb.status=0,cb.updated_by=p_actor,cb.updated_at=CURRENT_TIMESTAMP
 WHERE cb.subject_id=v_id AND cb.status=1
   AND NOT EXISTS(SELECT 1 FROM vw_sm_subject_mappings m WHERE m.subject_id=v_id
       AND m.course_id=cb.course_id AND m.branch_id=cb.branch_id AND m.mapping_status=1);
 COMMIT;
 SELECT v_id;
END$$

DROP PROCEDURE IF EXISTS sp_sm_subject_status$$
CREATE PROCEDURE sp_sm_subject_status(IN p_id BIGINT,IN p_status TINYINT,IN p_delete TINYINT,IN p_actor BIGINT)
BEGIN
 DECLARE v_id BIGINT DEFAULT NULL;
 DECLARE v_status TINYINT;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 START TRANSACTION;
 SELECT subject_id,status INTO v_id,v_status FROM subjects WHERE subject_id=p_id AND deleted_at IS NULL FOR UPDATE;
 IF v_id IS NULL THEN SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001,MESSAGE_TEXT='subjectId|Subject not found.'; END IF;
 IF p_status IS NULL OR p_status NOT IN (0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='status|Use Active, Inactive, 1 or 0.'; END IF;
 IF p_delete=1 AND EXISTS(SELECT 1 FROM vw_sm_subject_dependencies WHERE subject_id=p_id AND total_count>0) THEN
   SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002,MESSAGE_TEXT='subjectId|Subject has related records and cannot be deleted. Review dependencies.';
 END IF;
 IF p_delete=0 AND p_status=0 AND v_status=1 AND EXISTS(SELECT 1 FROM vw_sm_subject_dependencies WHERE subject_id=p_id AND active_count>0) THEN
   SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002,MESSAGE_TEXT='status|Subject has active dependencies. Review the dependencies endpoint.';
 END IF;
 IF p_delete=0 AND p_status=1 AND v_status=0 AND NOT EXISTS(
   SELECT 1 FROM vw_sm_subject_mappings m JOIN semesters sem ON sem.semester_id=m.semester_id
   JOIN courses c ON c.course_id=m.course_id JOIN branches b ON b.branch_id=m.branch_id
   WHERE m.subject_id=p_id AND m.mapping_status=1 AND sem.status=1 AND sem.is_archived=0
     AND c.status=1 AND c.deleted_at IS NULL AND b.status=1 AND b.deleted_at IS NULL) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='semesterId|An active course, branch and semester mapping is required.';
 END IF;
 UPDATE subjects SET status=p_status,updated_at=CURRENT_TIMESTAMP,updated_by=p_actor,
   deleted_at=IF(p_delete=1,CURRENT_TIMESTAMP,deleted_at),deleted_by=IF(p_delete=1,p_actor,deleted_by)
 WHERE subject_id=p_id;
 IF p_delete=1 THEN
   UPDATE subject_semesters SET status=0,updated_at=CURRENT_TIMESTAMP,updated_by=p_actor WHERE subject_id=p_id;
   UPDATE subject_semester_assignments SET status=0,updated_at=CURRENT_TIMESTAMP,updated_by=p_actor WHERE subject_id=p_id;
   UPDATE subject_course_branches SET status=0,updated_at=CURRENT_TIMESTAMP,updated_by=p_actor WHERE subject_id=p_id;
 END IF;
 COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_sm_subject_lookups$$
CREATE PROCEDURE sp_sm_subject_lookups(IN p_college BIGINT,IN p_year BIGINT,IN p_course BIGINT,IN p_branch BIGINT)
BEGIN
 SELECT academic_year_id AS id,academic_year_name AS name,status,is_archived AS isArchived
 FROM academicyears WHERE deleted_at IS NULL AND is_archived=0 ORDER BY start_date DESC;
 SELECT course_id AS id,course_name AS name,course_code AS code,college_id AS collegeId,department_id AS departmentId
 FROM courses WHERE status=1 AND deleted_at IS NULL AND (p_college IS NULL OR college_id=p_college) ORDER BY course_name;
 SELECT b.branch_id AS id,b.branch_name AS name,b.branch_code AS code,b.course_id AS courseId,c.college_id AS collegeId
 FROM branches b JOIN courses c ON c.course_id=b.course_id
 WHERE b.status=1 AND b.deleted_at IS NULL AND c.status=1 AND c.deleted_at IS NULL
   AND (p_college IS NULL OR c.college_id=p_college) AND (p_course IS NULL OR b.course_id=p_course) ORDER BY b.branch_name;
 SELECT sem.semester_id AS id,sem.semester_name AS name,sem.semester_name AS semesterName,
        sem.semester_number AS semesterNumber,sem.academic_year_id AS academicYearId,sem.course_id AS courseId,sem.branch_id AS branchId
 FROM semesters sem JOIN courses c ON c.course_id=sem.course_id
 JOIN branches b ON b.branch_id=sem.branch_id
 WHERE sem.status=1 AND sem.is_archived=0 AND c.status=1 AND c.deleted_at IS NULL AND b.status=1 AND b.deleted_at IS NULL
   AND (p_college IS NULL OR c.college_id=p_college) AND (p_year IS NULL OR sem.academic_year_id=p_year)
   AND (p_course IS NULL OR sem.course_id=p_course) AND (p_branch IS NULL OR sem.branch_id=p_branch)
 ORDER BY sem.semester_number,sem.semester_id;
END$$
DELIMITER ;
-- Install verification: these five routines and two views should be present.
SELECT ROUTINE_NAME FROM information_schema.routines
WHERE routine_schema=DATABASE() AND routine_name IN
 ('sp_sm_subject_list','sp_sm_subject_save','sp_sm_subject_status','sp_sm_subject_dependencies','sp_sm_subject_lookups')
ORDER BY routine_name;
