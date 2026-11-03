-- =============================================================
-- PHASE 5 - ADVANCED TIMETABLE MANAGEMENT
-- Additive migration only. Existing timetable APIs/tables remain valid.
-- Target: MySQL 8.x
-- =============================================================

CREATE TABLE IF NOT EXISTS timetable_period_configurations (
    period_configuration_id BIGINT NOT NULL AUTO_INCREMENT,
    academic_year_id BIGINT NOT NULL,
    period_number INT NULL,
    period_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'CLASS',
    display_order INT NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    PRIMARY KEY (period_configuration_id),
    UNIQUE KEY uq_tt_period_year_order (academic_year_id, display_order),
    KEY idx_tt_period_year_status (academic_year_id, status),
    KEY idx_tt_period_time (academic_year_id, start_time, end_time),
    CONSTRAINT fk_tt_period_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academicyears(academic_year_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_tt_period_times CHECK (end_time > start_time),
    CONSTRAINT chk_tt_period_type CHECK (period_type IN ('CLASS','BREAK','LUNCH')),
    CONSTRAINT chk_tt_period_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS academic_working_days (
    academic_working_day_id BIGINT NOT NULL AUTO_INCREMENT,
    academic_year_id BIGINT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    PRIMARY KEY (academic_working_day_id),
    UNIQUE KEY uq_academic_working_day (academic_year_id, day_of_week),
    KEY idx_academic_working_day_status (academic_year_id, status),
    CONSTRAINT fk_academic_working_day_year
        FOREIGN KEY (academic_year_id) REFERENCES academicyears(academic_year_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_academic_working_day_name CHECK (
        day_of_week IN ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY')
    ),
    CONSTRAINT chk_academic_working_day_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS academic_calendar_settings (
    academic_year_id BIGINT NOT NULL,
    reviewed TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    PRIMARY KEY (academic_year_id),
    CONSTRAINT fk_academic_calendar_settings_year
        FOREIGN KEY (academic_year_id) REFERENCES academicyears(academic_year_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_academic_calendar_reviewed CHECK (reviewed IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS academic_calendar_days (
    academic_calendar_day_id BIGINT NOT NULL AUTO_INCREMENT,
    academic_year_id BIGINT NOT NULL,
    calendar_date DATE NOT NULL,
    day_type VARCHAR(30) NOT NULL DEFAULT 'HOLIDAY',
    description VARCHAR(255) NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    PRIMARY KEY (academic_calendar_day_id),
    UNIQUE KEY uq_academic_calendar_date (academic_year_id, calendar_date),
    KEY idx_academic_calendar_range (academic_year_id, calendar_date, status),
    CONSTRAINT fk_academic_calendar_day_year
        FOREIGN KEY (academic_year_id) REFERENCES academicyears(academic_year_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_academic_calendar_type CHECK (
        day_type IN ('HOLIDAY','NON_WORKING','WORKING_OVERRIDE')
    ),
    CONSTRAINT chk_academic_calendar_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS classrooms (
    classroom_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    classroom_code VARCHAR(50) NOT NULL,
    classroom_name VARCHAR(100) NOT NULL,
    room_type VARCHAR(30) NULL,
    capacity INT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    PRIMARY KEY (classroom_id),
    UNIQUE KEY uq_classroom_code (college_id, classroom_code),
    KEY idx_classroom_college_status (college_id, status),
    CONSTRAINT fk_classroom_college
        FOREIGN KEY (college_id) REFERENCES colleges(college_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_classroom_status CHECK (status IN (0,1)),
    CONSTRAINT chk_classroom_capacity CHECK (capacity IS NULL OR capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS timetable_subject_requirements (
    timetable_subject_requirement_id BIGINT NOT NULL AUTO_INCREMENT,
    timetable_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    periods_per_week INT NOT NULL,
    block_size INT NOT NULL DEFAULT 1,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    PRIMARY KEY (timetable_subject_requirement_id),
    UNIQUE KEY uq_tt_subject_requirement (timetable_id, subject_id),
    KEY idx_tt_requirement_subject (subject_id, status),
    CONSTRAINT fk_tt_requirement_timetable
        FOREIGN KEY (timetable_id) REFERENCES timetables(timetable_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_tt_requirement_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_tt_requirement_periods CHECK (periods_per_week > 0),
    CONSTRAINT chk_tt_requirement_block CHECK (block_size > 0),
    CONSTRAINT chk_tt_requirement_status CHECK (status IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Idempotent helper for additive legacy-table columns.
DROP PROCEDURE IF EXISTS sp_phase5_add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE sp_phase5_add_column_if_missing(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = p_table_name
          AND column_name = p_column_name
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', REPLACE(p_table_name, '`', '``'),
            '` ADD COLUMN `', REPLACE(p_column_name, '`', '``'), '` ', p_definition
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL sp_phase5_add_column_if_missing('timetables', 'revision', 'INT NOT NULL DEFAULT 1 AFTER `updated_by`');
CALL sp_phase5_add_column_if_missing('timetable_entries', 'classroom_id', 'BIGINT NULL AFTER `classroom`');
CALL sp_phase5_add_column_if_missing('timetable_entries', 'generated_source', 'VARCHAR(20) NOT NULL DEFAULT ''MANUAL'' AFTER `entry_type`');
CALL sp_phase5_add_column_if_missing('timetable_entries', 'schedule_group_key', 'VARCHAR(64) NULL AFTER `generated_source`');

DROP PROCEDURE IF EXISTS sp_phase5_add_column_if_missing;

-- Add classroom FK/index only when absent.
DROP PROCEDURE IF EXISTS sp_phase5_add_classroom_fk;
DELIMITER $$
CREATE PROCEDURE sp_phase5_add_classroom_fk()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'timetable_entries'
          AND index_name = 'idx_timetable_entry_classroom_id'
    ) THEN
        ALTER TABLE timetable_entries
            ADD KEY idx_timetable_entry_classroom_id (classroom_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = DATABASE()
          AND table_name = 'timetable_entries'
          AND constraint_name = 'fk_timetable_entry_classroom'
    ) THEN
        ALTER TABLE timetable_entries
            ADD CONSTRAINT fk_timetable_entry_classroom
            FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id)
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$
DELIMITER ;
CALL sp_phase5_add_classroom_fk();
DROP PROCEDURE IF EXISTS sp_phase5_add_classroom_fk;

-- Conflict lookup indexes.
DROP PROCEDURE IF EXISTS sp_phase5_add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE sp_phase5_add_index_if_missing(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_columns TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = p_table_name
          AND index_name = p_index_name
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', REPLACE(p_table_name, '`', '``'),
            '` ADD INDEX `', REPLACE(p_index_name, '`', '``'), '` (', p_columns, ')'
        );
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL sp_phase5_add_index_if_missing('timetable_entries', 'idx_tt_conflict_faculty', '`faculty_id`,`day_of_week`,`status`');
CALL sp_phase5_add_index_if_missing('timetable_entries', 'idx_tt_conflict_section', '`section_id`,`day_of_week`,`status`');
CALL sp_phase5_add_index_if_missing('timetable_entries', 'idx_tt_conflict_room', '`classroom_id`,`day_of_week`,`status`');
CALL sp_phase5_add_index_if_missing('timetables', 'idx_tt_publish_context', '`academic_year_id`,`status`,`effective_from`,`effective_to`');
DROP PROCEDURE IF EXISTS sp_phase5_add_index_if_missing;

-- Seed real legacy room references without inventing new academic data.
INSERT INTO classrooms
(
    college_id,
    classroom_code,
    classroom_name,
    room_type,
    capacity,
    status
)
SELECT DISTINCT
    s.college_id,
    LEFT(CONCAT('LEGACY-', UPPER(REPLACE(REPLACE(TRIM(s.room), ' ', '-'), '/', '-'))), 50),
    TRIM(s.room),
    CASE WHEN UPPER(s.room) LIKE '%LAB%' THEN 'LAB' ELSE 'CLASSROOM' END,
    NULL,
    1
FROM sections s
WHERE s.room IS NOT NULL
  AND TRIM(s.room) <> ''
ON DUPLICATE KEY UPDATE
    classroom_name = VALUES(classroom_name),
    status = 1;

INSERT INTO classrooms
(
    college_id,
    classroom_code,
    classroom_name,
    room_type,
    capacity,
    status
)
SELECT DISTINCT
    s.college_id,
    LEFT(CONCAT('LEGACY-', UPPER(REPLACE(REPLACE(TRIM(e.classroom), ' ', '-'), '/', '-'))), 50),
    TRIM(e.classroom),
    CASE WHEN UPPER(e.classroom) LIKE '%LAB%' THEN 'LAB' ELSE 'CLASSROOM' END,
    NULL,
    1
FROM timetable_entries e
INNER JOIN sections s ON s.section_id = e.section_id
WHERE e.classroom IS NOT NULL
  AND TRIM(e.classroom) <> ''
ON DUPLICATE KEY UPDATE
    classroom_name = VALUES(classroom_name),
    status = 1;

UPDATE timetable_entries e
INNER JOIN sections s ON s.section_id = e.section_id
INNER JOIN classrooms c
    ON c.college_id = s.college_id
   AND UPPER(TRIM(c.classroom_name)) = UPPER(TRIM(e.classroom))
SET e.classroom_id = c.classroom_id
WHERE e.classroom_id IS NULL
  AND e.classroom IS NOT NULL
  AND TRIM(e.classroom) <> '';

-- Verification
SELECT 'Phase 5 timetable migration completed' AS message;
SELECT COUNT(*) AS period_config_count FROM timetable_period_configurations;
SELECT COUNT(*) AS classroom_count FROM classrooms;
