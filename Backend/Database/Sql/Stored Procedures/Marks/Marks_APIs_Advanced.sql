-- ============================================================
-- B.Tech CMS - Advanced Marks APIs
-- Additive database changes only. No DROP/TRUNCATE/DELETE.
-- MySQL 8.0+
--
-- Supports:
--   1. Individual mark entry
--   2. Edit/re-entry with workflow protection
--   3. Excel/JSON bulk preview + transactional bulk processing
--   4. Summary/student/subject reports
--   5. Draft -> Submitted -> Approved / Rejected workflow
--   6. Approval audit history
--   7. College isolation and exam/student/subject validation
-- ============================================================

USE cms_btech;

-- ------------------------------------------------------------
-- Additive columns to the existing student_marks table.
-- Existing rows are preserved.
-- ------------------------------------------------------------
ALTER TABLE student_marks
    ADD COLUMN IF NOT EXISTS college_id BIGINT NULL AFTER mark_id,
    ADD COLUMN IF NOT EXISTS exam_id BIGINT NULL AFTER subject_id,
    ADD COLUMN IF NOT EXISTS section_id BIGINT NULL AFTER exam_id,
    ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' AFTER status,
    ADD COLUMN IF NOT EXISTS version_no INT NOT NULL DEFAULT 1 AFTER workflow_status;

-- Replace the legacy uniqueness key with an exam-aware key.
-- Existing legacy rows remain; NULL exam_id values do not collide in MySQL.
SET @has_legacy_unique := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'student_marks'
      AND INDEX_NAME = 'uq_student_subject_exam'
);
SET @sql := IF(@has_legacy_unique = 1,
    'ALTER TABLE student_marks DROP INDEX uq_student_subject_exam',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_new_unique := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'student_marks'
      AND INDEX_NAME = 'uq_student_subject_exam_v2'
);
SET @sql := IF(@has_new_unique = 0,
    'ALTER TABLE student_marks ADD UNIQUE KEY uq_student_subject_exam_v2 (student_id, subject_id, exam_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_scope_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'student_marks'
      AND INDEX_NAME = 'idx_student_marks_exam_scope'
);
SET @sql := IF(@has_scope_idx = 0,
    'CREATE INDEX idx_student_marks_exam_scope ON student_marks(exam_id, college_id, section_id, subject_id, workflow_status)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_workflow_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'student_marks'
      AND INDEX_NAME = 'idx_student_marks_workflow'
);
SET @sql := IF(@has_workflow_idx = 0,
    'CREATE INDEX idx_student_marks_workflow ON student_marks(workflow_status, exam_id, subject_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Existing marks_approvals is retained. Add a full history table.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marks_approval_history (
    history_id BIGINT NOT NULL AUTO_INCREMENT,
    mark_id BIGINT NOT NULL,
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    action_by BIGINT NULL,
    action_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks VARCHAR(500) NULL,
    PRIMARY KEY (history_id),
    KEY idx_marks_approval_history_mark (mark_id, action_at),
    CONSTRAINT fk_marks_approval_history_mark
        FOREIGN KEY (mark_id) REFERENCES student_marks(mark_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS marks_bulk_uploads (
    upload_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NULL,
    exam_id BIGINT NOT NULL,
    section_id BIGINT NULL,
    file_name VARCHAR(255) NULL,
    total_rows INT NOT NULL DEFAULT 0,
    valid_rows INT NOT NULL DEFAULT 0,
    inserted_rows INT NOT NULL DEFAULT 0,
    updated_rows INT NOT NULL DEFAULT 0,
    rejected_rows INT NOT NULL DEFAULT 0,
    uploaded_by BIGINT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (upload_id),
    KEY idx_marks_bulk_exam (exam_id, uploaded_at),
    KEY idx_marks_bulk_college (college_id, uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS marks_bulk_upload_errors (
    error_id BIGINT NOT NULL AUTO_INCREMENT,
    upload_id BIGINT NOT NULL,
    row_number INT NOT NULL,
    student_code VARCHAR(50) NULL,
    subject_code VARCHAR(50) NULL,
    error_code VARCHAR(50) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (error_id),
    KEY idx_marks_bulk_error_upload (upload_id, row_number),
    CONSTRAINT fk_marks_bulk_error_upload
        FOREIGN KEY (upload_id) REFERENCES marks_bulk_uploads(upload_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ------------------------------------------------------------
-- Add missing FK/index only if the schema does not already have it.
-- These do not modify existing data.
-- ------------------------------------------------------------
SET @has_exam_fk := (
    SELECT COUNT(*)
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'student_marks'
      AND CONSTRAINT_NAME = 'fk_student_marks_exam'
);

SET @sql := IF(@has_exam_fk = 0,
    'ALTER TABLE student_marks ADD CONSTRAINT fk_student_marks_exam FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Common result shape:
-- MarkDto columns expected by Dapper.
-- ============================================================

DROP PROCEDURE IF EXISTS sp_marks_entry_add;
DROP PROCEDURE IF EXISTS sp_marks_entry_update;
DROP PROCEDURE IF EXISTS sp_marks_get;
DROP PROCEDURE IF EXISTS sp_marks_list;
DROP PROCEDURE IF EXISTS sp_marks_bulk_preview;
DROP PROCEDURE IF EXISTS sp_marks_bulk_upload;
DROP PROCEDURE IF EXISTS sp_marks_report_summary;
DROP PROCEDURE IF EXISTS sp_marks_report_student;
DROP PROCEDURE IF EXISTS sp_marks_report_subject;
DROP PROCEDURE IF EXISTS sp_marks_submit;
DROP PROCEDURE IF EXISTS sp_marks_approve;
DROP PROCEDURE IF EXISTS sp_marks_reject;
DROP PROCEDURE IF EXISTS sp_marks_approval_pending;
DROP PROCEDURE IF EXISTS sp_marks_approval_history;

DELIMITER $$

-- ============================================================
-- 1. INDIVIDUAL ENTRY
-- ============================================================
CREATE PROCEDURE sp_marks_entry_add(
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

    SELECT sm.mark_id, sm.workflow_status
      INTO v_existing, v_status
    FROM student_marks sm
    WHERE sm.student_id = p_student_id
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

    SET @new_mark_id := LAST_INSERT_ID();

    INSERT INTO marks_approvals
    (mark_id, approval_status, created_by)
    VALUES (@new_mark_id, 'PENDING', p_actor_id)
    ON DUPLICATE KEY UPDATE
        approval_status = 'PENDING',
        updated_at = NOW(),
        updated_by = p_actor_id;

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
    WHERE sm.mark_id = @new_mark_id;
END$$

-- ============================================================
-- 2. EDIT
-- ============================================================
CREATE PROCEDURE sp_marks_entry_update(
    IN p_mark_id BIGINT,
    IN p_marks_obtained DECIMAL(7,2),
    IN p_max_marks DECIMAL(7,2),
    IN p_grade VARCHAR(10),
    IN p_remarks VARCHAR(500),
    IN p_actor_id BIGINT,
    IN p_college_id BIGINT,
    IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_college BIGINT;
    DECLARE v_max DECIMAL(7,2);
    DECLARE v_status VARCHAR(20);

    SELECT college_id, workflow_status, max_marks
      INTO v_college, v_status, v_max
    FROM student_marks
    WHERE mark_id = p_mark_id
    LIMIT 1;

    IF v_college IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Mark entry not found.';
    END IF;

    IF p_is_super_admin = 0 AND v_college <> p_college_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='You cannot edit marks for another college.';
    END IF;

    IF v_status NOT IN ('DRAFT','REJECTED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only DRAFT or REJECTED marks can be edited.';
    END IF;

    SET v_max = COALESCE(p_max_marks, v_max);

    IF p_marks_obtained < 0 OR p_marks_obtained > v_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Marks obtained must be between 0 and MaxMarks.';
    END IF;

    UPDATE student_marks
    SET max_marks = v_max,
        marks_obtained = p_marks_obtained,
        grade = COALESCE(NULLIF(TRIM(p_grade),''), CASE
            WHEN p_marks_obtained / v_max * 100 >= 90 THEN 'A+'
            WHEN p_marks_obtained / v_max * 100 >= 80 THEN 'A'
            WHEN p_marks_obtained / v_max * 100 >= 70 THEN 'B+'
            WHEN p_marks_obtained / v_max * 100 >= 60 THEN 'B'
            WHEN p_marks_obtained / v_max * 100 >= 50 THEN 'C'
            WHEN p_marks_obtained / v_max * 100 >= 40 THEN 'D'
            ELSE 'F' END),
        remarks = p_remarks,
        updated_by = p_actor_id,
        updated_at = NOW(),
        workflow_status = 'DRAFT',
        version_no = version_no + 1
    WHERE mark_id = p_mark_id;

    UPDATE marks_approvals
    SET approval_status='PENDING', updated_by=p_actor_id, updated_at=NOW(), remarks=NULL
    WHERE mark_id=p_mark_id;

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
    JOIN exams e ON e.exam_id=sm.exam_id
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    LEFT JOIN sections sec ON sec.section_id=sm.section_id
    WHERE sm.mark_id=p_mark_id;
END$$

-- ============================================================
-- 3. GET / LIST
-- ============================================================
CREATE PROCEDURE sp_marks_get(
    IN p_mark_id BIGINT, IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
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
    JOIN exams e ON e.exam_id=sm.exam_id
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    LEFT JOIN sections sec ON sec.section_id=sm.section_id
    WHERE sm.mark_id=p_mark_id
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id);
END$$

CREATE PROCEDURE sp_marks_list(
    IN p_exam_id BIGINT, IN p_student_id BIGINT, IN p_subject_id BIGINT,
    IN p_section_id BIGINT, IN p_workflow_status VARCHAR(20), IN p_search VARCHAR(150),
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
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
    JOIN exams e ON e.exam_id=sm.exam_id
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    LEFT JOIN sections sec ON sec.section_id=sm.section_id
    WHERE (p_is_super_admin=1 OR sm.college_id=p_college_id)
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

-- ============================================================
-- 4. BULK PREVIEW
-- ============================================================
CREATE PROCEDURE sp_marks_bulk_preview(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_rows_json JSON,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
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
                   AND t.marks_obtained >= 0
                   AND t.marks_obtained <= COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100)
                 THEN 1 ELSE 0 END) AS valid_rows,
        0 AS inserted_rows, 0 AS updated_rows,
        SUM(CASE WHEN st.student_id IS NULL
                   OR sub.subject_id IS NULL
                   OR e.exam_id IS NULL
                   OR t.marks_obtained < 0
                   OR t.marks_obtained > COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100)
                 THEN 1 ELSE 0 END) AS rejected_rows
    FROM tmp_marks_rows t
    LEFT JOIN exams e ON e.exam_id=p_exam_id AND e.status=1 AND e.deleted_at IS NULL
    LEFT JOIN students st ON st.student_code=t.student_code AND st.status=1 AND st.deleted_at IS NULL
    LEFT JOIN subjects sub ON sub.subject_code=t.subject_code AND sub.status=1 AND sub.deleted_at IS NULL;

    SELECT
        t.row_no AS row_number, t.student_code, t.subject_code,
        CASE
            WHEN e.exam_id IS NULL THEN 'EXAM_NOT_FOUND'
            WHEN st.student_id IS NULL THEN 'STUDENT_NOT_FOUND'
            WHEN st.college_id <> e.college_id THEN 'COLLEGE_MISMATCH'
            WHEN sub.subject_id IS NULL THEN 'SUBJECT_NOT_FOUND'
            WHEN t.marks_obtained < 0 THEN 'NEGATIVE_MARKS'
            WHEN t.marks_obtained > COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) THEN 'MARKS_EXCEED_MAX'
            WHEN EXISTS (
                SELECT 1 FROM student_marks sm
                WHERE sm.exam_id=e.exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
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
                WHERE sm.exam_id=e.exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
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
           WHERE sm.exam_id=e.exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
       )
    ORDER BY t.row_no;

    DROP TEMPORARY TABLE IF EXISTS tmp_marks_rows;
END$$

-- ============================================================
-- 5. BULK UPLOAD
-- Valid rows are inserted. Invalid rows are returned.
-- Existing entries are updated only when UpsertDrafts=1 and the
-- existing workflow state is DRAFT/REJECTED.
-- ============================================================
CREATE PROCEDURE sp_marks_bulk_upload(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_rows_json JSON,
    IN p_upsert_drafts TINYINT, IN p_actor_id BIGINT,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_college BIGINT;
    DECLARE v_exam_name VARCHAR(150);
    DECLARE v_upload_id BIGINT;

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

    INSERT INTO marks_bulk_upload_errors
    (upload_id,row_number,student_code,subject_code,error_code,message)
    SELECT v_upload_id,t.row_no,t.student_code,t.subject_code,
        CASE
            WHEN st.student_id IS NULL THEN 'STUDENT_NOT_FOUND'
            WHEN st.college_id<>v_college THEN 'COLLEGE_MISMATCH'
            WHEN sub.subject_id IS NULL THEN 'SUBJECT_NOT_FOUND'
            WHEN t.marks_obtained<0 THEN 'NEGATIVE_MARKS'
            WHEN t.marks_obtained>COALESCE(t.max_marks,NULLIF(sub.external_marks,0),NULLIF(sub.internal_marks,0),100) THEN 'MARKS_EXCEED_MAX'
            WHEN EXISTS (
                SELECT 1 FROM student_marks sm
                WHERE sm.exam_id=p_exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
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
                WHERE sm.exam_id=p_exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
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
           WHERE sm.exam_id=p_exam_id AND sm.student_id=st.student_id AND sm.subject_id=sub.subject_id
             AND (p_upsert_drafts=0 OR sm.workflow_status NOT IN ('DRAFT','REJECTED'))
       );

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
      AND NOT EXISTS (SELECT 1 FROM marks_bulk_upload_errors er WHERE er.upload_id=v_upload_id AND er.row_number=t.row_no);

    INSERT INTO marks_approvals(mark_id,approval_status,created_by)
    SELECT sm.mark_id,'PENDING',p_actor_id
    FROM student_marks sm
    JOIN tmp_marks_rows t ON t.student_code=(SELECT student_code FROM students WHERE student_id=sm.student_id)
    JOIN subjects sub ON sub.subject_id=sm.subject_id AND sub.subject_code=t.subject_code
    WHERE sm.exam_id=p_exam_id
      AND sm.entered_by=p_actor_id
      AND sm.entered_at >= NOW() - INTERVAL 10 SECOND
    ON DUPLICATE KEY UPDATE approval_status='PENDING',updated_by=p_actor_id,updated_at=NOW();

    -- Update only DRAFT/REJECTED existing rows when explicitly requested.
    IF p_upsert_drafts=1 THEN
        UPDATE student_marks sm
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
        WHERE sm.exam_id=p_exam_id
          AND sm.workflow_status IN ('DRAFT','REJECTED')
          AND er.row_number IS NULL;
    END IF;

    UPDATE marks_bulk_uploads u
    SET valid_rows=(SELECT COUNT(*) FROM tmp_marks_rows t WHERE NOT EXISTS (SELECT 1 FROM marks_bulk_upload_errors e WHERE e.upload_id=u.upload_id AND e.row_number=t.row_no)),
        rejected_rows=(SELECT COUNT(*) FROM marks_bulk_upload_errors e WHERE e.upload_id=u.upload_id),
        inserted_rows=(SELECT COUNT(*) FROM student_marks sm WHERE sm.exam_id=u.exam_id AND sm.entered_by=p_actor_id AND sm.entered_at>=NOW()-INTERVAL 10 SECOND),
        updated_rows=0
    WHERE u.upload_id=v_upload_id;

    SELECT upload_id, total_rows, valid_rows, inserted_rows, updated_rows, rejected_rows
    FROM marks_bulk_uploads WHERE upload_id=v_upload_id;

    SELECT row_number, student_code, subject_code, error_code, message
    FROM marks_bulk_upload_errors
    WHERE upload_id=v_upload_id
    ORDER BY row_number;

    DROP TEMPORARY TABLE IF EXISTS tmp_marks_rows;
END$$

-- ============================================================
-- 6. REPORTS
-- ============================================================
CREATE PROCEDURE sp_marks_report_summary(
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
    LEFT JOIN student_marks sm ON sm.exam_id=e.exam_id AND sm.student_id=st.student_id
        AND (p_section_id IS NULL OR sm.section_id=p_section_id)
        AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
        AND (p_student_id IS NULL OR sm.student_id=p_student_id)
        AND (p_workflow_status IS NULL OR sm.workflow_status=p_workflow_status)
    WHERE e.exam_id=p_exam_id
      AND (p_is_super_admin=1 OR e.college_id=p_college_id)
    GROUP BY e.exam_id,e.exam_code,e.exam_name;
END$$

CREATE PROCEDURE sp_marks_report_student(
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
    LEFT JOIN student_marks sm ON sm.exam_id=e.exam_id AND sm.student_id=st.student_id
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
    WHERE sm.exam_id=p_exam_id
      AND sm.student_id=p_student_id
      AND sm.workflow_status='APPROVED'
    ORDER BY sub.subject_code;
END$$

CREATE PROCEDURE sp_marks_report_subject(
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
    JOIN student_marks sm ON sm.subject_id=sub.subject_id AND sm.exam_id=p_exam_id
    JOIN exams e ON e.exam_id=sm.exam_id
    WHERE (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_workflow_status IS NULL OR sm.workflow_status=p_workflow_status)
      AND (p_is_super_admin=1 OR e.college_id=p_college_id)
    GROUP BY sub.subject_id,sub.subject_code,sub.subject_name
    ORDER BY sub.subject_code;
END$$

-- ============================================================
-- 7. WORKFLOW
-- ============================================================
CREATE PROCEDURE sp_marks_submit(
    IN p_exam_id BIGINT, IN p_mark_ids_json JSON, IN p_section_id BIGINT,
    IN p_subject_id BIGINT, IN p_remarks VARCHAR(500), IN p_actor_id BIGINT,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    DROP TEMPORARY TABLE IF EXISTS tmp_mark_ids;
    CREATE TEMPORARY TABLE tmp_mark_ids(mark_id BIGINT PRIMARY KEY);
    INSERT IGNORE INTO tmp_mark_ids
    SELECT mark_id FROM JSON_TABLE(p_mark_ids_json,'$[*]' COLUMNS(mark_id BIGINT PATH '$')) j;

    UPDATE student_marks sm
    JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id
    SET sm.workflow_status='SUBMITTED', sm.updated_by=p_actor_id, sm.updated_at=NOW(), sm.version_no=sm.version_no+1
    WHERE sm.exam_id=p_exam_id
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id)
      AND sm.workflow_status IN ('DRAFT','REJECTED');

    INSERT INTO marks_approvals(mark_id,approval_status,submitted_by,submitted_at,remarks,created_by)
    SELECT sm.mark_id,'SUBMITTED',p_actor_id,NOW(),p_remarks,p_actor_id
    FROM student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id
    ON DUPLICATE KEY UPDATE approval_status='SUBMITTED',submitted_by=p_actor_id,submitted_at=NOW(),remarks=p_remarks,updated_by=p_actor_id,updated_at=NOW();

    INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,remarks)
    SELECT sm.mark_id,'DRAFT','SUBMITTED',p_actor_id,p_remarks
    FROM student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id
    WHERE sm.workflow_status='SUBMITTED';

    SELECT ROW_COUNT() AS requested_count, ROW_COUNT() AS processed_count, 0 AS rejected_count;
    SELECT sm.mark_id FROM student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id
    WHERE sm.exam_id=p_exam_id AND sm.workflow_status='SUBMITTED';
    SELECT x.mark_id,'INVALID_STATE' AS error_code,'Mark was not in DRAFT or REJECTED state.' AS message
    FROM tmp_mark_ids x LEFT JOIN student_marks sm ON sm.mark_id=x.mark_id
    WHERE sm.mark_id IS NULL OR sm.workflow_status NOT IN ('SUBMITTED');

    DROP TEMPORARY TABLE tmp_mark_ids;
END$$

CREATE PROCEDURE sp_marks_approve(
    IN p_exam_id BIGINT, IN p_mark_ids_json JSON, IN p_section_id BIGINT,
    IN p_subject_id BIGINT, IN p_remarks VARCHAR(500), IN p_actor_id BIGINT,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    DROP TEMPORARY TABLE IF EXISTS tmp_mark_ids;
    CREATE TEMPORARY TABLE tmp_mark_ids(mark_id BIGINT PRIMARY KEY);
    INSERT IGNORE INTO tmp_mark_ids
    SELECT mark_id FROM JSON_TABLE(p_mark_ids_json,'$[*]' COLUMNS(mark_id BIGINT PATH '$')) j;

    INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,remarks)
    SELECT sm.mark_id,sm.workflow_status,'APPROVED',p_actor_id,p_remarks
    FROM student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id
    WHERE sm.exam_id=p_exam_id AND sm.workflow_status='SUBMITTED'
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id);

    UPDATE student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id
    SET sm.workflow_status='APPROVED',sm.updated_by=p_actor_id,sm.updated_at=NOW(),sm.version_no=sm.version_no+1
    WHERE sm.exam_id=p_exam_id AND sm.workflow_status='SUBMITTED'
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id);

    UPDATE marks_approvals ma JOIN tmp_mark_ids x ON x.mark_id=ma.mark_id
    SET ma.approval_status='APPROVED',ma.approved_by=p_actor_id,ma.approved_at=NOW(),ma.remarks=p_remarks,ma.updated_by=p_actor_id,ma.updated_at=NOW()
    WHERE ma.mark_id IN (SELECT mark_id FROM tmp_mark_ids);

    SELECT (SELECT COUNT(*) FROM tmp_mark_ids) AS requested_count,
           (SELECT COUNT(*) FROM marks_approval_history h WHERE h.action_by=p_actor_id AND h.to_status='APPROVED' AND h.action_at>=NOW()-INTERVAL 10 SECOND) AS processed_count,
           0 AS rejected_count;
    SELECT sm.mark_id FROM student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id WHERE sm.workflow_status='APPROVED';
    SELECT x.mark_id,'INVALID_STATE' AS error_code,'Only SUBMITTED marks can be approved.' AS message
    FROM tmp_mark_ids x JOIN student_marks sm ON sm.mark_id=x.mark_id WHERE sm.workflow_status<>'APPROVED';
    DROP TEMPORARY TABLE tmp_mark_ids;
END$$

CREATE PROCEDURE sp_marks_reject(
    IN p_exam_id BIGINT, IN p_mark_ids_json JSON, IN p_section_id BIGINT,
    IN p_subject_id BIGINT, IN p_remarks VARCHAR(500), IN p_actor_id BIGINT,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    IF p_remarks IS NULL OR TRIM(p_remarks)='' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Rejection remarks are required.';
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_mark_ids;
    CREATE TEMPORARY TABLE tmp_mark_ids(mark_id BIGINT PRIMARY KEY);
    INSERT IGNORE INTO tmp_mark_ids
    SELECT mark_id FROM JSON_TABLE(p_mark_ids_json,'$[*]' COLUMNS(mark_id BIGINT PATH '$')) j;

    INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,remarks)
    SELECT sm.mark_id,sm.workflow_status,'REJECTED',p_actor_id,p_remarks
    FROM student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id
    WHERE sm.exam_id=p_exam_id AND sm.workflow_status='SUBMITTED'
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id);

    UPDATE student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id
    SET sm.workflow_status='REJECTED',sm.updated_by=p_actor_id,sm.updated_at=NOW(),sm.version_no=sm.version_no+1
    WHERE sm.exam_id=p_exam_id AND sm.workflow_status='SUBMITTED'
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id);

    UPDATE marks_approvals ma JOIN tmp_mark_ids x ON x.mark_id=ma.mark_id
    SET ma.approval_status='REJECTED',ma.remarks=p_remarks,ma.updated_by=p_actor_id,ma.updated_at=NOW()
    WHERE ma.mark_id IN (SELECT mark_id FROM tmp_mark_ids);

    SELECT (SELECT COUNT(*) FROM tmp_mark_ids) AS requested_count,
           0 AS processed_count,
           (SELECT COUNT(*) FROM marks_approval_history h WHERE h.action_by=p_actor_id AND h.to_status='REJECTED' AND h.action_at>=NOW()-INTERVAL 10 SECOND) AS rejected_count;
    SELECT sm.mark_id FROM student_marks sm JOIN tmp_mark_ids x ON x.mark_id=sm.mark_id WHERE sm.workflow_status='REJECTED';
    SELECT x.mark_id,'INVALID_STATE' AS error_code,'Only SUBMITTED marks can be rejected.' AS message
    FROM tmp_mark_ids x JOIN student_marks sm ON sm.mark_id=x.mark_id WHERE sm.workflow_status<>'REJECTED';
    DROP TEMPORARY TABLE tmp_mark_ids;
END$$

-- ============================================================
-- 8. APPROVAL QUEUE / HISTORY
-- ============================================================
CREATE PROCEDURE sp_marks_approval_pending(
    IN p_exam_id BIGINT, IN p_section_id BIGINT, IN p_subject_id BIGINT,
    IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    SELECT ma.approval_id, ma.mark_id, ma.approval_status,
           ma.submitted_by, ma.submitted_at, ma.approved_by, ma.approved_at, ma.remarks
    FROM marks_approvals ma
    JOIN student_marks sm ON sm.mark_id=ma.mark_id
    WHERE sm.exam_id=p_exam_id
      AND sm.workflow_status='SUBMITTED'
      AND (p_section_id IS NULL OR sm.section_id=p_section_id)
      AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id)
    ORDER BY ma.submitted_at,ma.approval_id;
END$$

CREATE PROCEDURE sp_marks_approval_history(
    IN p_mark_id BIGINT, IN p_college_id BIGINT, IN p_is_super_admin TINYINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM student_marks
        WHERE mark_id=p_mark_id AND (p_is_super_admin=1 OR college_id=p_college_id)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Mark entry not found.';
    END IF;

    SELECT history_id,mark_id,from_status,to_status,action_by,action_at,remarks
    FROM marks_approval_history
    WHERE mark_id=p_mark_id
    ORDER BY history_id;
END$$

DELIMITER ;

-- ============================================================
-- Verification
-- ============================================================
SELECT 'MARKS MODULE SQL INSTALLED' AS result;
SELECT COUNT(*) AS marks_count FROM student_marks;
SELECT COUNT(*) AS approval_count FROM marks_approvals;
SELECT COUNT(*) AS approval_history_count FROM marks_approval_history;
