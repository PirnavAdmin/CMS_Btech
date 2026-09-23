-- =============================================================
-- ATOMIC STUDENT ACADEMIC PROGRESSION + PROMOTION HISTORY
-- MySQL 8.x / database: cms_btech
--
-- The student row, active section assignment and promotion history
-- are changed in one transaction. Any validation/database failure
-- rolls back every change.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_student_promote`;
DELIMITER $$

CREATE PROCEDURE `sp_student_promote`(
    IN p_student_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_to_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_start DATE DEFAULT NULL;
    DECLARE v_course_type VARCHAR(50) DEFAULT NULL;
    DECLARE v_total_semesters INT DEFAULT NULL;
    DECLARE v_from_assignment_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_id BIGINT DEFAULT NULL;
    DECLARE v_to_section_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester INT DEFAULT NULL;
    DECLARE v_to_semester INT DEFAULT NULL;
    DECLARE v_target_level_number INT DEFAULT NULL;
    DECLARE v_promotion_id BIGINT DEFAULT NULL;
    DECLARE v_promotion_order INT DEFAULT 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_created_by IS NULL OR p_created_by <= 0 OR NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.user_id = p_created_by
          AND u.status = 1
          AND u.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    START TRANSACTION;

    -- Lock the student and its current academic context.
    SELECT
        s.college_id,
        s.course_id,
        s.branch_id,
        s.academic_year_id,
        ay.start_date,
        c.course_type,
        c.total_semesters
    INTO
        v_college_id,
        v_course_id,
        v_branch_id,
        v_from_academic_year_id,
        v_from_academic_year_start,
        v_course_type,
        v_total_semesters
    FROM students s
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
       AND ay.deleted_at IS NULL
    INNER JOIN courses c
        ON c.course_id = s.course_id
       AND c.status = 1
       AND c.deleted_at IS NULL
    WHERE s.student_id = p_student_id
      AND s.status = 1
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_from_academic_year_id IS NULL OR v_course_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student, course, or academic year is unavailable.';
    END IF;

    -- The active assignment is the authoritative semester/section.
    SELECT
        ssa.student_section_assignment_id,
        sec.section_id,
        COALESCE(sec.semester, sem.semester_number)
    INTO
        v_from_assignment_id,
        v_from_section_id,
        v_from_semester
    FROM student_section_assignments ssa
    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.status = 1
       AND sec.is_archived = 0
       AND sec.deleted_at IS NULL
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0
    WHERE ssa.student_id = p_student_id
      AND ssa.academic_year_id = v_from_academic_year_id
      AND ssa.status = 1
    ORDER BY ssa.assigned_at DESC,
             ssa.student_section_assignment_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_from_assignment_id IS NULL OR v_from_semester IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The student has no active semester/section assignment.';
    END IF;

    IF v_from_semester <= 0 OR v_from_semester >= v_total_semesters THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The student is already in the final semester or has an invalid semester.';
    END IF;

    SET v_to_semester = v_from_semester + 1;

    -- Two semesters share an academic year. Crossing an even semester
    -- requires the next configured active academic year.
    IF MOD(v_from_semester, 2) = 1 THEN
        SET v_to_academic_year_id = v_from_academic_year_id;
    ELSE
        SELECT ay.academic_year_id
        INTO v_to_academic_year_id
        FROM academicyears ay
        WHERE ay.start_date > v_from_academic_year_start
          AND ay.status = 1
          AND ay.is_archived = 0
          AND ay.deleted_at IS NULL
        ORDER BY ay.start_date ASC, ay.academic_year_id ASC
        LIMIT 1
        FOR UPDATE;

        IF v_to_academic_year_id IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Activate the next academic year before cross-year promotion.';
        END IF;
    END IF;

    SET v_target_level_number = CEIL(v_to_semester / 2.0);

    IF NOT EXISTS (
        SELECT 1
        FROM academic_levels al
        WHERE al.academic_year_id = v_to_academic_year_id
          AND al.level_number = v_target_level_number
          AND al.level_type = v_course_type
          AND al.status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The target academic level is not configured.';
    END IF;

    -- Choose an active target section with capacity and lock it.
    SELECT sec.section_id
    INTO v_to_section_id
    FROM sections sec
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0
    WHERE sec.college_id = v_college_id
      AND sec.academic_year_id = v_to_academic_year_id
      AND sec.course_id = v_course_id
      AND sec.branch_id <=> v_branch_id
      AND COALESCE(sec.semester, sem.semester_number) = v_to_semester
      AND sec.status = 1
      AND sec.is_archived = 0
      AND sec.deleted_at IS NULL
      AND (
          SELECT COUNT(*)
          FROM student_section_assignments target_ssa
          WHERE target_ssa.section_id = sec.section_id
            AND target_ssa.status = 1
      ) < sec.capacity
    ORDER BY
        (
            SELECT COUNT(*)
            FROM student_section_assignments target_ssa
            WHERE target_ssa.section_id = sec.section_id
              AND target_ssa.status = 1
        ) ASC,
        sec.section_id ASC
    LIMIT 1
    FOR UPDATE;

    IF v_to_section_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No active target-semester section with capacity is configured.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = v_from_academic_year_id
          AND sp.to_academic_year_id = v_to_academic_year_id
          AND sp.from_semester = v_from_semester
          AND sp.to_semester = v_to_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND sp.promotion_status IN ('PENDING', 'APPROVED')
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'This semester promotion is already recorded.';
    END IF;

    SELECT COALESCE(MAX(sp.promotion_order), 0) + 1
    INTO v_promotion_order
    FROM student_promotions sp
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL;

    -- History, assignment movement, and student context are one unit.
    INSERT INTO student_promotions (
        student_id,
        college_id,
        from_academic_year_id,
        to_academic_year_id,
        from_course_id,
        to_course_id,
        from_branch_id,
        to_branch_id,
        from_section_id,
        to_section_id,
        from_semester,
        to_semester,
        promotion_status,
        decision,
        decision_date,
        decision_by,
        remarks,
        promotion_eligibility,
        eligibility_remarks,
        promotion_type,
        promotion_date,
        effective_date,
        promotion_reason,
        approved_at,
        is_final,
        promotion_order,
        is_active,
        created_at,
        created_by
    ) VALUES (
        p_student_id,
        v_college_id,
        v_from_academic_year_id,
        v_to_academic_year_id,
        v_course_id,
        v_course_id,
        v_branch_id,
        v_branch_id,
        v_from_section_id,
        v_to_section_id,
        v_from_semester,
        v_to_semester,
        'APPROVED',
        'APPROVE',
        UTC_TIMESTAMP(),
        p_created_by,
        'Student academic progression completed.',
        'ELIGIBLE',
        'Approved by an authorized user.',
        CASE
            WHEN v_to_academic_year_id = v_from_academic_year_id
                THEN 'SEMESTER'
            ELSE 'ACADEMIC_YEAR'
        END,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP(),
        'Academic progression.',
        UTC_TIMESTAMP(),
        IF(v_to_semester = v_total_semesters, 1, 0),
        v_promotion_order,
        1,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_promotion_id = LAST_INSERT_ID();

    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_created_by
    WHERE student_section_assignment_id = v_from_assignment_id
      AND status = 1;

    INSERT INTO student_section_assignments (
        student_id,
        section_id,
        academic_year_id,
        status,
        assigned_at,
        assigned_by
    ) VALUES (
        p_student_id,
        v_to_section_id,
        v_to_academic_year_id,
        1,
        UTC_TIMESTAMP(),
        p_created_by
    );

    UPDATE students
    SET academic_year_id = v_to_academic_year_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_created_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student academic progression could not be updated.';
    END IF;

    COMMIT;

    -- PascalCase columns support Dapper; snake_case aliases preserve the
    -- older StudentRepository reader contract. No existing caller is removed.
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

        sp.promotion_id AS promotion_id,
        sp.student_id AS student_id,
        sp.from_academic_year_id AS from_academic_year_id,
        fay.academic_year_name AS from_academic_year_name,
        sp.to_academic_year_id AS to_academic_year_id,
        tay.academic_year_name AS to_academic_year_name,
        sp.from_course_id AS from_course_id,
        sp.to_course_id AS to_course_id,
        sp.from_branch_id AS from_branch_id,
        sp.to_branch_id AS to_branch_id,
        sp.promotion_status AS promotion_status,
        sp.decision AS decision,
        sp.promotion_eligibility AS promotion_eligibility,
        sp.promotion_type AS promotion_type,
        sp.promotion_date AS promotion_date,
        sp.effective_date AS effective_date,
        sp.remarks AS remarks
    FROM student_promotions sp
    INNER JOIN students st
        ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay
        ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay
        ON tay.academic_year_id = sp.to_academic_year_id
    WHERE sp.promotion_id = v_promotion_id;
END$$

DELIMITER ;

-- Configuration prerequisites for a successful call:
-- 1. The target academic level exists and is active.
-- 2. An active target-semester section with available capacity exists.
-- 3. For even-to-odd semester progression, the next academic year is active.
-- CALL sp_student_promote(1, 1);
