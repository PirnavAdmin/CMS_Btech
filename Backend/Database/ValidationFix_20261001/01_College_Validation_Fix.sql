-- Apply after selecting your existing database (for example USE cms_btech;).
-- MySQL 8.0. No EF migrations, row deletions, reassignment, or duplicate removal.
-- Back up first; MySQL DDL commits automatically. Stop the API while applying.
-- Existing leave types had NO college ownership: retain NULL as legacy shared data.
-- New backend creations always supply a real college_id. Do not guess a legacy owner.
-- Inactive/deleted course codes remain reserved within their college.
-- Inactive leave types remain reserved. faculty.user_id remains globally unique.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_apply_college_validation_20261001$$
CREATE PROCEDURE sp_apply_college_validation_20261001()
BEGIN
    DECLARE v_drop LONGTEXT;
    IF DATABASE() IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Select your existing database before running this patch.';
    END IF;
    IF EXISTS (SELECT 1 FROM courses GROUP BY college_id,course_code HAVING COUNT(*)>1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Duplicate course codes exist within a college. Review records before applying; no rows were removed.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                   AND table_name='faculty_leave_types' AND column_name='college_id') THEN
        ALTER TABLE faculty_leave_types ADD COLUMN college_id BIGINT NULL AFTER leave_type_id;
    END IF;
    IF EXISTS (SELECT 1 FROM faculty_leave_types GROUP BY COALESCE(college_id,0),name HAVING COUNT(*)>1)
       OR EXISTS (SELECT 1 FROM faculty_leave_types GROUP BY COALESCE(college_id,0),code HAVING COUNT(*)>1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Duplicate leave names/codes exist within a scope. Review records before applying; no rows were removed.';
    END IF;
    IF EXISTS (SELECT 1 FROM faculty_leave_types t LEFT JOIN colleges c ON c.college_id=t.college_id
               WHERE t.college_id IS NOT NULL AND (t.college_id<=0 OR c.college_id IS NULL)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A leave type references an invalid college. Correct its owner before applying this patch.';
    END IF;

    -- Add scoped indexes BEFORE removing global constraints, so there is no unprotected interval.
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
                   AND table_name='courses' AND index_name='uq_courses_college_code') THEN
        ALTER TABLE courses ADD UNIQUE KEY uq_courses_college_code(college_id,course_code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
                   AND table_name='faculty_leave_types' AND column_name='college_scope_id') THEN
        ALTER TABLE faculty_leave_types ADD COLUMN college_scope_id BIGINT
            GENERATED ALWAYS AS (COALESCE(college_id,0)) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
                   AND table_name='faculty_leave_types' AND index_name='uq_leave_college_name') THEN
        ALTER TABLE faculty_leave_types ADD UNIQUE KEY uq_leave_college_name(college_scope_id,name);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
                   AND table_name='faculty_leave_types' AND index_name='uq_leave_college_code') THEN
        ALTER TABLE faculty_leave_types ADD UNIQUE KEY uq_leave_college_code(college_scope_id,code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE()
                   AND table_name='faculty_leave_types' AND column_name='college_id' AND referenced_table_name='colleges') THEN
        ALTER TABLE faculty_leave_types ADD CONSTRAINT fk_leave_type_college
            FOREIGN KEY(college_id) REFERENCES colleges(college_id);
    END IF;

    SELECT GROUP_CONCAT(CONCAT('DROP INDEX `',REPLACE(index_name,'`','``'),'`') SEPARATOR ', ')
      INTO v_drop FROM (
        SELECT index_name FROM information_schema.statistics
        WHERE table_schema=DATABASE() AND table_name='courses' AND non_unique=0 AND index_name<>'PRIMARY'
        GROUP BY index_name HAVING COUNT(*)=1 AND MAX(column_name)='course_code'
      ) global_indexes;
    IF v_drop IS NOT NULL THEN
        SET @college_patch_ddl=CONCAT('ALTER TABLE courses ',v_drop);
        PREPARE college_patch_stmt FROM @college_patch_ddl;
        EXECUTE college_patch_stmt;
        DEALLOCATE PREPARE college_patch_stmt;
    END IF;
    SELECT GROUP_CONCAT(CONCAT('DROP INDEX `',REPLACE(index_name,'`','``'),'`') SEPARATOR ', ')
      INTO v_drop FROM (
        SELECT index_name FROM information_schema.statistics
        WHERE table_schema=DATABASE() AND table_name='faculty_leave_types' AND non_unique=0 AND index_name<>'PRIMARY'
        GROUP BY index_name HAVING COUNT(*)=1 AND MAX(column_name) IN ('name','code')
      ) global_indexes;
    IF v_drop IS NOT NULL THEN
        SET @college_patch_ddl=CONCAT('ALTER TABLE faculty_leave_types ',v_drop);
        PREPARE college_patch_stmt FROM @college_patch_ddl;
        EXECUTE college_patch_stmt;
        DEALLOCATE PREPARE college_patch_stmt;
    END IF;
END$$
CALL sp_apply_college_validation_20261001()$$
DROP PROCEDURE sp_apply_college_validation_20261001$$

-- Retain the old two-argument sp_course_code_exists for compatibility.
-- The backend now calls the scoped procedure below.
DROP PROCEDURE IF EXISTS sp_course_code_exists_in_college$$
CREATE PROCEDURE sp_course_code_exists_in_college(
    IN p_college_id BIGINT, IN p_course_code VARCHAR(50), IN p_exclude_id BIGINT)
BEGIN
    SELECT EXISTS(SELECT 1 FROM courses
      WHERE college_id=p_college_id AND course_code=UPPER(TRIM(p_course_code))
        AND (p_exclude_id IS NULL OR course_id<>p_exclude_id)) AS code_exists;
END$$

DROP PROCEDURE IF EXISTS sp_course_create$$
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
        WHERE department_id = p_department_id AND college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Department not found in the selected college.';
    END IF;

    IF p_duration_years <= 0 OR p_total_semesters <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duration and total semesters must be greater than zero.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM courses
        WHERE college_id = p_college_id
          AND course_code = UPPER(TRIM((p_course_code COLLATE utf8mb4_0900_ai_ci)))
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course code already exists in the selected college, including inactive/deleted records.';
    END IF;

    INSERT INTO courses (
        college_id, department_id, course_code, course_name,
        course_short_name, course_type, duration_years, total_semesters,
        eligibility, description, status, created_at, created_by
    ) VALUES (
        p_college_id, p_department_id, UPPER(TRIM((p_course_code COLLATE utf8mb4_0900_ai_ci))),
        TRIM((p_course_name COLLATE utf8mb4_0900_ai_ci)), (p_course_short_name COLLATE utf8mb4_0900_ai_ci), (p_course_type COLLATE utf8mb4_0900_ai_ci),
        p_duration_years, p_total_semesters, (p_eligibility COLLATE utf8mb4_0900_ai_ci), (p_description COLLATE utf8mb4_0900_ai_ci),
        COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS sp_course_update$$
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
    IF NOT EXISTS (SELECT 1 FROM courses WHERE course_id=p_course_id AND college_id=p_college_id AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course not found in the selected college.';
    END IF;
    IF p_department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM departments
        WHERE department_id=p_department_id AND college_id=p_college_id AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Department not found in the selected college.';
    END IF;
    IF p_duration_years<=0 OR p_total_semesters<=0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Duration and total semesters must be greater than zero.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM courses
        WHERE college_id = p_college_id
          AND course_code = UPPER(TRIM((p_course_code COLLATE utf8mb4_0900_ai_ci)))
          AND course_id <> p_course_id
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course code already exists in the selected college, including inactive/deleted records.';
    END IF;

    UPDATE courses
    SET college_id = p_college_id,
        department_id = p_department_id,
        course_code = UPPER(TRIM((p_course_code COLLATE utf8mb4_0900_ai_ci))),
        course_name = TRIM((p_course_name COLLATE utf8mb4_0900_ai_ci)),
        course_short_name = (p_course_short_name COLLATE utf8mb4_0900_ai_ci),
        course_type = (p_course_type COLLATE utf8mb4_0900_ai_ci),
        duration_years = p_duration_years,
        total_semesters = p_total_semesters,
        eligibility = (p_eligibility COLLATE utf8mb4_0900_ai_ci),
        description = (p_description COLLATE utf8mb4_0900_ai_ci),
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

DELIMITER ;

-- Post-apply inspection. There should be scoped leave/course keys and global faculty.user_id.
SHOW INDEX FROM courses;
SHOW INDEX FROM faculty_leave_types;
SHOW INDEX FROM faculty;
SELECT 'College validation patch applied. Restart the updated backend.' AS result;
