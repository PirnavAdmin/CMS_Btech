-- ============================================================================
-- CMS BTECH: Academic-year tenant isolation fix
-- Target: MySQL 8.x; database: cms_btech
--
-- Additive/safe intent:
--   * Adds college_id to academicyears.
--   * Maps only the legacy B.Tech rows confirmed in Dump202622ndOCT.sql.
--   * Does not change existing academic-year names, dates, status or archive flags.
--   * Enforces academic-year name uniqueness per college.
--   * Enforces at most one active year per college.
--   * Adds no academic years for new colleges.
--
-- IMPORTANT:
-- If this script reports unmatched rows with college_id IS NULL, stop and inspect
-- those rows before mapping them. Do not automatically assign unknown rows to B.Tech.
-- ============================================================================

USE cms_btech;

-- Preflight: the B.Tech college must exist. In the supplied dump its code is BTECH001.
DROP PROCEDURE IF EXISTS sp_precheck_academic_year_tenant_fix;
DELIMITER $$
CREATE PROCEDURE sp_precheck_academic_year_tenant_fix()
BEGIN
    DECLARE v_btech_college_id BIGINT DEFAULT NULL;

    SET v_btech_college_id = (
        SELECT c.college_id
        FROM colleges c
        WHERE c.college_code = 'BTECH001'
          AND c.deleted_at IS NULL
        ORDER BY c.college_id
        LIMIT 1
    );

    IF v_btech_college_id IS NULL THEN
        SET v_btech_college_id = (
            SELECT c.college_id
            FROM colleges c
            WHERE LOWER(TRIM(c.college_name)) = LOWER('BTech College of Engineering')
              AND c.deleted_at IS NULL
            ORDER BY c.college_id
            LIMIT 1
        );
    END IF;

    IF v_btech_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Academic-year migration stopped: B.Tech college BTECH001 was not found.';
    END IF;
END$$
DELIMITER ;

CALL sp_precheck_academic_year_tenant_fix();
DROP PROCEDURE IF EXISTS sp_precheck_academic_year_tenant_fix;

-- Add college_id as nullable first so the existing rows can be backfilled.
SET @academic_year_sql := IF(
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND column_name = 'college_id'
    ),
    'SELECT 1',
    'ALTER TABLE academicyears ADD COLUMN college_id BIGINT NULL AFTER academic_year_id'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

SET @btech_college_id := (
    SELECT c.college_id
    FROM colleges c
    WHERE c.college_code = 'BTECH001'
      AND c.deleted_at IS NULL
    ORDER BY c.college_id
    LIMIT 1
);

SET @btech_college_id := COALESCE(
    @btech_college_id,
    (
        SELECT c.college_id
        FROM colleges c
        WHERE LOWER(TRIM(c.college_name)) = LOWER('BTech College of Engineering')
          AND c.deleted_at IS NULL
        ORDER BY c.college_id
        LIMIT 1
    )
);

-- These five legacy rows are present in the supplied dump.
-- Match by name AND dates (not by auto-increment IDs), and preserve status/dates.
UPDATE academicyears ay
SET ay.college_id = @btech_college_id
WHERE ay.college_id IS NULL
  AND @btech_college_id IS NOT NULL
  AND (
       (ay.academic_year_name = '2025-2026'
        AND ay.start_date = '2025-06-01' AND ay.end_date = '2026-05-31')
    OR (ay.academic_year_name = '2026-2027'
        AND ay.start_date = '2026-06-01' AND ay.end_date = '2027-05-31')
    OR (ay.academic_year_name = '2027 - 2028'
        AND ay.start_date = '2027-05-31' AND ay.end_date = '2028-05-30')
    OR (ay.academic_year_name = '2028 - 2029'
        AND ay.start_date = '2028-05-30' AND ay.end_date = '2029-05-29')
    OR (ay.academic_year_name = '2029 - 2030'
        AND ay.start_date = '2029-05-29' AND ay.end_date = '2030-05-28')
  );

-- Capture any records that could not be safely mapped. Do not guess ownership.
SET @unmapped_academic_year_count := (
    SELECT COUNT(*) FROM academicyears WHERE college_id IS NULL
);

SELECT
    academic_year_id,
    academic_year_name,
    start_date,
    end_date,
    status,
    is_archived,
    created_by
FROM academicyears
WHERE college_id IS NULL
ORDER BY academic_year_id;

-- Stop the migration if an unrecognized legacy row remains unmapped.
DROP PROCEDURE IF EXISTS sp_validate_academic_year_tenant_backfill;
DELIMITER $$
CREATE PROCEDURE sp_validate_academic_year_tenant_backfill()
BEGIN
    DECLARE v_missing BIGINT DEFAULT 0;

    SELECT COUNT(*)
      INTO v_missing
    FROM academicyears
    WHERE college_id IS NULL;

    IF v_missing > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Unmapped academic-year rows remain. Inspect academicyears WHERE college_id IS NULL.';
    END IF;
END$$
DELIMITER ;

CALL sp_validate_academic_year_tenant_backfill();
DROP PROCEDURE IF EXISTS sp_validate_academic_year_tenant_backfill;

SET @academic_year_sql := IF(
    @unmapped_academic_year_count = 0,
    'ALTER TABLE academicyears MODIFY COLUMN college_id BIGINT NOT NULL',
    'SELECT ''Skipped NOT NULL conversion because unmapped academic-year rows remain'' AS migration_warning'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

-- Remove the old GLOBAL academic-year-name unique index.
SET @academic_year_sql := IF(
    @unmapped_academic_year_count = 0
    AND EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND index_name = 'uq_academic_year_name'
    ),
    'ALTER TABLE academicyears DROP INDEX uq_academic_year_name',
    'SELECT 1'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

-- Add uniqueness per college.
SET @academic_year_sql := IF(
    @unmapped_academic_year_count > 0
    OR EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND index_name = 'uq_academicyears_college_name'
    ),
    'SELECT 1',
    'CREATE UNIQUE INDEX uq_academicyears_college_name ON academicyears(college_id, academic_year_name)'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

-- Rebuild active_guard only if it still represents a GLOBAL active year.
-- New expression returns college_id for active records, allowing one active
-- year per college rather than one active year for the entire database.
SET @active_guard_expression := (
    SELECT generation_expression
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'academicyears'
      AND column_name = 'active_guard'
    LIMIT 1
);

SET @rebuild_active_guard := IF(
    @unmapped_academic_year_count = 0
    AND (
        @active_guard_expression IS NULL
        OR LOWER(@active_guard_expression) NOT LIKE '%college_id%'
    ),
    1,
    0
);

SET @academic_year_sql := IF(
    @rebuild_active_guard = 1
    AND EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND index_name = 'uq_academicyears_single_active'
    ),
    'ALTER TABLE academicyears DROP INDEX uq_academicyears_single_active',
    'SELECT 1'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

SET @academic_year_sql := IF(
    @rebuild_active_guard = 1
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND column_name = 'active_guard'
    ),
    'ALTER TABLE academicyears DROP COLUMN active_guard',
    'SELECT 1'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

SET @academic_year_sql := IF(
    @rebuild_active_guard = 1,
    'ALTER TABLE academicyears ADD COLUMN active_guard BIGINT GENERATED ALWAYS AS (CASE WHEN status = 1 AND is_archived = 0 AND deleted_at IS NULL THEN college_id ELSE NULL END) STORED',
    'SELECT 1'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

SET @academic_year_sql := IF(
    @unmapped_academic_year_count > 0
    OR EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND index_name = 'uq_academicyears_single_active'
    ),
    'SELECT 1',
    'CREATE UNIQUE INDEX uq_academicyears_single_active ON academicyears(active_guard)'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

-- Add the college FK only if it is not already present.
SET @academic_year_sql := IF(
    @unmapped_academic_year_count > 0
    OR EXISTS (
        SELECT 1
        FROM information_schema.referential_constraints
        WHERE constraint_schema = DATABASE()
          AND table_name = 'academicyears'
          AND constraint_name = 'fk_academicyears_college'
    ),
    'SELECT 1',
    'ALTER TABLE academicyears ADD CONSTRAINT fk_academicyears_college FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE RESTRICT ON UPDATE CASCADE'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

-- Supporting index for tenant/status list queries.
SET @academic_year_sql := IF(
    @unmapped_academic_year_count > 0
    OR EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'academicyears'
          AND index_name = 'idx_academicyears_college_status'
    ),
    'SELECT 1',
    'CREATE INDEX idx_academicyears_college_status ON academicyears(college_id, status, is_archived, deleted_at)'
);
PREPARE academic_year_stmt FROM @academic_year_sql;
EXECUTE academic_year_stmt;
DEALLOCATE PREPARE academic_year_stmt;

-- Verification: current academic years should belong to B.Tech (college_id=1
-- in the supplied dump), while newly created colleges should have zero years.
SELECT
    ay.academic_year_id,
    ay.college_id,
    c.college_code,
    c.college_name,
    ay.academic_year_name,
    ay.start_date,
    ay.end_date,
    ay.status,
    ay.is_archived
FROM academicyears ay
INNER JOIN colleges c ON c.college_id = ay.college_id
WHERE ay.deleted_at IS NULL
ORDER BY ay.college_id, ay.start_date, ay.academic_year_id;

SELECT
    college_id,
    COUNT(*) AS active_year_count
FROM academicyears
WHERE status = 1
  AND is_archived = 0
  AND deleted_at IS NULL
GROUP BY college_id
HAVING COUNT(*) > 1;

SHOW INDEX FROM academicyears;
