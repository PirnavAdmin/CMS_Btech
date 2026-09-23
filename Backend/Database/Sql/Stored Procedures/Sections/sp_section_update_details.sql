DROP PROCEDURE IF EXISTS sp_section_update_details;
DELIMITER $$
CREATE PROCEDURE sp_section_update_details(
    IN p_section_id BIGINT,
    IN p_section_name VARCHAR(100),
    IN p_section_code VARCHAR(20),
    IN p_capacity INT,
    IN p_class_teacher_employee_profile_id BIGINT,
    IN p_room VARCHAR(100),
    IN p_shift VARCHAR(30),
    IN p_section_type VARCHAR(50),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_department_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_semester_id BIGINT DEFAULT NULL;
    DECLARE v_current_strength INT DEFAULT 0;

    SELECT
        s.college_id,
        s.academic_year_id,
        s.department_id,
        s.course_id,
        s.branch_id,
        s.semester_id
    INTO
        v_college_id,
        v_academic_year_id,
        v_department_id,
        v_course_id,
        v_branch_id,
        v_semester_id
    FROM sections s
    WHERE s.section_id = p_section_id
      AND s.is_archived = 0
      AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    IF NULLIF(TRIM(p_section_name), '') IS NULL
       OR NULLIF(TRIM(p_section_code), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section name and section code are required.';
    END IF;

    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section capacity must be greater than zero.';
    END IF;

    SELECT COUNT(*)
    INTO v_current_strength
    FROM student_section_assignments ssa
    WHERE ssa.section_id = p_section_id
      AND ssa.status = 1;

    IF p_capacity < v_current_strength THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacity cannot be below the current student strength.';
    END IF;

    IF p_class_teacher_employee_profile_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM employee_profiles ep
        INNER JOIN users u ON u.user_id = ep.user_id
        WHERE ep.employee_profile_id = p_class_teacher_employee_profile_id
          AND ep.status = 1
          AND ep.deleted_at IS NULL
          AND u.status = 1
          AND u.deleted_at IS NULL
          AND (u.college_id = v_college_id OR u.college_id IS NULL)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class teacher is unavailable for this college.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM sections duplicate_section
        WHERE duplicate_section.section_id <> p_section_id
          AND duplicate_section.academic_year_id = v_academic_year_id
          AND duplicate_section.department_id = v_department_id
          AND duplicate_section.course_id = v_course_id
          AND duplicate_section.branch_id = v_branch_id
          AND duplicate_section.semester_id <=> v_semester_id
          AND LOWER(TRIM(duplicate_section.section_code COLLATE utf8mb4_unicode_ci)) = LOWER(TRIM(p_section_code COLLATE utf8mb4_unicode_ci))
          AND duplicate_section.is_archived = 0
          AND duplicate_section.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section code already exists for the selected semester.';
    END IF;

    UPDATE sections
    SET section_name = TRIM(p_section_name),
        section_code = TRIM(p_section_code),
        capacity = p_capacity,
        class_teacher_employee_profile_id = p_class_teacher_employee_profile_id,
        room = NULLIF(TRIM(p_room), ''),
        shift = NULLIF(TRIM(p_shift), ''),
        section_type = NULLIF(TRIM(p_section_type), ''),
        status = IF(COALESCE(p_status, status) = 1, 1, 0),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND is_archived = 0
      AND deleted_at IS NULL;

    SELECT 1 AS AffectedRows;
END$$
DELIMITER ;
