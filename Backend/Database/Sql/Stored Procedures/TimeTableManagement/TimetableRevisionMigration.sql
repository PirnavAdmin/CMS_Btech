-- Class Timetable revision support: additive / non-destructive migration
-- Database: cms_btech
-- BACK UP FIRST. Review and run in a maintenance window.
-- Does not delete timetable rows or remove existing APIs.
-- This migration allows multiple timetable versions for one academic-year/semester/section.

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_tt_revision_schema_upgrade_check$$
CREATE PROCEDURE sp_tt_revision_schema_upgrade_check()
BEGIN
  DECLARE v_unique_exists INT DEFAULT 0;
  DECLARE v_source_exists INT DEFAULT 0;
  DECLARE v_revision_no_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO v_unique_exists
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'timetables'
    AND index_name = 'uq_timetable'
    AND non_unique = 0;

  SELECT COUNT(*) INTO v_source_exists
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'timetables'
    AND column_name = 'source_timetable_id';

  SELECT COUNT(*) INTO v_revision_no_exists
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'timetables'
    AND column_name = 'revision_number';

  -- Existing schema has uq_timetable(academic_year_id, semester_id, section_id).
  -- Drop only that uniqueness rule; do not drop or modify any rows.
  IF v_unique_exists > 0 THEN
    ALTER TABLE timetables DROP INDEX uq_timetable;
  END IF;

  IF v_source_exists = 0 THEN
    ALTER TABLE timetables ADD COLUMN source_timetable_id BIGINT NULL AFTER timetable_id;
  END IF;

  IF v_revision_no_exists = 0 THEN
    ALTER TABLE timetables ADD COLUMN revision_number INT NOT NULL DEFAULT 1 AFTER revision;
  END IF;

  -- Add a non-unique lookup index only when it does not already exist.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'timetables'
      AND index_name = 'idx_timetable_revision_source'
  ) THEN
    ALTER TABLE timetables ADD INDEX idx_timetable_revision_source (source_timetable_id, revision_number);
  END IF;

  -- Add a self-reference to preserve lineage; nullable for existing/original timetable masters.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = 'timetables'
      AND constraint_name = 'fk_timetable_revision_source'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE timetables
      ADD CONSTRAINT fk_timetable_revision_source
      FOREIGN KEY (source_timetable_id) REFERENCES timetables(timetable_id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$
DELIMITER ;

CALL sp_tt_revision_schema_upgrade_check();
DROP PROCEDURE IF EXISTS sp_tt_revision_schema_upgrade_check;

-- Verification (expect source_timetable_id, revision_number and idx_timetable_revision_source).
SHOW COLUMNS FROM timetables;
SHOW INDEX FROM timetables;
