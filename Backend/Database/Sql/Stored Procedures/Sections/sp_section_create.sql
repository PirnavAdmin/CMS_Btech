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

    IF p_department_id IS NULL OR p_department_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department is required.';
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
       DEPARTMENT → COLLEGE
       ===================================================== */

    IF NOT EXISTS
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
       COURSE → COLLEGE + DEPARTMENT
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND department_id = p_department_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Course does not belong to the selected college and department.';

    END IF;


    /* =====================================================
       BRANCH → COURSE + DEPARTMENT
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND department_id = p_department_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Branch does not belong to the selected course and department.';

    END IF;


    /* =====================================================
       SEMESTER → BRANCH
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM semesters
        WHERE semester_id = p_semester_id
          AND branch_id = p_branch_id
          AND status = 1
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Semester does not belong to the selected branch.';

    END IF;


    /* =====================================================
       DUPLICATE SECTION
       ===================================================== */

    IF EXISTS
    (
        SELECT 1
        FROM sections
        WHERE academic_year_id = p_academic_year_id
          AND department_id = p_department_id
          AND course_id = p_course_id
          AND branch_id = p_branch_id
          AND semester_id = p_semester_id
          AND LOWER(TRIM(section_code))
              = LOWER(TRIM(p_section_code))
          AND is_archived = 0
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