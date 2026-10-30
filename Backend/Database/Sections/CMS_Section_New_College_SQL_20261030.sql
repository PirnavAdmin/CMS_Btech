-- CMS: new-college section creation fix (2026-10-30)
-- Run in MySQL Workbench against the existing cms_btech database.
-- This is an update script, not a database dump or an EF migration.
-- No business records are deleted and no IDs or semester mappings are changed.
-- DATA CHANGE: restore XYZ college 95 / year 45 (2026-2027), which its semesters use;
-- return future year 51 to upcoming; activate SRI college 92 / current year 39.
-- These repairs use the supplied dump's IDs PLUS college/date identity checks.
-- Archived older years, unrelated colleges and permissions are untouched.
USE `cms_btech`;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Updated source: Database/Sql/Stored Procedures/Sections/sp_section_create.sql
DROP PROCEDURE IF EXISTS sp_section_create;

DELIMITER $$

CREATE PROCEDURE sp_section_create
(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_section_code VARCHAR(20),
    IN p_section_name VARCHAR(100),
    IN p_capacity INT,
    IN p_created_by BIGINT
)
BEGIN

    /* =====================================================
       BASIC VALIDATION
       ===================================================== */

    IF p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College is required.';
    END IF;

    IF p_academic_year_id IS NULL OR p_academic_year_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year is required.';
    END IF;

    IF p_department_id IS NOT NULL AND p_department_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department ID must be positive when supplied, or null.';
    END IF;

    IF p_course_id IS NULL OR p_course_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course is required.';
    END IF;

    IF p_branch_id IS NULL OR p_branch_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Branch is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester is required.';
    END IF;

    IF p_section_code IS NULL
       OR TRIM(p_section_code) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section code is required.';
    END IF;

    IF p_section_name IS NULL
       OR TRIM(p_section_name) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section name is required.';
    END IF;

    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section capacity must be greater than zero.';
    END IF;


    /* =====================================================
       COLLEGE
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
          AND status = 1
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College does not exist or is inactive.';

    END IF;


    /* =====================================================
       ACADEMIC YEAR
       ===================================================== */

    -- Validate ownership separately from activation so the response is actionable.
    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year does not belong to the selected college or has been deleted.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND college_id = p_college_id
          AND status = 1 AND is_archived = 0 AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Activate the selected academic year in Academic Years for this college before creating sections.';
    END IF;


    /* =====================================================
       OPTIONAL DEPARTMENT → COLLEGE
       ===================================================== */

    IF p_department_id IS NOT NULL AND NOT EXISTS
    (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND college_id = p_college_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Department does not belong to the selected college.';

    END IF;


    /* =====================================================
       COURSE → COLLEGE
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Course does not belong to the selected college.';

    END IF;


    /* =====================================================
       BRANCH → COURSE
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Branch does not belong to the selected course.';

    END IF;


    /* =====================================================
       SEMESTER → BRANCH
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM semesters
        WHERE semester_id = p_semester_id
          AND course_id = p_course_id
          AND academic_year_id = p_academic_year_id
          AND branch_id = p_branch_id
          AND status = 1
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Semester does not match the selected course, branch and academic year.';

    END IF;


    /* =====================================================
       DUPLICATE SECTION
       ===================================================== */

    IF EXISTS
    (
        SELECT 1
        FROM sections
        WHERE college_id = p_college_id
          AND academic_year_id = p_academic_year_id
          AND course_id = p_course_id
          AND branch_id = p_branch_id
          AND semester_id = p_semester_id
          AND LOWER(TRIM(section_code)) COLLATE utf8mb4_0900_ai_ci
              = LOWER(TRIM(p_section_code)) COLLATE utf8mb4_0900_ai_ci
          AND is_archived = 0
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section code already exists for the selected semester.';

    END IF;


    /* =====================================================
       INSERT
       ===================================================== */

    INSERT INTO sections
    (
        college_id,
        academic_year_id,
        department_id,
        course_id,
        branch_id,
        semester_id,
        section_code,
        section_name,
        capacity,
        status,
        is_archived,
        created_at,
        created_by
    )
    VALUES
    (
        p_college_id,
        p_academic_year_id,
        p_department_id,
        p_course_id,
        p_branch_id,
        p_semester_id,
        TRIM(p_section_code),
        TRIM(p_section_name),
        p_capacity,
        1,
        0,
        UTC_TIMESTAMP(),
        p_created_by
    );


    SELECT LAST_INSERT_ID() AS SectionId;

END$$

DELIMITER ;

-- Updated source: Database/Sql/Stored Procedures/Sections/sp_section_update.sql
DROP PROCEDURE IF EXISTS sp_section_update;
DELIMITER $$
CREATE PROCEDURE sp_section_update(
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
    DECLARE v_current_strength INT DEFAULT 0;
    DECLARE v_semester_number INT DEFAULT NULL;

    SELECT s.`college_id`
    INTO v_college_id
    FROM `sections` s
    WHERE s.`section_id` = p_section_id
      AND s.`is_archived` = 0
      AND s.`deleted_at` IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section not found.';
    END IF;
    IF NULLIF(TRIM((p_section_name COLLATE utf8mb4_0900_ai_ci)), '') IS NULL
       OR NULLIF(TRIM((p_section_code COLLATE utf8mb4_0900_ai_ci)), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section name and section code are required.';
    END IF;
    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section capacity must be greater than zero.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND college_id = v_college_id
          AND status = 1 AND is_archived = 0 AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Activate the selected academic year for this college before changing the section academic mapping.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `courses` c
        WHERE c.`course_id` = p_course_id
          AND c.`college_id` = v_college_id
          AND c.`status` = 1 AND c.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course does not belong to the section college.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `branches` b
        WHERE b.`branch_id` = p_branch_id
          AND b.`course_id` = p_course_id
          AND b.`status` = 1 AND b.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch does not belong to the selected course.';
    END IF;

    SELECT sem.`semester_number`
    INTO v_semester_number
    FROM `semesters` sem
    WHERE sem.`semester_id` = p_semester
      AND sem.`academic_year_id` = p_academic_year_id
      AND sem.`course_id` = p_course_id
      AND sem.`branch_id` = p_branch_id
      AND sem.`status` = 1
      AND sem.`is_archived` = 0
    LIMIT 1;

    IF v_semester_number IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Semester does not match the selected course, branch and academic year.';
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
          AND duplicate_section.`college_id` = v_college_id
          AND duplicate_section.`academic_year_id` = p_academic_year_id
          AND duplicate_section.`course_id` = p_course_id
          AND duplicate_section.`branch_id` = p_branch_id
          AND duplicate_section.`semester_id` = p_semester
          AND LOWER(TRIM(duplicate_section.`section_code`)) COLLATE utf8mb4_0900_ai_ci = LOWER(TRIM((p_section_code COLLATE utf8mb4_0900_ai_ci)))
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
        `section_name` = TRIM((p_section_name COLLATE utf8mb4_0900_ai_ci)),
        `section_code` = TRIM((p_section_code COLLATE utf8mb4_0900_ai_ci)),
        `capacity` = p_capacity,
        `class_teacher_employee_profile_id` = p_class_teacher_employee_profile_id,
        `room` = NULLIF(TRIM((p_room COLLATE utf8mb4_0900_ai_ci)), ''),
        `shift` = NULLIF(TRIM((p_shift COLLATE utf8mb4_0900_ai_ci)), ''),
        `section_type` = NULLIF(TRIM((p_section_type COLLATE utf8mb4_0900_ai_ci)), ''),
        `status` = IF(COALESCE(p_status, 0) = 1, 1, 0),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by
    WHERE `section_id` = p_section_id
      AND `is_archived` = 0
      AND `deleted_at` IS NULL;

    SELECT 1 AS `AffectedRows`;
END$$
DELIMITER ;



-- Apply the narrowly scoped data repair atomically. Stop on errors.
DROP PROCEDURE IF EXISTS sp_cms_repair_section_year_20261030;
DELIMITER $$
CREATE PROCEDURE sp_cms_repair_section_year_20261030()
BEGIN
    DECLARE v_lock BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    -- Use the same parent-row lock as the updated backend's year creation/activation.
    SELECT college_id INTO v_lock FROM colleges WHERE college_id = 92 FOR UPDATE;
    SELECT college_id INTO v_lock FROM colleges WHERE college_id = 95 FOR UPDATE;

    IF EXISTS (
        SELECT 1 FROM colleges c JOIN academicyears ay ON ay.college_id = c.college_id
        WHERE c.college_id = 95 AND UPPER(TRIM(c.college_code)) = 'XYZ'
          AND c.status = 1 AND c.deleted_at IS NULL
          AND ay.academic_year_id = 45 AND ay.start_date = '2026-10-30'
          AND ay.end_date = '2027-10-30' AND ay.deleted_at IS NULL
          AND CURRENT_DATE() BETWEEN ay.start_date AND ay.end_date
    ) THEN
        IF EXISTS (
            SELECT 1 FROM academicyears WHERE college_id = 95 AND status = 1
              AND is_archived = 0 AND deleted_at IS NULL
              AND academic_year_id NOT IN (45, 51)
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'XYZ has a different active year. Review academic years before applying this repair.';
        END IF;
        IF EXISTS (
            SELECT 1 FROM academicyears WHERE academic_year_id = 51 AND college_id = 95
              AND status = 1 AND is_archived = 0 AND deleted_at IS NULL
              AND start_date <= CURRENT_DATE()
        ) OR EXISTS (
            SELECT 1 FROM sections WHERE college_id = 95 AND academic_year_id = 51
              AND deleted_at IS NULL
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'XYZ future year is already in use. Review before switching its active year.';
        END IF;

        -- Demote only the future year seen in the dump; keep it available as Upcoming.
        UPDATE academicyears
        SET status = 0, is_archived = 0, updated_at = UTC_TIMESTAMP()
        WHERE academic_year_id = 51 AND college_id = 95 AND status = 1
          AND is_archived = 0 AND deleted_at IS NULL AND start_date > CURRENT_DATE();

        -- Restore the exact current year used by XYZ's existing semesters.
        UPDATE academicyears
        SET status = 1, is_archived = 0, updated_at = UTC_TIMESTAMP()
        WHERE academic_year_id = 45 AND college_id = 95 AND deleted_at IS NULL
          AND (status <> 1 OR is_archived <> 0);
    END IF;

    -- The second screenshot's SRI college: activate its current, unarchived year
    -- only when it has no active year. Never replace a later manual selection.
    IF EXISTS (
        SELECT 1 FROM colleges c JOIN academicyears ay ON ay.college_id = c.college_id
        WHERE c.college_id = 92 AND UPPER(TRIM(c.college_code)) = 'STAS'
          AND c.status = 1 AND c.deleted_at IS NULL
          AND ay.academic_year_id = 39 AND ay.start_date = '2026-10-29'
          AND ay.end_date = '2027-10-29' AND ay.is_archived = 0 AND ay.deleted_at IS NULL
          AND CURRENT_DATE() BETWEEN ay.start_date AND ay.end_date
    ) AND NOT EXISTS (
        SELECT 1 FROM academicyears WHERE college_id = 92 AND status = 1
          AND is_archived = 0 AND deleted_at IS NULL
    ) THEN
        UPDATE academicyears
        SET status = 1, updated_at = UTC_TIMESTAMP()
        WHERE academic_year_id = 39 AND college_id = 92 AND is_archived = 0 AND deleted_at IS NULL;
    END IF;
    COMMIT;
END$$
DELIMITER ;
CALL sp_cms_repair_section_year_20261030();
DROP PROCEDURE IF EXISTS sp_cms_repair_section_year_20261030;

-- Expected for the supplied dump: SRI 92/year 39 active; XYZ 95/year 45 active;
-- XYZ year 51 remains in the database with status=0 and is_archived=0.
SELECT c.college_id, c.college_name, ay.academic_year_id, ay.academic_year_name,
       ay.status, ay.is_archived, ay.start_date, ay.end_date
FROM colleges c JOIN academicyears ay ON ay.college_id = c.college_id
WHERE c.college_id IN (92, 95) AND ay.deleted_at IS NULL
ORDER BY c.college_id, ay.academic_year_id;

-- Readiness diagnostic: the existing semester IDs now use the active college year.
SELECT c.college_id, c.college_name, sem.semester_id, sem.semester_name,
       sem.course_id, sem.branch_id, sem.academic_year_id,
       CASE WHEN ay.college_id = c.college_id AND ay.status = 1
                 AND ay.is_archived = 0 AND ay.deleted_at IS NULL
            THEN 'READY' ELSE 'Activate the semester academic year in this college' END AS section_year_readiness
FROM semesters sem JOIN courses co ON co.course_id = sem.course_id
JOIN colleges c ON c.college_id = co.college_id
LEFT JOIN academicyears ay ON ay.academic_year_id = sem.academic_year_id
WHERE c.college_id IN (92, 95) AND sem.status = 1 AND sem.is_archived = 0
ORDER BY c.college_id, sem.branch_id, sem.semester_number;
