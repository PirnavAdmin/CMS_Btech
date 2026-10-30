-- V2: college validation plus authorized faculty data correction.
-- Back up first; stop the backend and select the existing database.
-- Example: USE cms_btech;
-- Run the whole script and stop on any error.

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


-- Faculty ownership correction, based on the user's sql dump.sql supplied 2026-10-01.
-- Select your database first. Stop the backend while applying and keep your backup.
-- User authorized inferred ownership repair. No faculty/user IDs or credentials change.
-- Decisions:
--   faculty 16 / user 21 -> college 87, retaining department 29 (college 87).
--   faculty 11 / user 17 retain college 82; use a college-82 CIVIL department.
--   If absent, create that department from the existing department 5 definition.
-- Original faculty/profile/attendance/history links remain intact. No rows are deleted.
-- Reruns are safe. Unexpected identity, ownership, or related records stop the transaction.
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS backend_data_repair_audit (
    repair_key VARCHAR(80) NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id BIGINT NOT NULL,
    before_values JSON NULL,
    after_values JSON NOT NULL,
    repair_reason VARCHAR(500) NOT NULL,
    applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    executed_by VARCHAR(288) NOT NULL,
    PRIMARY KEY(repair_key,entity_type,entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_fix_faculty_ownership_20261001$$
CREATE PROCEDURE sp_fix_faculty_ownership_20261001()
main: BEGIN
    DECLARE v_f16_college BIGINT DEFAULT NULL;
    DECLARE v_u21_college BIGINT DEFAULT NULL;
    DECLARE v_f11_department BIGINT DEFAULT NULL;
    DECLARE v_civil_department BIGINT DEFAULT NULL;
    DECLARE v_lock BIGINT DEFAULT NULL;
    DECLARE v_before JSON;
    DECLARE v_new_department TINYINT DEFAULT 0;
    DECLARE v_repair VARCHAR(80) DEFAULT 'faculty_ownership_20261001_v2';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Lock the exact records being repaired; reject a different snapshot/identity.
    SELECT college_id INTO v_f16_college FROM faculty
    WHERE faculty_id=16 AND user_id=21 AND faculty_code='5b719c619fef4f0780459b6cf1de87c9'
      AND department_id=29 AND employee_profile_id IS NULL AND status=1 AND deleted_at IS NULL
    FOR UPDATE;
    SELECT college_id INTO v_u21_college FROM users
    WHERE user_id=21 AND employee_user_id='USR00000021' AND status=1 AND deleted_at IS NULL
    FOR UPDATE;
    SELECT department_id INTO v_f11_department FROM faculty
    WHERE faculty_id=11 AND user_id=17 AND faculty_code='52390da986b6435ab92b2c6002596142'
      AND college_id=82 AND employee_profile_id IS NULL AND status=1 AND deleted_at IS NULL
    FOR UPDATE;
    SELECT user_id INTO v_lock FROM users
    WHERE user_id=17 AND employee_user_id='USR00000017' AND college_id=82 AND status=1 AND deleted_at IS NULL
    FOR UPDATE;
    IF v_f16_college IS NULL OR v_f16_college NOT IN (1,87)
       OR v_u21_college IS NULL OR v_u21_college NOT IN (1,87)
       OR v_f11_department IS NULL OR v_lock IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty/user identities or ownership changed since the supplied dump; repair stopped with no row changes.';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM colleges WHERE college_id=87 AND status=1 AND deleted_at IS NULL)
       OR NOT EXISTS(SELECT 1 FROM colleges WHERE college_id=82 AND status=1 AND deleted_at IS NULL)
       OR NOT EXISTS(SELECT 1 FROM departments WHERE department_id=29 AND college_id=87 AND department_code='HOD' AND status=1 AND deleted_at IS NULL)
       OR NOT EXISTS(SELECT 1 FROM departments WHERE department_id=5 AND college_id=1 AND department_code='CIVIL' AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Expected target colleges or source departments are unavailable; repair stopped.';
    END IF;

    -- Do not override added employment/profile/access assignments or move academic history.
    IF EXISTS(SELECT 1 FROM employee_profiles WHERE user_id IN (17,21))
       OR EXISTS(SELECT 1 FROM faculty_profile WHERE faculty_id IN (11,16)
           AND ((faculty_id=11 AND user_id<>17) OR (faculty_id=16 AND user_id<>21) OR employee_profile_id IS NOT NULL))
       OR EXISTS(SELECT 1 FROM college_user_mappings m JOIN college_settings c ON c.college_setting_id=m.college_setting_id
           WHERE m.user_id=21 AND c.college_id<>87)
       OR EXISTS(SELECT 1 FROM departments WHERE hod_user_id=21 AND college_id<>87)
       OR EXISTS(SELECT 1 FROM faculty_subject_allocations a JOIN branches b ON b.branch_id=a.branch_id
           JOIN courses c ON c.course_id=b.course_id
           WHERE a.faculty_id IN (11,16) AND c.college_id<>CASE a.faculty_id WHEN 11 THEN 82 ELSE 87 END)
       OR EXISTS(SELECT 1 FROM timetable_entries e JOIN sections s ON s.section_id=e.section_id
           WHERE e.faculty_id IN (11,16) AND s.college_id<>CASE e.faculty_id WHEN 11 THEN 82 ELSE 87 END)
       OR EXISTS(SELECT 1 FROM student_attendance a JOIN sections s ON s.section_id=a.section_id
           WHERE a.faculty_id IN (11,16) AND s.college_id<>CASE a.faculty_id WHEN 11 THEN 82 ELSE 87 END) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Related profile/access/academic records conflict with the planned colleges; repair stopped without modifying them.';
    END IF;

    SELECT department_id INTO v_civil_department FROM departments
    WHERE college_id=82 AND department_code='CIVIL' FOR UPDATE;
    IF v_civil_department IS NOT NULL AND NOT EXISTS(SELECT 1 FROM departments
       WHERE department_id=v_civil_department AND status=1 AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='College 82 CIVIL department already exists but is inactive/deleted; repair stopped.';
    END IF;
    IF v_f11_department<>5 AND (v_civil_department IS NULL OR v_f11_department<>v_civil_department) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Faculty 11 department was changed independently; repair stopped.';
    END IF;
    IF (v_f16_college<>87 OR v_u21_college<>87 OR v_f11_department=5)
       AND EXISTS(SELECT 1 FROM backend_data_repair_audit WHERE repair_key=v_repair) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Previously repaired records changed afterward; do not overwrite those changes by rerunning the repair.';
    END IF;

    IF v_civil_department IS NULL THEN
        INSERT INTO departments(college_id,department_code,department_name,description,status,created_at)
        SELECT 82,department_code,department_name,description,1,UTC_TIMESTAMP()
        FROM departments WHERE department_id=5;
        SET v_civil_department=LAST_INSERT_ID();
        SET v_new_department=1;
        INSERT INTO backend_data_repair_audit
            (repair_key,entity_type,entity_id,before_values,after_values,repair_reason,executed_by)
        SELECT v_repair,'department',department_id,NULL,
            JSON_OBJECT('collegeId',college_id,'departmentCode',department_code,'departmentName',department_name,'status',status),
            'Created college-82 CIVIL from department 5 definition to preserve faculty 11/user 17 college ownership.',CURRENT_USER()
        FROM departments WHERE department_id=v_civil_department;
    END IF;

    IF v_f16_college<>87 THEN
        SELECT JSON_OBJECT('collegeId',college_id,'departmentId',department_id,'userId',user_id,'updatedAt',updated_at)
            INTO v_before FROM faculty WHERE faculty_id=16;
        UPDATE faculty SET college_id=87,updated_at=UTC_TIMESTAMP() WHERE faculty_id=16;
        INSERT INTO backend_data_repair_audit
            (repair_key,entity_type,entity_id,before_values,after_values,repair_reason,executed_by)
        VALUES(v_repair,'faculty',16,v_before,JSON_OBJECT('collegeId',87,'departmentId',29,'userId',21),
            'Aligned with selected college 87 and department 29; original create endpoint ignored query collegeId.',CURRENT_USER());
    END IF;
    IF v_u21_college<>87 THEN
        SELECT JSON_OBJECT('collegeId',college_id,'updatedAt',updated_at) INTO v_before FROM users WHERE user_id=21;
        UPDATE users SET college_id=87,updated_at=UTC_TIMESTAMP() WHERE user_id=21;
        INSERT INTO backend_data_repair_audit
            (repair_key,entity_type,entity_id,before_values,after_values,repair_reason,executed_by)
        VALUES(v_repair,'user',21,v_before,JSON_OBJECT('collegeId',87),
            'Aligned user 21 with its existing faculty 16 and department 29 in college 87.',CURRENT_USER());
    END IF;
    IF v_f11_department<>v_civil_department THEN
        SELECT JSON_OBJECT('collegeId',college_id,'departmentId',department_id,'userId',user_id,'updatedAt',updated_at)
            INTO v_before FROM faculty WHERE faculty_id=11;
        UPDATE faculty SET department_id=v_civil_department,updated_at=UTC_TIMESTAMP() WHERE faculty_id=11;
        INSERT INTO backend_data_repair_audit
            (repair_key,entity_type,entity_id,before_values,after_values,repair_reason,executed_by)
        VALUES(v_repair,'faculty',11,v_before,JSON_OBJECT('collegeId',82,'departmentId',v_civil_department,'userId',17),
            'Preserved matching faculty/user college 82; replaced incorrect cross-college CIVIL department reference.',CURRENT_USER());
    END IF;

    IF EXISTS(SELECT 1 FROM faculty f JOIN users u ON u.user_id=f.user_id
        JOIN departments d ON d.department_id=f.department_id
        WHERE f.faculty_id IN (11,16) AND (f.college_id<>u.college_id OR f.college_id<>d.college_id)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Ownership verification failed; all data changes rolled back.';
    END IF;
    COMMIT;
    SELECT 'Faculty ownership corrected; existing IDs and records preserved.' AS result,
        87 AS faculty16CollegeId,82 AS faculty11CollegeId,v_civil_department AS faculty11DepartmentId,
        v_new_department AS departmentCreatedThisRun;
END$$
CALL sp_fix_faculty_ownership_20261001()$$
DROP PROCEDURE sp_fix_faculty_ownership_20261001$$
DELIMITER ;

SELECT f.faculty_id,f.user_id,f.college_id AS faculty_college_id,u.college_id AS user_college_id,
       f.department_id,d.college_id AS department_college_id,d.department_name,f.status
FROM faculty f JOIN users u ON u.user_id=f.user_id JOIN departments d ON d.department_id=f.department_id
WHERE f.faculty_id IN (11,16) ORDER BY f.faculty_id;
SELECT repair_key,entity_type,entity_id,before_values,after_values,applied_at,executed_by
FROM backend_data_repair_audit WHERE repair_key='faculty_ownership_20261001_v2'
ORDER BY entity_type,entity_id;


-- Read-only verification. Select your database first (USE cms_btech;).
SET @inspect_college_id=87;
SET @inspect_user_id=NULL; -- Set this to the userId returned in a faculty conflict/log.

SELECT college_id,college_code,college_name,status,deleted_at
FROM colleges WHERE college_id=@inspect_college_id;

SELECT course_id,college_id,course_code,course_name,status,deleted_at
FROM courses WHERE course_code='BTECH' ORDER BY college_id,course_id;

-- NULL college_id means a preserved legacy shared type, not college 87 ownership.
SELECT leave_type_id,college_id,name,code,status
FROM faculty_leave_types WHERE name='Casual Leave' OR code='CL'
ORDER BY college_id,leave_type_id;

SELECT f.faculty_id,f.user_id,f.college_id AS faculty_college_id,
       u.college_id AS user_college_id,f.department_id,d.college_id AS department_college_id,
       f.status,f.deleted_at
FROM faculty f JOIN users u ON u.user_id=f.user_id
JOIN departments d ON d.department_id=f.department_id
WHERE f.college_id=@inspect_college_id OR d.college_id=@inspect_college_id
   OR (@inspect_user_id IS NOT NULL AND f.user_id=@inspect_user_id)
ORDER BY f.faculty_id;

-- Existing cross-college data inconsistencies; do not guess which side is the correct owner.
SELECT f.faculty_id,f.user_id,f.college_id AS faculty_college_id,
       u.college_id AS user_college_id,f.department_id,d.college_id AS department_college_id,
       f.status,f.deleted_at
FROM faculty f JOIN users u ON u.user_id=f.user_id
JOIN departments d ON d.department_id=f.department_id
WHERE f.college_id<>d.college_id
   OR (u.college_id IS NOT NULL AND f.college_id<>u.college_id)
ORDER BY f.faculty_id;

SELECT user_id,COUNT(*) AS faculty_count FROM faculty
GROUP BY user_id HAVING COUNT(*)>1;

SELECT college_id,course_code,COUNT(*) AS duplicate_count FROM courses
GROUP BY college_id,course_code HAVING COUNT(*)>1;
SELECT college_scope_id,name,COUNT(*) AS duplicate_count FROM faculty_leave_types
GROUP BY college_scope_id,name HAVING COUNT(*)>1;
SELECT college_scope_id,code,COUNT(*) AS duplicate_count FROM faculty_leave_types
GROUP BY college_scope_id,code HAVING COUNT(*)>1;

SHOW INDEX FROM courses;
SHOW INDEX FROM faculty_leave_types;
SHOW INDEX FROM faculty;
CALL sp_course_code_exists_in_college(87,'BTECH',NULL);
