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
