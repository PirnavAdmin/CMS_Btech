-- CMS BTech: Section Department Optional Fix (2026-10-01)
-- Incremental patch for the supplied sql dump(1).sql; no full-dump import required.
-- Apply AFTER previously required database updates, with backend stopped.
-- Execute the whole file in MySQL Workbench; stop on the first error.
-- No section data is deleted, renamed, or assigned a dummy department.


-- Select the existing database before applying this patch. MySQL 8.0.13+.
USE cms_btech;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- This helper is rerunnable and changes no existing section data.
-- It refuses to guess how to merge conflicting live sections.
DROP PROCEDURE IF EXISTS sp_apply_section_optional_department_20261001;
DELIMITER $$
CREATE PROCEDURE sp_apply_section_optional_department_20261001()
BEGIN
    DECLARE v_ddl LONGTEXT;
    IF EXISTS (
        SELECT 1 FROM sections
        WHERE is_archived = 0 AND deleted_at IS NULL
        GROUP BY college_id, academic_year_id, COALESCE(course_id,0),
                 COALESCE(branch_id,0), COALESCE(semester_id,0),
                 LOWER(TRIM(section_code)) COLLATE utf8mb4_0900_ai_ci
        HAVING COUNT(*) > 1
    ) THEN
        SELECT college_id, academic_year_id, course_id, branch_id, semester_id,
               LOWER(TRIM(section_code)) COLLATE utf8mb4_0900_ai_ci AS duplicate_code,
               GROUP_CONCAT(section_id ORDER BY section_id) AS section_ids
        FROM sections
        WHERE is_archived = 0 AND deleted_at IS NULL
        GROUP BY college_id, academic_year_id, course_id, branch_id, semester_id,
                 LOWER(TRIM(section_code)) COLLATE utf8mb4_0900_ai_ci
        HAVING COUNT(*) > 1;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Duplicate section codes exist in the same academic scope. Resolve the listed records and rerun this patch.';
    END IF;

    SET v_ddl = 'ALTER TABLE sections MODIFY COLUMN department_id BIGINT NULL DEFAULT NULL';
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'sections'
          AND column_name = 'section_code_active_key'
    ) THEN
        SET v_ddl = CONCAT(v_ddl,
            ', ADD COLUMN section_code_active_key VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
            ' GENERATED ALWAYS AS (CASE WHEN is_archived = 0 AND deleted_at IS NULL',
            ' THEN LOWER(TRIM(section_code)) ELSE NULL END) VIRTUAL');
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'sections'
          AND index_name = 'uq_section_code'
    ) THEN
        SET v_ddl = CONCAT(v_ddl, ', DROP INDEX uq_section_code');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'sections'
          AND index_name = 'uq_sections_scope_code'
    ) THEN
        SET v_ddl = CONCAT(v_ddl,
            ', ADD UNIQUE KEY uq_sections_scope_code (college_id, academic_year_id,',
            ' (COALESCE(course_id,0)), (COALESCE(branch_id,0)), (COALESCE(semester_id,0)), section_code_active_key)');
    END IF;

    -- One atomic MySQL 8 ALTER: the old key is retained if adding the new key fails.
    SET @section_department_ddl_20261001 = v_ddl;
    PREPARE section_department_stmt_20261001 FROM @section_department_ddl_20261001;
    EXECUTE section_department_stmt_20261001;
    DEALLOCATE PREPARE section_department_stmt_20261001;
    SET @section_department_ddl_20261001 = NULL;
END$$
DELIMITER ;
CALL sp_apply_section_optional_department_20261001();
DROP PROCEDURE sp_apply_section_optional_department_20261001;

-- The department FK is retained: NULL is accepted, supplied IDs must still exist.
-- The new unique key ignores department and normalizes case/outer spaces.
-- Inactive sections reserve their code; archived/deleted sections release it.
-- COALESCE expressions also protect legacy rows whose other mapping IDs are NULL.


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

    IF NOT EXISTS
    (
        SELECT 1
        FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND status = 1
          AND is_archived = 0
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Academic year does not exist or is inactive.';

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
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_semester_id BIGINT DEFAULT NULL;
    DECLARE v_current_strength INT DEFAULT 0;

    SELECT
        s.college_id,
        s.academic_year_id,
        s.course_id,
        s.branch_id,
        s.semester_id
    INTO
        v_college_id,
        v_academic_year_id,
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
          AND duplicate_section.college_id = v_college_id
          AND duplicate_section.academic_year_id = v_academic_year_id
          AND duplicate_section.course_id <=> v_course_id
          AND duplicate_section.branch_id <=> v_branch_id
          AND duplicate_section.semester_id <=> v_semester_id
          AND LOWER(TRIM(duplicate_section.section_code COLLATE utf8mb4_0900_ai_ci)) = LOWER(TRIM(p_section_code COLLATE utf8mb4_0900_ai_ci))
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
          AND status = 1 AND is_archived = 0 AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year does not exist or is inactive.';
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


DROP PROCEDURE IF EXISTS sp_section_exists;
DELIMITER $$

CREATE PROCEDURE sp_section_exists
(
    IN p_academic_year_id BIGINT,
    IN p_department_id BIGINT, -- Retained for compatibility; not part of uniqueness.
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_section_code VARCHAR(20),
    IN p_exclude_section_id BIGINT
)
BEGIN

    SELECT
        COUNT(*) AS RecordCount

    FROM sections

    WHERE academic_year_id = p_academic_year_id
      AND course_id <=> p_course_id
      AND branch_id <=> p_branch_id
      AND semester_id <=> p_semester_id
      AND LOWER(TRIM(section_code)) COLLATE utf8mb4_0900_ai_ci
          = LOWER(TRIM(p_section_code)) COLLATE utf8mb4_0900_ai_ci
      AND is_archived = 0
      AND deleted_at IS NULL
      AND
      (
          p_exclude_section_id IS NULL
          OR section_id <> p_exclude_section_id
      );

END $$

DELIMITER ;


DROP PROCEDURE IF EXISTS sp_section_get_all;
DELIMITER $$
CREATE PROCEDURE sp_section_get_all()
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(sem.semester_name, CONCAT('Semester ', COALESCE(s.semester, sem.semester_number))) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,
        GREATEST(
            s.capacity - (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ), 0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived
    FROM sections s
    INNER JOIN colleges col ON col.college_id = s.college_id
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN departments d ON d.department_id = s.department_id
    INNER JOIN courses c ON c.course_id = s.course_id
    INNER JOIN branches b ON b.branch_id = s.branch_id
    LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    WHERE s.is_archived = 0
      AND s.deleted_at IS NULL
    ORDER BY d.department_name, c.course_name, b.branch_name,
             COALESCE(s.semester, sem.semester_number), s.section_code;
END$$
DELIMITER ;


DROP PROCEDURE IF EXISTS sp_section_get_by_id;
DELIMITER $$
CREATE PROCEDURE sp_section_get_by_id(IN p_section_id BIGINT)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_code AS DepartmentCode,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(s.semester, sem.semester_number) AS SemesterNumber,
        COALESCE(sem.semester_name, CONCAT('Semester ', COALESCE(s.semester, sem.semester_number))) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,
        GREATEST(
            s.capacity - (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived,
        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,
        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy
    FROM sections s
    INNER JOIN colleges col ON col.college_id = s.college_id
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN departments d ON d.department_id = s.department_id
    INNER JOIN courses c ON c.course_id = s.course_id
    INNER JOIN branches b ON b.branch_id = s.branch_id
    LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    WHERE s.section_id = p_section_id
      AND s.is_archived = 0
      AND s.deleted_at IS NULL;
END$$
DELIMITER ;


DROP PROCEDURE IF EXISTS sp_section_search;
DELIMITER $$
CREATE PROCEDURE sp_section_search(
    IN p_search VARCHAR(100),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_status TINYINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(sem.semester_name, CONCAT('Semester ', COALESCE(s.semester, sem.semester_number))) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,
        GREATEST(
            s.capacity - (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ), 0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived
    FROM sections s
    INNER JOIN colleges col ON col.college_id = s.college_id
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN departments d ON d.department_id = s.department_id
    INNER JOIN courses c ON c.course_id = s.course_id
    INNER JOIN branches b ON b.branch_id = s.branch_id
    LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    WHERE s.is_archived = 0
      AND s.deleted_at IS NULL
      AND (
          p_search IS NULL OR TRIM(p_search COLLATE utf8mb4_0900_ai_ci) = ''
          OR s.section_code LIKE CONCAT('%', TRIM(p_search COLLATE utf8mb4_0900_ai_ci), '%')
          OR s.section_name LIKE CONCAT('%', TRIM(p_search COLLATE utf8mb4_0900_ai_ci), '%')
      )
      AND (p_department_id IS NULL OR s.department_id = p_department_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_semester_id IS NULL OR s.semester_id = p_semester_id)
      AND (p_status IS NULL OR s.status = p_status)
    ORDER BY d.department_name, c.course_name, b.branch_name,
             COALESCE(s.semester, sem.semester_number), s.section_code;
END$$
DELIMITER ;


DROP TRIGGER IF EXISTS trg_cms_sections_insert;
DELIMITER $$
CREATE TRIGGER `trg_cms_sections_insert` BEFORE INSERT ON `sections` FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 THEN IF NEW.department_id IS NOT NULL THEN
    CALL sp_cms_require_active('department',NEW.department_id);
    IF NOT EXISTS (SELECT 1 FROM departments WHERE department_id=NEW.department_id AND college_id=NEW.college_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Department does not belong to the selected college.';
    END IF;
END IF; IF NEW.course_id IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.course_id);
IF NOT EXISTS (SELECT 1 FROM courses WHERE course_id=NEW.course_id AND college_id=NEW.college_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course does not belong to the selected college.';
END IF; END IF; IF NEW.branch_id IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section branch must belong to the selected course.'; END IF; END IF; IF NEW.semester_id IS NOT NULL THEN CALL sp_cms_require_active('semester',NEW.semester_id); IF NOT EXISTS(SELECT 1 FROM semesters WHERE semester_id=NEW.semester_id AND course_id=NEW.course_id AND branch_id=NEW.branch_id AND academic_year_id=NEW.academic_year_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section semester must match course, branch and academic year.'; END IF; END IF; END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_cms_sections_update;
DELIMITER $$
CREATE TRIGGER `trg_cms_sections_update` BEFORE UPDATE ON `sections` FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF (OLD.status=1 AND NEW.status=0) OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN CALL sp_cms_check_deactivation('section',OLD.section_id); END IF;
IF NEW.status=1 AND (OLD.status<>1 OR NOT(NEW.college_id<=>OLD.college_id) OR NOT(NEW.department_id<=>OLD.department_id) OR NOT(NEW.course_id<=>OLD.course_id) OR NOT(NEW.branch_id<=>OLD.branch_id) OR NOT(NEW.semester_id<=>OLD.semester_id) OR NOT(NEW.academic_year_id<=>OLD.academic_year_id)) THEN IF NEW.department_id IS NOT NULL THEN
    CALL sp_cms_require_active('department',NEW.department_id);
    IF NOT EXISTS (SELECT 1 FROM departments WHERE department_id=NEW.department_id AND college_id=NEW.college_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Department does not belong to the selected college.';
    END IF;
END IF; IF NEW.course_id IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.course_id);
IF NOT EXISTS (SELECT 1 FROM courses WHERE course_id=NEW.course_id AND college_id=NEW.college_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course does not belong to the selected college.';
END IF; END IF; IF NEW.branch_id IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section branch must belong to the selected course.'; END IF; END IF; IF NEW.semester_id IS NOT NULL THEN CALL sp_cms_require_active('semester',NEW.semester_id); IF NOT EXISTS(SELECT 1 FROM semesters WHERE semester_id=NEW.semester_id AND course_id=NEW.course_id AND branch_id=NEW.branch_id AND academic_year_id=NEW.academic_year_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section semester must match course, branch and academic year.'; END IF; END IF; END IF;
END$$
DELIMITER ;



-- Deployment verification (no test rows inserted).
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_schema=DATABASE() AND table_name='sections' AND column_name='department_id';
SELECT index_name, non_unique, seq_in_index, column_name, expression
FROM information_schema.statistics
WHERE table_schema=DATABASE() AND table_name='sections' AND index_name='uq_sections_scope_code'
ORDER BY seq_in_index;
SELECT 'Section optional-department patch applied.' AS result;
