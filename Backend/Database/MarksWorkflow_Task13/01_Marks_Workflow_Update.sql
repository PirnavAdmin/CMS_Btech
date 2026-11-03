-- Task 13: Faculty submit; HOD approve/reject. MySQL 8.0.21+.
-- Select your existing database in MySQL Workbench, then execute this entire file.
-- Baseline: dump 7-10.sql. No USE statement, production seed data, or EF migration.
-- Existing procedure signatures and API routes are retained.
-- Run this patch LAST, after any older marks SQL scripts. Re-running is safe.
-- Workflow procedures own their transaction: do not wrap CALLs in another transaction.

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_marks_assert_actor$$
CREATE PROCEDURE sp_marks_assert_actor(
    IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_is_super_admin TINYINT,
    IN p_action VARCHAR(20), OUT p_is_admin TINYINT
)
BEGIN
    DECLARE v_user_college BIGINT DEFAULT NULL;
    DECLARE v_super INT DEFAULT 0;
    DECLARE v_admin INT DEFAULT 0;
    DECLARE v_hod INT DEFAULT 0;
    DECLARE v_faculty INT DEFAULT 0;
    SET p_is_admin = 0;
    IF p_actor_id IS NULL OR p_actor_id <= 0 OR NOT EXISTS (
        SELECT 1 FROM users WHERE user_id=p_actor_id AND status=1 AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='Active authenticated user is required.';
    END IF;
    SELECT college_id INTO v_user_college FROM users WHERE user_id=p_actor_id;
    SELECT COALESCE(MAX(r.role_code='SUPER_ADMIN'),0),
           COALESCE(MAX(r.role_code IN ('COLLEGE_ADMIN','PRINCIPAL')),0),
           COALESCE(MAX(r.role_code='HOD'),0), COALESCE(MAX(r.role_code='FACULTY'),0)
      INTO v_super,v_admin,v_hod,v_faculty
    FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
    WHERE ur.user_id=p_actor_id AND ur.status=1 AND ur.removed_at IS NULL
      AND r.status=1 AND r.deleted_at IS NULL;
    IF p_is_super_admin IS NULL OR p_is_super_admin NOT IN (0,1) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='Invalid authorization scope.';
    END IF;
    IF p_is_super_admin=1 AND v_super=0 THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='Super administrator access is not assigned to this user.';
    END IF;
    IF p_is_super_admin=0 AND (p_college_id IS NULL OR p_college_id<=0
        OR v_user_college IS NULL OR v_user_college<>p_college_id) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='Token college does not match the active user college.';
    END IF;
    SET p_is_admin = IF((p_is_super_admin=1 AND v_super=1) OR v_admin=1,1,0);
    IF p_action IN ('APPROVED','REJECTED','PENDING') THEN
        IF p_is_admin=0 AND v_hod=0 THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='An active HOD or administrator role is required.';
        END IF;
    ELSEIF p_action IN ('SUBMITTED','EDIT','HISTORY') THEN
        IF p_is_admin=0 AND v_hod=0 AND v_faculty=0 THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='An active faculty, HOD or administrator role is required.';
        END IF;
    ELSE
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='Unsupported marks action.';
    END IF;
END$$

DROP PROCEDURE IF EXISTS sp_marks_assert_faculty_scope$$
CREATE PROCEDURE sp_marks_assert_faculty_scope(
    IN p_actor_id BIGINT, IN p_exam_id BIGINT, IN p_subject_id BIGINT, IN p_section_id BIGINT
)
BEGIN
    -- employee_profile_id is a profile ID; resolve the login through ep.user_id.
    -- A NULL subject/year allocation is incomplete and is never a wildcard.
    IF NOT EXISTS (
        SELECT 1 FROM faculty f
        LEFT JOIN employee_profiles ep ON ep.employee_profile_id=f.employee_profile_id
        JOIN faculty_subject_allocations a ON a.faculty_id=f.faculty_id
        JOIN exams e ON e.exam_id=p_exam_id
        WHERE COALESCE(ep.user_id,f.user_id)=p_actor_id
          AND f.status=1 AND f.deleted_at IS NULL AND f.college_id=e.college_id
          AND (f.employee_profile_id IS NULL OR (ep.status=1 AND ep.deleted_at IS NULL))
          AND a.status=1 AND a.deleted_at IS NULL
          AND a.subject_id=p_subject_id AND a.academic_year_id=e.academic_year_id
          AND a.branch_id=e.branch_id AND a.semester_id=e.semester_id
          AND (a.course_id IS NULL OR a.course_id=e.course_id)
          AND (a.section_id IS NULL OR a.section_id=p_section_id)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002,
            MESSAGE_TEXT='No active faculty allocation matches this exam, subject, year and section.';
    END IF;
END$$

DROP PROCEDURE IF EXISTS sp_marks_assert_hod_scope$$
CREATE PROCEDURE sp_marks_assert_hod_scope(IN p_actor_id BIGINT, IN p_exam_id BIGINT)
BEGIN
    -- Department belongs to the exam branch. Section.department_id remains optional.
    IF NOT EXISTS (
        SELECT 1 FROM exams e JOIN branches b ON b.branch_id=e.branch_id
        JOIN departments d ON d.department_id=b.department_id AND d.college_id=e.college_id
        JOIN employee_profiles ep ON ep.user_id=p_actor_id AND ep.department_id=d.department_id
        JOIN user_roles ur ON ur.user_id=p_actor_id AND ur.status=1 AND ur.removed_at IS NULL
        JOIN roles r ON r.role_id=ur.role_id AND r.role_code='HOD' AND r.status=1 AND r.deleted_at IS NULL
        WHERE e.exam_id=p_exam_id AND d.hod_user_id=p_actor_id
          AND b.status=1 AND b.deleted_at IS NULL AND b.course_id=e.course_id
          AND d.status=1 AND d.deleted_at IS NULL AND ep.status=1 AND ep.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002,
            MESSAGE_TEXT='Only the assigned active HOD of the exam branch department can review these marks.';
    END IF;
END$$

DROP PROCEDURE IF EXISTS sp_marks_workflow_apply$$
CREATE PROCEDURE sp_marks_workflow_apply(
    IN p_action VARCHAR(20), IN p_exam_id BIGINT, IN p_mark_ids_json JSON,
    IN p_section_id BIGINT, IN p_subject_id BIGINT, IN p_remarks VARCHAR(500),
    IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_is_super_admin TINYINT,
    IN p_expected_version INT
)
BEGIN
    DECLARE v_admin TINYINT DEFAULT 0;
    DECLARE v_done TINYINT DEFAULT 0;
    DECLARE v_found TINYINT DEFAULT 0;
    DECLARE v_mark_id BIGINT;
    DECLARE v_exam_college BIGINT DEFAULT NULL;
    DECLARE v_mark_college BIGINT;
    DECLARE v_mark_exam BIGINT;
    DECLARE v_subject BIGINT;
    DECLARE v_section BIGINT;
    DECLARE v_entered_by BIGINT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_active TINYINT;
    DECLARE v_version INT;
    DECLARE v_max DECIMAL(7,2);
    DECLARE v_marks DECIMAL(7,2);
    DECLARE v_approval_id BIGINT;
    DECLARE v_approval_status VARCHAR(20);
    DECLARE v_submitted_by BIGINT;
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_message VARCHAR(128);
    DECLARE c_marks CURSOR FOR
        SELECT j.mark_id FROM JSON_TABLE(p_mark_ids_json,'$[*]'
            COLUMNS(mark_id BIGINT PATH '$' ERROR ON EMPTY ERROR ON ERROR)) j ORDER BY j.mark_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done=1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_action IS NULL OR p_action NOT IN ('SUBMITTED','APPROVED','REJECTED') THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='Invalid workflow action.';
    END IF;
    IF p_exam_id IS NULL OR p_exam_id<=0 OR (p_section_id IS NOT NULL AND p_section_id<=0)
        OR (p_subject_id IS NOT NULL AND p_subject_id<=0) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='ExamId and supplied scope IDs must be positive.';
    END IF;
    IF p_mark_ids_json IS NULL OR JSON_TYPE(p_mark_ids_json)<>'ARRAY'
        OR JSON_LENGTH(p_mark_ids_json)=0 OR JSON_LENGTH(p_mark_ids_json)>1000 THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='Provide an array of 1 to 1000 positive MarkIds.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM JSON_TABLE(p_mark_ids_json,'$[*]' COLUMNS(n FOR ORDINALITY)) j
        WHERE JSON_TYPE(JSON_EXTRACT(p_mark_ids_json,CONCAT('$[',j.n-1,']')))<>'INTEGER'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='MarkIds must be JSON integers.';
    END IF;
    SELECT COUNT(DISTINCT j.mark_id) INTO v_count FROM JSON_TABLE(p_mark_ids_json,'$[*]'
        COLUMNS(mark_id BIGINT PATH '$' ERROR ON EMPTY ERROR ON ERROR)) j WHERE j.mark_id>0;
    IF v_count<>JSON_LENGTH(p_mark_ids_json) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='MarkIds must be positive and unique.';
    END IF;
    IF p_expected_version IS NOT NULL AND (p_expected_version<=0 OR v_count<>1) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='ExpectedVersion must be positive and apply to one mark.';
    END IF;
    SET p_remarks=NULLIF(TRIM(p_remarks),'');
    IF p_action='REJECTED' AND p_remarks IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='Rejection remarks are required.';
    END IF;

    START TRANSACTION;
    CALL sp_marks_assert_actor(p_actor_id,p_college_id,p_is_super_admin,p_action,v_admin);
    SELECT college_id INTO v_exam_college FROM exams
    WHERE exam_id=p_exam_id AND status=1 AND deleted_at IS NULL;
    IF v_exam_college IS NULL OR (p_is_super_admin=0 AND v_exam_college<>p_college_id) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT='Active exam not found in the authorized college.';
    END IF;
    IF v_admin=0 AND p_action<>'SUBMITTED' THEN
        CALL sp_marks_assert_hod_scope(p_actor_id,p_exam_id);
    END IF;
    SET v_done=0;
    OPEN c_marks;
    mark_loop: LOOP
        FETCH c_marks INTO v_mark_id;
        IF v_done=1 THEN LEAVE mark_loop; END IF;
        SET v_found=1;
        BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_found=0;
            SELECT college_id,exam_id,subject_id,section_id,entered_by,workflow_status,status,version_no,max_marks,marks_obtained
              INTO v_mark_college,v_mark_exam,v_subject,v_section,v_entered_by,v_status,v_active,v_version,v_max,v_marks
            FROM student_marks WHERE mark_id=v_mark_id FOR UPDATE;
        END;
        IF v_found=0 OR v_mark_college IS NULL OR v_mark_college<>v_exam_college
            OR v_mark_exam IS NULL OR v_mark_exam<>p_exam_id OR v_active<>1 THEN
            SET v_message=CONCAT('MarkId ',v_mark_id,' not found in the active exam and authorized college.');
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT=v_message;
        END IF;
        IF (p_section_id IS NOT NULL AND NOT (v_section<=>p_section_id))
            OR (p_subject_id IS NOT NULL AND v_subject<>p_subject_id) THEN
            SET v_message=CONCAT('MarkId ',v_mark_id,' does not match the selected subject or section.');
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT=v_message;
        END IF;
        IF p_expected_version IS NOT NULL AND v_version<>p_expected_version THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30004, MESSAGE_TEXT='Marks changed since review. Refresh before making a decision.';
        END IF;
        IF p_action='SUBMITTED' THEN
            IF v_status NOT IN ('DRAFT','REJECTED') THEN
                SET v_message=CONCAT('MarkId ',v_mark_id,': only DRAFT or REJECTED marks can be submitted.');
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30004, MESSAGE_TEXT=v_message;
            END IF;
            IF v_max<=0 OR v_marks<0 OR v_marks>v_max THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='Marks must be between zero and a positive maximum.';
            END IF;
            IF v_admin=0 THEN
                IF v_entered_by IS NULL OR v_entered_by<>p_actor_id THEN
                    SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='Faculty can submit only their own mark entries.';
                END IF;
                CALL sp_marks_assert_faculty_scope(p_actor_id,p_exam_id,v_subject,v_section);
            END IF;
        ELSEIF v_status<>'SUBMITTED' THEN
            SET v_message=CONCAT('MarkId ',v_mark_id,': only SUBMITTED marks can be approved or rejected.');
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30004, MESSAGE_TEXT=v_message;
        END IF;

        SET v_approval_id=NULL;
        SET v_submitted_by=NULL;
        BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_approval_id=NULL;
            SELECT approval_id,approval_status,submitted_by INTO v_approval_id,v_approval_status,v_submitted_by
            FROM marks_approvals WHERE mark_id=v_mark_id FOR UPDATE;
        END;
        IF p_action='SUBMITTED' AND v_approval_id IS NOT NULL AND (
            (v_status='DRAFT' AND v_approval_status NOT IN ('PENDING','DRAFT')) OR
            (v_status='REJECTED' AND v_approval_status<>'REJECTED')
        ) THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30004, MESSAGE_TEXT='Mark and approval states are inconsistent. Verify existing data before submitting.';
        END IF;
        IF p_action<>'SUBMITTED' THEN
            IF v_approval_id IS NULL OR v_approval_status<>'SUBMITTED' OR v_submitted_by IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30004, MESSAGE_TEXT='No valid pending submission exists for this mark.';
            END IF;
            IF v_submitted_by=p_actor_id OR v_entered_by=p_actor_id THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='The submitter or mark creator cannot review their own marks.';
            END IF;
        END IF;

        UPDATE student_marks SET workflow_status=p_action,updated_by=p_actor_id,
            updated_at=UTC_TIMESTAMP(),version_no=version_no+1 WHERE mark_id=v_mark_id;
        IF p_action='SUBMITTED' THEN
            INSERT INTO marks_approvals(mark_id,approval_status,submitted_by,submitted_at,remarks,created_by)
            VALUES(v_mark_id,'SUBMITTED',p_actor_id,UTC_TIMESTAMP(),p_remarks,p_actor_id)
            ON DUPLICATE KEY UPDATE approval_status='SUBMITTED',submitted_by=p_actor_id,
                submitted_at=UTC_TIMESTAMP(),approved_by=NULL,approved_at=NULL,remarks=p_remarks,
                updated_by=p_actor_id,updated_at=UTC_TIMESTAMP();
        ELSE
            UPDATE marks_approvals SET approval_status=p_action,
                approved_by=IF(p_action='APPROVED',p_actor_id,NULL),
                approved_at=IF(p_action='APPROVED',UTC_TIMESTAMP(),NULL),
                remarks=p_remarks,updated_by=p_actor_id,updated_at=UTC_TIMESTAMP()
            WHERE approval_id=v_approval_id;
        END IF;
        INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,action_at,remarks)
        VALUES(v_mark_id,v_status,p_action,p_actor_id,UTC_TIMESTAMP(),p_remarks);
    END LOOP;
    CLOSE c_marks;
    COMMIT;

    -- Counts describe THIS batch; RejectedCount retains the count of marks returned for correction.
    SELECT v_count AS RequestedCount,v_count AS ProcessedCount,
        IF(p_action='REJECTED',v_count,0) AS RejectedCount;
    SELECT j.mark_id AS MarkId FROM JSON_TABLE(p_mark_ids_json,'$[*]' COLUMNS(mark_id BIGINT PATH '$')) j ORDER BY j.mark_id;
    SELECT 0 AS RowNumber,'' AS StudentCode,'' AS SubjectCode,'' AS ErrorCode,'' AS Message WHERE 1=0;
END$$

DROP PROCEDURE IF EXISTS sp_marks_submit$$
CREATE PROCEDURE sp_marks_submit(
    IN p_exam_id BIGINT,IN p_mark_ids_json JSON,IN p_section_id BIGINT,IN p_subject_id BIGINT,
    IN p_remarks VARCHAR(500),IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT
)
BEGIN
    CALL sp_marks_workflow_apply('SUBMITTED',p_exam_id,p_mark_ids_json,p_section_id,p_subject_id,
        p_remarks,p_actor_id,p_college_id,p_is_super_admin,NULL);
END$$

DROP PROCEDURE IF EXISTS sp_marks_approve$$
CREATE PROCEDURE sp_marks_approve(
    IN p_exam_id BIGINT,IN p_mark_ids_json JSON,IN p_section_id BIGINT,IN p_subject_id BIGINT,
    IN p_remarks VARCHAR(500),IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT
)
BEGIN
    CALL sp_marks_workflow_apply('APPROVED',p_exam_id,p_mark_ids_json,p_section_id,p_subject_id,
        p_remarks,p_actor_id,p_college_id,p_is_super_admin,NULL);
END$$

DROP PROCEDURE IF EXISTS sp_marks_reject$$
CREATE PROCEDURE sp_marks_reject(
    IN p_exam_id BIGINT,IN p_mark_ids_json JSON,IN p_section_id BIGINT,IN p_subject_id BIGINT,
    IN p_remarks VARCHAR(500),IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT
)
BEGIN
    CALL sp_marks_workflow_apply('REJECTED',p_exam_id,p_mark_ids_json,p_section_id,p_subject_id,
        p_remarks,p_actor_id,p_college_id,p_is_super_admin,NULL);
END$$

DROP PROCEDURE IF EXISTS sp_marks_approval_decide$$
CREATE PROCEDURE sp_marks_approval_decide(
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
    FROM marks_approvals ma JOIN student_marks sm ON sm.mark_id=ma.mark_id
    WHERE ma.approval_id=p_approval_id AND (p_is_super_admin=1 OR sm.college_id=p_college_id);
    IF v_mark IS NULL OR v_exam IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT='Approval not found in the authorized college or missing exam mapping.';
    END IF;
    CALL sp_marks_workflow_apply(p_decision,v_exam,JSON_ARRAY(v_mark),NULL,NULL,p_remarks,
        p_actor_id,p_college_id,p_is_super_admin,p_expected_version);
END$$

DROP PROCEDURE IF EXISTS sp_marks_approval_pending_for_actor$$
CREATE PROCEDURE sp_marks_approval_pending_for_actor(
    IN p_exam_id BIGINT,IN p_section_id BIGINT,IN p_subject_id BIGINT,
    IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_admin TINYINT;
    CALL sp_marks_assert_actor(p_actor_id,p_college_id,p_is_super_admin,'PENDING',v_admin);
    IF NOT EXISTS (SELECT 1 FROM exams WHERE exam_id=p_exam_id AND status=1 AND deleted_at IS NULL
        AND (p_is_super_admin=1 OR college_id=p_college_id)) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT='Active exam not found in the authorized college.';
    END IF;
    IF v_admin=0 THEN CALL sp_marks_assert_hod_scope(p_actor_id,p_exam_id); END IF;
    SELECT ma.approval_id AS ApprovalId,ma.mark_id AS MarkId,ma.approval_status AS ApprovalStatus,
        ma.submitted_by AS SubmittedBy,ma.submitted_at AS SubmittedAt,ma.approved_by AS ApprovedBy,
        ma.approved_at AS ApprovedAt,ma.remarks AS Remarks,sm.exam_id AS ExamId,sm.subject_id AS SubjectId,
        sm.section_id AS SectionId,sm.student_id AS StudentId,st.student_code AS StudentCode,
        st.full_name AS StudentName,sub.subject_name AS SubjectName,sec.section_name AS SectionName,
        u.full_name AS SubmittedByName,sm.marks_obtained AS MarksObtained,sm.max_marks AS MaxMarks,sm.version_no AS VersionNo
    FROM marks_approvals ma JOIN student_marks sm ON sm.mark_id=ma.mark_id
    JOIN exams e ON e.exam_id=sm.exam_id AND e.college_id=sm.college_id
    JOIN students st ON st.student_id=sm.student_id JOIN subjects sub ON sub.subject_id=sm.subject_id
    LEFT JOIN sections sec ON sec.section_id=sm.section_id LEFT JOIN users u ON u.user_id=ma.submitted_by
    WHERE sm.exam_id=p_exam_id AND sm.status=1 AND sm.workflow_status='SUBMITTED' AND ma.approval_status='SUBMITTED'
      AND ma.submitted_by IS NOT NULL AND ma.submitted_by<>p_actor_id
      AND (sm.entered_by IS NULL OR sm.entered_by<>p_actor_id)
      AND (p_section_id IS NULL OR sm.section_id=p_section_id) AND (p_subject_id IS NULL OR sm.subject_id=p_subject_id)
      AND (p_is_super_admin=1 OR sm.college_id=p_college_id)
    ORDER BY ma.submitted_at,ma.approval_id;
END$$

DROP PROCEDURE IF EXISTS sp_marks_approval_history_for_actor$$
CREATE PROCEDURE sp_marks_approval_history_for_actor(
    IN p_mark_id BIGINT,IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_admin TINYINT;
    DECLARE v_exam BIGINT DEFAULT NULL;
    DECLARE v_owner BIGINT DEFAULT NULL;
    CALL sp_marks_assert_actor(p_actor_id,p_college_id,p_is_super_admin,'HISTORY',v_admin);
    SELECT exam_id,entered_by INTO v_exam,v_owner FROM student_marks
    WHERE mark_id=p_mark_id AND (p_is_super_admin=1 OR college_id=p_college_id);
    IF v_exam IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT='Mark not found in the authorized college or missing exam mapping.';
    END IF;
    IF v_admin=0 AND NOT (v_owner<=>p_actor_id) AND NOT EXISTS (
        SELECT 1 FROM marks_approval_history WHERE mark_id=p_mark_id AND action_by=p_actor_id
    ) THEN
        CALL sp_marks_assert_hod_scope(p_actor_id,v_exam);
    END IF;
    SELECT history_id AS HistoryId,mark_id AS MarkId,from_status AS FromStatus,to_status AS ToStatus,
        action_by AS ActionBy,action_at AS ActionAt,remarks AS Remarks
    FROM marks_approval_history WHERE mark_id=p_mark_id ORDER BY history_id;
END$$

DROP PROCEDURE IF EXISTS sp_marks_entry_update$$
CREATE PROCEDURE sp_marks_entry_update(
    IN p_mark_id BIGINT,IN p_marks_obtained DECIMAL(7,2),IN p_max_marks DECIMAL(7,2),
    IN p_grade VARCHAR(10),IN p_remarks VARCHAR(500),IN p_actor_id BIGINT,IN p_college_id BIGINT,IN p_is_super_admin TINYINT
)
BEGIN
    DECLARE v_admin TINYINT;
    DECLARE v_college BIGINT DEFAULT NULL;
    DECLARE v_exam BIGINT;
    DECLARE v_subject BIGINT;
    DECLARE v_section BIGINT;
    DECLARE v_owner BIGINT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_max DECIMAL(7,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    CALL sp_marks_assert_actor(p_actor_id,p_college_id,p_is_super_admin,'EDIT',v_admin);
    SELECT college_id,exam_id,subject_id,section_id,entered_by,workflow_status,max_marks
    INTO v_college,v_exam,v_subject,v_section,v_owner,v_status,v_max
    FROM student_marks WHERE mark_id=p_mark_id AND status=1 FOR UPDATE;
    IF v_college IS NULL OR (p_is_super_admin=0 AND v_college<>p_college_id) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30003, MESSAGE_TEXT='Active mark entry not found in the authorized college.';
    END IF;
    IF v_exam IS NULL OR NOT EXISTS (SELECT 1 FROM exams WHERE exam_id=v_exam AND college_id=v_college
        AND status=1 AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30004, MESSAGE_TEXT='Mark entry requires a valid active exam mapping before editing.';
    END IF;
    IF v_status NOT IN ('DRAFT','REJECTED') THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30004, MESSAGE_TEXT='Only DRAFT or REJECTED marks can be edited.';
    END IF;
    IF v_admin=0 THEN
        IF v_owner IS NULL OR v_owner<>p_actor_id THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30002, MESSAGE_TEXT='Faculty can edit only their own mark entries.';
        END IF;
        CALL sp_marks_assert_faculty_scope(p_actor_id,v_exam,v_subject,v_section);
    END IF;
    SET v_max=COALESCE(p_max_marks,v_max);
    IF v_max IS NULL OR v_max<=0 OR p_marks_obtained IS NULL OR p_marks_obtained<0 OR p_marks_obtained>v_max THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO=30001, MESSAGE_TEXT='Marks must be between zero and a positive maximum.';
    END IF;
    UPDATE student_marks SET max_marks=v_max,marks_obtained=p_marks_obtained,
        grade=COALESCE(NULLIF(TRIM(p_grade),''),CASE
            WHEN p_marks_obtained/v_max*100>=90 THEN 'A+' WHEN p_marks_obtained/v_max*100>=80 THEN 'A'
            WHEN p_marks_obtained/v_max*100>=70 THEN 'B+' WHEN p_marks_obtained/v_max*100>=60 THEN 'B'
            WHEN p_marks_obtained/v_max*100>=50 THEN 'C' WHEN p_marks_obtained/v_max*100>=40 THEN 'D' ELSE 'F' END),
        remarks=p_remarks,updated_by=p_actor_id,updated_at=UTC_TIMESTAMP(),workflow_status='DRAFT',version_no=version_no+1
    WHERE mark_id=p_mark_id;
    INSERT INTO marks_approvals(mark_id,approval_status,created_by)
    VALUES(p_mark_id,'PENDING',p_actor_id)
    ON DUPLICATE KEY UPDATE approval_status='PENDING',submitted_by=NULL,submitted_at=NULL,
        approved_by=NULL,approved_at=NULL,remarks=NULL,updated_by=p_actor_id,updated_at=UTC_TIMESTAMP();
    INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,action_at,remarks)
    VALUES(p_mark_id,v_status,'DRAFT',p_actor_id,UTC_TIMESTAMP(),p_remarks);
    COMMIT;
    CALL sp_marks_get(p_mark_id,p_college_id,p_is_super_admin);
END$$

-- Preserve bulk correction after rejection without overwriting submitted/approved rows.
DROP PROCEDURE IF EXISTS sp_marks_bulk_upload$$
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
        LEFT JOIN student_marks sm ON sm.student_id=st.student_id AND sm.subject_id=sub.subject_id AND sm.exam_id=p_exam_id
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
                SELECT entered_by,college_id INTO v_owner,v_existing_college FROM student_marks WHERE mark_id=v_mark FOR UPDATE;
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

    DROP TEMPORARY TABLE IF EXISTS tmp_task13_bulk_existing;
    CREATE TEMPORARY TABLE tmp_task13_bulk_existing(mark_id BIGINT PRIMARY KEY);
    INSERT IGNORE INTO tmp_task13_bulk_existing
    SELECT sm.mark_id FROM student_marks sm
    JOIN students st ON st.student_id=sm.student_id
    JOIN subjects sub ON sub.subject_id=sm.subject_id
    JOIN tmp_marks_rows t ON t.student_code=st.student_code AND t.subject_code=sub.subject_code
    WHERE sm.exam_id=p_exam_id;

    -- Record the prior state only for existing rows that this batch will update.
    IF p_upsert_drafts=1 THEN
        INSERT INTO marks_approval_history(mark_id,from_status,to_status,action_by,action_at,remarks)
        SELECT sm.mark_id,sm.workflow_status,'DRAFT',p_actor_id,UTC_TIMESTAMP(),t.remarks
        FROM student_marks sm
        JOIN students st ON st.student_id=sm.student_id
        JOIN subjects sub ON sub.subject_id=sm.subject_id
        JOIN tmp_marks_rows t ON t.student_code=st.student_code AND t.subject_code=sub.subject_code
        WHERE sm.exam_id=p_exam_id AND sm.workflow_status IN ('DRAFT','REJECTED')
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
      AND NOT EXISTS (SELECT 1 FROM student_marks existing WHERE existing.exam_id=p_exam_id
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
        WHERE sm.exam_id=p_exam_id
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
    WHERE sm.exam_id=p_exam_id AND sm.college_id=v_college AND sm.workflow_status='DRAFT'
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

DELIMITER ;
