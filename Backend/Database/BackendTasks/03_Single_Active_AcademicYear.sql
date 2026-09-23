-- Backend Task 4: enforce at most one active academic year.
-- Select the backend schema before running. Existing rows are preserved.

CREATE TABLE IF NOT EXISTS academicyears (
    academic_year_id BIGINT NOT NULL AUTO_INCREMENT,
    academic_year_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TINYINT NOT NULL DEFAULT 0,
    is_archived TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (academic_year_id),
    UNIQUE KEY uq_academic_year_name (academic_year_name),
    CONSTRAINT chk_academic_year_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- If old data contains more than one active row, preserve the newest one and
-- archive the others before adding the database-level unique guard.
SET @backend_keep_active_id := (
    SELECT academic_year_id
    FROM academicyears
    WHERE status = 1
      AND is_archived = 0
      AND deleted_at IS NULL
    ORDER BY updated_at DESC, start_date DESC, academic_year_id DESC
    LIMIT 1
);

UPDATE academicyears
SET status = 0,
    is_archived = 1,
    updated_at = UTC_TIMESTAMP()
WHERE status = 1
  AND is_archived = 0
  AND deleted_at IS NULL
  AND academic_year_id <> COALESCE(@backend_keep_active_id, -1);

-- A generated column is NULL for non-active rows. MySQL permits multiple NULL
-- values in a UNIQUE index, but only one row may contain active_guard = 1.
SET @backend_sql := IF(
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND column_name = 'active_guard'
    ),
    'SELECT 1',
    'ALTER TABLE academicyears ADD COLUMN active_guard TINYINT GENERATED ALWAYS AS (CASE WHEN status = 1 AND is_archived = 0 AND deleted_at IS NULL THEN 1 ELSE NULL END) STORED'
);
PREPARE backend_stmt FROM @backend_sql;
EXECUTE backend_stmt;
DEALLOCATE PREPARE backend_stmt;

SET @backend_sql := IF(
    EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND index_name = 'uq_academicyears_single_active'
    ),
    'SELECT 1',
    'CREATE UNIQUE INDEX uq_academicyears_single_active ON academicyears(active_guard)'
);
PREPARE backend_stmt FROM @backend_sql;
EXECUTE backend_stmt;
DEALLOCATE PREPARE backend_stmt;

DROP PROCEDURE IF EXISTS sp_AcademicYear_Add;
DROP PROCEDURE IF EXISTS sp_AcademicYear_List;
DROP PROCEDURE IF EXISTS sp_AcademicYear_GetById;
DROP PROCEDURE IF EXISTS sp_AcademicYear_Activate;
DROP PROCEDURE IF EXISTS sp_AcademicYear_Deactivate;

DELIMITER $$

CREATE PROCEDURE sp_AcademicYear_Add(
    IN p_academic_year_name VARCHAR(50),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_created_by BIGINT
)
BEGIN
    IF p_academic_year_name IS NULL OR TRIM(p_academic_year_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name is required.';
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date must be greater than start date.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_name = TRIM(p_academic_year_name)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name already exists.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE deleted_at IS NULL
          AND NOT (p_end_date < start_date OR p_start_date > end_date)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year dates overlap an existing academic year.';
    END IF;

    -- New records are upcoming. Activate only through the activate operation.
    INSERT INTO academicyears (
        academic_year_name, start_date, end_date, status, is_archived,
        created_at, created_by
    ) VALUES (
        TRIM(p_academic_year_name), p_start_date, p_end_date, 0, 0,
        UTC_TIMESTAMP(), p_created_by
    );

    SELECT * FROM academicyears WHERE academic_year_id = LAST_INSERT_ID();
END$$

CREATE PROCEDURE sp_AcademicYear_List(
    IN p_search VARCHAR(100),
    IN p_filter VARCHAR(20)
)
BEGIN
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL
      AND (
            p_search IS NULL OR TRIM(p_search) = ''
         OR academic_year_name LIKE CONCAT('%', TRIM(p_search), '%')
      )
      AND (
            p_filter IS NULL OR TRIM(p_filter) = '' OR LOWER(TRIM(p_filter)) = 'all'
         OR (LOWER(TRIM(p_filter)) = 'active' AND status = 1 AND is_archived = 0)
         OR (LOWER(TRIM(p_filter)) = 'upcoming' AND status = 0 AND is_archived = 0)
         OR (LOWER(TRIM(p_filter)) = 'archived' AND is_archived = 1)
      )
    ORDER BY start_date DESC, academic_year_id DESC;
END$$

CREATE PROCEDURE sp_AcademicYear_GetById(
    IN p_academic_year_id BIGINT
)
BEGIN
    SELECT *
    FROM academicyears
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_AcademicYear_Activate(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
    ) THEN
        SELECT * FROM academicyears WHERE 1 = 0;
    ELSE
        START TRANSACTION;

        UPDATE academicyears
        SET status = 0,
            is_archived = 1,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE academic_year_id <> p_academic_year_id
          AND status = 1
          AND is_archived = 0
          AND deleted_at IS NULL;

        UPDATE academicyears
        SET status = 1,
            is_archived = 0,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL;

        COMMIT;

        SELECT * FROM academicyears
        WHERE academic_year_id = p_academic_year_id;
    END IF;
END$$

CREATE PROCEDURE sp_AcademicYear_Deactivate(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE academicyears
    SET status = 0,
        is_archived = 1,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL;

    SELECT * FROM academicyears
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL;
END$$

DELIMITER ;

-- Verification: active_count must be 0 or 1.
SELECT COUNT(*) AS active_count
FROM academicyears
WHERE status = 1
  AND is_archived = 0
  AND deleted_at IS NULL;
