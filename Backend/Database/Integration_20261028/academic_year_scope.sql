-- MySQL 8 / InnoDB. Select the target database; back up and stop writers first.
-- No business data is inserted, updated, deleted, or reassigned.
-- A preflight failure requires investigation. Do not bypass its checks.
DELIMITER $$
DROP PROCEDURE IF EXISTS cms_migrate_academic_scope_20261028$$
CREATE PROCEDURE cms_migrate_academic_scope_20261028()
BEGIN
  DECLARE name_columns TEXT;
  DECLARE scoped_columns TEXT;
  DECLARE guard_columns TEXT;
  -- Legacy NULL ownership is preserved, never assigned to a guessed college.
  -- Scoped API reads exclude these rows; new API writes require a positive college ID.
  IF EXISTS(SELECT 1 FROM academicyears a LEFT JOIN colleges c ON c.college_id=a.college_id WHERE a.college_id IS NOT NULL AND c.college_id IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='STOP: orphan academic-year college IDs exist.';
  END IF;
  IF EXISTS(SELECT 1 FROM academicyears GROUP BY college_id,academic_year_name HAVING COUNT(*)>1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='STOP: duplicate academic-year names exist within a college.';
  END IF;
  IF EXISTS(SELECT 1 FROM academicyears WHERE college_id IS NOT NULL AND status=1 AND is_archived=0 AND deleted_at IS NULL GROUP BY college_id HAVING COUNT(*)>1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='STOP: more than one active year exists within a college.';
  END IF;
  SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) INTO name_columns
    FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='academicyears' AND index_name='uq_academic_year_name';
  SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) INTO scoped_columns
    FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='academicyears' AND index_name='uq_academicyears_college_name';
  SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) INTO guard_columns
    FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='academicyears' AND index_name='uq_academicyears_single_active';
  IF (name_columns IS NOT NULL AND name_columns <> 'academic_year_name') OR
     (scoped_columns IS NOT NULL AND scoped_columns <> 'college_id,academic_year_name') OR
     (guard_columns IS NOT NULL AND guard_columns <> 'active_guard') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='STOP: unexpected index definitions; manual schema review required.';
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='academicyears'
    AND index_name IN ('uq_academicyears_college_name','uq_academicyears_single_active') AND non_unique<>0) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='STOP: expected unique index is non-unique.';
  END IF;
  IF EXISTS(SELECT index_name FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='academicyears'
    AND non_unique=0 AND index_name<>'uq_academic_year_name' GROUP BY index_name HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index)='academic_year_name') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='STOP: an additional global year-name unique index needs review.';
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='academicyears'
    AND column_name='active_guard' AND COALESCE(generation_expression,'')='') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='STOP: active_guard is not generated; preserve and review its data.';
  END IF;
  SET @cms_scope_ddl='ALTER TABLE academicyears MODIFY COLUMN college_id BIGINT NULL';
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='academicyears' AND column_name='active_guard') THEN
    SET @cms_scope_ddl=CONCAT(@cms_scope_ddl, ', MODIFY COLUMN active_guard BIGINT GENERATED ALWAYS AS (CASE WHEN status=1 AND is_archived=0 AND deleted_at IS NULL THEN college_id ELSE NULL END) STORED');
  ELSE
    SET @cms_scope_ddl=CONCAT(@cms_scope_ddl, ', ADD COLUMN active_guard BIGINT GENERATED ALWAYS AS (CASE WHEN status=1 AND is_archived=0 AND deleted_at IS NULL THEN college_id ELSE NULL END) STORED');
  END IF;
  IF name_columns IS NOT NULL THEN SET @cms_scope_ddl=CONCAT(@cms_scope_ddl, ', DROP INDEX uq_academic_year_name'); END IF;
  IF scoped_columns IS NULL THEN SET @cms_scope_ddl=CONCAT(@cms_scope_ddl, ', ADD UNIQUE INDEX uq_academicyears_college_name(college_id,academic_year_name)'); END IF;
  IF guard_columns IS NULL THEN SET @cms_scope_ddl=CONCAT(@cms_scope_ddl, ', ADD UNIQUE INDEX uq_academicyears_single_active(active_guard)'); END IF;
  PREPARE cms_scope_stmt FROM @cms_scope_ddl;
  EXECUTE cms_scope_stmt;
  DEALLOCATE PREPARE cms_scope_stmt;
END$$
CALL cms_migrate_academic_scope_20261028()$$
DROP PROCEDURE cms_migrate_academic_scope_20261028$$
DELIMITER ;
SHOW CREATE TABLE academicyears;

-- Ownership repair is a separate, authorized operation. This SELECT changes nothing.
SELECT academic_year_id, academic_year_name FROM academicyears WHERE college_id IS NULL;
