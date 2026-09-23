-- Student Management API database objects
-- No EF Core migration is required. Run this file manually after importing
-- the supplied cms_btech database dump.

USE cms_btech;

DROP PROCEDURE IF EXISTS sp_student_get_all;
DROP PROCEDURE IF EXISTS sp_student_search;
DROP PROCEDURE IF EXISTS sp_student_get_by_id;
DROP PROCEDURE IF EXISTS sp_student_code_exists;
DROP PROCEDURE IF EXISTS sp_student_validate_references;
DROP PROCEDURE IF EXISTS sp_student_create;
DROP PROCEDURE IF EXISTS sp_student_update;
DROP PROCEDURE IF EXISTS sp_student_update_status;

DELIMITER $$

CREATE PROCEDURE sp_student_get_all(
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_page_number INT DEFAULT 1;
    DECLARE v_page_size INT DEFAULT 20;
    DECLARE v_offset INT DEFAULT 0;

    SET v_page_number = IFNULL(NULLIF(p_page_number, 0), 1);
    SET v_page_size = LEAST(IFNULL(NULLIF(p_page_size, 0), 20), 100);
    SET v_offset = (v_page_number - 1) * v_page_size;

    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by,
        COUNT(*) OVER() AS total_records
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.deleted_at IS NULL
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_college_id IS NULL OR s.college_id = p_college_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_academic_year_id IS NULL OR s.academic_year_id = p_academic_year_id)
    ORDER BY s.student_id DESC
    LIMIT v_offset, v_page_size;
END$$

CREATE PROCEDURE sp_student_search(
    IN p_query VARCHAR(150),
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_page_number INT DEFAULT 1;
    DECLARE v_page_size INT DEFAULT 20;
    DECLARE v_offset INT DEFAULT 0;
    DECLARE v_search VARCHAR(160);

    SET v_page_number = IFNULL(NULLIF(p_page_number, 0), 1);
    SET v_page_size = LEAST(IFNULL(NULLIF(p_page_size, 0), 20), 100);
    SET v_offset = (v_page_number - 1) * v_page_size;
    SET v_search = CONCAT('%', TRIM(IFNULL(p_query, '')), '%');

    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by,
        COUNT(*) OVER() AS total_records
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.deleted_at IS NULL
      AND (
          s.student_code LIKE v_search
          OR s.full_name LIKE v_search
          OR s.email LIKE v_search
          OR s.mobile LIKE v_search
      )
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_college_id IS NULL OR s.college_id = p_college_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_academic_year_id IS NULL OR s.academic_year_id = p_academic_year_id)
    ORDER BY s.student_id DESC
    LIMIT v_offset, v_page_size;
END$$

CREATE PROCEDURE sp_student_get_by_id(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        s.student_id,
        s.college_id,
        c.college_name,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        s.blood_group,
        s.address,
        s.course_id,
        co.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        s.status,
        s.created_at,
        s.created_by,
        s.updated_at,
        s.updated_by,
        s.deleted_at,
        s.deleted_by
    FROM students s
    INNER JOIN colleges c
        ON c.college_id = s.college_id
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    LEFT JOIN courses co
        ON co.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_student_code_exists(
    IN p_student_code VARCHAR(50),
    IN p_exclude_student_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM students
        WHERE student_code = TRIM(p_student_code)
          AND deleted_at IS NULL
          AND (p_exclude_student_id IS NULL OR student_id <> p_exclude_student_id)
    ) AS exists_value;
END$$

CREATE PROCEDURE sp_student_validate_references(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT
)
BEGIN
    SELECT
        EXISTS(
            SELECT 1 FROM colleges
            WHERE college_id = p_college_id AND deleted_at IS NULL
        ) AS college_exists,
        EXISTS(
            SELECT 1 FROM academicyears
            WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
        ) AS academic_year_exists,
        (p_course_id IS NULL OR EXISTS(
            SELECT 1 FROM courses
            WHERE course_id = p_course_id AND deleted_at IS NULL
        )) AS course_exists,
        (p_branch_id IS NULL OR EXISTS(
            SELECT 1 FROM branches
            WHERE branch_id = p_branch_id AND deleted_at IS NULL
        )) AS branch_exists,
        (p_course_id IS NULL OR EXISTS(
            SELECT 1 FROM courses
            WHERE course_id = p_course_id
              AND college_id = p_college_id
              AND deleted_at IS NULL
        )) AS course_belongs_to_college,
        (p_branch_id IS NULL OR EXISTS(
            SELECT 1 FROM branches
            WHERE branch_id = p_branch_id
              AND (p_course_id IS NULL OR course_id = p_course_id)
              AND deleted_at IS NULL
        )) AS branch_belongs_to_course;
END$$

CREATE PROCEDURE sp_student_create(
    IN p_college_id BIGINT,
    IN p_student_code VARCHAR(50),
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_student_id BIGINT;

    IF TRIM(IFNULL(p_student_code, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code is required.';
    END IF;

    IF TRIM(IFNULL(p_full_name, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;

    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF EXISTS(
        SELECT 1 FROM students
        WHERE student_code = TRIM(p_student_code)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code already exists.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CollegeId does not exist.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AcademicYearId does not exist.';
    END IF;

    IF p_course_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CourseId is invalid for the selected college.';
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BranchId is invalid for the selected course.';
    END IF;

    INSERT INTO students
    (
        college_id,
        student_code,
        full_name,
        gender,
        date_of_birth,
        email,
        mobile,
        blood_group,
        address,
        course_id,
        branch_id,
        academic_year_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_college_id,
        UPPER(TRIM(p_student_code)),
        TRIM(p_full_name),
        NULLIF(TRIM(p_gender), ''),
        p_date_of_birth,
        NULLIF(TRIM(p_email), ''),
        NULLIF(TRIM(p_mobile), ''),
        NULLIF(TRIM(p_blood_group), ''),
        NULLIF(TRIM(p_address), ''),
        p_course_id,
        p_branch_id,
        p_academic_year_id,
        p_status,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_student_id = LAST_INSERT_ID();
    CALL sp_student_get_by_id(v_student_id);
END$$

CREATE PROCEDURE sp_student_update(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT,
    IN p_student_code VARCHAR(50),
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM students
        WHERE student_id = p_student_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found.';
    END IF;

    IF TRIM(IFNULL(p_student_code, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code is required.';
    END IF;

    IF TRIM(IFNULL(p_full_name, '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;

    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF EXISTS(
        SELECT 1 FROM students
        WHERE student_code = TRIM(p_student_code)
          AND student_id <> p_student_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code already exists.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CollegeId does not exist.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AcademicYearId does not exist.';
    END IF;

    IF p_course_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CourseId is invalid for the selected college.';
    END IF;

    IF p_branch_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BranchId is invalid for the selected course.';
    END IF;

    UPDATE students
    SET college_id = p_college_id,
        student_code = UPPER(TRIM(p_student_code)),
        full_name = TRIM(p_full_name),
        gender = NULLIF(TRIM(p_gender), ''),
        date_of_birth = p_date_of_birth,
        email = NULLIF(TRIM(p_email), ''),
        mobile = NULLIF(TRIM(p_mobile), ''),
        blood_group = NULLIF(TRIM(p_blood_group), ''),
        address = NULLIF(TRIM(p_address), ''),
        course_id = p_course_id,
        branch_id = p_branch_id,
        academic_year_id = p_academic_year_id,
        status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    CALL sp_student_get_by_id(p_student_id);
END$$

CREATE PROCEDURE sp_student_update_status(
    IN p_student_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF NOT EXISTS(
        SELECT 1 FROM students
        WHERE student_id = p_student_id AND deleted_at IS NULL
    ) THEN
        SELECT
            s.student_id,
            s.college_id,
            c.college_name,
            s.student_code,
            s.full_name,
            s.gender,
            s.date_of_birth,
            s.email,
            s.mobile,
            s.blood_group,
            s.address,
            s.course_id,
            co.course_name,
            s.branch_id,
            b.branch_name,
            s.academic_year_id,
            ay.academic_year_name,
            s.status,
            s.created_at,
            s.created_by,
            s.updated_at,
            s.updated_by,
            s.deleted_at,
            s.deleted_by
        FROM students s
        INNER JOIN colleges c ON c.college_id = s.college_id
        INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
        LEFT JOIN courses co ON co.course_id = s.course_id
        LEFT JOIN branches b ON b.branch_id = s.branch_id
        WHERE 1 = 0;
    ELSE
        UPDATE students
        SET status = p_status,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE student_id = p_student_id
          AND deleted_at IS NULL;

        CALL sp_student_get_by_id(p_student_id);
    END IF;
END$$

DELIMITER ;

-- Optional verification commands:
-- CALL sp_student_get_all(NULL, NULL, NULL, NULL, NULL, 1, 20);
-- CALL sp_student_search('STU', NULL, NULL, NULL, NULL, NULL, 1, 20);
-- CALL sp_student_get_by_id(1);
-- CALL sp_student_validate_references(1, 2, 1, 1);
-- CALL sp_student_code_exists('STU004', NULL);
