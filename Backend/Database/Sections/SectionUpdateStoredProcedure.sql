-- =============================================================
-- MISSING SECTION UPDATE PROCEDURE
-- Required by SectionRepository.UpdateAsync; absent from dump3even.sql.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_section_update`;
DELIMITER $$

CREATE PROCEDURE `sp_section_update`(
    IN p_section_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester BIGINT,
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
    DECLARE v_department_id BIGINT DEFAULT NULL;
    DECLARE v_current_strength INT DEFAULT 0;
    DECLARE v_semester_number INT DEFAULT NULL;

    SELECT s.`college_id`, s.`department_id`
    INTO v_college_id, v_department_id
    FROM `sections` s
    WHERE s.`section_id` = p_section_id
      AND s.`is_archived` = 0
      AND s.`deleted_at` IS NULL
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

    IF NOT EXISTS (
        SELECT 1 FROM `courses` c
        WHERE c.`course_id` = p_course_id
          AND c.`college_id` = v_college_id
          AND c.`department_id` = v_department_id
          AND c.`status` = 1 AND c.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course does not belong to the section college and department.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `branches` b
        WHERE b.`branch_id` = p_branch_id
          AND b.`course_id` = p_course_id
          AND b.`department_id` = v_department_id
          AND b.`status` = 1 AND b.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch does not belong to the selected course.';
    END IF;

    SELECT sem.`semester_number`
    INTO v_semester_number
    FROM `semesters` sem
    WHERE sem.`semester_id` = p_semester
      AND sem.`course_id` = p_course_id
      AND sem.`branch_id` = p_branch_id
      AND sem.`status` = 1
      AND sem.`is_archived` = 0
    LIMIT 1;

    IF v_semester_number IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Semester does not match the selected course and branch.';
    END IF;

    IF p_class_teacher_employee_profile_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM `employee_profiles` ep
        INNER JOIN `users` u ON u.`user_id` = ep.`user_id`
        WHERE ep.`employee_profile_id` = p_class_teacher_employee_profile_id
          AND ep.`status` = 1
          AND ep.`deleted_at` IS NULL
          AND u.`status` = 1
          AND u.`deleted_at` IS NULL
          AND (u.`college_id` = v_college_id OR u.`college_id` IS NULL)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class teacher is unavailable for this college.';
    END IF;

    SELECT COUNT(*) INTO v_current_strength
    FROM `student_section_assignments` ssa
    WHERE ssa.`section_id` = p_section_id AND ssa.`status` = 1;

    IF p_capacity < v_current_strength THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacity cannot be below the current student strength.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM `sections` duplicate_section
        WHERE duplicate_section.`section_id` <> p_section_id
          AND duplicate_section.`academic_year_id` = p_academic_year_id
          AND duplicate_section.`department_id` = v_department_id
          AND duplicate_section.`course_id` = p_course_id
          AND duplicate_section.`branch_id` = p_branch_id
          AND duplicate_section.`semester_id` = p_semester
          AND LOWER(TRIM(duplicate_section.`section_code`)) = LOWER(TRIM(p_section_code))
          AND duplicate_section.`is_archived` = 0
          AND duplicate_section.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section code already exists for the selected semester.';
    END IF;

    UPDATE `sections`
    SET `course_id` = p_course_id,
        `branch_id` = p_branch_id,
        `academic_year_id` = p_academic_year_id,
        `semester` = v_semester_number,
        `semester_id` = p_semester,
        `section_name` = TRIM(p_section_name),
        `section_code` = TRIM(p_section_code),
        `capacity` = p_capacity,
        `class_teacher_employee_profile_id` = p_class_teacher_employee_profile_id,
        `room` = NULLIF(TRIM(p_room), ''),
        `shift` = NULLIF(TRIM(p_shift), ''),
        `section_type` = NULLIF(TRIM(p_section_type), ''),
        `status` = IF(COALESCE(p_status, 0) = 1, 1, 0),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by
    WHERE `section_id` = p_section_id
      AND `is_archived` = 0
      AND `deleted_at` IS NULL;

    SELECT 1 AS `AffectedRows`;
END$$

DELIMITER ;
