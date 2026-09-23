-- =============================================================
-- CMS BTECH BACKEND INTEGRATION UPDATE
-- Generated: 2026-09-03
-- Target: MySQL 8.x / cms_btech
--
-- Run after importing the supplied cms_btech database dump.
-- Existing APIs, tables and data are preserved. Procedures in this
-- file are replaced with their integration-ready definitions.
-- =============================================================

USE `cms_btech`;


-- BEGIN Database/Semester/SemesterCourseIntegration.sql
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
-- END Database/Semester/SemesterCourseIntegration.sql


-- BEGIN Database/Sections/SectionUpdateStoredProcedure.sql
-- =============================================================
-- MISSING SECTION UPDATE PROCEDURE
-- Required by SectionRepository.UpdateAsync; absent from dump3even.sql.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_section_update`;
DELIMITER $$

CREATE PROCEDURE `sp_section_update`(
    IN p_section_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester BIGINT,
    IN p_section_name VARCHAR(100),
    IN p_section_code VARCHAR(20),
    IN p_capacity INT,
    IN p_class_teacher_employee_profile_id BIGINT,
    IN p_room VARCHAR(100),
    IN p_shift VARCHAR(30),
    IN p_section_type VARCHAR(50),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_department_id BIGINT DEFAULT NULL;
    DECLARE v_current_strength INT DEFAULT 0;
    DECLARE v_semester_number INT DEFAULT NULL;

    SELECT s.`college_id`, s.`department_id`
    INTO v_college_id, v_department_id
    FROM `sections` s
    WHERE s.`section_id` = p_section_id
      AND s.`is_archived` = 0
      AND s.`deleted_at` IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section not found.';
    END IF;
    IF NULLIF(TRIM(p_section_name), '') IS NULL
       OR NULLIF(TRIM(p_section_code), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section name and section code are required.';
    END IF;
    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section capacity must be greater than zero.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `courses` c
        WHERE c.`course_id` = p_course_id
          AND c.`college_id` = v_college_id
          AND c.`department_id` = v_department_id
          AND c.`status` = 1 AND c.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course does not belong to the section college and department.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `branches` b
        WHERE b.`branch_id` = p_branch_id
          AND b.`course_id` = p_course_id
          AND b.`department_id` = v_department_id
          AND b.`status` = 1 AND b.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch does not belong to the selected course.';
    END IF;

    SELECT sem.`semester_number`
    INTO v_semester_number
    FROM `semesters` sem
    WHERE sem.`semester_id` = p_semester
      AND sem.`course_id` = p_course_id
      AND sem.`branch_id` = p_branch_id
      AND sem.`status` = 1
      AND sem.`is_archived` = 0
    LIMIT 1;

    IF v_semester_number IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Semester does not match the selected course and branch.';
    END IF;

    IF p_class_teacher_employee_profile_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM `employee_profiles` ep
        INNER JOIN `users` u ON u.`user_id` = ep.`user_id`
        WHERE ep.`employee_profile_id` = p_class_teacher_employee_profile_id
          AND ep.`status` = 1
          AND ep.`deleted_at` IS NULL
          AND u.`status` = 1
          AND u.`deleted_at` IS NULL
          AND (u.`college_id` = v_college_id OR u.`college_id` IS NULL)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class teacher is unavailable for this college.';
    END IF;

    SELECT COUNT(*) INTO v_current_strength
    FROM `student_section_assignments` ssa
    WHERE ssa.`section_id` = p_section_id AND ssa.`status` = 1;

    IF p_capacity < v_current_strength THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacity cannot be below the current student strength.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM `sections` duplicate_section
        WHERE duplicate_section.`section_id` <> p_section_id
          AND duplicate_section.`academic_year_id` = p_academic_year_id
          AND duplicate_section.`department_id` = v_department_id
          AND duplicate_section.`course_id` = p_course_id
          AND duplicate_section.`branch_id` = p_branch_id
          AND duplicate_section.`semester_id` = p_semester
          AND LOWER(TRIM(duplicate_section.`section_code`)) = LOWER(TRIM(p_section_code))
          AND duplicate_section.`is_archived` = 0
          AND duplicate_section.`deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section code already exists for the selected semester.';
    END IF;

    UPDATE `sections`
    SET `course_id` = p_course_id,
        `branch_id` = p_branch_id,
        `academic_year_id` = p_academic_year_id,
        `semester` = v_semester_number,
        `semester_id` = p_semester,
        `section_name` = TRIM(p_section_name),
        `section_code` = TRIM(p_section_code),
        `capacity` = p_capacity,
        `class_teacher_employee_profile_id` = p_class_teacher_employee_profile_id,
        `room` = NULLIF(TRIM(p_room), ''),
        `shift` = NULLIF(TRIM(p_shift), ''),
        `section_type` = NULLIF(TRIM(p_section_type), ''),
        `status` = IF(COALESCE(p_status, 0) = 1, 1, 0),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by
    WHERE `section_id` = p_section_id
      AND `is_archived` = 0
      AND `deleted_at` IS NULL;

    SELECT 1 AS `AffectedRows`;
END$$

DELIMITER ;
-- END Database/Sections/SectionUpdateStoredProcedure.sql


-- BEGIN Database/Sql/Stored Procedures/Sections/sp_section_get_all.sql
DROP PROCEDURE IF EXISTS sp_section_get_all;
DELIMITER $$
CREATE PROCEDURE sp_section_get_all()
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(sem.semester_name, CONCAT('Semester ', COALESCE(s.semester, sem.semester_number))) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,
        GREATEST(
            s.capacity - (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ), 0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived
    FROM sections s
    INNER JOIN colleges col ON col.college_id = s.college_id
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
    INNER JOIN departments d ON d.department_id = s.department_id
    INNER JOIN courses c ON c.course_id = s.course_id
    INNER JOIN branches b ON b.branch_id = s.branch_id
    LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    WHERE s.is_archived = 0
      AND s.deleted_at IS NULL
    ORDER BY d.department_name, c.course_name, b.branch_name,
             COALESCE(s.semester, sem.semester_number), s.section_code;
END$$
DELIMITER ;
-- END Database/Sql/Stored Procedures/Sections/sp_section_get_all.sql


-- BEGIN Database/Sql/Stored Procedures/Sections/sp_section_get_by_id.sql
DROP PROCEDURE IF EXISTS sp_section_get_by_id;
DELIMITER $$
CREATE PROCEDURE sp_section_get_by_id(IN p_section_id BIGINT)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_code AS DepartmentCode,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(s.semester, sem.semester_number) AS SemesterNumber,
        COALESCE(sem.semester_name, CONCAT('Semester ', COALESCE(s.semester, sem.semester_number))) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,
        GREATEST(
            s.capacity - (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived,
        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,
        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy
    FROM sections s
    INNER JOIN colleges col ON col.college_id = s.college_id
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
    INNER JOIN departments d ON d.department_id = s.department_id
    INNER JOIN courses c ON c.course_id = s.course_id
    INNER JOIN branches b ON b.branch_id = s.branch_id
    LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    WHERE s.section_id = p_section_id
      AND s.is_archived = 0
      AND s.deleted_at IS NULL;
END$$
DELIMITER ;
-- END Database/Sql/Stored Procedures/Sections/sp_section_get_by_id.sql


-- BEGIN Database/Sql/Stored Procedures/Sections/sp_section_search.sql
DROP PROCEDURE IF EXISTS sp_section_search;
DELIMITER $$
CREATE PROCEDURE sp_section_search(
    IN p_search VARCHAR(100),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_status TINYINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(sem.semester_name, CONCAT('Semester ', COALESCE(s.semester, sem.semester_number))) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,
        GREATEST(
            s.capacity - (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ), 0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived
    FROM sections s
    INNER JOIN colleges col ON col.college_id = s.college_id
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
    INNER JOIN departments d ON d.department_id = s.department_id
    INNER JOIN courses c ON c.course_id = s.course_id
    INNER JOIN branches b ON b.branch_id = s.branch_id
    LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    WHERE s.is_archived = 0
      AND s.deleted_at IS NULL
      AND (
          p_search IS NULL OR TRIM(p_search COLLATE utf8mb4_unicode_ci) = ''
          OR s.section_code LIKE CONCAT('%', TRIM(p_search COLLATE utf8mb4_unicode_ci), '%')
          OR s.section_name LIKE CONCAT('%', TRIM(p_search COLLATE utf8mb4_unicode_ci), '%')
      )
      AND (p_department_id IS NULL OR s.department_id = p_department_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_semester_id IS NULL OR s.semester_id = p_semester_id)
      AND (p_status IS NULL OR s.status = p_status)
    ORDER BY d.department_name, c.course_name, b.branch_name,
             COALESCE(s.semester, sem.semester_number), s.section_code;
END$$
DELIMITER ;
-- END Database/Sql/Stored Procedures/Sections/sp_section_search.sql


-- BEGIN Database/Sql/Stored Procedures/Sections/sp_section_update_details.sql
DROP PROCEDURE IF EXISTS sp_section_update_details;
DELIMITER $$
CREATE PROCEDURE sp_section_update_details(
    IN p_section_id BIGINT,
    IN p_section_name VARCHAR(100),
    IN p_section_code VARCHAR(20),
    IN p_capacity INT,
    IN p_class_teacher_employee_profile_id BIGINT,
    IN p_room VARCHAR(100),
    IN p_shift VARCHAR(30),
    IN p_section_type VARCHAR(50),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_department_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_semester_id BIGINT DEFAULT NULL;
    DECLARE v_current_strength INT DEFAULT 0;

    SELECT
        s.college_id,
        s.academic_year_id,
        s.department_id,
        s.course_id,
        s.branch_id,
        s.semester_id
    INTO
        v_college_id,
        v_academic_year_id,
        v_department_id,
        v_course_id,
        v_branch_id,
        v_semester_id
    FROM sections s
    WHERE s.section_id = p_section_id
      AND s.is_archived = 0
      AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    IF NULLIF(TRIM(p_section_name), '') IS NULL
       OR NULLIF(TRIM(p_section_code), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section name and section code are required.';
    END IF;

    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section capacity must be greater than zero.';
    END IF;

    SELECT COUNT(*)
    INTO v_current_strength
    FROM student_section_assignments ssa
    WHERE ssa.section_id = p_section_id
      AND ssa.status = 1;

    IF p_capacity < v_current_strength THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacity cannot be below the current student strength.';
    END IF;

    IF p_class_teacher_employee_profile_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM employee_profiles ep
        INNER JOIN users u ON u.user_id = ep.user_id
        WHERE ep.employee_profile_id = p_class_teacher_employee_profile_id
          AND ep.status = 1
          AND ep.deleted_at IS NULL
          AND u.status = 1
          AND u.deleted_at IS NULL
          AND (u.college_id = v_college_id OR u.college_id IS NULL)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class teacher is unavailable for this college.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM sections duplicate_section
        WHERE duplicate_section.section_id <> p_section_id
          AND duplicate_section.academic_year_id = v_academic_year_id
          AND duplicate_section.department_id = v_department_id
          AND duplicate_section.course_id = v_course_id
          AND duplicate_section.branch_id = v_branch_id
          AND duplicate_section.semester_id <=> v_semester_id
          AND LOWER(TRIM(duplicate_section.section_code COLLATE utf8mb4_unicode_ci)) = LOWER(TRIM(p_section_code COLLATE utf8mb4_unicode_ci))
          AND duplicate_section.is_archived = 0
          AND duplicate_section.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section code already exists for the selected semester.';
    END IF;

    UPDATE sections
    SET section_name = TRIM(p_section_name),
        section_code = TRIM(p_section_code),
        capacity = p_capacity,
        class_teacher_employee_profile_id = p_class_teacher_employee_profile_id,
        room = NULLIF(TRIM(p_room), ''),
        shift = NULLIF(TRIM(p_shift), ''),
        section_type = NULLIF(TRIM(p_section_type), ''),
        status = IF(COALESCE(p_status, status) = 1, 1, 0),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND is_archived = 0
      AND deleted_at IS NULL;

    SELECT 1 AS AffectedRows;
END$$
DELIMITER ;
-- END Database/Sql/Stored Procedures/Sections/sp_section_update_details.sql


-- BEGIN Database/StudentIntegration/StudentIntegrationOperations.sql
-- =============================================================
-- STUDENT ADMISSION / DOCUMENT / PROMOTION INTEGRATION
-- Direct-run MySQL 8.x update; no migration runner is required.
-- Existing tables, document columns, procedures and APIs are kept.
-- =============================================================

USE `cms_btech`;

CREATE TABLE IF NOT EXISTS `student_document_files` (
    `document_id` BIGINT NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT NOT NULL,
    `document_type` VARCHAR(100) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `content_type` VARCHAR(150) DEFAULT NULL,
    `file_size` BIGINT DEFAULT NULL,
    `uploaded_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME DEFAULT NULL,
    `deleted_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`document_id`),
    KEY `idx_student_document_files_student` (`student_id`, `is_deleted`),
    CONSTRAINT `fk_student_document_files_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1000000000 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_fee_structures` (
    `fee_structure_id` BIGINT NOT NULL AUTO_INCREMENT,
    `admission_id` BIGINT NOT NULL,
    `tuition_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `admission_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `hostel_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `transportation_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `scholarship_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_plan` VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME',
    `payment_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`fee_structure_id`),
    UNIQUE KEY `uq_student_admission_fee_admission` (`admission_id`),
    CONSTRAINT `fk_student_admission_fee_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_student_admission_fee_nonnegative`
        CHECK (`tuition_fee` >= 0 AND `admission_fee` >= 0
            AND `hostel_fee` >= 0 AND `transportation_fee` >= 0
            AND `scholarship_amount` >= 0 AND `amount_paid` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_previous_education` (
    `previous_education_id` BIGINT NOT NULL AUTO_INCREMENT,
    `admission_id` BIGINT NOT NULL,
    `qualification_level` VARCHAR(30) NOT NULL,
    `qualification` VARCHAR(100) DEFAULT NULL,
    `board_or_university` VARCHAR(150) DEFAULT NULL,
    `institution` VARCHAR(255) DEFAULT NULL,
    `roll_number` VARCHAR(50) DEFAULT NULL,
    `passing_year` VARCHAR(20) DEFAULT NULL,
    `stream` VARCHAR(100) DEFAULT NULL,
    `score` DECIMAL(5,2) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`previous_education_id`),
    UNIQUE KEY `uq_admission_previous_education_level`
        (`admission_id`, `qualification_level`),
    CONSTRAINT `fk_admission_previous_education_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_admission_previous_education_score`
        CHECK (`score` IS NULL OR (`score` >= 0 AND `score` <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_admission_form_data` (
    `admission_id` BIGINT NOT NULL,
    `form_data` JSON NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` BIGINT DEFAULT NULL,
    PRIMARY KEY (`admission_id`),
    CONSTRAINT `fk_student_admission_form_data_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `studentadmissions` (`AdmissionId`)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS `sp_student_admission_form_data_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_form_data_upsert`(
    IN p_admission_id BIGINT,
    IN p_form_data LONGTEXT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF p_form_data IS NULL OR JSON_VALID(p_form_data) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission formData must be valid JSON.';
    END IF;

    INSERT INTO `student_admission_form_data` (
        `admission_id`, `form_data`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, CAST(p_form_data AS JSON), UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `form_data` = VALUES(`form_data`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END$$
DELIMITER ;

-- Return all normalized columns plus the complete frontend form payload.
DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetById`;
DELIMITER $$
CREATE PROCEDURE `sp_StudentAdmission_GetById`(IN p_admission_id BIGINT)
BEGIN
    SELECT sa.*, fd.`form_data` AS `FrontendFormDataJson`,
        sec.`college_id` AS `AdmissionCollegeId`, col.`college_name` AS `AdmissionCollegeName`,
        sec.`department_id` AS `AdmissionDepartmentId`, dep.`department_name` AS `AdmissionDepartmentName`,
        sec.`course_id` AS `AdmissionCourseId`, course_record.`course_name` AS `AdmissionCourseName`,
        sec.`branch_id` AS `AdmissionBranchId`, branch_record.`branch_name` AS `AdmissionBranchName`,
        ay.`academic_year_name` AS `AcademicYearName`,
        sec.`semester_id` AS `SemesterId`, semester_record.`semester_number` AS `SemesterNumber`,
        semester_record.`semester_name` AS `SemesterName`, sec.`section_name` AS `SectionName`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_form_data` fd
        ON fd.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    LEFT JOIN `colleges` col ON col.`college_id` = sec.`college_id`
    LEFT JOIN `departments` dep ON dep.`department_id` = sec.`department_id`
    LEFT JOIN `courses` course_record ON course_record.`course_id` = sec.`course_id`
    LEFT JOIN `branches` branch_record ON branch_record.`branch_id` = sec.`branch_id`
    LEFT JOIN `academicyears` ay ON ay.`academic_year_id` = sa.`AcademicYearId`
    LEFT JOIN `semesters` semester_record ON semester_record.`semester_id` = sec.`semester_id`
    WHERE sa.`AdmissionId` = p_admission_id
      AND sa.`IsDeleted` = 0
    LIMIT 1;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_list`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_list`(
    IN p_search VARCHAR(255),
    IN p_admission_status VARCHAR(50),
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;

    IF p_page_number IS NULL OR p_page_number < 1 THEN
        SET p_page_number = 1;
    END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN
        SET p_page_size = 20;
    END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT sa.*, fd.`form_data` AS `FrontendFormDataJson`,
        sec.`college_id` AS `AdmissionCollegeId`, col.`college_name` AS `AdmissionCollegeName`,
        sec.`department_id` AS `AdmissionDepartmentId`, dep.`department_name` AS `AdmissionDepartmentName`,
        sec.`course_id` AS `AdmissionCourseId`, course_record.`course_name` AS `AdmissionCourseName`,
        sec.`branch_id` AS `AdmissionBranchId`, branch_record.`branch_name` AS `AdmissionBranchName`,
        ay.`academic_year_name` AS `AcademicYearName`,
        sec.`semester_id` AS `SemesterId`, semester_record.`semester_number` AS `SemesterNumber`,
        semester_record.`semester_name` AS `SemesterName`, sec.`section_name` AS `SectionName`,
        COUNT(*) OVER() AS `TotalRecords`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_form_data` fd
        ON fd.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    LEFT JOIN `colleges` col ON col.`college_id` = sec.`college_id`
    LEFT JOIN `departments` dep ON dep.`department_id` = sec.`department_id`
    LEFT JOIN `courses` course_record ON course_record.`course_id` = sec.`course_id`
    LEFT JOIN `branches` branch_record ON branch_record.`branch_id` = sec.`branch_id`
    LEFT JOIN `academicyears` ay ON ay.`academic_year_id` = sa.`AcademicYearId`
    LEFT JOIN `semesters` semester_record ON semester_record.`semester_id` = sec.`semester_id`
    WHERE sa.`IsDeleted` = 0
      AND (
          NULLIF(TRIM(p_search), '') IS NULL
          OR sa.`RegistrationNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`ApplicationNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`AdmissionNo` LIKE CONCAT('%', TRIM(p_search), '%')
          OR CONCAT_WS(' ', sa.`FirstName`, sa.`LastName`) LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`StudentEmail` LIKE CONCAT('%', TRIM(p_search), '%')
          OR sa.`MobileNumber` LIKE CONCAT('%', TRIM(p_search), '%')
      )
      AND (
          NULLIF(TRIM(p_admission_status), '') IS NULL
          OR UPPER(sa.`AdmissionStatus`) = UPPER(TRIM(p_admission_status))
      )
    ORDER BY sa.`CreatedAt` DESC, sa.`AdmissionId` DESC
    LIMIT p_page_size OFFSET v_offset;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_create`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_create`(
    IN p_student_id BIGINT,
    IN p_document_type VARCHAR(100),
    IN p_file_name VARCHAR(255),
    IN p_file_path VARCHAR(500),
    IN p_content_type VARCHAR(150),
    IN p_file_size BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_document_id BIGINT;

    IF NOT EXISTS (
        SELECT 1 FROM `students`
        WHERE `student_id` = p_student_id AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found.';
    END IF;
    IF NULLIF(TRIM(p_document_type), '') IS NULL
       OR NULLIF(TRIM(p_file_name), '') IS NULL
       OR NULLIF(TRIM(p_file_path), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Document type, file name and file path are required.';
    END IF;

    INSERT INTO `student_document_files` (
        `student_id`, `document_type`, `file_name`, `file_path`,
        `content_type`, `file_size`, `uploaded_date`, `created_by`
    ) VALUES (
        p_student_id, TRIM(p_document_type), TRIM(p_file_name), TRIM(p_file_path),
        NULLIF(TRIM(p_content_type), ''), p_file_size, UTC_TIMESTAMP(), p_created_by
    );
    SET v_document_id = LAST_INSERT_ID();

    SELECT
        f.`document_id` AS `DocumentId`,
        f.`student_id` AS `StudentId`,
        f.`document_type` AS `DocumentType`,
        f.`file_name` AS `FileName`,
        f.`file_path` AS `FilePath`,
        f.`content_type` AS `ContentType`,
        f.`file_size` AS `FileSize`,
        f.`uploaded_date` AS `UploadedDate`
    FROM `student_document_files` f
    WHERE f.`document_id` = v_document_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_get_by_id`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_get_by_id`(
    IN p_student_id BIGINT,
    IN p_document_id BIGINT
)
BEGIN
    SELECT
        d.`DocumentId`, d.`StudentId`, d.`DocumentType`, d.`FileName`,
        d.`FilePath`, d.`ContentType`, d.`FileSize`, d.`UploadedDate`
    FROM (
        SELECT
            f.`document_id` AS `DocumentId`,
            f.`student_id` AS `StudentId`,
            f.`document_type` AS `DocumentType`,
            f.`file_name` AS `FileName`,
            f.`file_path` AS `FilePath`,
            f.`content_type` AS `ContentType`,
            f.`file_size` AS `FileSize`,
            f.`uploaded_date` AS `UploadedDate`
        FROM `student_document_files` f
        WHERE f.`is_deleted` = 0

        UNION ALL

        SELECT (sd.`DocumentId` * 100) + legacy.`type_number`, sd.`Student_Id`,
            legacy.`document_type`, legacy.`file_name`, legacy.`file_name`,
            NULL, NULL, sd.`UploadedDate`
        FROM `student_documents` sd
        INNER JOIN (
            SELECT 1 AS `type_number`, 'Aadhaar Document' AS `document_type`,
                sd1.`AadhaarDocument` AS `file_name`, sd1.`DocumentId` AS `source_id`
            FROM `student_documents` sd1
            UNION ALL SELECT 2, 'Previous Certificates', sd2.`PreviousCertificates`, sd2.`DocumentId` FROM `student_documents` sd2
            UNION ALL SELECT 3, 'Transfer Certificate', sd3.`TransferCertificate`, sd3.`DocumentId` FROM `student_documents` sd3
            UNION ALL SELECT 4, 'Passport Photo', sd4.`PassportPhoto`, sd4.`DocumentId` FROM `student_documents` sd4
            UNION ALL SELECT 5, 'Caste Certificate', sd5.`CasteCertificate`, sd5.`DocumentId` FROM `student_documents` sd5
            UNION ALL SELECT 6, 'Income Certificate', sd6.`IncomeCertificate`, sd6.`DocumentId` FROM `student_documents` sd6
        ) legacy ON legacy.`source_id` = sd.`DocumentId`
        WHERE NULLIF(TRIM(legacy.`file_name`), '') IS NOT NULL
    ) d
    WHERE d.`StudentId` = p_student_id
      AND d.`DocumentId` = p_document_id
    LIMIT 1;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_document_delete`;
DELIMITER $$
CREATE PROCEDURE `sp_student_document_delete`(
    IN p_student_id BIGINT,
    IN p_document_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    DECLARE v_deleted INT DEFAULT 0;
    DECLARE v_legacy_source_id BIGINT DEFAULT 0;
    DECLARE v_legacy_type INT DEFAULT 0;

    UPDATE `student_document_files`
    SET `is_deleted` = 1,
        `deleted_at` = UTC_TIMESTAMP(),
        `deleted_by` = p_deleted_by
    WHERE `document_id` = p_document_id
      AND `student_id` = p_student_id
      AND `is_deleted` = 0;
    SET v_deleted = ROW_COUNT();

    IF v_deleted = 0 AND p_document_id < 1000000000 THEN
        SET v_legacy_source_id = FLOOR(p_document_id / 100);
        SET v_legacy_type = MOD(p_document_id, 100);

        UPDATE `student_documents`
        SET `AadhaarDocument` = IF(v_legacy_type = 1, NULL, `AadhaarDocument`),
            `PreviousCertificates` = IF(v_legacy_type = 2, NULL, `PreviousCertificates`),
            `TransferCertificate` = IF(v_legacy_type = 3, NULL, `TransferCertificate`),
            `PassportPhoto` = IF(v_legacy_type = 4, NULL, `PassportPhoto`),
            `CasteCertificate` = IF(v_legacy_type = 5, NULL, `CasteCertificate`),
            `IncomeCertificate` = IF(v_legacy_type = 6, NULL, `IncomeCertificate`)
        WHERE `DocumentId` = v_legacy_source_id
          AND `Student_Id` = p_student_id
          AND v_legacy_type BETWEEN 1 AND 6;
        SET v_deleted = ROW_COUNT();
    END IF;

    SELECT IF(v_deleted > 0, 1, 0) AS `Deleted`;
END$$
DELIMITER ;

-- Replace the existing list procedure with a backward-compatible union.
DROP PROCEDURE IF EXISTS `sp_student_documents_get_by_student_id`;
DELIMITER $$
CREATE PROCEDURE `sp_student_documents_get_by_student_id`(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        documents.`document_id`, documents.`student_id`,
        documents.`document_type`, documents.`file_name`, documents.`uploaded_date`
    FROM (
        SELECT
            f.`document_id`, f.`student_id`, f.`document_type`,
            f.`file_name`, f.`uploaded_date`, 0 AS `display_order`
        FROM `student_document_files` f
        WHERE f.`student_id` = p_student_id AND f.`is_deleted` = 0

        UNION ALL

        SELECT (sd.`DocumentId` * 100) + 1, sd.`Student_Id`, 'Aadhaar Document', sd.`AadhaarDocument`, sd.`UploadedDate`, 1
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`AadhaarDocument`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 2, sd.`Student_Id`, 'Previous Certificates', sd.`PreviousCertificates`, sd.`UploadedDate`, 2
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`PreviousCertificates`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 3, sd.`Student_Id`, 'Transfer Certificate', sd.`TransferCertificate`, sd.`UploadedDate`, 3
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`TransferCertificate`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 4, sd.`Student_Id`, 'Passport Photo', sd.`PassportPhoto`, sd.`UploadedDate`, 4
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`PassportPhoto`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 5, sd.`Student_Id`, 'Caste Certificate', sd.`CasteCertificate`, sd.`UploadedDate`, 5
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`CasteCertificate`), '') IS NOT NULL
        UNION ALL SELECT (sd.`DocumentId` * 100) + 6, sd.`Student_Id`, 'Income Certificate', sd.`IncomeCertificate`, sd.`UploadedDate`, 6
        FROM `student_documents` sd WHERE sd.`Student_Id` = p_student_id AND NULLIF(TRIM(sd.`IncomeCertificate`), '') IS NOT NULL
    ) documents
    ORDER BY documents.`uploaded_date` DESC, documents.`display_order`, documents.`document_id` DESC;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_submit`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_submit`(
    IN p_admission_id BIGINT,
    IN p_submitted_by BIGINT
)
BEGIN
    DECLARE v_previous_status VARCHAR(50) DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM `users`
        WHERE `user_id` = p_submitted_by AND `status` = 1 AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    SELECT `AdmissionStatus` INTO v_previous_status
    FROM `studentadmissions`
    WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    LIMIT 1;

    IF v_previous_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF v_previous_status NOT IN ('Draft', 'Registered', 'Application Submitted') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only a draft or registered admission can be submitted.';
    END IF;

    IF v_previous_status <> 'Application Submitted' THEN
        UPDATE `studentadmissions`
        SET `AdmissionStatus` = 'Application Submitted',
            `SubmittedAt` = UTC_TIMESTAMP(),
            `UpdatedAt` = UTC_TIMESTAMP(),
            `UpdatedBy` = p_submitted_by
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0;

        INSERT INTO `admission_status_history` (
            `AdmissionId`, `PreviousStatus`, `NewStatus`, `ActionType`, `Remarks`,
            `ChangedBy`, `ChangedAt`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`
        ) VALUES (
            p_admission_id, v_previous_status, 'Application Submitted', 'SUBMITTED',
            'Admission application submitted through the API.', p_submitted_by,
            UTC_TIMESTAMP(), 1, 0, p_submitted_by, UTC_TIMESTAMP()
        );
    END IF;

    SELECT
        sa.`AdmissionId`, sa.`AdmissionStatus`, sa.`SubmittedAt`
    FROM `studentadmissions` sa
    WHERE sa.`AdmissionId` = p_admission_id;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_get`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_fee_get`(IN p_admission_id BIGINT)
BEGIN
    SELECT
        sa.`AdmissionId`,
        COALESCE(fs.`tuition_fee`, 0.00) AS `TuitionFee`,
        COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00) AS `AdmissionFee`,
        COALESCE(fs.`hostel_fee`, 0.00) AS `HostelFee`,
        COALESCE(fs.`transportation_fee`, 0.00) AS `TransportationFee`,
        COALESCE(fs.`scholarship_amount`, 0.00) AS `ScholarshipAmount`,
        GREATEST(
            COALESCE(fs.`tuition_fee`, 0.00) + COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00)
            + COALESCE(fs.`hostel_fee`, 0.00) + COALESCE(fs.`transportation_fee`, 0.00)
            - COALESCE(fs.`scholarship_amount`, 0.00), 0.00
        ) AS `FirstYearTotal`,
        COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00) AS `AmountPaid`,
        GREATEST(
            COALESCE(fs.`tuition_fee`, 0.00) + COALESCE(fs.`admission_fee`, sa.`AdmissionFeeAmount`, 0.00)
            + COALESCE(fs.`hostel_fee`, 0.00) + COALESCE(fs.`transportation_fee`, 0.00)
            - COALESCE(fs.`scholarship_amount`, 0.00)
            - COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00), 0.00
        ) AS `BalanceAmount`,
        COALESCE(fs.`payment_plan`, 'ONE_TIME') AS `PaymentPlan`,
        COALESCE(fs.`payment_status`, IF(sa.`AdmissionFeePaid` = 1, 'PAID', 'PENDING')) AS `PaymentStatus`,
        COALESCE(fs.`updated_at`, sa.`UpdatedAt`) AS `UpdatedAt`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_fee_structures` fs
        ON fs.`admission_id` = sa.`AdmissionId`
    WHERE sa.`AdmissionId` = p_admission_id AND sa.`IsDeleted` = 0;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_fee_upsert`(
    IN p_admission_id BIGINT,
    IN p_tuition_fee DECIMAL(12,2),
    IN p_admission_fee DECIMAL(12,2),
    IN p_hostel_fee DECIMAL(12,2),
    IN p_transportation_fee DECIMAL(12,2),
    IN p_scholarship_amount DECIMAL(12,2),
    IN p_payment_plan VARCHAR(50),
    IN p_payment_status VARCHAR(50),
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF COALESCE(p_tuition_fee, 0) < 0 OR COALESCE(p_admission_fee, 0) < 0
       OR COALESCE(p_hostel_fee, 0) < 0 OR COALESCE(p_transportation_fee, 0) < 0
       OR COALESCE(p_scholarship_amount, 0) < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fee amounts cannot be negative.';
    END IF;

    INSERT INTO `student_admission_fee_structures` (
        `admission_id`, `tuition_fee`, `admission_fee`, `hostel_fee`,
        `transportation_fee`, `scholarship_amount`, `payment_plan`,
        `payment_status`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, COALESCE(p_tuition_fee, 0), COALESCE(p_admission_fee, 0),
        COALESCE(p_hostel_fee, 0), COALESCE(p_transportation_fee, 0),
        COALESCE(p_scholarship_amount, 0), COALESCE(NULLIF(TRIM(p_payment_plan), ''), 'ONE_TIME'),
        COALESCE(NULLIF(UPPER(TRIM(p_payment_status)), ''), 'PENDING'),
        UTC_TIMESTAMP(), p_updated_by, UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `tuition_fee` = VALUES(`tuition_fee`),
        `admission_fee` = VALUES(`admission_fee`),
        `hostel_fee` = VALUES(`hostel_fee`),
        `transportation_fee` = VALUES(`transportation_fee`),
        `scholarship_amount` = VALUES(`scholarship_amount`),
        `payment_plan` = VALUES(`payment_plan`),
        `payment_status` = VALUES(`payment_status`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;

    CALL `sp_student_admission_fee_get`(p_admission_id);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_get`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_previous_education_get`(IN p_admission_id BIGINT)
BEGIN
    IF EXISTS (
        SELECT 1 FROM `student_admission_previous_education`
        WHERE `admission_id` = p_admission_id
    ) THEN
        SELECT
            pe.`qualification_level` AS `QualificationLevel`,
            pe.`qualification` AS `Qualification`,
            pe.`board_or_university` AS `BoardOrUniversity`,
            pe.`institution` AS `Institution`,
            pe.`roll_number` AS `RollNumber`,
            pe.`passing_year` AS `PassingYear`,
            pe.`stream` AS `Stream`,
            pe.`score` AS `Score`,
            pe.`updated_at` AS `UpdatedAt`
        FROM `student_admission_previous_education` pe
        WHERE pe.`admission_id` = p_admission_id
        ORDER BY FIELD(pe.`qualification_level`, 'TENTH', 'INTERMEDIATE', 'DIPLOMA', 'OTHER'), pe.`previous_education_id`;
    ELSE
        SELECT
            'TENTH' AS `QualificationLevel`,
            'Class 10' AS `Qualification`,
            sa.`PreviousBoard` AS `BoardOrUniversity`,
            sa.`PreviousSchool` AS `Institution`,
            sa.`PreviousHallTicket` AS `RollNumber`,
            sa.`PreviousYear` AS `PassingYear`,
            NULL AS `Stream`,
            sa.`PreviousPercentage` AS `Score`,
            sa.`UpdatedAt` AS `UpdatedAt`
        FROM `studentadmissions` sa
        WHERE sa.`AdmissionId` = p_admission_id
          AND sa.`IsDeleted` = 0
          AND (sa.`PreviousSchool` IS NOT NULL OR sa.`PreviousBoard` IS NOT NULL
               OR sa.`PreviousPercentage` IS NOT NULL);
    END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_upsert`;
DELIMITER $$
CREATE PROCEDURE `sp_student_admission_previous_education_upsert`(
    IN p_admission_id BIGINT,
    IN p_qualification_level VARCHAR(30),
    IN p_qualification VARCHAR(100),
    IN p_board_or_university VARCHAR(150),
    IN p_institution VARCHAR(255),
    IN p_roll_number VARCHAR(50),
    IN p_passing_year VARCHAR(20),
    IN p_stream VARCHAR(100),
    IN p_score DECIMAL(5,2),
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_level VARCHAR(30);
    SET v_level = UPPER(TRIM(p_qualification_level));

    IF NOT EXISTS (
        SELECT 1 FROM `studentadmissions`
        WHERE `AdmissionId` = p_admission_id AND `IsDeleted` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;
    IF v_level NOT IN ('TENTH', 'INTERMEDIATE', 'DIPLOMA', 'OTHER') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid qualification level.';
    END IF;
    IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Score must be between 0 and 100.';
    END IF;

    INSERT INTO `student_admission_previous_education` (
        `admission_id`, `qualification_level`, `qualification`,
        `board_or_university`, `institution`, `roll_number`, `passing_year`,
        `stream`, `score`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, v_level, NULLIF(TRIM(p_qualification), ''),
        NULLIF(TRIM(p_board_or_university), ''), NULLIF(TRIM(p_institution), ''),
        NULLIF(TRIM(p_roll_number), ''), NULLIF(TRIM(p_passing_year), ''),
        NULLIF(TRIM(p_stream), ''), p_score, UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `qualification` = VALUES(`qualification`),
        `board_or_university` = VALUES(`board_or_university`),
        `institution` = VALUES(`institution`),
        `roll_number` = VALUES(`roll_number`),
        `passing_year` = VALUES(`passing_year`),
        `stream` = VALUES(`stream`),
        `score` = VALUES(`score`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_dashboard`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_dashboard`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT
)
BEGIN
    SELECT
        COUNT(*) AS `TotalStudents`,
        SUM(IF(latest.`promotion_id` IS NULL OR latest.`promotion_status` = 'PENDING', 1, 0)) AS `PendingReview`,
        SUM(IF(latest.`promotion_eligibility` = 'ELIGIBLE', 1, 0)) AS `Eligible`,
        SUM(IF(latest.`promotion_status` = 'APPROVED', 1, 0)) AS `Promoted`,
        SUM(IF(latest.`promotion_status` = 'REJECTED', 1, 0)) AS `Rejected`,
        SUM(IF(latest.`promotion_eligibility` = 'FAILED', 1, 0)) AS `Failed`,
        SUM(IF(latest.`promotion_eligibility` = 'DETAINED', 1, 0)) AS `Detained`,
        SUM(IF(latest.`promotion_eligibility` = 'FAILED', 1, 0)) AS `Backlogs`,
        0 AS `PrerequisiteIssues`
    FROM `students` s
    LEFT JOIN `student_promotions` latest
        ON latest.`promotion_id` = (
            SELECT MAX(sp2.`promotion_id`)
            FROM `student_promotions` sp2
            WHERE sp2.`student_id` = s.`student_id`
              AND sp2.`is_active` = 1 AND sp2.`deleted_at` IS NULL
        )
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_directory`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_directory`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    IF p_page_number IS NULL OR p_page_number < 1 THEN SET p_page_number = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT
        s.`student_id` AS `StudentId`,
        s.`student_code` AS `StudentCode`,
        s.`full_name` AS `StudentName`,
        sad.`RollNumber` AS `RollNumber`,
        COALESCE(sa.`RegistrationNo`, sad.`RegistrationNumber`) AS `RegistrationNumber`,
        COALESCE(sa.`AdmissionNo`, sad.`AdmissionNumber`) AS `AdmissionNumber`,
        s.`email` AS `Email`,
        s.`mobile` AS `Mobile`,
        d.`department_name` AS `DepartmentName`,
        s.`course_id` AS `CourseId`,
        COALESCE(NULLIF(c.`course_short_name`, ''), c.`course_name`) AS `CourseName`,
        s.`branch_id` AS `BranchId`,
        b.`branch_name` AS `BranchName`,
        s.`academic_year_id` AS `AcademicYearId`,
        ay.`academic_year_name` AS `AcademicYearName`,
        COALESCE(sec.`semester`, sem.`semester_number`) AS `CurrentSemester`,
        CONCAT('Semester ', COALESCE(sec.`semester`, sem.`semester_number`)) AS `CurrentSemesterName`,
        CASE WHEN COALESCE(sec.`semester`, sem.`semester_number`) < 8
             THEN COALESCE(sec.`semester`, sem.`semester_number`) + 1 ELSE NULL END AS `TargetSemester`,
        CASE WHEN COALESCE(sec.`semester`, sem.`semester_number`) < 8
             THEN CONCAT('Semester ', COALESCE(sec.`semester`, sem.`semester_number`) + 1)
             ELSE 'Degree Completion Review' END AS `TargetSemesterName`,
        sec.`section_name` AS `SectionName`,
        CAST(NULL AS DECIMAL(10,2)) AS `CreditsEarned`,
        CAST(NULL AS DECIMAL(5,2)) AS `Sgpa`,
        CAST(NULL AS DECIMAL(5,2)) AS `Cgpa`,
        CAST(NULL AS SIGNED) AS `FailedSubjectCount`,
        CAST(NULL AS SIGNED) AS `PrerequisiteIssueCount`,
        0 AS `ResultsAvailable`,
        'PENDING_MODULE' AS `ExamIntegrationStatus`,
        COALESCE(latest.`promotion_status`, 'PENDING') AS `PromotionStatus`,
        COALESCE(latest.`promotion_eligibility`, 'PENDING_RESULTS') AS `EligibilityStatus`
    FROM `students` s
    LEFT JOIN `courses` c ON c.`course_id` = s.`course_id`
    LEFT JOIN `branches` b ON b.`branch_id` = s.`branch_id`
    LEFT JOIN `departments` d ON d.`department_id` = b.`department_id`
    LEFT JOIN `studentadmissions` sa ON sa.`AdmissionId` = s.`admission_id`
    LEFT JOIN `student_academic_details` sad
        ON sad.`AcademicId` = (
            SELECT MAX(sad2.`AcademicId`)
            FROM `student_academic_details` sad2
            WHERE sad2.`RegistrationNumber` = sa.`RegistrationNo`
               OR sad2.`AdmissionNumber` = sa.`AdmissionNo`
        )
    INNER JOIN `academicyears` ay ON ay.`academic_year_id` = s.`academic_year_id`
    LEFT JOIN `student_section_assignments` ssa
        ON ssa.`student_section_assignment_id` = (
            SELECT MAX(ssa2.`student_section_assignment_id`)
            FROM `student_section_assignments` ssa2
            WHERE ssa2.`student_id` = s.`student_id` AND ssa2.`status` = 1
        )
    LEFT JOIN `sections` sec ON sec.`section_id` = ssa.`section_id`
    LEFT JOIN `semesters` sem ON sem.`semester_id` = sec.`semester_id`
    LEFT JOIN `student_promotions` latest
        ON latest.`promotion_id` = (
            SELECT MAX(sp2.`promotion_id`)
            FROM `student_promotions` sp2
            WHERE sp2.`student_id` = s.`student_id`
              AND sp2.`is_active` = 1 AND sp2.`deleted_at` IS NULL
        )
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
    ORDER BY s.`full_name`, s.`student_id`
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `students` s
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'));
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_student_promotion_history_directory`;
DELIMITER $$
CREATE PROCEDURE `sp_student_promotion_history_directory`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(255),
    IN p_status VARCHAR(30),
    IN p_page_number INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT DEFAULT 0;
    IF p_page_number IS NULL OR p_page_number < 1 THEN SET p_page_number = 1; END IF;
    IF p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100 THEN SET p_page_size = 20; END IF;
    SET v_offset = (p_page_number - 1) * p_page_size;

    SELECT
        sp.`promotion_id` AS `PromotionId`,
        sp.`student_id` AS `StudentId`,
        s.`student_code` AS `StudentCode`,
        s.`full_name` AS `StudentName`,
        sad.`RollNumber` AS `RollNumber`,
        COALESCE(sa.`RegistrationNo`, sad.`RegistrationNumber`) AS `RegistrationNumber`,
        COALESCE(sa.`AdmissionNo`, sad.`AdmissionNumber`) AS `AdmissionNumber`,
        fay.`academic_year_name` AS `FromAcademicYearName`,
        tay.`academic_year_name` AS `ToAcademicYearName`,
        COALESCE(NULLIF(fc.`course_short_name`, ''), fc.`course_name`) AS `FromCourseName`,
        COALESCE(NULLIF(tc.`course_short_name`, ''), tc.`course_name`) AS `ToCourseName`,
        fb.`branch_name` AS `FromBranchName`,
        tb.`branch_name` AS `ToBranchName`,
        sp.`from_semester` AS `FromSemester`,
        sp.`to_semester` AS `ToSemester`,
        sp.`promotion_status` AS `PromotionStatus`,
        sp.`promotion_eligibility` AS `PromotionEligibility`,
        CAST(NULL AS DECIMAL(5,2)) AS `Cgpa`,
        CAST(NULL AS DECIMAL(10,2)) AS `CreditsEarned`,
        CASE WHEN sp.`decision_by` IS NULL THEN 'System' ELSE 'Individual' END AS `PromotionMode`,
        actor.`full_name` AS `PromotedBy`,
        COALESCE(sp.`decision_date`, sp.`created_at`) AS `PromotionDate`,
        sp.`remarks` AS `Remarks`,
        sp.`created_at` AS `CreatedAt`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    LEFT JOIN `studentadmissions` sa ON sa.`AdmissionId` = s.`admission_id`
    LEFT JOIN `student_academic_details` sad
        ON sad.`AcademicId` = (
            SELECT MAX(sad2.`AcademicId`)
            FROM `student_academic_details` sad2
            WHERE sad2.`RegistrationNumber` = sa.`RegistrationNo`
               OR sad2.`AdmissionNumber` = sa.`AdmissionNo`
        )
    LEFT JOIN `users` actor ON actor.`user_id` = COALESCE(sp.`decision_by`, sp.`created_by`)
    LEFT JOIN `academicyears` fay ON fay.`academic_year_id` = sp.`from_academic_year_id`
    LEFT JOIN `academicyears` tay ON tay.`academic_year_id` = sp.`to_academic_year_id`
    LEFT JOIN `courses` fc ON fc.`course_id` = sp.`from_course_id`
    LEFT JOIN `courses` tc ON tc.`course_id` = sp.`to_course_id`
    LEFT JOIN `branches` fb ON fb.`branch_id` = sp.`from_branch_id`
    LEFT JOIN `branches` tb ON tb.`branch_id` = sp.`to_branch_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
      AND (NULLIF(TRIM(p_status), '') IS NULL OR UPPER(p_status) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM(p_status)))
    ORDER BY sp.`created_at` DESC, sp.`promotion_id` DESC
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM(p_search), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM(p_search), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM(p_search), '%'))
      AND (NULLIF(TRIM(p_status), '') IS NULL OR UPPER(p_status) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM(p_status)));
END$$
DELIMITER ;

-- Smoke-test examples (execute after applying this file):
-- CALL sp_student_admission_list(NULL, NULL, 1, 20);
-- CALL sp_student_admission_fee_get(1);
-- CALL sp_student_admission_previous_education_get(1);
-- CALL sp_student_promotion_dashboard(NULL, NULL, NULL, NULL);
-- CALL sp_student_promotion_directory(NULL, NULL, NULL, NULL, NULL, 1, 20);
-- CALL sp_student_promotion_history_directory(NULL, NULL, NULL, 1, 20);
-- END Database/StudentIntegration/StudentIntegrationOperations.sql


-- BEGIN Database/StudentProfile/StudentProfileUpdatesTable.sql
-- =============================================================
-- STUDENT PROFILE UPDATE HISTORY TABLE
-- Idempotent: existing tables/data are preserved.
-- MySQL 8.x / database: cms_btech
-- =============================================================

USE `cms_btech`;

CREATE TABLE IF NOT EXISTS `student_profile_updates` (
    `StudentProfileUpdateId` BIGINT NOT NULL AUTO_INCREMENT,
    `StudentProfileId` BIGINT NOT NULL,
    `StudentId` BIGINT NOT NULL,
    `ChangeType` VARCHAR(50) NOT NULL DEFAULT 'Update',
    `ChangedFields` LONGTEXT NULL,
    `OldValues` LONGTEXT NULL,
    `NewValues` LONGTEXT NULL,
    `ChangeReason` VARCHAR(500) NULL,
    `ChangeSource` VARCHAR(50) NOT NULL DEFAULT 'API',
    `ChangedBy` BIGINT NULL,
    `ChangedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `IpAddress` VARCHAR(45) NULL,
    `UserAgent` VARCHAR(500) NULL,
    PRIMARY KEY (`StudentProfileUpdateId`),
    KEY `IX_StudentProfileUpdates_ProfileDate` (`StudentProfileId`, `ChangedAt`),
    KEY `IX_StudentProfileUpdates_StudentDate` (`StudentId`, `ChangedAt`),
    KEY `IX_StudentProfileUpdates_ChangedBy` (`ChangedBy`),
    KEY `IX_StudentProfileUpdates_ChangeType` (`ChangeType`),
    KEY `IX_StudentProfileUpdates_ChangedAt` (`ChangedAt`),
    CONSTRAINT `FK_StudentProfileUpdates_StudentProfile`
        FOREIGN KEY (`StudentProfileId`)
        REFERENCES `student_profiles` (`StudentProfileId`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `FK_StudentProfileUpdates_Student`
        FOREIGN KEY (`StudentId`)
        REFERENCES `students` (`student_id`)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `FK_StudentProfileUpdates_ChangedBy`
        FOREIGN KEY (`ChangedBy`)
        REFERENCES `users` (`user_id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Immutable history of changes made to student profiles';
-- END Database/StudentProfile/StudentProfileUpdatesTable.sql


-- BEGIN Database/StudentProfile/StudentProfileFullUpdateStoredProcedure.sql
-- =============================================================
-- STUDENT PROFILE SCREEN: PERSONAL + PARENT UPDATE
-- MySQL 8.x. Updates the editable profile-screen fields and the
-- immutable student_profile_updates history in one transaction.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_student_profile_full_update`;
DELIMITER $$
CREATE PROCEDURE `sp_student_profile_full_update`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_father_name VARCHAR(150),
    IN p_father_mobile VARCHAR(20),
    IN p_father_email VARCHAR(150),
    IN p_father_occupation VARCHAR(100),
    IN p_mother_name VARCHAR(150),
    IN p_mother_mobile VARCHAR(20),
    IN p_mother_email VARCHAR(150),
    IN p_mother_occupation VARCHAR(100),
    IN p_change_reason VARCHAR(500),
    IN p_changed_by BIGINT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_profile_id BIGINT DEFAULT NULL;
    DECLARE v_existing_student_id BIGINT DEFAULT NULL;
    DECLARE v_old_values JSON;
    DECLARE v_new_values JSON;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0
       OR p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid student and college are required.';
    END IF;
    IF NULLIF(TRIM(p_full_name), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;
    IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of birth cannot be in the future.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM `users`
        WHERE `user_id` = p_changed_by AND `status` = 1 AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    START TRANSACTION;

    SELECT s.`student_id`
      INTO v_existing_student_id
    FROM `students` s
    WHERE s.`student_id` = p_student_id
      AND s.`college_id` = p_college_id
      AND s.`deleted_at` IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_existing_student_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student profile not found for this college.';
    END IF;

    SELECT sp.`StudentProfileId`
      INTO v_profile_id
    FROM `student_profiles` sp
    WHERE sp.`StudentId` = p_student_id AND sp.`IsDeleted` = 0
    LIMIT 1
    FOR UPDATE;

    IF v_profile_id IS NULL THEN
        INSERT INTO `student_profiles` (
            `StudentId`, `BloodGroup`, `Address`, `IsActive`, `IsDeleted`,
            `CreatedBy`, `CreatedAt`, `UpdatedBy`, `UpdatedAt`
        ) VALUES (
            p_student_id, p_blood_group, p_address, 1, 0,
            p_changed_by, UTC_TIMESTAMP(), p_changed_by, UTC_TIMESTAMP()
        );
        SET v_profile_id = LAST_INSERT_ID();
    END IF;

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`
    ) INTO v_old_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    UPDATE `students`
    SET `full_name` = TRIM(p_full_name),
        `gender` = COALESCE(NULLIF(TRIM(p_gender), ''), `gender`),
        `date_of_birth` = COALESCE(p_date_of_birth, `date_of_birth`),
        `email` = COALESCE(NULLIF(TRIM(p_email), ''), `email`),
        `mobile` = COALESCE(NULLIF(TRIM(p_mobile), ''), `mobile`),
        `blood_group` = COALESCE(NULLIF(TRIM(p_blood_group), ''), `blood_group`),
        `address` = COALESCE(NULLIF(TRIM(p_address), ''), `address`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_changed_by
    WHERE `student_id` = p_student_id AND `college_id` = p_college_id;

    UPDATE `student_profiles`
    SET `BloodGroup` = COALESCE(NULLIF(TRIM(p_blood_group), ''), `BloodGroup`),
        `Address` = COALESCE(NULLIF(TRIM(p_address), ''), `Address`),
        `UpdatedBy` = p_changed_by,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `StudentProfileId` = v_profile_id;

    INSERT INTO `student_parents` (
        `student_id`, `father_name`, `father_mobile`, `father_email`,
        `father_occupation`, `mother_name`, `mother_mobile`, `mother_email`,
        `mother_occupation`, `created_at`, `updated_at`
    ) VALUES (
        p_student_id, NULLIF(TRIM(p_father_name), ''), NULLIF(TRIM(p_father_mobile), ''),
        NULLIF(TRIM(p_father_email), ''), NULLIF(TRIM(p_father_occupation), ''),
        NULLIF(TRIM(p_mother_name), ''), NULLIF(TRIM(p_mother_mobile), ''),
        NULLIF(TRIM(p_mother_email), ''), NULLIF(TRIM(p_mother_occupation), ''),
        UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        `father_name` = COALESCE(NULLIF(TRIM(p_father_name), ''), `father_name`),
        `father_mobile` = COALESCE(NULLIF(TRIM(p_father_mobile), ''), `father_mobile`),
        `father_email` = COALESCE(NULLIF(TRIM(p_father_email), ''), `father_email`),
        `father_occupation` = COALESCE(NULLIF(TRIM(p_father_occupation), ''), `father_occupation`),
        `mother_name` = COALESCE(NULLIF(TRIM(p_mother_name), ''), `mother_name`),
        `mother_mobile` = COALESCE(NULLIF(TRIM(p_mother_mobile), ''), `mother_mobile`),
        `mother_email` = COALESCE(NULLIF(TRIM(p_mother_email), ''), `mother_email`),
        `mother_occupation` = COALESCE(NULLIF(TRIM(p_mother_occupation), ''), `mother_occupation`),
        `updated_at` = UTC_TIMESTAMP();

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`
    ) INTO v_new_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    INSERT INTO `student_profile_updates` (
        `StudentProfileId`, `StudentId`, `ChangeType`, `ChangedFields`,
        `OldValues`, `NewValues`, `ChangeReason`, `ChangeSource`,
        `ChangedBy`, `ChangedAt`, `IpAddress`, `UserAgent`
    ) VALUES (
        v_profile_id, p_student_id, 'ProfileScreenUpdate',
        JSON_ARRAY(
            'FullName', 'Gender', 'DateOfBirth', 'Email', 'Mobile',
            'BloodGroup', 'Address', 'FatherName', 'FatherMobile',
            'FatherEmail', 'FatherOccupation', 'MotherName', 'MotherMobile',
            'MotherEmail', 'MotherOccupation'
        ),
        v_old_values, v_new_values,
        COALESCE(NULLIF(TRIM(p_change_reason), ''), 'Student profile updated from the profile screen.'),
        'API', p_changed_by, UTC_TIMESTAMP(6),
        LEFT(p_ip_address, 45), LEFT(p_user_agent, 500)
    );

    COMMIT;
    SELECT 1 AS `Updated`;
END$$
DELIMITER ;
-- END Database/StudentProfile/StudentProfileFullUpdateStoredProcedure.sql


-- BEGIN Database/StudentManagement/StudentManagementStoredProcedures.sql
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
-- END Database/StudentManagement/StudentManagementStoredProcedures.sql


-- BEGIN Database/StudentProfile/StudentPersonalInformationStoredProcedures.sql
-- =============================================================
-- STUDENT PROFILE: PERSONAL INFORMATION + AUDIT
-- MySQL 8.x
-- Prerequisites already present in the supplied database:
--   students, student_profiles, student_profile_updates,
--   courses, branches, academicyears, users
-- =============================================================

USE cms_btech;

DROP PROCEDURE IF EXISTS sp_student_profile_personal_get;
DROP PROCEDURE IF EXISTS sp_student_profile_personal_update;

DELIMITER $$

CREATE PROCEDURE sp_student_profile_personal_get(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        s.student_id,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        sp.ProfilePhoto AS profile_photo,
        sp.AlternateEmail AS alternate_email,
        sp.AlternateMobile AS alternate_mobile,
        COALESCE(sp.BloodGroup, s.blood_group) AS blood_group,
        sp.Nationality AS nationality,
        sp.Religion AS religion,
        sp.Category AS category,
        COALESCE(sp.Address, s.address) AS address,
        sp.City AS city,
        sp.District AS district,
        sp.State AS state,
        COALESCE(sp.Country, 'India') AS country,
        sp.Pincode AS pincode,
        COALESCE(sp.ProfileStatus, 'Incomplete') AS profile_status,
        COALESCE(sp.IsProfileCompleted, 0) AS is_profile_completed,
        COALESCE(sp.IsVerified, 0) AS is_verified,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS profile_completion_percentage,
        s.college_id,
        s.course_id,
        c.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        COALESCE(
            GREATEST(
                COALESCE(s.updated_at, s.created_at),
                COALESCE(sp.UpdatedAt, sp.CreatedAt)
            ),
            s.updated_at,
            s.created_at
        ) AS updated_at
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    LEFT JOIN courses c
        ON c.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_student_profile_personal_update(
    IN p_student_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_profile_photo VARCHAR(500),
    IN p_alternate_email VARCHAR(150),
    IN p_alternate_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_nationality VARCHAR(100),
    IN p_religion VARCHAR(100),
    IN p_category VARCHAR(100),
    IN p_address TEXT,
    IN p_city VARCHAR(100),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_change_reason VARCHAR(500),
    IN p_changed_by BIGINT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_profile_id BIGINT DEFAULT NULL;
    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_changed_fields JSON;
    DECLARE v_old_values JSON;
    DECLARE v_new_values JSON;

    DECLARE v_old_full_name VARCHAR(150);
    DECLARE v_old_gender VARCHAR(20);
    DECLARE v_old_date_of_birth DATE;
    DECLARE v_old_email VARCHAR(150);
    DECLARE v_old_mobile VARCHAR(20);
    DECLARE v_old_profile_photo VARCHAR(500);
    DECLARE v_old_alternate_email VARCHAR(150);
    DECLARE v_old_alternate_mobile VARCHAR(20);
    DECLARE v_old_blood_group VARCHAR(10);
    DECLARE v_old_nationality VARCHAR(100);
    DECLARE v_old_religion VARCHAR(100);
    DECLARE v_old_category VARCHAR(100);
    DECLARE v_old_address TEXT;
    DECLARE v_old_city VARCHAR(100);
    DECLARE v_old_district VARCHAR(100);
    DECLARE v_old_state VARCHAR(100);
    DECLARE v_old_country VARCHAR(100);
    DECLARE v_old_pincode VARCHAR(10);
    DECLARE v_completion_percentage DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_completed TINYINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_changed_fields = JSON_ARRAY();
    SET v_old_values = JSON_OBJECT();
    SET v_new_values = JSON_OBJECT();

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_changed_by IS NULL OR p_changed_by <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid logged-in user is required.';
    END IF;

    IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Date of birth cannot be in the future.';
    END IF;

    START TRANSACTION;

    SELECT COUNT(*)
    INTO v_student_exists
    FROM students s
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL;

    IF v_student_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student profile not found.';
    END IF;

    SELECT
        sp.StudentProfileId,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        sp.ProfilePhoto,
        sp.AlternateEmail,
        sp.AlternateMobile,
        COALESCE(sp.BloodGroup, s.blood_group),
        sp.Nationality,
        sp.Religion,
        sp.Category,
        COALESCE(sp.Address, s.address),
        sp.City,
        sp.District,
        sp.State,
        COALESCE(sp.Country, 'India'),
        sp.Pincode
    INTO
        v_profile_id,
        v_old_full_name,
        v_old_gender,
        v_old_date_of_birth,
        v_old_email,
        v_old_mobile,
        v_old_profile_photo,
        v_old_alternate_email,
        v_old_alternate_mobile,
        v_old_blood_group,
        v_old_nationality,
        v_old_religion,
        v_old_category,
        v_old_address,
        v_old_city,
        v_old_district,
        v_old_state,
        v_old_country,
        v_old_pincode
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF p_full_name IS NOT NULL AND NOT (p_full_name <=> v_old_full_name) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'FullName');
        SET v_old_values = JSON_SET(v_old_values, '$.FullName', v_old_full_name);
        SET v_new_values = JSON_SET(v_new_values, '$.FullName', p_full_name);
    END IF;
    IF p_gender IS NOT NULL AND NOT (p_gender <=> v_old_gender) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Gender');
        SET v_old_values = JSON_SET(v_old_values, '$.Gender', v_old_gender);
        SET v_new_values = JSON_SET(v_new_values, '$.Gender', p_gender);
    END IF;
    IF p_date_of_birth IS NOT NULL AND NOT (p_date_of_birth <=> v_old_date_of_birth) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'DateOfBirth');
        SET v_old_values = JSON_SET(v_old_values, '$.DateOfBirth', v_old_date_of_birth);
        SET v_new_values = JSON_SET(v_new_values, '$.DateOfBirth', p_date_of_birth);
    END IF;
    IF p_email IS NOT NULL AND NOT (p_email <=> v_old_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Email');
        SET v_old_values = JSON_SET(v_old_values, '$.Email', v_old_email);
        SET v_new_values = JSON_SET(v_new_values, '$.Email', p_email);
    END IF;
    IF p_mobile IS NOT NULL AND NOT (p_mobile <=> v_old_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Mobile');
        SET v_old_values = JSON_SET(v_old_values, '$.Mobile', v_old_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.Mobile', p_mobile);
    END IF;
    IF p_profile_photo IS NOT NULL AND NOT (p_profile_photo <=> v_old_profile_photo) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'ProfilePhoto');
        SET v_old_values = JSON_SET(v_old_values, '$.ProfilePhoto', v_old_profile_photo);
        SET v_new_values = JSON_SET(v_new_values, '$.ProfilePhoto', p_profile_photo);
    END IF;
    IF p_alternate_email IS NOT NULL AND NOT (p_alternate_email <=> v_old_alternate_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateEmail');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateEmail', v_old_alternate_email);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateEmail', p_alternate_email);
    END IF;
    IF p_alternate_mobile IS NOT NULL AND NOT (p_alternate_mobile <=> v_old_alternate_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateMobile');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateMobile', v_old_alternate_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateMobile', p_alternate_mobile);
    END IF;
    IF p_blood_group IS NOT NULL AND NOT (p_blood_group <=> v_old_blood_group) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'BloodGroup');
        SET v_old_values = JSON_SET(v_old_values, '$.BloodGroup', v_old_blood_group);
        SET v_new_values = JSON_SET(v_new_values, '$.BloodGroup', p_blood_group);
    END IF;
    IF p_nationality IS NOT NULL AND NOT (p_nationality <=> v_old_nationality) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Nationality');
        SET v_old_values = JSON_SET(v_old_values, '$.Nationality', v_old_nationality);
        SET v_new_values = JSON_SET(v_new_values, '$.Nationality', p_nationality);
    END IF;
    IF p_religion IS NOT NULL AND NOT (p_religion <=> v_old_religion) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Religion');
        SET v_old_values = JSON_SET(v_old_values, '$.Religion', v_old_religion);
        SET v_new_values = JSON_SET(v_new_values, '$.Religion', p_religion);
    END IF;
    IF p_category IS NOT NULL AND NOT (p_category <=> v_old_category) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Category');
        SET v_old_values = JSON_SET(v_old_values, '$.Category', v_old_category);
        SET v_new_values = JSON_SET(v_new_values, '$.Category', p_category);
    END IF;
    IF p_address IS NOT NULL AND NOT (p_address <=> v_old_address) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Address');
        SET v_old_values = JSON_SET(v_old_values, '$.Address', v_old_address);
        SET v_new_values = JSON_SET(v_new_values, '$.Address', p_address);
    END IF;
    IF p_city IS NOT NULL AND NOT (p_city <=> v_old_city) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'City');
        SET v_old_values = JSON_SET(v_old_values, '$.City', v_old_city);
        SET v_new_values = JSON_SET(v_new_values, '$.City', p_city);
    END IF;
    IF p_district IS NOT NULL AND NOT (p_district <=> v_old_district) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'District');
        SET v_old_values = JSON_SET(v_old_values, '$.District', v_old_district);
        SET v_new_values = JSON_SET(v_new_values, '$.District', p_district);
    END IF;
    IF p_state IS NOT NULL AND NOT (p_state <=> v_old_state) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'State');
        SET v_old_values = JSON_SET(v_old_values, '$.State', v_old_state);
        SET v_new_values = JSON_SET(v_new_values, '$.State', p_state);
    END IF;
    IF p_country IS NOT NULL AND NOT (p_country <=> v_old_country) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Country');
        SET v_old_values = JSON_SET(v_old_values, '$.Country', v_old_country);
        SET v_new_values = JSON_SET(v_new_values, '$.Country', p_country);
    END IF;
    IF p_pincode IS NOT NULL AND NOT (p_pincode <=> v_old_pincode) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Pincode');
        SET v_old_values = JSON_SET(v_old_values, '$.Pincode', v_old_pincode);
        SET v_new_values = JSON_SET(v_new_values, '$.Pincode', p_pincode);
    END IF;

    IF JSON_LENGTH(v_changed_fields) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No personal-information values changed.';
    END IF;

    UPDATE students
    SET
        full_name = COALESCE(p_full_name, full_name),
        gender = COALESCE(p_gender, gender),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        email = COALESCE(p_email, email),
        mobile = COALESCE(p_mobile, mobile),
        blood_group = COALESCE(p_blood_group, blood_group),
        address = COALESCE(p_address, address),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_changed_by
    WHERE student_id = p_student_id;

    IF v_profile_id IS NULL THEN
        INSERT INTO student_profiles
        (
            StudentId, ProfilePhoto, AlternateEmail, AlternateMobile,
            BloodGroup, Nationality, Religion, Category, Address,
            City, District, State, Country, Pincode,
            IsActive, IsDeleted, CreatedBy, CreatedAt
        )
        VALUES
        (
            p_student_id, p_profile_photo, p_alternate_email, p_alternate_mobile,
            p_blood_group, p_nationality, p_religion, p_category, p_address,
            p_city, p_district, p_state, COALESCE(p_country, 'India'), p_pincode,
            1, 0, p_changed_by, UTC_TIMESTAMP()
        );

        SET v_profile_id = LAST_INSERT_ID();
    ELSE
        UPDATE student_profiles
        SET
            ProfilePhoto = COALESCE(p_profile_photo, ProfilePhoto),
            AlternateEmail = COALESCE(p_alternate_email, AlternateEmail),
            AlternateMobile = COALESCE(p_alternate_mobile, AlternateMobile),
            BloodGroup = COALESCE(p_blood_group, BloodGroup),
            Nationality = COALESCE(p_nationality, Nationality),
            Religion = COALESCE(p_religion, Religion),
            Category = COALESCE(p_category, Category),
            Address = COALESCE(p_address, Address),
            City = COALESCE(p_city, City),
            District = COALESCE(p_district, District),
            State = COALESCE(p_state, State),
            Country = COALESCE(p_country, Country),
            Pincode = COALESCE(p_pincode, Pincode),
            UpdatedBy = p_changed_by,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StudentProfileId = v_profile_id;
    END IF;

    SELECT
        ROUND(
            (
                (s.full_name IS NOT NULL AND TRIM(s.full_name) <> '') +
                (s.gender IS NOT NULL AND TRIM(s.gender) <> '') +
                (s.date_of_birth IS NOT NULL) +
                (s.email IS NOT NULL AND TRIM(s.email) <> '') +
                (s.mobile IS NOT NULL AND TRIM(s.mobile) <> '') +
                (sp.BloodGroup IS NOT NULL AND TRIM(sp.BloodGroup) <> '') +
                (sp.Nationality IS NOT NULL AND TRIM(sp.Nationality) <> '') +
                (sp.Address IS NOT NULL AND TRIM(sp.Address) <> '') +
                (sp.City IS NOT NULL AND TRIM(sp.City) <> '') +
                (sp.District IS NOT NULL AND TRIM(sp.District) <> '') +
                (sp.State IS NOT NULL AND TRIM(sp.State) <> '') +
                (sp.Country IS NOT NULL AND TRIM(sp.Country) <> '') +
                (sp.Pincode IS NOT NULL AND TRIM(sp.Pincode) <> '')
            ) / 13 * 100,
            2
        )
    INTO v_completion_percentage
    FROM students s
    INNER JOIN student_profiles sp ON sp.StudentId = s.student_id
    WHERE s.student_id = p_student_id;

    SET v_completed = IF(v_completion_percentage = 100.00, 1, 0);

    UPDATE student_profiles
    SET
        ProfileCompletionPercentage = v_completion_percentage,
        IsProfileCompleted = v_completed,
        ProfileStatus = CASE
            WHEN ProfileStatus IN ('Verified', 'Active', 'Inactive', 'Suspended')
                THEN ProfileStatus
            WHEN v_completed = 1 THEN 'Pending Verification'
            ELSE 'Incomplete'
        END,
        UpdatedBy = p_changed_by,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentProfileId = v_profile_id;

    INSERT INTO student_profile_updates
    (
        StudentProfileId,
        StudentId,
        ChangeType,
        ChangedFields,
        OldValues,
        NewValues,
        ChangeReason,
        ChangeSource,
        ChangedBy,
        ChangedAt,
        IpAddress,
        UserAgent
    )
    VALUES
    (
        v_profile_id,
        p_student_id,
        'Update',
        CAST(v_changed_fields AS CHAR),
        CAST(v_old_values AS CHAR),
        CAST(v_new_values AS CHAR),
        NULLIF(TRIM(p_change_reason), ''),
        'Profile API',
        p_changed_by,
        UTC_TIMESTAMP(6),
        p_ip_address,
        p_user_agent
    );

    COMMIT;

    CALL sp_student_profile_personal_get(p_student_id);
END$$

DELIMITER ;

-- Verification commands:
-- CALL sp_student_profile_personal_get(1);
-- CALL sp_student_profile_personal_update(
--   1, NULL, NULL, NULL, NULL, NULL, NULL,
--   'student.personal@example.com', '9000000099', NULL,
--   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
--   'Updated alternate contact details', 1, '127.0.0.1', 'MySQL Workbench'
-- );
-- END Database/StudentProfile/StudentPersonalInformationStoredProcedures.sql


-- BEGIN Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_all.sql
DROP PROCEDURE IF EXISTS sp_student_profile_get_all;

DELIMITER $$

CREATE PROCEDURE sp_student_profile_get_all
(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(200),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester INT,
    IN p_section_id BIGINT,
    IN p_status INT
)
BEGIN

    SELECT
        s.student_id AS StudentId,
        s.student_code AS StudentCode,
        s.full_name AS StudentName,
        COALESCE(sp.ProfilePhoto, sa.StudentPhoto, sa.PassportPhoto) AS ProfilePhoto,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        -- Admission information
        sa.RegistrationNo AS RegistrationNumber,
        sa.AdmissionNo AS AdmissionNumber,

        -- Academic information
        s.course_id AS CourseId,
        c.course_name AS Course,

        s.branch_id AS BranchId,
        b.branch_name AS Branch,

        b.department_id AS DepartmentId,
        d.department_name AS Department,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,
        sec.section_id AS SectionId,
        sec.section_name AS Section,

        -- Contact
        s.mobile AS Mobile,
        s.email AS Email,

        -- Status
        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        s.college_id = p_college_id
        AND s.deleted_at IS NULL

        -- Search
        AND
        (
            p_search IS NULL
            OR TRIM(p_search) = ''

            OR s.full_name LIKE CONCAT('%', p_search, '%')

            OR s.student_code LIKE CONCAT('%', p_search, '%')

            OR s.mobile LIKE CONCAT('%', p_search, '%')

            OR s.email LIKE CONCAT('%', p_search, '%')

            OR sa.RegistrationNo LIKE CONCAT('%', p_search, '%')

            OR sa.AdmissionNo LIKE CONCAT('%', p_search, '%')
        )

        -- Department
        AND
        (
            p_department_id IS NULL
            OR b.department_id = p_department_id
        )

        -- Course
        AND
        (
            p_course_id IS NULL
            OR s.course_id = p_course_id
        )

        -- Branch
        AND
        (
            p_branch_id IS NULL
            OR s.branch_id = p_branch_id
        )

        -- Academic Year
        AND
        (
            p_academic_year_id IS NULL
            OR s.academic_year_id = p_academic_year_id
        )

        -- Semester
        AND
        (
            p_semester IS NULL
            OR sec.semester = p_semester
        )

        -- Section
        AND
        (
            p_section_id IS NULL
            OR sec.section_id = p_section_id
        )

        -- Status
        AND
        (
            p_status IS NULL
            OR s.status = p_status
        )

    ORDER BY
        s.student_id DESC;

END$$

DELIMITER ;
-- END Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_all.sql


-- BEGIN Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_preview.sql
DROP PROCEDURE IF EXISTS sp_student_profile_get_preview;

DELIMITER $$

CREATE PROCEDURE sp_student_profile_get_preview
(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT
)
BEGIN

    SELECT

        /* =========================
           HEADER
           ========================= */

        s.student_id AS StudentId,

        s.student_code AS StudentCode,

        s.full_name AS StudentName,

        COALESCE(
            sp.ProfilePhoto,
            sa.StudentPhoto,
            sa.PassportPhoto
        ) AS ProfilePhoto,

        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status,


        /* =========================
           SUMMARY
           ========================= */

        sa.RegistrationNo AS RegistrationNumber,

        sa.AdmissionNo AS AdmissionNumber,

        NULL AS RollNumber,

        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS StudentStatus,


        /* =========================
           FEE STATUS
           ========================= */

        CASE

            WHEN sa.AdmissionFeeAmount IS NULL
                THEN 'Not available'

            WHEN sa.AdmissionFeeAmount = 0
                THEN 'Not available'

            WHEN sa.AdmissionFeePaid = 1
                THEN 'Paid'

            ELSE 'Pending'

        END AS FeeStatus,


        /* =========================
           ATTENDANCE / RESULTS
           ========================= */

        'Not available' AS AttendanceStatus,

        'Not available' AS ResultStatus,


        /* =========================
           ACADEMIC INFORMATION
           ========================= */

        s.course_id AS CourseId,

        c.course_name AS Course,

        b.department_id AS DepartmentId,

        d.department_name AS Department,

        s.branch_id AS BranchId,

        b.branch_name AS Branch,

        s.academic_year_id AS AcademicYearId,

        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,

        sec.section_id AS SectionId,

        sec.section_name AS Section,

        NULL AS AcademicRollNumber,

        sa.RegistrationNo AS AcademicRegistrationNumber,


        /* =========================
           PERSONAL INFORMATION
           ========================= */

        s.full_name AS PersonalFullName,

        s.gender AS Gender,

        s.date_of_birth AS DateOfBirth,

        s.mobile AS Mobile,

        s.email AS Email,

        s.blood_group AS BloodGroup,

        s.address AS Address,


        /* =========================
           PARENT / GUARDIAN
           ========================= */

        COALESCE(spar.father_name, sa.FatherName) AS FatherName,

        COALESCE(spar.mother_name, sa.MotherName) AS MotherName,

        sa.GuardianName AS GuardianName,

        COALESCE(spar.father_mobile, spar.mother_mobile, sa.GuardianMobile) AS ParentMobile,

        COALESCE(spar.father_email, spar.mother_email, sa.GuardianEmail) AS ParentEmail,

        COALESCE(spar.father_occupation, sa.Occupation) AS FatherOccupation,

        spar.mother_occupation AS MotherOccupation


    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN student_parents spar
        ON spar.student_id = s.student_id

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        s.student_id = p_student_id
        AND s.college_id = p_college_id
        AND s.deleted_at IS NULL;

END$$

DELIMITER ;
-- END Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_preview.sql


-- BEGIN Database/Sql/Stored Procedures/StudentPromotionEligible/sp_student_promotion_get_eligible.sql
DROP PROCEDURE IF EXISTS sp_student_promotion_get_eligible;

DELIMITER $$

CREATE PROCEDURE sp_student_promotion_get_eligible
(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester INT,
    IN p_search VARCHAR(150)
)
BEGIN

    /*
        =========================================================
        VALIDATE ACADEMIC YEAR
        =========================================================
    */

    IF NOT EXISTS
    (
        SELECT 1
        FROM academicyears ay
        WHERE ay.academic_year_id = p_academic_year_id
          AND ay.deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year does not exist.';

    END IF;


    /*
        =========================================================
        GET ELIGIBLE STUDENTS
        =========================================================
    */

    SELECT

        st.student_id AS StudentId,

        st.student_code AS StudentCode,

        st.full_name AS StudentName,

        NULL AS RollNumber,

        sa.RegistrationNo AS RegistrationNumber,

        st.email AS Email,

        st.mobile AS Mobile,

        st.college_id AS CollegeId,

        c.course_id AS CourseId,

        c.course_code AS CourseCode,

        c.course_name AS CourseName,

        b.branch_id AS BranchId,

        b.branch_code AS BranchCode,

        b.branch_name AS BranchName,

        st.academic_year_id AS AcademicYearId,

        ay.academic_year_name AS AcademicYearName,

        sec.section_id AS SectionId,

        sec.section_name AS SectionName,

        COALESCE(sec.semester, sem.semester_number) AS CurrentSemester,

        c.total_semesters AS TotalSemesters,

        COALESCE(sec.semester, sem.semester_number) + 1 AS NextSemester,

        'PENDING_REVIEW' AS EligibilityStatus,

        NULL AS PromotionStatus,

        0 AS ResultsAvailable,

        NULL AS Sgpa,

        NULL AS Cgpa,

        NULL AS CreditsEarned

    FROM students st

    INNER JOIN academicyears ay
        ON ay.academic_year_id = st.academic_year_id
       AND ay.deleted_at IS NULL

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = st.admission_id
       AND sa.IsDeleted = 0

    LEFT JOIN courses c
        ON c.course_id = st.course_id
       AND c.deleted_at IS NULL

    LEFT JOIN branches b
        ON b.branch_id = st.branch_id
       AND b.deleted_at IS NULL

    /*
        Get the student's current active section
    */

    INNER JOIN student_section_assignments ssa
        ON ssa.student_id = st.student_id
       AND ssa.academic_year_id = st.academic_year_id
       AND ssa.status = 1

    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.deleted_at IS NULL
       AND sec.status = 1

    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0

    WHERE

        /*
            Student must be active
        */
        st.status = 1

        AND st.deleted_at IS NULL

        /*
            College isolation
        */
        AND st.college_id = p_college_id

        /*
            Academic year
        */
        AND st.academic_year_id = p_academic_year_id

        /*
            Optional course filter
        */
        AND
        (
            p_course_id IS NULL
            OR st.course_id = p_course_id
        )

        /*
            Optional branch filter
        */
        AND
        (
            p_branch_id IS NULL
            OR st.branch_id = p_branch_id
        )

        /*
            Optional semester filter
        */
        AND
        (
            p_semester IS NULL
            OR COALESCE(sec.semester, sem.semester_number) = p_semester
        )

        /*
            Student must not be in final semester.
        */
        AND
        (
            c.total_semesters IS NULL
            OR COALESCE(sec.semester, sem.semester_number) < c.total_semesters
        )

        /*
            Don't show students who already have an active
            promotion evaluation for this academic year.
        */
        AND NOT EXISTS
        (
            SELECT 1
            FROM student_promotions sp
            WHERE sp.student_id = st.student_id

              AND sp.from_academic_year_id = st.academic_year_id

              AND sp.from_semester = COALESCE(sec.semester, sem.semester_number)

              AND sp.deleted_at IS NULL

              AND sp.promotion_status IN
              (
                  'PENDING',
                  'APPROVED'
              )
        )

        /*
            Search
        */
        AND
        (
            p_search IS NULL
            OR p_search = ''

            OR st.student_code LIKE CONCAT('%', p_search, '%')

            OR st.full_name LIKE CONCAT('%', p_search, '%')

            OR st.email LIKE CONCAT('%', p_search, '%')

            OR st.mobile LIKE CONCAT('%', p_search, '%')

            OR sa.RegistrationNo LIKE CONCAT('%', p_search, '%')

            OR sa.AdmissionNo LIKE CONCAT('%', p_search, '%')
        )

    ORDER BY
        st.full_name ASC;

END $$

DELIMITER ;
-- END Database/Sql/Stored Procedures/StudentPromotionEligible/sp_student_promotion_get_eligible.sql


-- BEGIN Database/StudentPromotion/StudentPromotionAtomicStoredProcedure.sql
-- =============================================================
-- ATOMIC STUDENT ACADEMIC PROGRESSION + PROMOTION HISTORY
-- MySQL 8.x / database: cms_btech
--
-- The student row, active section assignment and promotion history
-- are changed in one transaction. Any validation/database failure
-- rolls back every change.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_student_promote`;
DELIMITER $$

CREATE PROCEDURE `sp_student_promote`(
    IN p_student_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_to_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_start DATE DEFAULT NULL;
    DECLARE v_course_type VARCHAR(50) DEFAULT NULL;
    DECLARE v_total_semesters INT DEFAULT NULL;
    DECLARE v_from_assignment_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_id BIGINT DEFAULT NULL;
    DECLARE v_to_section_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester INT DEFAULT NULL;
    DECLARE v_to_semester INT DEFAULT NULL;
    DECLARE v_target_level_number INT DEFAULT NULL;
    DECLARE v_promotion_id BIGINT DEFAULT NULL;
    DECLARE v_promotion_order INT DEFAULT 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_created_by IS NULL OR p_created_by <= 0 OR NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.user_id = p_created_by
          AND u.status = 1
          AND u.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    START TRANSACTION;

    -- Lock the student and its current academic context.
    SELECT
        s.college_id,
        s.course_id,
        s.branch_id,
        s.academic_year_id,
        ay.start_date,
        c.course_type,
        c.total_semesters
    INTO
        v_college_id,
        v_course_id,
        v_branch_id,
        v_from_academic_year_id,
        v_from_academic_year_start,
        v_course_type,
        v_total_semesters
    FROM students s
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
       AND ay.deleted_at IS NULL
    INNER JOIN courses c
        ON c.course_id = s.course_id
       AND c.status = 1
       AND c.deleted_at IS NULL
    WHERE s.student_id = p_student_id
      AND s.status = 1
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_from_academic_year_id IS NULL OR v_course_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student, course, or academic year is unavailable.';
    END IF;

    -- The active assignment is the authoritative semester/section.
    SELECT
        ssa.student_section_assignment_id,
        sec.section_id,
        COALESCE(sec.semester, sem.semester_number)
    INTO
        v_from_assignment_id,
        v_from_section_id,
        v_from_semester
    FROM student_section_assignments ssa
    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.status = 1
       AND sec.is_archived = 0
       AND sec.deleted_at IS NULL
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0
    WHERE ssa.student_id = p_student_id
      AND ssa.academic_year_id = v_from_academic_year_id
      AND ssa.status = 1
    ORDER BY ssa.assigned_at DESC,
             ssa.student_section_assignment_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_from_assignment_id IS NULL OR v_from_semester IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The student has no active semester/section assignment.';
    END IF;

    IF v_from_semester <= 0 OR v_from_semester >= v_total_semesters THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The student is already in the final semester or has an invalid semester.';
    END IF;

    SET v_to_semester = v_from_semester + 1;

    -- Two semesters share an academic year. Crossing an even semester
    -- requires the next configured active academic year.
    IF MOD(v_from_semester, 2) = 1 THEN
        SET v_to_academic_year_id = v_from_academic_year_id;
    ELSE
        SELECT ay.academic_year_id
        INTO v_to_academic_year_id
        FROM academicyears ay
        WHERE ay.start_date > v_from_academic_year_start
          AND ay.status = 1
          AND ay.is_archived = 0
          AND ay.deleted_at IS NULL
        ORDER BY ay.start_date ASC, ay.academic_year_id ASC
        LIMIT 1
        FOR UPDATE;

        IF v_to_academic_year_id IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Activate the next academic year before cross-year promotion.';
        END IF;
    END IF;

    SET v_target_level_number = CEIL(v_to_semester / 2.0);

    IF NOT EXISTS (
        SELECT 1
        FROM academic_levels al
        WHERE al.academic_year_id = v_to_academic_year_id
          AND al.level_number = v_target_level_number
          AND al.level_type = v_course_type
          AND al.status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The target academic level is not configured.';
    END IF;

    -- Choose an active target section with capacity and lock it.
    SELECT sec.section_id
    INTO v_to_section_id
    FROM sections sec
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
       AND sem.status = 1
       AND sem.is_archived = 0
    WHERE sec.college_id = v_college_id
      AND sec.academic_year_id = v_to_academic_year_id
      AND sec.course_id = v_course_id
      AND sec.branch_id <=> v_branch_id
      AND COALESCE(sec.semester, sem.semester_number) = v_to_semester
      AND sec.status = 1
      AND sec.is_archived = 0
      AND sec.deleted_at IS NULL
      AND (
          SELECT COUNT(*)
          FROM student_section_assignments target_ssa
          WHERE target_ssa.section_id = sec.section_id
            AND target_ssa.status = 1
      ) < sec.capacity
    ORDER BY
        (
            SELECT COUNT(*)
            FROM student_section_assignments target_ssa
            WHERE target_ssa.section_id = sec.section_id
              AND target_ssa.status = 1
        ) ASC,
        sec.section_id ASC
    LIMIT 1
    FOR UPDATE;

    IF v_to_section_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No active target-semester section with capacity is configured.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = v_from_academic_year_id
          AND sp.to_academic_year_id = v_to_academic_year_id
          AND sp.from_semester = v_from_semester
          AND sp.to_semester = v_to_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND sp.promotion_status IN ('PENDING', 'APPROVED')
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'This semester promotion is already recorded.';
    END IF;

    SELECT COALESCE(MAX(sp.promotion_order), 0) + 1
    INTO v_promotion_order
    FROM student_promotions sp
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL;

    -- History, assignment movement, and student context are one unit.
    INSERT INTO student_promotions (
        student_id,
        college_id,
        from_academic_year_id,
        to_academic_year_id,
        from_course_id,
        to_course_id,
        from_branch_id,
        to_branch_id,
        from_section_id,
        to_section_id,
        from_semester,
        to_semester,
        promotion_status,
        decision,
        decision_date,
        decision_by,
        remarks,
        promotion_eligibility,
        eligibility_remarks,
        promotion_type,
        promotion_date,
        effective_date,
        promotion_reason,
        approved_at,
        is_final,
        promotion_order,
        is_active,
        created_at,
        created_by
    ) VALUES (
        p_student_id,
        v_college_id,
        v_from_academic_year_id,
        v_to_academic_year_id,
        v_course_id,
        v_course_id,
        v_branch_id,
        v_branch_id,
        v_from_section_id,
        v_to_section_id,
        v_from_semester,
        v_to_semester,
        'APPROVED',
        'APPROVE',
        UTC_TIMESTAMP(),
        p_created_by,
        'Student academic progression completed.',
        'ELIGIBLE',
        'Approved by an authorized user.',
        CASE
            WHEN v_to_academic_year_id = v_from_academic_year_id
                THEN 'SEMESTER'
            ELSE 'ACADEMIC_YEAR'
        END,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP(),
        'Academic progression.',
        UTC_TIMESTAMP(),
        IF(v_to_semester = v_total_semesters, 1, 0),
        v_promotion_order,
        1,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_promotion_id = LAST_INSERT_ID();

    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_created_by
    WHERE student_section_assignment_id = v_from_assignment_id
      AND status = 1;

    INSERT INTO student_section_assignments (
        student_id,
        section_id,
        academic_year_id,
        status,
        assigned_at,
        assigned_by
    ) VALUES (
        p_student_id,
        v_to_section_id,
        v_to_academic_year_id,
        1,
        UTC_TIMESTAMP(),
        p_created_by
    );

    UPDATE students
    SET academic_year_id = v_to_academic_year_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_created_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student academic progression could not be updated.';
    END IF;

    COMMIT;

    -- PascalCase columns support Dapper; snake_case aliases preserve the
    -- older StudentRepository reader contract. No existing caller is removed.
    SELECT
        sp.promotion_id AS PromotionId,
        sp.student_id AS StudentId,
        st.full_name AS StudentName,
        sp.from_branch_id AS BranchId,
        sp.from_academic_year_id AS AcademicYearId,
        sp.from_semester AS CurrentSemester,
        sp.to_semester AS NextSemester,
        sp.promotion_eligibility AS EligibilityStatus,
        sp.promotion_status AS PromotionStatus,
        sp.remarks AS Remarks,
        sp.created_at AS CreatedAt,
        sp.from_academic_year_id AS FromAcademicYearId,
        fay.academic_year_name AS FromAcademicYearName,
        sp.to_academic_year_id AS ToAcademicYearId,
        tay.academic_year_name AS ToAcademicYearName,
        sp.from_course_id AS FromCourseId,
        sp.to_course_id AS ToCourseId,
        sp.from_branch_id AS FromBranchId,
        sp.to_branch_id AS ToBranchId,
        sp.decision AS Decision,
        sp.promotion_eligibility AS PromotionEligibility,
        sp.promotion_type AS PromotionType,
        sp.promotion_date AS PromotionDate,
        sp.effective_date AS EffectiveDate,

        sp.promotion_id AS promotion_id,
        sp.student_id AS student_id,
        sp.from_academic_year_id AS from_academic_year_id,
        fay.academic_year_name AS from_academic_year_name,
        sp.to_academic_year_id AS to_academic_year_id,
        tay.academic_year_name AS to_academic_year_name,
        sp.from_course_id AS from_course_id,
        sp.to_course_id AS to_course_id,
        sp.from_branch_id AS from_branch_id,
        sp.to_branch_id AS to_branch_id,
        sp.promotion_status AS promotion_status,
        sp.decision AS decision,
        sp.promotion_eligibility AS promotion_eligibility,
        sp.promotion_type AS promotion_type,
        sp.promotion_date AS promotion_date,
        sp.effective_date AS effective_date,
        sp.remarks AS remarks
    FROM student_promotions sp
    INNER JOIN students st
        ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay
        ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay
        ON tay.academic_year_id = sp.to_academic_year_id
    WHERE sp.promotion_id = v_promotion_id;
END$$

DELIMITER ;

-- Configuration prerequisites for a successful call:
-- 1. The target academic level exists and is active.
-- 2. An active target-semester section with available capacity exists.
-- 3. For even-to-odd semester progression, the next academic year is active.
-- CALL sp_student_promote(1, 1);
-- END Database/StudentPromotion/StudentPromotionAtomicStoredProcedure.sql


-- BEGIN Database/StudentPromotion/StudentPromotionFrontendContractStoredProcedure.sql
USE `cms_btech`;

DROP PROCEDURE IF EXISTS sp_student_promote_contract;
DELIMITER $$
CREATE PROCEDURE sp_student_promote_contract(
    IN p_student_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_current_semester INT,
    IN p_next_semester INT,
    IN p_target_academic_year_id BIGINT,
    IN p_target_semester_id BIGINT,
    IN p_target_section_id BIGINT,
    IN p_eligibility_status VARCHAR(30),
    IN p_remarks VARCHAR(500),
    IN p_degree_conferred TINYINT,
    IN p_degree_conferred_at DATETIME,
    IN p_created_by BIGINT,
    IN p_manage_transaction TINYINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_start DATE DEFAULT NULL;
    DECLARE v_to_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_assignment_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_course_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester INT DEFAULT NULL;
    DECLARE v_to_semester_id BIGINT DEFAULT NULL;
    DECLARE v_to_semester INT DEFAULT NULL;
    DECLARE v_to_section_id BIGINT DEFAULT NULL;
    DECLARE v_total_semesters INT DEFAULT NULL;
    DECLARE v_promotion_id BIGINT DEFAULT NULL;
    DECLARE v_promotion_order INT DEFAULT 1;
    DECLARE v_is_graduation TINYINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        IF COALESCE(p_manage_transaction, 1) = 1 THEN
            ROLLBACK;
        END IF;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'studentIds: Every student ID must be a positive numeric ID.';
    END IF;

    IF p_branch_id IS NULL OR p_branch_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'branchId: branchId must be a positive numeric ID.';
    END IF;

    IF p_academic_year_id IS NULL OR p_academic_year_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'academicYearId: academicYearId must be a positive numeric ID.';
    END IF;

    IF p_current_semester IS NULL OR p_current_semester <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'currentSemester: currentSemester must be a positive integer.';
    END IF;

    IF p_next_semester IS NULL OR p_next_semester <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'nextSemester: nextSemester must be a positive integer.';
    END IF;

    IF UPPER(COALESCE(NULLIF(TRIM(p_eligibility_status), ''), '')) <> 'ELIGIBLE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'eligibilityStatus: Student must be ELIGIBLE for promotion.';
    END IF;

    IF p_target_academic_year_id IS NOT NULL AND p_target_academic_year_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetAcademicYearId: Value must be a positive numeric ID or null.';
    END IF;

    IF p_target_semester_id IS NOT NULL AND p_target_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetSemesterId: Value must be a positive numeric ID or null.';
    END IF;

    IF p_target_section_id IS NOT NULL AND p_target_section_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetSectionId: Value must be a positive numeric ID or null.';
    END IF;

    IF p_created_by IS NULL OR p_created_by <= 0 OR NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.user_id = p_created_by
          AND u.status = 1
          AND u.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'createdBy: Authenticated user is not valid or active.';
    END IF;

    IF COALESCE(p_manage_transaction, 1) = 1 THEN
        START TRANSACTION;
    END IF;

    SELECT
        s.college_id,
        s.course_id,
        s.branch_id,
        s.academic_year_id,
        ay.start_date,
        c.total_semesters
    INTO
        v_college_id,
        v_course_id,
        v_branch_id,
        v_from_academic_year_id,
        v_from_academic_year_start,
        v_total_semesters
    FROM students s
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
       AND ay.deleted_at IS NULL
    INNER JOIN courses c
        ON c.course_id = s.course_id
       AND c.status = 1
       AND c.deleted_at IS NULL
    WHERE s.student_id = p_student_id
      AND s.status = 1
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_course_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'studentIds: Student does not exist, is inactive, or has no course mapping.';
    END IF;

    IF v_branch_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'branchId: Student branch mapping is missing.';
    END IF;

    IF v_branch_id <> p_branch_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'branchId: Student does not belong to the selected branch.';
    END IF;

    IF v_from_academic_year_id <> p_academic_year_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'academicYearId: Student does not belong to the selected academic year.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM branches b
        WHERE b.branch_id = p_branch_id
          AND b.course_id = v_course_id
          AND b.status = 1
          AND b.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'branchId: Selected branch is inactive or does not belong to the student course.';
    END IF;

    SELECT
        ssa.student_section_assignment_id,
        sec.section_id,
        sec.course_id,
        sec.branch_id,
        sec.academic_year_id,
        sec.semester_id,
        COALESCE(sec.semester, sem.semester_number)
    INTO
        v_from_assignment_id,
        v_from_section_id,
        v_from_section_course_id,
        v_from_section_branch_id,
        v_from_section_academic_year_id,
        v_from_semester_id,
        v_from_semester
    FROM student_section_assignments ssa
    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.status = 1
       AND sec.is_archived = 0
       AND sec.deleted_at IS NULL
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
    WHERE ssa.student_id = p_student_id
      AND ssa.status = 1
    ORDER BY ssa.assigned_at DESC, ssa.student_section_assignment_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_from_assignment_id IS NULL OR v_from_semester IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'currentSemester: Student has no active semester/section assignment.';
    END IF;

    IF v_from_section_course_id <> v_course_id
       OR v_from_section_branch_id <> p_branch_id
       OR v_from_section_academic_year_id <> p_academic_year_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'currentSemester: Active section mapping does not match the selected student branch/year.';
    END IF;

    IF v_from_semester <> p_current_semester THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'currentSemester: Student is not assigned to the selected current semester.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = p_academic_year_id
          AND sp.from_semester = p_current_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND UPPER(COALESCE(sp.promotion_eligibility, '')) IN ('FAILED', 'DETAINED')
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'eligibilityStatus: Student is marked FAILED or DETAINED for this semester.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = p_academic_year_id
          AND sp.from_semester = p_current_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND sp.promotion_status IN ('PENDING', 'APPROVED')
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'studentIds: Student already has a pending/approved promotion for this semester.';
    END IF;

    SET v_is_graduation = IF(p_current_semester >= v_total_semesters, 1, 0);

    IF COALESCE(p_degree_conferred, 0) = 1 AND p_current_semester < v_total_semesters THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'degreeConferred: Degree can be conferred only from the final semester.';
    END IF;

    IF COALESCE(p_degree_conferred, 0) = 1 THEN
        SET v_is_graduation = 1;
    END IF;

    IF v_is_graduation = 1 THEN
        SET v_to_academic_year_id = COALESCE(p_target_academic_year_id, p_academic_year_id);
        SET v_to_semester_id = COALESCE(p_target_semester_id, v_from_semester_id);
        SET v_to_semester = p_current_semester;
        SET v_to_section_id = NULL;
    ELSE
        IF p_next_semester <> p_current_semester + 1 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'nextSemester: Must be the immediate next semester number.';
        END IF;

        IF p_next_semester > v_total_semesters THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'nextSemester: Next semester exceeds the course total semesters.';
        END IF;

        IF p_target_academic_year_id IS NOT NULL THEN
            SET v_to_academic_year_id = p_target_academic_year_id;
        ELSEIF CEIL(p_current_semester / 2.0) = CEIL(p_next_semester / 2.0) THEN
            SET v_to_academic_year_id = p_academic_year_id;
        ELSE
            SELECT MIN(ay.academic_year_id)
            INTO v_to_academic_year_id
            FROM academicyears ay
            WHERE ay.start_date > v_from_academic_year_start
              AND ay.deleted_at IS NULL
              AND ay.is_archived = 0;
        END IF;

        IF v_to_academic_year_id IS NULL OR NOT EXISTS (
            SELECT 1
            FROM academicyears ay
            WHERE ay.academic_year_id = v_to_academic_year_id
              AND ay.deleted_at IS NULL
              AND ay.is_archived = 0
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetAcademicYearId: Target academic year mapping does not exist or is archived.';
        END IF;

        SET v_to_semester = p_next_semester;

        IF p_target_semester_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1
                FROM semesters sem
                WHERE sem.semester_id = p_target_semester_id
                  AND sem.course_id = v_course_id
                  AND sem.branch_id = p_branch_id
                  AND sem.academic_year_id = v_to_academic_year_id
                  AND sem.semester_number = p_next_semester
                  AND sem.status = 1
                  AND sem.is_archived = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetSemesterId: Target semester does not match course, branch, year and semester number.';
            END IF;
            SET v_to_semester_id = p_target_semester_id;
        ELSE
            SELECT MIN(sem.semester_id)
            INTO v_to_semester_id
            FROM semesters sem
            WHERE sem.course_id = v_course_id
              AND sem.branch_id = p_branch_id
              AND sem.academic_year_id = v_to_academic_year_id
              AND sem.semester_number = p_next_semester
              AND sem.status = 1
              AND sem.is_archived = 0;

            IF v_to_semester_id IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'nextSemester: No active target semester mapping exists for the selected branch/year.';
            END IF;
        END IF;

        -- NULL is valid. It means promote now and allocate the section later.
        SET v_to_section_id = p_target_section_id;

        IF v_to_section_id IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM sections sec
            WHERE sec.section_id = v_to_section_id
              AND sec.college_id = v_college_id
              AND sec.academic_year_id = v_to_academic_year_id
              AND sec.course_id = v_course_id
              AND sec.branch_id = p_branch_id
              AND (sec.semester_id = v_to_semester_id OR sec.semester = p_next_semester)
              AND sec.status = 1
              AND sec.is_archived = 0
              AND sec.deleted_at IS NULL
              AND (
                  SELECT COUNT(*)
                  FROM student_section_assignments x
                  WHERE x.section_id = sec.section_id
                    AND x.status = 1
              ) < sec.capacity
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetSectionId: Section is invalid, mismatched, inactive, archived, or full.';
        END IF;
    END IF;

    SELECT COALESCE(MAX(sp.promotion_order), 0) + 1
    INTO v_promotion_order
    FROM student_promotions sp
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL;

    INSERT INTO student_promotions (
        student_id, college_id,
        from_academic_year_id, to_academic_year_id,
        from_course_id, to_course_id,
        from_branch_id, to_branch_id,
        from_section_id, to_section_id,
        from_semester, from_semester_id,
        to_semester, to_semester_id,
        promotion_status, decision, decision_date, decision_by,
        remarks, promotion_eligibility, eligibility_remarks,
        promotion_type, promotion_date, effective_date,
        promotion_reason, approved_at, is_final, promotion_order,
        is_active, created_at, created_by
    ) VALUES (
        p_student_id, v_college_id,
        p_academic_year_id, v_to_academic_year_id,
        v_course_id, v_course_id,
        p_branch_id, p_branch_id,
        v_from_section_id, v_to_section_id,
        p_current_semester, v_from_semester_id,
        v_to_semester, v_to_semester_id,
        'APPROVED', 'APPROVE', UTC_TIMESTAMP(), p_created_by,
        NULLIF(TRIM(p_remarks), ''), 'ELIGIBLE',
        CASE WHEN v_is_graduation = 1 THEN 'Degree requirements completed.' ELSE 'Eligible and promoted.' END,
        CASE WHEN v_is_graduation = 1 THEN 'GRADUATION' ELSE 'SEMESTER' END,
        UTC_TIMESTAMP(), UTC_TIMESTAMP(),
        CASE WHEN v_is_graduation = 1 THEN 'Degree conferred after final semester.' ELSE 'Semester batch promotion.' END,
        UTC_TIMESTAMP(), v_is_graduation, v_promotion_order,
        1, UTC_TIMESTAMP(), p_created_by
    );

    SET v_promotion_id = LAST_INSERT_ID();

    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_created_by
    WHERE student_section_assignment_id = v_from_assignment_id
      AND status = 1;

    IF v_is_graduation = 0 AND v_to_section_id IS NOT NULL THEN
        INSERT INTO student_section_assignments (
            student_id, section_id, academic_year_id,
            status, assigned_at, assigned_by
        ) VALUES (
            p_student_id, v_to_section_id, v_to_academic_year_id,
            1, UTC_TIMESTAMP(), p_created_by
        );
    END IF;

    UPDATE students
    SET academic_year_id = v_to_academic_year_id,
        branch_id = p_branch_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_created_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'studentIds: Student academic mapping could not be updated.';
    END IF;

    IF COALESCE(p_manage_transaction, 1) = 1 THEN
        COMMIT;
    END IF;

    SELECT
        sp.promotion_id AS PromotionId,
        sp.student_id AS StudentId,
        st.full_name AS StudentName,
        sp.from_branch_id AS BranchId,
        sp.from_academic_year_id AS AcademicYearId,
        sp.from_semester AS CurrentSemester,
        sp.to_semester AS NextSemester,
        sp.promotion_eligibility AS EligibilityStatus,
        sp.promotion_status AS PromotionStatus,
        sp.remarks AS Remarks,
        sp.created_at AS CreatedAt,
        sp.from_academic_year_id AS FromAcademicYearId,
        fay.academic_year_name AS FromAcademicYearName,
        sp.to_academic_year_id AS ToAcademicYearId,
        tay.academic_year_name AS ToAcademicYearName,
        sp.from_course_id AS FromCourseId,
        sp.to_course_id AS ToCourseId,
        sp.from_branch_id AS FromBranchId,
        sp.to_branch_id AS ToBranchId,
        sp.decision AS Decision,
        sp.promotion_eligibility AS PromotionEligibility,
        sp.promotion_type AS PromotionType,
        sp.promotion_date AS PromotionDate,
        sp.effective_date AS EffectiveDate,
        sp.to_academic_year_id AS TargetAcademicYearId,
        sp.to_semester_id AS TargetSemesterId,
        sp.to_section_id AS TargetSectionId,
        IF(sp.promotion_type = 'GRADUATION', TRUE, FALSE) AS IsGraduated,
        IF(sp.promotion_type = 'GRADUATION', TRUE, FALSE) AS DegreeConferred,
        CASE
            WHEN sp.promotion_type = 'GRADUATION'
                THEN COALESCE(p_degree_conferred_at, sp.effective_date)
            ELSE NULL
        END AS DegreeConferredAt
    FROM student_promotions sp
    INNER JOIN students st ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay ON tay.academic_year_id = sp.to_academic_year_id
    WHERE sp.promotion_id = v_promotion_id;
END$$
DELIMITER ;
-- END Database/StudentPromotion/StudentPromotionFrontendContractStoredProcedure.sql


-- BEGIN Database/Sql/Stored Procedures/StudentPromotionHistory/sp_student_promotion_get_history.sql
-- ============================================================
-- Task: Develop API to retrieve a student's complete promotion history
-- Database: cms_btech
-- New stored procedure only. Existing tables/procedures are not dropped.
-- ============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_student_promotion_get_history`;
DELIMITER $$

CREATE PROCEDURE `sp_student_promotion_get_history`(
    IN p_student_id BIGINT
)
BEGIN
    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    SELECT
        sp.promotion_id                  AS PromotionId,
        sp.student_id                    AS StudentId,
        st.student_code                  AS StudentCode,
        st.full_name                     AS StudentName,
        COALESCE(sp.college_id, st.college_id) AS CollegeId,

        sp.from_academic_year_id         AS FromAcademicYearId,
        fay.academic_year_name           AS FromAcademicYearName,
        sp.to_academic_year_id           AS ToAcademicYearId,
        tay.academic_year_name           AS ToAcademicYearName,

        sp.from_course_id                AS FromCourseId,
        fc.course_name                   AS FromCourseName,
        sp.to_course_id                  AS ToCourseId,
        tc.course_name                   AS ToCourseName,

        sp.from_branch_id                AS FromBranchId,
        fb.branch_name                   AS FromBranchName,
        sp.to_branch_id                  AS ToBranchId,
        tb.branch_name                   AS ToBranchName,

        sp.from_section_id               AS FromSectionId,
        fs.section_name                  AS FromSectionName,
        sp.to_section_id                 AS ToSectionId,
        ts.section_name                  AS ToSectionName,

        sp.from_semester                 AS FromSemester,
        sp.to_semester                   AS ToSemester,

        sp.promotion_status              AS PromotionStatus,
        sp.decision                      AS Decision,
        sp.decision_date                 AS DecisionDate,
        sp.decision_by                   AS DecisionBy,
        du.full_name                     AS DecisionByName,
        sp.remarks                       AS Remarks,

        sp.attendance_percentage         AS AttendancePercentage,
        sp.total_marks                   AS TotalMarks,
        sp.obtained_marks                AS ObtainedMarks,
        sp.marks_percentage              AS MarksPercentage,
        sp.passed_subjects               AS PassedSubjects,
        sp.failed_subjects               AS FailedSubjects,
        sp.backlog_count                 AS BacklogCount,

        sp.promotion_eligibility         AS PromotionEligibility,
        sp.eligibility_remarks           AS EligibilityRemarks,
        sp.promotion_type                AS PromotionType,
        sp.promotion_date                AS PromotionDate,
        sp.effective_date                AS EffectiveDate,
        sp.promotion_reason              AS PromotionReason,
        sp.rejection_reason              AS RejectionReason,
        sp.approved_at                   AS ApprovedAt,
        sp.is_final                      AS IsFinal,
        sp.promotion_order               AS PromotionOrder,
        sp.is_active                     AS IsActive,

        sp.created_at                    AS CreatedAt,
        sp.created_by                    AS CreatedBy,
        cu.full_name                     AS CreatedByName,
        sp.updated_at                    AS UpdatedAt,
        sp.updated_by                    AS UpdatedBy,
        uu.full_name                     AS UpdatedByName

    FROM student_promotions sp
    INNER JOIN students st
        ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay
        ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay
        ON tay.academic_year_id = sp.to_academic_year_id
    LEFT JOIN courses fc
        ON fc.course_id = sp.from_course_id
    LEFT JOIN courses tc
        ON tc.course_id = sp.to_course_id
    LEFT JOIN branches fb
        ON fb.branch_id = sp.from_branch_id
    LEFT JOIN branches tb
        ON tb.branch_id = sp.to_branch_id
    LEFT JOIN sections fs
        ON fs.section_id = sp.from_section_id
    LEFT JOIN sections ts
        ON ts.section_id = sp.to_section_id
    LEFT JOIN users du
        ON du.user_id = sp.decision_by
    LEFT JOIN users cu
        ON cu.user_id = sp.created_by
    LEFT JOIN users uu
        ON uu.user_id = sp.updated_by
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL
    ORDER BY
        COALESCE(sp.promotion_date, sp.decision_date, sp.created_at) DESC,
        COALESCE(sp.promotion_order, 0) DESC,
        sp.promotion_id DESC;
END$$

DELIMITER ;

-- Test after running this script:
-- CALL sp_student_promotion_get_history(1);
-- END Database/Sql/Stored Procedures/StudentPromotionHistory/sp_student_promotion_get_history.sql

