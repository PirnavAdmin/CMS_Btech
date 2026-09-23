    -- Backend Task 5: Branch/specialization table and stored procedures.
-- Select the backend schema before running. Existing rows are preserved.

CREATE TABLE IF NOT EXISTS branches (
    branch_id BIGINT NOT NULL AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    branch_code VARCHAR(50) NOT NULL,
    branch_name VARCHAR(150) NOT NULL,
    short_name VARCHAR(50) NULL,
    specialization VARCHAR(150) NULL,
    department_id BIGINT NULL,
    branch_type VARCHAR(50) NULL,   
    duration INT NULL,
    total_semesters INT NULL,
    intake_capacity INT NULL,
    starting_academic_year_id BIGINT NULL,
    description VARCHAR(500) NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (branch_id),
    UNIQUE KEY uq_branches_course_code (course_id, branch_code),
    KEY idx_branches_course_id (course_id),
    KEY idx_branches_department_id (department_id),
    KEY idx_branches_status (status),
    CONSTRAINT fk_backend_branches_course
        FOREIGN KEY (course_id) REFERENCES courses(course_id),
    CONSTRAINT fk_backend_branches_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- The supplied dump contains procedures that reference specialization even
-- though its branches table omits that column. Add only when missing.
SET @backend_sql := IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'branches'
          AND column_name = 'specialization'
    ),
    'SELECT 1',
    'ALTER TABLE branches ADD COLUMN specialization VARCHAR(150) NULL AFTER short_name'
);
PREPARE backend_stmt FROM @backend_sql;
EXECUTE backend_stmt;
DEALLOCATE PREPARE backend_stmt;

-- Fixes Error 1054: Unknown column b.duration.
SET @backend_sql := IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'branches'
          AND column_name = 'duration'
    ),
    'SELECT 1',
    'ALTER TABLE branches ADD COLUMN duration INT NULL AFTER branch_type'
);
PREPARE backend_stmt FROM @backend_sql;
EXECUTE backend_stmt;
DEALLOCATE PREPARE backend_stmt;

DROP PROCEDURE IF EXISTS sp_branch_create;
DROP PROCEDURE IF EXISTS sp_branch_get_all;
DROP PROCEDURE IF EXISTS sp_branch_get_by_id;
DROP PROCEDURE IF EXISTS sp_branch_get_by_course;
DROP PROCEDURE IF EXISTS sp_branch_update;
DROP PROCEDURE IF EXISTS sp_branch_delete;

DELIMITER $$

CREATE PROCEDURE sp_branch_create(
    IN p_course_id BIGINT,
    IN p_branch_code VARCHAR(50),
    IN p_branch_name VARCHAR(150),
    IN p_short_name VARCHAR(50),
    IN p_specialization VARCHAR(150),
    IN p_department_id BIGINT,
    IN p_branch_type VARCHAR(50),
    IN p_duration INT,
    IN p_total_semesters INT,
    IN p_intake_capacity INT,
    IN p_starting_academic_year_id BIGINT,
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM courses
        WHERE course_id = p_course_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course not found.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM branches
        WHERE course_id = p_course_id
          AND branch_code = UPPER(TRIM(p_branch_code))
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch code already exists for this course.';
    END IF;

    INSERT INTO branches (
        course_id, branch_code, branch_name, short_name, specialization,
        department_id, branch_type, duration, total_semesters,
        intake_capacity, starting_academic_year_id, description,
        status, created_at, created_by
    ) VALUES (
        p_course_id, UPPER(TRIM(p_branch_code)), TRIM(p_branch_name),
        p_short_name, p_specialization, p_department_id, p_branch_type,
        p_duration, p_total_semesters, p_intake_capacity,
        p_starting_academic_year_id, p_description,
        COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = LAST_INSERT_ID();
END$$

CREATE PROCEDURE sp_branch_get_all()
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.deleted_at IS NULL
    ORDER BY b.branch_id DESC;
END$$

CREATE PROCEDURE sp_branch_get_by_id(
    IN p_branch_id BIGINT
)
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = p_branch_id
      AND b.deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_branch_get_by_course(
    IN p_course_id BIGINT
)
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.course_id = p_course_id
      AND b.deleted_at IS NULL
    ORDER BY b.branch_name, b.branch_id;
END$$

CREATE PROCEDURE sp_branch_update(
    IN p_branch_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_code VARCHAR(50),
    IN p_branch_name VARCHAR(150),
    IN p_short_name VARCHAR(50),
    IN p_specialization VARCHAR(150),
    IN p_department_id BIGINT,
    IN p_branch_type VARCHAR(50),
    IN p_duration INT,
    IN p_total_semesters INT,
    IN p_intake_capacity INT,
    IN p_starting_academic_year_id BIGINT,
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM branches
        WHERE course_id = p_course_id
          AND branch_code = UPPER(TRIM(p_branch_code))
          AND branch_id <> p_branch_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch code already exists for this course.';
    END IF;

    UPDATE branches
    SET course_id = p_course_id,
        branch_code = UPPER(TRIM(p_branch_code)),
        branch_name = TRIM(p_branch_name),
        short_name = p_short_name,
        specialization = p_specialization,
        department_id = p_department_id,
        branch_type = p_branch_type,
        duration = p_duration,
        total_semesters = p_total_semesters,
        intake_capacity = p_intake_capacity,
        starting_academic_year_id = p_starting_academic_year_id,
        description = p_description,
        status = COALESCE(p_status, status),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE branch_id = p_branch_id
      AND deleted_at IS NULL;

    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = p_branch_id
      AND b.deleted_at IS NULL;
END$$

CREATE PROCEDURE sp_branch_delete(
    IN p_branch_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    UPDATE branches
    SET status = 0,
        deleted_at = UTC_TIMESTAMP(),
        deleted_by = p_deleted_by
    WHERE branch_id = p_branch_id
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DELIMITER ;

SHOW PROCEDURE STATUS
WHERE Db = DATABASE()
  AND Name IN (
      'sp_branch_create', 'sp_branch_get_all', 'sp_branch_get_by_id',
      'sp_branch_get_by_course', 'sp_branch_update', 'sp_branch_delete'
  );
