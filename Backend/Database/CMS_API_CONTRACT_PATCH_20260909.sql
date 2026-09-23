USE cms_btech;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cms_add_student_promotion_column$$
CREATE PROCEDURE sp_cms_add_student_promotion_column(IN p_name VARCHAR(64), IN p_definition VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'student_promotions'
          AND column_name = p_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE student_promotions ADD COLUMN `', p_name, '` ', p_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CALL sp_cms_add_student_promotion_column('from_semester_id', 'BIGINT NULL AFTER from_semester')$$
CALL sp_cms_add_student_promotion_column('to_semester_id', 'BIGINT NULL AFTER to_semester')$$
DROP PROCEDURE sp_cms_add_student_promotion_column$$

DROP PROCEDURE IF EXISTS sp_student_promote_contract$$
CREATE PROCEDURE sp_student_promote_contract(
    IN p_student_id BIGINT,
    IN p_target_academic_year_id BIGINT,
    IN p_target_semester_id BIGINT,
    IN p_target_section_id BIGINT,
    IN p_eligibility_status VARCHAR(30),
    IN p_remarks VARCHAR(500),
    IN p_degree_conferred TINYINT,
    IN p_degree_conferred_at DATETIME,
    IN p_created_by BIGINT,
    IN p_manage_transaction TINYINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_start DATE DEFAULT NULL;
    DECLARE v_to_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_assignment_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester INT DEFAULT NULL;
    DECLARE v_to_semester_id BIGINT DEFAULT NULL;
    DECLARE v_to_semester INT DEFAULT NULL;
    DECLARE v_to_section_id BIGINT DEFAULT NULL;
    DECLARE v_total_semesters INT DEFAULT NULL;
    DECLARE v_promotion_id BIGINT DEFAULT NULL;
    DECLARE v_promotion_order INT DEFAULT 1;
    DECLARE v_is_graduation TINYINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        IF COALESCE(p_manage_transaction, 1) = 1 THEN
            ROLLBACK;
        END IF;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_created_by IS NULL OR p_created_by <= 0 OR NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.user_id = p_created_by AND u.status = 1 AND u.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    IF COALESCE(p_manage_transaction, 1) = 1 THEN
        START TRANSACTION;
    END IF;

    SELECT s.college_id, s.course_id, s.branch_id, s.academic_year_id, ay.start_date, c.total_semesters
      INTO v_college_id, v_course_id, v_branch_id, v_from_academic_year_id, v_from_academic_year_start, v_total_semesters
    FROM students s
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id AND ay.deleted_at IS NULL
    INNER JOIN courses c ON c.course_id = s.course_id AND c.deleted_at IS NULL
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
      AND s.status = 1
    LIMIT 1
    FOR UPDATE;

    IF v_from_academic_year_id IS NULL OR v_course_id IS NULL OR v_branch_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student academic mapping is incomplete.';
    END IF;

    SELECT ssa.student_section_assignment_id,
           sec.section_id,
           sec.semester_id,
           COALESCE(sec.semester, sem.semester_number)
      INTO v_from_assignment_id, v_from_section_id, v_from_semester_id, v_from_semester
    FROM student_section_assignments ssa
    INNER JOIN sections sec ON sec.section_id = ssa.section_id AND sec.deleted_at IS NULL
    LEFT JOIN semesters sem ON sem.semester_id = sec.semester_id
    WHERE ssa.student_id = p_student_id
      AND ssa.status = 1
    ORDER BY ssa.assigned_at DESC, ssa.student_section_assignment_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_from_assignment_id IS NULL OR v_from_semester IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The student has no active semester/section assignment.';
    END IF;

    SET v_is_graduation = IF(COALESCE(p_degree_conferred, 0) = 1 OR v_from_semester >= v_total_semesters, 1, 0);

    IF p_target_academic_year_id IS NOT NULL THEN
        SET v_to_academic_year_id = p_target_academic_year_id;
    ELSEIF v_is_graduation = 1 OR MOD(v_from_semester, 2) = 1 THEN
        SET v_to_academic_year_id = v_from_academic_year_id;
    ELSE
        SELECT ay.academic_year_id INTO v_to_academic_year_id
        FROM academicyears ay
        WHERE ay.start_date > v_from_academic_year_start
          AND ay.deleted_at IS NULL
          AND ay.is_archived = 0
        ORDER BY ay.start_date, ay.academic_year_id
        LIMIT 1;
    END IF;

    IF v_to_academic_year_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target academic year could not be resolved.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM academicyears ay
        WHERE ay.academic_year_id = v_to_academic_year_id
          AND ay.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TargetAcademicYearId is invalid.';
    END IF;

    IF v_is_graduation = 1 THEN
        SET v_to_semester_id = COALESCE(p_target_semester_id, v_from_semester_id);
        SET v_to_semester = v_from_semester;
        SET v_to_section_id = NULL;
    ELSE
        SET v_to_semester_id = p_target_semester_id;

        IF v_to_semester_id IS NULL THEN
            SELECT sem.semester_id, sem.semester_number
              INTO v_to_semester_id, v_to_semester
            FROM semesters sem
            WHERE sem.branch_id = v_branch_id
              AND sem.semester_number = v_from_semester + 1
              AND sem.status = 1
              AND sem.is_archived = 0
            ORDER BY sem.semester_id
            LIMIT 1;
        ELSE
            SELECT sem.semester_number
              INTO v_to_semester
            FROM semesters sem
            WHERE sem.semester_id = v_to_semester_id
              AND sem.branch_id = v_branch_id
              AND sem.status = 1
              AND sem.is_archived = 0
            LIMIT 1;
        END IF;

        IF v_to_semester_id IS NULL OR v_to_semester IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TargetSemesterId is invalid for the student branch.';
        END IF;

        IF v_to_semester <> v_from_semester + 1 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target semester must be the immediate next semester.';
        END IF;

        SET v_to_section_id = p_target_section_id;

        IF v_to_section_id IS NULL THEN
            SELECT sec.section_id
              INTO v_to_section_id
            FROM sections sec
            WHERE sec.college_id = v_college_id
              AND sec.academic_year_id = v_to_academic_year_id
              AND sec.course_id = v_course_id
              AND sec.branch_id = v_branch_id
              AND (sec.semester_id = v_to_semester_id OR sec.semester = v_to_semester)
              AND sec.status = 1
              AND sec.is_archived = 0
              AND sec.deleted_at IS NULL
              AND (SELECT COUNT(*) FROM student_section_assignments x WHERE x.section_id = sec.section_id AND x.status = 1) < sec.capacity
            ORDER BY sec.section_id
            LIMIT 1
            FOR UPDATE;
        ELSE
            IF NOT EXISTS (
                SELECT 1 FROM sections sec
                WHERE sec.section_id = v_to_section_id
                  AND sec.college_id = v_college_id
                  AND sec.academic_year_id = v_to_academic_year_id
                  AND sec.course_id = v_course_id
                  AND sec.branch_id = v_branch_id
                  AND (sec.semester_id = v_to_semester_id OR sec.semester = v_to_semester)
                  AND sec.status = 1
                  AND sec.is_archived = 0
                  AND sec.deleted_at IS NULL
                  AND (SELECT COUNT(*) FROM student_section_assignments x WHERE x.section_id = sec.section_id AND x.status = 1) < sec.capacity
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TargetSectionId is invalid, inactive, mismatched, or full.';
            END IF;
        END IF;

        IF v_to_section_id IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No valid target section with capacity is available.';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = v_from_academic_year_id
          AND sp.from_semester = v_from_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND sp.promotion_status IN ('PENDING','APPROVED')
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This student already has a promotion record for the current semester.';
    END IF;

    SELECT COALESCE(MAX(sp.promotion_order), 0) + 1
      INTO v_promotion_order
    FROM student_promotions sp
    WHERE sp.student_id = p_student_id AND sp.deleted_at IS NULL;

    INSERT INTO student_promotions (
        student_id, college_id,
        from_academic_year_id, to_academic_year_id,
        from_course_id, to_course_id,
        from_branch_id, to_branch_id,
        from_section_id, to_section_id,
        from_semester, from_semester_id,
        to_semester, to_semester_id,
        promotion_status, decision, decision_date, decision_by,
        remarks, promotion_eligibility, eligibility_remarks,
        promotion_type, promotion_date, effective_date,
        promotion_reason, approved_at, is_final, promotion_order,
        is_active, created_at, created_by
    ) VALUES (
        p_student_id, v_college_id,
        v_from_academic_year_id, v_to_academic_year_id,
        v_course_id, v_course_id,
        v_branch_id, v_branch_id,
        v_from_section_id, v_to_section_id,
        v_from_semester, v_from_semester_id,
        v_to_semester, v_to_semester_id,
        'APPROVED', 'APPROVE', UTC_TIMESTAMP(), p_created_by,
        NULLIF(TRIM(p_remarks), ''),
        UPPER(COALESCE(NULLIF(TRIM(p_eligibility_status),''),'ELIGIBLE')),
        CASE WHEN v_is_graduation = 1 THEN 'Degree requirements completed.' ELSE 'Promotion approved.' END,
        CASE WHEN v_is_graduation = 1 THEN 'GRADUATION' ELSE 'SEMESTER' END,
        UTC_TIMESTAMP(), UTC_TIMESTAMP(),
        CASE WHEN v_is_graduation = 1 THEN 'Degree conferred after final semester.' ELSE 'Academic progression.' END,
        UTC_TIMESTAMP(), v_is_graduation, v_promotion_order,
        1, UTC_TIMESTAMP(), p_created_by
    );

    SET v_promotion_id = LAST_INSERT_ID();

    UPDATE student_section_assignments
    SET status = 0, removed_at = UTC_TIMESTAMP(), removed_by = p_created_by
    WHERE student_section_assignment_id = v_from_assignment_id AND status = 1;

    IF v_is_graduation = 0 THEN
        INSERT INTO student_section_assignments(student_id, section_id, academic_year_id, status, assigned_at, assigned_by)
        VALUES(p_student_id, v_to_section_id, v_to_academic_year_id, 1, UTC_TIMESTAMP(), p_created_by);
    END IF;

    UPDATE students
    SET academic_year_id = v_to_academic_year_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_created_by
    WHERE student_id = p_student_id AND deleted_at IS NULL;

    IF COALESCE(p_manage_transaction, 1) = 1 THEN
        COMMIT;
    END IF;

    SELECT
        sp.promotion_id AS PromotionId,
        sp.student_id AS StudentId,
        st.full_name AS StudentName,
        sp.from_branch_id AS BranchId,
        sp.from_academic_year_id AS AcademicYearId,
        sp.from_semester AS CurrentSemester,
        sp.to_semester AS NextSemester,
        sp.promotion_eligibility AS EligibilityStatus,
        sp.promotion_status AS PromotionStatus,
        sp.remarks AS Remarks,
        sp.created_at AS CreatedAt,
        sp.from_academic_year_id AS FromAcademicYearId,
        fay.academic_year_name AS FromAcademicYearName,
        sp.to_academic_year_id AS ToAcademicYearId,
        tay.academic_year_name AS ToAcademicYearName,
        sp.from_course_id AS FromCourseId,
        sp.to_course_id AS ToCourseId,
        sp.from_branch_id AS FromBranchId,
        sp.to_branch_id AS ToBranchId,
        sp.decision AS Decision,
        sp.promotion_eligibility AS PromotionEligibility,
        sp.promotion_type AS PromotionType,
        sp.promotion_date AS PromotionDate,
        sp.effective_date AS EffectiveDate,
        sp.to_academic_year_id AS TargetAcademicYearId,
        sp.to_semester_id AS TargetSemesterId,
        sp.to_section_id AS TargetSectionId,
        IF(sp.promotion_type='GRADUATION', TRUE, FALSE) AS IsGraduated,
        IF(sp.promotion_type='GRADUATION', TRUE, FALSE) AS DegreeConferred,
        CASE WHEN sp.promotion_type='GRADUATION' THEN COALESCE(p_degree_conferred_at, sp.effective_date) ELSE NULL END AS DegreeConferredAt
    FROM student_promotions sp
    INNER JOIN students st ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay ON tay.academic_year_id = sp.to_academic_year_id
    WHERE sp.promotion_id = v_promotion_id;
END$$

DELIMITER ;
