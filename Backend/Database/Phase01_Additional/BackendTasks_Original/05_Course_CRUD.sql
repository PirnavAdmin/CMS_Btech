-- Backend Task 6: Course Add, List, Edit, Details, and Status.
-- Select the backend schema before running. Existing rows are preserved.

CREATE TABLE IF NOT EXISTS courses (
    course_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    department_id BIGINT NULL,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    course_short_name VARCHAR(50) NULL,
    course_type VARCHAR(50) NULL,
    duration_years INT NOT NULL,
    total_semesters INT NOT NULL,
    eligibility VARCHAR(255) NULL,
    description VARCHAR(500) NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (course_id),
    UNIQUE KEY uq_courses_course_code (course_code),
    KEY idx_courses_college_id (college_id),
    KEY idx_courses_department_id (department_id),
    KEY idx_courses_name (course_name),
    KEY idx_courses_status (status),
    CONSTRAINT fk_backend_courses_college
        FOREIGN KEY (college_id) REFERENCES colleges(college_id),
    CONSTRAINT fk_backend_courses_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP PROCEDURE IF EXISTS sp_course_code_exists;
DROP PROCEDURE IF EXISTS sp_course_create;
DROP PROCEDURE IF EXISTS sp_course_get_all;
DROP PROCEDURE IF EXISTS sp_course_get_by_id;
DROP PROCEDURE IF EXISTS sp_course_update;
DROP PROCEDURE IF EXISTS sp_course_update_status;

DELIMITER $$

CREATE PROCEDURE sp_course_code_exists(
    IN p_course_code VARCHAR(50),
    IN p_exclude_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM(p_course_code))
          AND deleted_at IS NULL
          AND (p_exclude_id IS NULL OR course_id <> p_exclude_id)
    ) AS code_exists;
END$$

CREATE PROCEDURE sp_course_create(
    IN p_college_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_code VARCHAR(50),
    IN p_course_name VARCHAR(150),
    IN p_course_short_name VARCHAR(50),
    IN p_course_type VARCHAR(50),
    IN p_duration_years INT,
    IN p_total_semesters INT,
    IN p_eligibility VARCHAR(255),
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'College not found.';
    END IF;

    IF p_department_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM departments
        WHERE department_id = p_department_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Department not found.';
    END IF;

    IF p_duration_years <= 0 OR p_total_semesters <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duration and total semesters must be greater than zero.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM(p_course_code))
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course code already exists.';
    END IF;

    INSERT INTO courses (
        college_id, department_id, course_code, course_name,
        course_short_name, course_type, duration_years, total_semesters,
        eligibility, description, status, created_at, created_by
    ) VALUES (
        p_college_id, p_department_id, UPPER(TRIM(p_course_code)),
        TRIM(p_course_name), p_course_short_name, p_course_type,
        p_duration_years, p_total_semesters, p_eligibility, p_description,
        COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = LAST_INSERT_ID();
END$$

CREATE PROCEDURE sp_course_get_all(
    IN p_search VARCHAR(200),
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_department_id BIGINT
)
BEGIN
    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_college_id IS NULL OR c.college_id = p_college_id)
      AND (p_department_id IS NULL OR c.department_id = p_department_id)
      AND (
            p_search IS NULL OR TRIM(p_search) = ''
         OR c.course_code LIKE CONCAT('%', TRIM(p_search), '%')
         OR c.course_name LIKE CONCAT('%', TRIM(p_search), '%')
         OR c.course_short_name LIKE CONCAT('%', TRIM(p_search), '%')
         OR d.department_name LIKE CONCAT('%', TRIM(p_search), '%')
      )
    ORDER BY c.course_name, c.course_id;
END$$

CREATE PROCEDURE sp_course_get_by_id(
    IN p_course_id BIGINT
)
BEGIN
    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = p_course_id
      AND c.deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_course_update(
    IN p_course_id BIGINT,
    IN p_college_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_code VARCHAR(50),
    IN p_course_name VARCHAR(150),
    IN p_course_short_name VARCHAR(50),
    IN p_course_type VARCHAR(50),
    IN p_duration_years INT,
    IN p_total_semesters INT,
    IN p_eligibility VARCHAR(255),
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM(p_course_code))
          AND course_id <> p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course code already exists.';
    END IF;

    UPDATE courses
    SET college_id = p_college_id,
        department_id = p_department_id,
        course_code = UPPER(TRIM(p_course_code)),
        course_name = TRIM(p_course_name),
        course_short_name = p_course_short_name,
        course_type = p_course_type,
        duration_years = p_duration_years,
        total_semesters = p_total_semesters,
        eligibility = p_eligibility,
        description = p_description,
        status = COALESCE(p_status, status),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE course_id = p_course_id
      AND deleted_at IS NULL;

    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = p_course_id
      AND c.deleted_at IS NULL;
END$$

CREATE PROCEDURE sp_course_update_status(
    IN p_course_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE courses
    SET status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE course_id = p_course_id
      AND deleted_at IS NULL;

    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = p_course_id
      AND c.deleted_at IS NULL;
END$$

DELIMITER ;

SHOW PROCEDURE STATUS
WHERE Db = DATABASE()
  AND Name IN (
      'sp_course_code_exists', 'sp_course_create', 'sp_course_get_all',
      'sp_course_get_by_id', 'sp_course_update', 'sp_course_update_status'
  );
