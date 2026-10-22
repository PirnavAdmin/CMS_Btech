-- Run against the application schema before deploying the college-scoped backend.
-- Existing years remain unassigned; assign them explicitly to their owning college.
-- No historical academic year is copied or deleted.
DROP PROCEDURE IF EXISTS migrate_college_academic_years;
DELIMITER $$
CREATE PROCEDURE migrate_college_academic_years()
BEGIN
    DECLARE finished INT DEFAULT 0;
    DECLARE index_to_drop VARCHAR(128);
    DECLARE old_indexes CURSOR FOR
        SELECT index_name FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'academicyears'
          AND non_unique = 0 AND index_name <> 'PRIMARY'
        GROUP BY index_name
        HAVING COUNT(*) = 1 AND MAX(column_name) IN ('academic_year_name', 'active_guard');
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished = 1;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'academicyears' AND column_name = 'college_id') THEN
        ALTER TABLE academicyears ADD COLUMN college_id BIGINT NULL;
    END IF;
    OPEN old_indexes;
    drop_indexes: LOOP
        FETCH old_indexes INTO index_to_drop;
        IF finished = 1 THEN LEAVE drop_indexes; END IF;
        SET @drop_year_index = CONCAT('ALTER TABLE academicyears DROP INDEX `', REPLACE(index_to_drop, '`', '``'), '`');
        PREPARE stmt FROM @drop_year_index;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    CLOSE old_indexes;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'academicyears' AND column_name = 'active_guard') THEN
        ALTER TABLE academicyears ADD COLUMN active_guard TINYINT GENERATED ALWAYS AS
            (CASE WHEN status = 1 AND is_archived = 0 AND deleted_at IS NULL THEN 1 ELSE NULL END) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE()
        AND table_name = 'academicyears' AND index_name = 'uq_college_academic_year_name') THEN
        CREATE UNIQUE INDEX uq_college_academic_year_name ON academicyears(college_id, academic_year_name);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE()
        AND table_name = 'academicyears' AND index_name = 'uq_college_active_academic_year') THEN
        CREATE UNIQUE INDEX uq_college_active_academic_year ON academicyears(college_id, active_guard);
    END IF;
END$$
DELIMITER ;
CALL migrate_college_academic_years();
DROP PROCEDURE migrate_college_academic_years;
