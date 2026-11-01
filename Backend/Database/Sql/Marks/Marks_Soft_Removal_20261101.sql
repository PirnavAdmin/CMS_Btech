-- CMS marks soft removal - 2026-11-01. MySQL 8.0; direct SQL, no EF migrations.
-- Select the target cms_btech schema in MySQL Workbench before running this entire file.
-- Apply AFTER the existing marks workflow scripts. Back up first; pause marks writes
-- during deployment: ALTER TABLE is atomic in MySQL 8 but DDL implicitly commits.
-- All student_marks/marks_approvals/history rows and IDs are retained.
-- This script does not grant roles or permissions. Existing marks/delete RBAC applies.

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_marks_removal_schema_20261101$$
CREATE PROCEDURE sp_marks_removal_schema_20261101()
BEGIN
    DECLARE v_ddl LONGTEXT DEFAULT '';
    IF DATABASE() IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Select the target CMS database before applying this script.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema=DATABASE()
        AND routine_name='sp_marks_assert_actor') OR NOT EXISTS (
        SELECT 1 FROM information_schema.routines WHERE routine_schema=DATABASE()
        AND routine_name='sp_marks_assert_faculty_scope') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Existing marks workflow/actor/allocation procedures are required.';
    END IF;
    IF EXISTS (SELECT 1 FROM student_marks WHERE status=1 AND exam_id IS NOT NULL
        GROUP BY student_id,subject_id,exam_id HAVING COUNT(*)>1) OR EXISTS (
        SELECT 1 FROM student_marks WHERE status=1
        GROUP BY student_id,subject_id,exam_name HAVING COUNT(*)>1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Duplicate active marks detected; resolve them before applying this script.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
        AND table_name='student_marks' AND column_name='removed_at') THEN
        SET v_ddl=CONCAT(v_ddl,'ADD COLUMN removed_at DATETIME(6) NULL,');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
        AND table_name='student_marks' AND column_name='removed_by') THEN
        SET v_ddl=CONCAT(v_ddl,'ADD COLUMN removed_by BIGINT NULL,');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
        AND table_name='student_marks' AND column_name='active_mark_slot') THEN
        SET v_ddl=CONCAT(v_ddl,'ADD COLUMN active_mark_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status=1 THEN 1 ELSE NULL END) STORED,');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
        AND table_name='student_marks' AND index_name='uq_student_subject_exam') THEN
        SET v_ddl=CONCAT(v_ddl,'DROP INDEX uq_student_subject_exam,');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
        AND table_name='student_marks' AND index_name='uq_student_subject_exam_v2') THEN
        SET v_ddl=CONCAT(v_ddl,'DROP INDEX uq_student_subject_exam_v2,');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
        AND table_name='student_marks' AND index_name='uq_marks_active_exam') THEN
        SET v_ddl=CONCAT(v_ddl,'ADD UNIQUE KEY uq_marks_active_exam (student_id,subject_id,exam_id,active_mark_slot),');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
        AND table_name='student_marks' AND index_name='uq_marks_active_legacy') THEN
        SET v_ddl=CONCAT(v_ddl,'ADD UNIQUE KEY uq_marks_active_legacy (student_id,subject_id,exam_name,active_mark_slot),');
    END IF;
    IF LENGTH(v_ddl)>0 THEN
        SET @marks_removal_ddl=CONCAT('ALTER TABLE student_marks ',LEFT(v_ddl,LENGTH(v_ddl)-1));
        PREPARE stmt FROM @marks_removal_ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
CALL sp_marks_removal_schema_20261101()$$
DROP PROCEDURE sp_marks_removal_schema_20261101$$

DROP PROCEDURE IF EXISTS sp_marks_entry_delete$$
CREATE PROCEDURE sp_marks_entry_delete(
    IN p_mark_id BIGINT, IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_admin TINYINT;
    DECLARE v_college BIGINT DEFAULT NULL;
    DECLARE v_exam BIGINT;
    DECLARE v_subject BIGINT;
    DECLARE v_section BIGINT;
    DECLARE v_owner BIGINT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_version INT;
    DECLARE v_removed_at DATETIME(6);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    -- Deletion intentionally reuses the existing EDIT role and allocation policy.
    -- ModulePermissionMiddleware separately requires the live marks/delete grant.
    CALL sp_marks_assert_actor(p_actor_id,p_college_id,p_is_super_admin,'EDIT',v_admin);
    IF p_mark_id IS NULL OR p_mark_id<=0 THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='markId must be greater than zero.';
    END IF;
    SELECT college_id,exam_id,subject_id,section_id,entered_by,workflow_status,version_no
      INTO v_college,v_exam,v_subject,v_section,v_owner,v_status,v_version
    FROM student_marks
    WHERE mark_id=p_mark_id AND status=1 AND (p_is_super_admin=1 OR college_id=p_college_id)
    FOR UPDATE;
    IF v_college IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT='Active mark entry not found in the authorized college.';
    END IF;
    IF v_exam IS NULL OR NOT EXISTS (SELECT 1 FROM exams WHERE exam_id=v_exam AND college_id=v_college
        AND status=1 AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30005, MESSAGE_TEXT='Mark requires a valid active exam mapping before removal.';
    END IF;
    IF v_admin=0 THEN
        IF v_owner IS NULL OR v_owner<>p_actor_id THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='Faculty can remove only their own mark entries.';
        END IF;
        CALL sp_marks_assert_faculty_scope(p_actor_id,v_exam,v_subject,v_section);
    END IF;
    IF v_status IS NULL OR v_status NOT IN ('DRAFT','REJECTED') THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30005,
            MESSAGE_TEXT='Only DRAFT or REJECTED marks can be removed. SUBMITTED/APPROVED marks are locked.';
    END IF;
    SET v_removed_at=UTC_TIMESTAMP(6);
    UPDATE student_marks SET status=0,removed_by=p_actor_id,removed_at=v_removed_at,
        updated_by=p_actor_id,updated_at=v_removed_at,version_no=version_no+1
    WHERE mark_id=p_mark_id;
    -- Preserve the original workflow status and approval row, including review metadata.
    INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,action_at,remarks)
    VALUES(p_mark_id,v_status,'REMOVED',p_actor_id,v_removed_at,'Soft removal via DELETE /api/v1/marks/{markId}.');
    COMMIT;
    SELECT p_mark_id AS mark_id,1 AS removed,v_status AS previous_workflow_status,
        p_actor_id AS removed_by,v_removed_at AS removed_at,v_version+1 AS version_no;
END$$

DROP PROCEDURE IF EXISTS `sp_marks_get`$$
CREATE PROCEDURE `sp_marks_get`(
    IN p_mark_id BIGINT, IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        sm.mark_id, sm.college_id, sm.exam_id, e.exam_code, COALESCE(e.exam_name, sm.exam_name) AS exam_name,
        sm.student_id, st.student_code, st.full_name AS student_name,
        sm.subject_id, sub.subject_code, sub.subject_name,
        sm.section_id, sec.section_name,
        sm.max_marks, sm.marks_obtained,
        ROUND((sm.marks_obtained / NULLIF(sm.max_marks,0))*100,2) AS percentage,
        sm.grade, sm.remarks, sm.workflow_status, sm.version_no,
        sm.entered_by, sm.entered_at, sm.updated_by, sm.updated_at
    FROM student_marks sm
    LEFT JOIN exams e ON e.exam_id=sm.exam_id
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    LEFT JOIN sections sec ON sec.section_id=sm.section_id
    WHERE sm.status=1 AND sm.mark_id=p_mark_id
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id);
END$$

DROP PROCEDURE IF EXISTS `sp_marks_list`$$
CREATE PROCEDURE `sp_marks_list`(
    IN p_exam_id BIGINT, IN p_student_id BIGINT, IN p_subject_id BIGINT,
    IN p_section_id BIGINT, IN p_workflow_status VARCHAR(20), IN p_search VARCHAR(150),
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        sm.mark_id, sm.college_id, sm.exam_id, e.exam_code, COALESCE(e.exam_name, sm.exam_name) AS exam_name,
        sm.student_id, st.student_code, st.full_name AS student_name,
        sm.subject_id, sub.subject_code, sub.subject_name,
        sm.section_id, sec.section_name,
        sm.max_marks, sm.marks_obtained,
        ROUND((sm.marks_obtained / NULLIF(sm.max_marks,0))*100,2) AS percentage,
        sm.grade, sm.remarks, sm.workflow_status, sm.version_no,
        sm.entered_by, sm.entered_at, sm.updated_by, sm.updated_at
    FROM student_marks sm
    LEFT JOIN exams e ON e.exam_id=sm.exam_id
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    LEFT JOIN sections sec ON sec.section_id=sm.section_id
    WHERE sm.status=1 AND (p_is_super_admin=1 OR sm.college_id=p_college_id)
      AND (p_exam_id IS NULL OR sm.exam_id=p_exam_id)
      AND (p_student_id IS NULL OR sm.student_id=p_student_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_workflow_status IS NULL OR sm.workflow_status=p_workflow_status)
      AND (
          p_search IS NULL OR p_search=''
          OR st.student_code LIKE CONCAT('%',p_search,'%')
          OR st.full_name LIKE CONCAT('%',p_search,'%')
          OR sub.subject_code LIKE CONCAT('%',p_search,'%')
          OR sub.subject_name LIKE CONCAT('%',p_search,'%')
      )
    ORDER BY st.student_code, sub.subject_code;
END$$

DROP PROCEDURE IF EXISTS `sp_marks_report_summary`$$
CREATE PROCEDURE `sp_marks_report_summary`(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_subject_id BIGINT,
    IN p_student_id BIGINT, IN p_workflow_status VARCHAR(20),
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        e.exam_id, e.exam_code, e.exam_name,
        COUNT(DISTINCT st.student_id) AS total_students,
        COUNT(DISTINCT sm.subject_id) AS total_subjects,
        COUNT(DISTINCT st.student_id) * GREATEST(COUNT(DISTINCT sm.subject_id),1) AS expected_entries,
        COUNT(sm.mark_id) AS entered_entries,
        SUM(CASE WHEN sm.mark_id IS NULL THEN 1 ELSE 0 END) AS pending_entries,
        SUM(CASE WHEN sm.workflow_status='DRAFT' THEN 1 ELSE 0 END) AS draft_entries,
        SUM(CASE WHEN sm.workflow_status='SUBMITTED' THEN 1 ELSE 0 END) AS submitted_entries,
        SUM(CASE WHEN sm.workflow_status='APPROVED' THEN 1 ELSE 0 END) AS approved_entries,
        SUM(CASE WHEN sm.workflow_status='REJECTED' THEN 1 ELSE 0 END) AS rejected_entries,
        COALESCE(ROUND(AVG((sm.marks_obtained/NULLIF(sm.max_marks,0))*100),2),0) AS average_percentage,
        COALESCE(ROUND(MAX((sm.marks_obtained/NULLIF(sm.max_marks,0))*100),2),0) AS highest_percentage,
        COALESCE(ROUND(MIN((sm.marks_obtained/NULLIF(sm.max_marks,0))*100),2),0) AS lowest_percentage
    FROM exams e
    LEFT JOIN students st ON st.college_id=e.college_id AND st.status=1 AND st.deleted_at IS NULL
        AND st.academic_year_id=e.academic_year_id
        AND (e.course_id IS NULL OR st.course_id=e.course_id)
        AND (e.branch_id IS NULL OR st.branch_id=e.branch_id)
    LEFT JOIN student_marks sm ON sm.status=1 AND sm.exam_id=e.exam_id AND sm.student_id=st.student_id
        AND (p_section_id IS NULL OR sm.section_id=p_section_id)
        AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
        AND (p_student_id IS NULL OR sm.student_id=p_student_id)
        AND (p_workflow_status IS NULL OR sm.workflow_status=p_workflow_status)
    WHERE e.exam_id=p_exam_id
      AND (p_is_super_admin=1 OR e.college_id=p_college_id)
    GROUP BY e.exam_id,e.exam_code,e.exam_name;
END$$

DROP PROCEDURE IF EXISTS `sp_marks_report_subject`$$
CREATE PROCEDURE `sp_marks_report_subject`(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_subject_id BIGINT,
    IN p_workflow_status VARCHAR(20), IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        sub.subject_id, sub.subject_code, sub.subject_name, p_exam_id AS exam_id,
        COUNT(DISTINCT sm.student_id) AS total_students,
        COUNT(sm.mark_id) AS entered_count,
        SUM(CASE WHEN sm.workflow_status='APPROVED' THEN 1 ELSE 0 END) AS approved_count,
        COALESCE(ROUND(AVG(sm.marks_obtained),2),0) AS average_marks,
        COALESCE(ROUND(AVG(sm.marks_obtained/NULLIF(sm.max_marks,0)*100),2),0) AS average_percentage,
        COALESCE(MAX(sm.marks_obtained),0) AS highest_marks,
        COALESCE(MIN(sm.marks_obtained),0) AS lowest_marks
    FROM subjects sub
    JOIN student_marks sm ON sm.status=1 AND sm.subject_id=sub.subject_id AND sm.exam_id=p_exam_id
    JOIN exams e ON e.exam_id=sm.exam_id
    WHERE (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_workflow_status IS NULL OR sm.workflow_status=p_workflow_status)
      AND (p_is_super_admin=1 OR e.college_id=p_college_id)
    GROUP BY sub.subject_id,sub.subject_code,sub.subject_name
    ORDER BY sub.subject_code;
END$$

DROP PROCEDURE IF EXISTS `sp_marks_report_student`$$
CREATE PROCEDURE `sp_marks_report_student`(
    IN p_exam_id BIGINT, IN p_student_id BIGINT,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT
        st.student_id, st.student_code, st.full_name AS student_name,
        e.exam_id, e.exam_code, e.exam_name,
        COALESCE(SUM(sm.marks_obtained),0) AS total_obtained,
        COALESCE(SUM(sm.max_marks),0) AS total_max_marks,
        COALESCE(ROUND(SUM(sm.marks_obtained)/NULLIF(SUM(sm.max_marks),0)*100,2),0) AS overall_percentage
    FROM students st
    JOIN exams e ON e.exam_id=p_exam_id
    LEFT JOIN student_marks sm ON sm.status=1 AND sm.exam_id=e.exam_id AND sm.student_id=st.student_id
        AND sm.workflow_status='APPROVED'
    WHERE st.student_id=p_student_id
      AND st.college_id=e.college_id
      AND (p_is_super_admin=1 OR st.college_id=p_college_id)
    GROUP BY st.student_id,st.student_code,st.full_name,e.exam_id,e.exam_code,e.exam_name;

    SELECT
        sub.subject_id, sub.subject_code, sub.subject_name,
        sm.marks_obtained, sm.max_marks,
        ROUND(sm.marks_obtained/NULLIF(sm.max_marks,0)*100,2) AS percentage,
        sm.grade, sm.workflow_status
    FROM student_marks sm
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    WHERE sm.status=1 AND sm.exam_id=p_exam_id
      AND sm.student_id=p_student_id
      AND sm.workflow_status='APPROVED'
    ORDER BY sub.subject_code;
END$$

DROP PROCEDURE IF EXISTS `sp_marks_approval_pending`$$
CREATE PROCEDURE `sp_marks_approval_pending`(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_subject_id BIGINT,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT ma.approval_id, ma.mark_id, ma.approval_status,
           ma.submitted_by, ma.submitted_at, ma.approved_by, ma.approved_at, ma.remarks
    FROM marks_approvals ma
    JOIN student_marks sm ON sm.status=1 AND sm.mark_id=ma.mark_id
    WHERE sm.status=1 AND sm.exam_id=p_exam_id
      AND sm.workflow_status='SUBMITTED'
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id)
    ORDER BY ma.submitted_at,ma.approval_id;
END$$

DROP PROCEDURE IF EXISTS `sp_marks_approval_decide`$$
CREATE PROCEDURE `sp_marks_approval_decide`(
    IN p_approval_id BIGINT,IN p_decision VARCHAR(20),IN p_remarks VARCHAR(500),
    IN p_expected_version INT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_mark BIGINT DEFAULT NULL;
    DECLARE v_exam BIGINT DEFAULT NULL;
    DECLARE v_admin TINYINT;
    SET p_decision=UPPER(TRIM(p_decision));
    IF p_decision IS NULL OR p_decision NOT IN ('APPROVED','REJECTED') OR p_approval_id IS NULL OR p_approval_id<=0 THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='A positive ApprovalId and APPROVED or REJECTED Status are required.';
    END IF;
    CALL sp_marks_assert_actor(p_actor_id,p_college_id,p_is_super_admin,p_decision,v_admin);
    SELECT sm.mark_id,sm.exam_id INTO v_mark,v_exam
    FROM marks_approvals ma JOIN student_marks sm ON sm.status=1 AND sm.mark_id=ma.mark_id
    WHERE ma.approval_id=p_approval_id AND (p_is_super_admin=1 OR sm.college_id=p_college_id);
    IF v_mark IS NULL OR v_exam IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT='Approval not found in the authorized college or missing exam mapping.';
    END IF;
    CALL sp_marks_workflow_apply(p_decision,v_exam,JSON_ARRAY(v_mark),NULL,NULL,p_remarks,
        p_actor_id,p_college_id,p_is_super_admin,p_expected_version);
END$$

DROP PROCEDURE IF EXISTS `sp_marks_bulk_preview`$$
CREATE PROCEDURE `sp_marks_bulk_preview`(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_rows_json JSON,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM exams WHERE exam_id=p_exam_id AND status=1 AND deleted_at IS NULL
        AND (p_is_super_admin=1 OR college_id=p_college_id)) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT='Active exam not found in the authorized college.';
    END IF;
    DROP TEMPORARY TABLE IF EXISTS tmp_marks_rows;
    CREATE TEMPORARY TABLE tmp_marks_rows AS
    SELECT *
    FROM JSON_TABLE(
        p_rows_json, '$[*]' COLUMNS(
            row_no FOR ORDINALITY,
            student_code VARCHAR(50) PATH '$.studentCode',
            subject_code VARCHAR(50) PATH '$.subjectCode',
            marks_obtained DECIMAL(7,2) PATH '$.marksObtained',
            max_marks DECIMAL(7,2) PATH '$.maxMarks' NULL ON EMPTY,
            grade VARCHAR(10) PATH '$.grade' NULL ON EMPTY,
            remarks VARCHAR(500) PATH '$.remarks' NULL ON EMPTY
        )
    ) j;

    SELECT
        COUNT(*) AS total_rows,
        SUM(CASE WHEN st.student_id IS NOT NULL
                   AND sub.subject_id IS NOT NULL
                   AND e.exam_id IS NOT NULL
                   AND st.college_id=e.college_id
                   AND NOT EXISTS (SELECT 1 FROM student_marks sm WHERE sm.status=1 AND sm.exam_id=p_exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id)
                   AND t.marks_obtained >= 0
                   AND t.marks_obtained <= COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100)
                 THEN 1 ELSE 0 END) AS valid_rows,
        0 AS inserted_rows, 0 AS updated_rows,
        SUM(CASE WHEN st.student_id IS NULL
                   OR sub.subject_id IS NULL
                   OR e.exam_id IS NULL
                   OR st.college_id<>e.college_id
                   OR EXISTS (SELECT 1 FROM student_marks sm WHERE sm.status=1 AND sm.exam_id=p_exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id)
                   OR t.marks_obtained < 0
                   OR t.marks_obtained > COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100)
                 THEN 1 ELSE 0 END) AS rejected_rows
    FROM tmp_marks_rows t
    LEFT JOIN exams e ON e.exam_id=p_exam_id AND e.status=1 AND e.deleted_at IS NULL
    LEFT JOIN students st ON st.student_code=t.student_code AND st.status=1 AND st.deleted_at IS NULL
    LEFT JOIN subjects sub ON sub.subject_code=t.subject_code AND sub.status=1 AND sub.deleted_at IS NULL;

    SELECT
        t.row_no AS `row_number`, t.student_code, t.subject_code,
        CASE
            WHEN e.exam_id IS NULL THEN 'EXAM_NOT_FOUND'
            WHEN st.student_id IS NULL THEN 'STUDENT_NOT_FOUND'
            WHEN st.college_id <> e.college_id THEN 'COLLEGE_MISMATCH'
            WHEN sub.subject_id IS NULL THEN 'SUBJECT_NOT_FOUND'
            WHEN t.marks_obtained < 0 THEN 'NEGATIVE_MARKS'
            WHEN t.marks_obtained > COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) THEN 'MARKS_EXCEED_MAX'
            WHEN EXISTS (
                SELECT 1 FROM student_marks sm
                WHERE sm.status=1 AND sm.exam_id=e.exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
            ) THEN 'DUPLICATE'
            ELSE 'VALID'
        END AS error_code,
        CASE
            WHEN e.exam_id IS NULL THEN 'Exam not found or inactive.'
            WHEN st.student_id IS NULL THEN 'Student code not found.'
            WHEN st.college_id <> e.college_id THEN 'Student does not belong to the exam college.'
            WHEN sub.subject_id IS NULL THEN 'Subject code not found.'
            WHEN t.marks_obtained < 0 THEN 'Marks cannot be negative.'
            WHEN t.marks_obtained > COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) THEN 'Marks exceed maximum marks.'
            WHEN EXISTS (
                SELECT 1 FROM student_marks sm
                WHERE sm.status=1 AND sm.exam_id=e.exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
            ) THEN 'A mark entry already exists for this student and subject.'
            ELSE 'Valid.'
        END AS message
    FROM tmp_marks_rows t
    LEFT JOIN exams e ON e.exam_id=p_exam_id AND e.status=1 AND e.deleted_at IS NULL
    LEFT JOIN students st ON st.student_code=t.student_code AND st.status=1 AND st.deleted_at IS NULL
    LEFT JOIN subjects sub ON sub.subject_code=t.subject_code AND sub.status=1 AND sub.deleted_at IS NULL
    WHERE e.exam_id IS NULL OR st.student_id IS NULL OR st.college_id<>e.college_id
       OR sub.subject_id IS NULL OR t.marks_obtained<0
       OR t.marks_obtained>COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100)
       OR EXISTS (
           SELECT 1 FROM student_marks sm
           WHERE sm.status=1 AND sm.exam_id=e.exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
       )
    ORDER BY t.row_no;

    DROP TEMPORARY TABLE IF EXISTS tmp_marks_rows;
END$$

DROP PROCEDURE IF EXISTS `sp_marks_bulk_upload`$$
CREATE PROCEDURE `sp_marks_bulk_upload`(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_rows_json JSON,
    IN p_upsert_drafts TINYINT, IN p_actor_id BIGINT,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_college BIGINT;
    DECLARE v_exam_name VARCHAR(150);
    DECLARE v_upload_id BIGINT;
    DECLARE v_admin TINYINT;
    DECLARE v_done TINYINT DEFAULT 0;
    DECLARE v_subject BIGINT;
    DECLARE v_mark BIGINT;
    DECLARE v_owner BIGINT;
    DECLARE v_existing_college BIGINT;
    DECLARE v_inserted INT DEFAULT 0;
    DECLARE v_updated INT DEFAULT 0;
    DECLARE c_scope CURSOR FOR
        SELECT sub.subject_id,sm.mark_id FROM tmp_marks_rows t
        JOIN students st ON st.student_code=t.student_code AND st.college_id=v_college
        JOIN subjects sub ON sub.subject_code=t.subject_code
        LEFT JOIN student_marks sm ON sm.status=1 AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id AND sm.exam_id=p_exam_id
        ORDER BY sm.mark_id,sub.subject_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done=1;

    -- This bulk procedure is called inside MarksRepository's ReadCommitted transaction.
    CALL sp_marks_assert_actor(p_actor_id,p_college_id,p_is_super_admin,'EDIT',v_admin);

    SELECT college_id, exam_name INTO v_college, v_exam_name
    FROM exams
    WHERE exam_id=p_exam_id AND status=1 AND deleted_at IS NULL;

    IF v_college IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Exam not found or inactive.';
    END IF;

    IF p_is_super_admin=0 AND v_college<>p_college_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Exam does not belong to your college.';
    END IF;

    INSERT INTO marks_bulk_uploads
    (college_id, exam_id, section_id, total_rows, uploaded_by)
    SELECT v_college, p_exam_id, p_section_id,
           JSON_LENGTH(p_rows_json), p_actor_id;
    SET v_upload_id=LAST_INSERT_ID();

    DROP TEMPORARY TABLE IF EXISTS tmp_marks_rows;
    CREATE TEMPORARY TABLE tmp_marks_rows AS
    SELECT *
    FROM JSON_TABLE(
        p_rows_json, '$[*]' COLUMNS(
            row_no FOR ORDINALITY,
            student_code VARCHAR(50) PATH '$.studentCode',
            subject_code VARCHAR(50) PATH '$.subjectCode',
            marks_obtained DECIMAL(7,2) PATH '$.marksObtained',
            max_marks DECIMAL(7,2) PATH '$.maxMarks' NULL ON EMPTY,
            grade VARCHAR(10) PATH '$.grade' NULL ON EMPTY,
            remarks VARCHAR(500) PATH '$.remarks' NULL ON EMPTY
        )
    ) j;

    -- Lock existing rows before validating/upserting, in the same order as workflow actions.
    SET v_done=0;
    OPEN c_scope;
    scope_loop: LOOP
        FETCH c_scope INTO v_subject,v_mark;
        IF v_done=1 THEN LEAVE scope_loop; END IF;
        IF v_admin=0 THEN
            CALL sp_marks_assert_faculty_scope(p_actor_id,p_exam_id,v_subject,p_section_id);
        END IF;
        IF v_mark IS NOT NULL THEN
            SET v_owner=NULL;
            SET v_existing_college=NULL;
            BEGIN
                DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_owner=NULL;
                SELECT entered_by,college_id INTO v_owner,v_existing_college FROM student_marks WHERE mark_id=v_mark AND status=1 FOR UPDATE;
            END;
            IF v_existing_college IS NULL OR v_existing_college<>v_college THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30004, MESSAGE_TEXT='Existing mark college does not match the exam college.';
            END IF;
            IF p_upsert_drafts=1 AND v_admin=0 AND (v_owner IS NULL OR v_owner<>p_actor_id) THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='Faculty can bulk-edit only their own mark entries.';
            END IF;
        END IF;
    END LOOP;
    CLOSE c_scope;

    INSERT INTO marks_bulk_upload_errors
    (upload_id,`row_number`,student_code,subject_code,error_code,message)
    SELECT v_upload_id,t.row_no,t.student_code,t.subject_code,
        CASE
            WHEN st.student_id IS NULL THEN 'STUDENT_NOT_FOUND'
            WHEN st.college_id<>v_college THEN 'COLLEGE_MISMATCH'
            WHEN sub.subject_id IS NULL THEN 'SUBJECT_NOT_FOUND'
            WHEN t.marks_obtained<0 THEN 'NEGATIVE_MARKS'
            WHEN t.marks_obtained>COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) THEN 'MARKS_EXCEED_MAX'
            WHEN EXISTS (
                SELECT 1 FROM student_marks sm
                WHERE sm.status=1 AND sm.exam_id=p_exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
                  AND (p_upsert_drafts=0 OR sm.workflow_status NOT IN ('DRAFT','REJECTED'))
            ) THEN 'DUPLICATE_OR_LOCKED'
            ELSE 'VALID'
        END,
        CASE
            WHEN st.student_id IS NULL THEN 'Student code not found.'
            WHEN st.college_id<>v_college THEN 'Student does not belong to the exam college.'
            WHEN sub.subject_id IS NULL THEN 'Subject code not found.'
            WHEN t.marks_obtained<0 THEN 'Marks cannot be negative.'
            WHEN t.marks_obtained>COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) THEN 'Marks exceed maximum marks.'
            WHEN EXISTS (
                SELECT 1 FROM student_marks sm
                WHERE sm.status=1 AND sm.exam_id=p_exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
                  AND (p_upsert_drafts=0 OR sm.workflow_status NOT IN ('DRAFT','REJECTED'))
            ) THEN 'Existing submitted/approved mark cannot be overwritten.'
            ELSE 'Valid.'
        END
    FROM tmp_marks_rows t
    LEFT JOIN students st ON st.student_code=t.student_code AND st.status=1 AND st.deleted_at IS NULL
    LEFT JOIN subjects sub ON sub.subject_code=t.subject_code AND sub.status=1 AND sub.deleted_at IS NULL
    WHERE st.student_id IS NULL OR st.college_id<>v_college OR sub.subject_id IS NULL
       OR t.marks_obtained<0
       OR t.marks_obtained>COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100)
       OR EXISTS (
           SELECT 1 FROM student_marks sm
           WHERE sm.status=1 AND sm.exam_id=p_exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
             AND (p_upsert_drafts=0 OR sm.workflow_status NOT IN ('DRAFT','REJECTED'))
       );

    DROP TEMPORARY TABLE IF EXISTS tmp_task13_bulk_existing;
    CREATE TEMPORARY TABLE tmp_task13_bulk_existing(mark_id BIGINT PRIMARY KEY);
    INSERT IGNORE INTO tmp_task13_bulk_existing
    SELECT sm.mark_id FROM student_marks sm
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    JOIN tmp_marks_rows t ON t.student_code=st.student_code AND t.subject_code=sub.subject_code
    WHERE sm.status=1 AND sm.exam_id=p_exam_id;

    -- Record the prior state only for existing rows that this batch will update.
    IF p_upsert_drafts=1 THEN
        INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,action_at,remarks)
        SELECT sm.mark_id,sm.workflow_status,'DRAFT',p_actor_id,UTC_TIMESTAMP(),t.remarks
        FROM student_marks sm
        JOIN students st ON st.student_id=sm.student_id
        JOIN subjects sub ON sub.subject_id=sm.subject_id
        JOIN tmp_marks_rows t ON t.student_code=st.student_code AND t.subject_code=sub.subject_code
        WHERE sm.status=1 AND sm.exam_id=p_exam_id AND sm.workflow_status IN ('DRAFT','REJECTED')
          AND NOT EXISTS (SELECT 1 FROM marks_bulk_upload_errors er WHERE er.upload_id=v_upload_id AND er.row_number=t.row_no);
    END IF;

    -- Insert valid new rows.
    INSERT INTO student_marks
    (
        college_id,student_id,subject_id,exam_id,section_id,exam_name,
        max_marks,marks_obtained,grade,remarks,entered_by,entered_at,
        status,workflow_status,version_no
    )
    SELECT
        v_college,st.student_id,sub.subject_id,p_exam_id,p_section_id,v_exam_name,
        COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100),
        t.marks_obtained,
        COALESCE(NULLIF(TRIM(t.grade),''), CASE
            WHEN t.marks_obtained / COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) * 100 >= 90 THEN 'A+'
            WHEN t.marks_obtained / COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) * 100 >= 80 THEN 'A'
            WHEN t.marks_obtained / COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) * 100 >= 70 THEN 'B+'
            WHEN t.marks_obtained / COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) * 100 >= 60 THEN 'B'
            WHEN t.marks_obtained / COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) * 100 >= 50 THEN 'C'
            WHEN t.marks_obtained / COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) * 100 >= 40 THEN 'D'
            ELSE 'F' END),
        t.remarks,p_actor_id,NOW(),1,'DRAFT',1
    FROM tmp_marks_rows t
    JOIN students st ON st.student_code=t.student_code AND st.status=1 AND st.deleted_at IS NULL
    JOIN subjects sub ON sub.subject_code=t.subject_code AND sub.status=1 AND sub.deleted_at IS NULL
    WHERE st.college_id=v_college
      AND NOT EXISTS (SELECT 1 FROM marks_bulk_upload_errors er WHERE er.upload_id=v_upload_id AND er.row_number=t.row_no)
      AND NOT EXISTS (SELECT 1 FROM student_marks existing WHERE existing.status=1 AND existing.exam_id=p_exam_id
          AND existing.student_id=st.student_id AND existing.subject_id=sub.subject_id);
    SET v_inserted=ROW_COUNT();

    -- Update only DRAFT/REJECTED existing rows when explicitly requested.
    IF p_upsert_drafts=1 THEN
        UPDATE student_marks sm
        JOIN tmp_task13_bulk_existing existing ON existing.mark_id=sm.mark_id
        JOIN students st ON st.student_id=sm.student_id
        JOIN subjects sub ON sub.subject_id=sm.subject_id
        JOIN tmp_marks_rows t ON t.student_code=st.student_code AND t.subject_code=sub.subject_code
        LEFT JOIN marks_bulk_upload_errors er ON er.upload_id=v_upload_id AND er.row_number=t.row_no
        SET sm.section_id=p_section_id,
            sm.max_marks=COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100),
            sm.marks_obtained=t.marks_obtained,
            sm.grade=COALESCE(NULLIF(TRIM(t.grade),''),sm.grade),
            sm.remarks=t.remarks,
            sm.updated_by=p_actor_id,
            sm.updated_at=NOW(),
            sm.workflow_status='DRAFT',
            sm.version_no=sm.version_no+1
        WHERE sm.status=1 AND sm.exam_id=p_exam_id
          AND sm.workflow_status IN ('DRAFT','REJECTED')
          AND er.row_number IS NULL;
        SET v_updated=ROW_COUNT();
    END IF;

    -- Reset review metadata only for editable rows actually accepted by this batch.
    INSERT INTO marks_approvals(mark_id,approval_status,created_by)
    SELECT sm.mark_id,'PENDING',p_actor_id FROM student_marks sm
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    JOIN tmp_marks_rows t ON t.student_code=st.student_code AND t.subject_code=sub.subject_code
    WHERE sm.status=1 AND sm.exam_id=p_exam_id AND sm.college_id=v_college AND sm.workflow_status='DRAFT'
      AND NOT EXISTS (SELECT 1 FROM marks_bulk_upload_errors er WHERE er.upload_id=v_upload_id AND er.row_number=t.row_no)
    ON DUPLICATE KEY UPDATE approval_status='PENDING',submitted_by=NULL,submitted_at=NULL,
        approved_by=NULL,approved_at=NULL,remarks=NULL,updated_by=p_actor_id,updated_at=UTC_TIMESTAMP();

    UPDATE marks_bulk_uploads u
    SET valid_rows=(SELECT COUNT(*) FROM tmp_marks_rows t WHERE NOT EXISTS (SELECT 1 FROM marks_bulk_upload_errors e WHERE e.upload_id=u.upload_id AND e.row_number=t.row_no)),
        rejected_rows=(SELECT COUNT(*) FROM marks_bulk_upload_errors e WHERE e.upload_id=u.upload_id),
        inserted_rows=v_inserted,
        updated_rows=v_updated
    WHERE u.upload_id=v_upload_id;

    SELECT upload_id, total_rows, valid_rows, inserted_rows, updated_rows, rejected_rows
    FROM marks_bulk_uploads WHERE upload_id=v_upload_id;

    SELECT `row_number`, student_code, subject_code, error_code, message
    FROM marks_bulk_upload_errors
    WHERE upload_id=v_upload_id
    ORDER BY `row_number`;

    DROP TEMPORARY TABLE IF EXISTS tmp_marks_rows;
    DROP TEMPORARY TABLE IF EXISTS tmp_task13_bulk_existing;
END$$

DROP PROCEDURE IF EXISTS `sp_marks_entry_add`$$
CREATE PROCEDURE `sp_marks_entry_add`(
    IN p_exam_id BIGINT,
    IN p_student_id BIGINT,
    IN p_subject_id BIGINT,
    IN p_section_id BIGINT,
    IN p_marks_obtained DECIMAL(7,2),
    IN p_max_marks DECIMAL(7,2),
    IN p_grade VARCHAR(10),
    IN p_remarks VARCHAR(500),
    IN p_actor_id BIGINT,
    IN p_college_id BIGINT,
    IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_college_id BIGINT;
    DECLARE v_course_id BIGINT;
    DECLARE v_branch_id BIGINT;
    DECLARE v_semester_id BIGINT;
    DECLARE v_exam_name VARCHAR(150);
    DECLARE v_student_college BIGINT;
    DECLARE v_student_year BIGINT;
    DECLARE v_max DECIMAL(7,2);
    DECLARE v_existing BIGINT DEFAULT NULL;
    DECLARE v_status VARCHAR(20);
    DECLARE v_admin TINYINT;
    DECLARE v_new_mark_id BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    CALL sp_marks_assert_actor(p_actor_id,p_college_id,p_is_super_admin,'EDIT',v_admin);

    SELECT e.college_id, e.course_id, e.branch_id, e.semester_id, e.exam_name
      INTO v_college_id, v_course_id, v_branch_id, v_semester_id, v_exam_name
    FROM exams e
    WHERE e.exam_id = p_exam_id
      AND e.status = 1
      AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Exam not found or inactive.';
    END IF;

    IF p_is_super_admin = 0 AND p_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='College information not found in token.';
    END IF;

    IF p_is_super_admin = 0 AND v_college_id <> p_college_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='You cannot enter marks for another college.';
    END IF;

    SELECT s.college_id, s.academic_year_id
      INTO v_student_college, v_student_year
    FROM students s
    WHERE s.student_id = p_student_id
      AND s.status = 1
      AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_student_college IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student not found or inactive.';
    END IF;

    IF v_student_college <> v_college_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student does not belong to the exam college.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM subject_course_branches scb
        WHERE scb.subject_id = p_subject_id
          AND scb.course_id = v_course_id
          AND scb.branch_id = v_branch_id
          AND scb.status = 1
    ) OR NOT EXISTS (
        SELECT 1 FROM subject_semester_assignments ssa
        WHERE ssa.subject_id = p_subject_id
          AND ssa.semester_id = v_semester_id
          AND ssa.status = 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Subject is not assigned to this exam academic context.';
    END IF;

    IF p_section_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM student_sections ss
        WHERE ss.student_id = p_student_id
          AND ss.section_id = p_section_id
          AND ss.academic_year_id = v_student_year
          AND ss.is_active = 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student is not assigned to the selected section.';
    END IF;

    SELECT COALESCE(p_max_marks, NULLIF(s.external_marks,0), NULLIF(s.internal_marks,0), 100)
      INTO v_max
    FROM subjects s
    WHERE s.subject_id = p_subject_id
      AND s.status = 1
    LIMIT 1;

    IF v_max IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Subject not found or inactive.';
    END IF;

    IF p_marks_obtained < 0 OR p_marks_obtained > v_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Marks obtained must be between 0 and MaxMarks.';
    END IF;

    IF v_admin=0 THEN
        CALL sp_marks_assert_faculty_scope(p_actor_id,p_exam_id,p_subject_id,p_section_id);
    END IF;

    SELECT sm.mark_id, sm.workflow_status
      INTO v_existing, v_status
    FROM student_marks sm
    WHERE sm.status=1 AND sm.student_id = p_student_id
      AND sm.subject_id = p_subject_id
      AND sm.exam_id = p_exam_id
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Mark entry already exists for this student, subject and exam.';
    END IF;

    INSERT INTO student_marks
    (
        college_id, student_id, subject_id, exam_id, section_id,
        exam_name, exam_date, max_marks, marks_obtained, grade, remarks,
        entered_by, entered_at, status, workflow_status, version_no
    )
    SELECT
        v_college_id, p_student_id, p_subject_id, p_exam_id, p_section_id,
        v_exam_name, NULL, v_max, p_marks_obtained,
        COALESCE(NULLIF(TRIM(p_grade),''), CASE
            WHEN p_marks_obtained / v_max * 100 >= 90 THEN 'A+'
            WHEN p_marks_obtained / v_max * 100 >= 80 THEN 'A'
            WHEN p_marks_obtained / v_max * 100 >= 70 THEN 'B+'
            WHEN p_marks_obtained / v_max * 100 >= 60 THEN 'B'
            WHEN p_marks_obtained / v_max * 100 >= 50 THEN 'C'
            WHEN p_marks_obtained / v_max * 100 >= 40 THEN 'D'
            ELSE 'F' END),
        p_remarks, p_actor_id, NOW(), 1, 'DRAFT', 1;

    SET v_new_mark_id := LAST_INSERT_ID();

    INSERT INTO marks_approvals
    (mark_id, approval_status, created_by)
    VALUES (v_new_mark_id, 'PENDING', p_actor_id)
    ON DUPLICATE KEY UPDATE
        approval_status = 'PENDING',
        updated_at = NOW(),
        updated_by = p_actor_id;

    COMMIT;

    SELECT
        sm.mark_id, sm.college_id, sm.exam_id, e.exam_code, e.exam_name,
        sm.student_id, st.student_code, st.full_name AS student_name,
        sm.subject_id, sub.subject_code, sub.subject_name,
        sm.section_id, sec.section_name,
        sm.max_marks, sm.marks_obtained,
        ROUND((sm.marks_obtained / NULLIF(sm.max_marks,0))*100,2) AS percentage,
        sm.grade, sm.remarks, sm.workflow_status, sm.version_no,
        sm.entered_by, sm.entered_at, sm.updated_by, sm.updated_at
    FROM student_marks sm
    JOIN exams e ON e.exam_id = sm.exam_id
    JOIN students st ON st.student_id = sm.student_id
    JOIN subjects sub ON sub.subject_id = sm.subject_id
    LEFT JOIN sections sec ON sec.section_id = sm.section_id
    WHERE sm.status=1 AND sm.mark_id = v_new_mark_id;
END$$

DELIMITER ;
