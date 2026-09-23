-- =============================================================
-- SEMESTER COURSE RELATIONSHIP FIX
-- Direct-run MySQL 8.x update; no EF migration is required.
-- Existing semester rows are backfilled from their branch.
-- =============================================================

USE `cms_btech`;

SET @has_semester_course_id = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'semesters'
      AND COLUMN_NAME = 'course_id'
);
SET @semester_course_column_sql = IF(
    @has_semester_course_id = 0,
    'ALTER TABLE `semesters` ADD COLUMN `course_id` BIGINT NULL AFTER `semester_id`',
    'SELECT 1'
);
PREPARE semester_course_column_stmt FROM @semester_course_column_sql;
EXECUTE semester_course_column_stmt;
DEALLOCATE PREPARE semester_course_column_stmt;

SET @has_semester_year_number = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'semesters'
      AND COLUMN_NAME = 'year_number'
);
SET @semester_year_column_sql = IF(
    @has_semester_year_number = 0,
    'ALTER TABLE `semesters` ADD COLUMN `year_number` INT NULL AFTER `semester_number`',
    'SELECT 1'
);
PREPARE semester_year_column_stmt FROM @semester_year_column_sql;
EXECUTE semester_year_column_stmt;
DEALLOCATE PREPARE semester_year_column_stmt;

-- The branch-to-course relationship is authoritative for existing rows.
UPDATE `semesters` semester_record
INNER JOIN `branches` branch_record
    ON branch_record.`branch_id` = semester_record.`branch_id`
SET semester_record.`course_id` = branch_record.`course_id`
WHERE semester_record.`course_id` IS NULL
   OR semester_record.`course_id` <> branch_record.`course_id`;

UPDATE `semesters`
SET `year_number` = CEIL(`semester_number` / 2.0)
WHERE `year_number` IS NULL OR `year_number` <= 0;

ALTER TABLE `semesters`
    MODIFY COLUMN `course_id` BIGINT NOT NULL,
    MODIFY COLUMN `year_number` INT NOT NULL;

SET @has_semester_course_index = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'semesters'
      AND INDEX_NAME = 'idx_semesters_course'
);
SET @semester_course_index_sql = IF(
    @has_semester_course_index = 0,
    'CREATE INDEX `idx_semesters_course` ON `semesters` (`course_id`)',
    'SELECT 1'
);
PREPARE semester_course_index_stmt FROM @semester_course_index_sql;
EXECUTE semester_course_index_stmt;
DEALLOCATE PREPARE semester_course_index_stmt;

SET @has_semester_course_fk = (
    SELECT COUNT(*)
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'semesters'
      AND CONSTRAINT_NAME = 'fk_semesters_course'
);
SET @semester_course_fk_sql = IF(
    @has_semester_course_fk = 0,
    'ALTER TABLE `semesters` ADD CONSTRAINT `fk_semesters_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE semester_course_fk_stmt FROM @semester_course_fk_sql;
EXECUTE semester_course_fk_stmt;
DEALLOCATE PREPARE semester_course_fk_stmt;

-- Verification query: CourseId/CourseName must be populated for every row.
SELECT
    semester_record.`semester_id` AS `SemesterId`,
    semester_record.`semester_name` AS `SemesterName`,
    semester_record.`course_id` AS `CourseId`,
    course_record.`course_name` AS `CourseName`,
    semester_record.`branch_id` AS `BranchId`,
    branch_record.`branch_name` AS `BranchName`,
    semester_record.`academic_year_id` AS `AcademicYearId`,
    semester_record.`year_number` AS `YearNumber`
FROM `semesters` semester_record
INNER JOIN `courses` course_record
    ON course_record.`course_id` = semester_record.`course_id`
INNER JOIN `branches` branch_record
    ON branch_record.`branch_id` = semester_record.`branch_id`
ORDER BY semester_record.`semester_number`, semester_record.`semester_id`;
