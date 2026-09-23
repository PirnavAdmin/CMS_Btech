-- CMS BTech integration update, 2026-09-08
-- Target: the supplied cms_btech MySQL 8.x database. Back up first.
-- Existing API procedure signatures retained. No EF migration is required.
-- This includes the requested Aadhaar cleanup/unique constraint.
-- Keep SQL execution stop-on-error enabled. Read START_HERE.md.

-- BEGIN 01_INTEGRATION_PATCH.sql
-- Apply ONCE to the supplied cms_btech dump, or rerun safely. No EF migrations.
-- No table/data drops. Existing procedure signatures remain available.
USE cms_btech;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_cms_add_column`$$
CREATE PROCEDURE `sp_cms_add_column`(IN p_name VARCHAR(64), IN p_definition VARCHAR(255))
BEGIN
IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='studentadmissions' AND column_name=p_name) THEN
 SET @cms_ddl = CONCAT('ALTER TABLE studentadmissions ADD COLUMN `',p_name,'` ',p_definition);
 PREPARE cms_statement FROM @cms_ddl; EXECUTE cms_statement; DEALLOCATE PREPARE cms_statement;
END IF;
END$$

CALL sp_cms_add_column('AcademicCollegeId','BIGINT NULL')$$

CALL sp_cms_add_column('AcademicDepartmentId','BIGINT NULL')$$

CALL sp_cms_add_column('AcademicCourseId','BIGINT NULL')$$

CALL sp_cms_add_column('AcademicBranchId','BIGINT NULL')$$

CALL sp_cms_add_column('AcademicSemesterId','BIGINT NULL')$$

CALL sp_cms_add_column('EntryType','VARCHAR(50) NULL')$$

CALL sp_cms_add_column('Regulation','VARCHAR(50) NULL')$$

CALL sp_cms_add_column('Batch','VARCHAR(50) NULL')$$

DROP PROCEDURE sp_cms_add_column$$

UPDATE studentadmissions sa JOIN sections sec ON sec.section_id=sa.SectionId
SET sa.AcademicCollegeId=COALESCE(sa.AcademicCollegeId,sec.college_id),
sa.AcademicDepartmentId=COALESCE(sa.AcademicDepartmentId,sec.department_id),
sa.AcademicCourseId=COALESCE(sa.AcademicCourseId,sec.course_id),
sa.AcademicBranchId=COALESCE(sa.AcademicBranchId,sec.branch_id),
sa.AcademicSemesterId=COALESCE(sa.AcademicSemesterId,sec.semester_id)
WHERE sa.IsDeleted=0$$

CREATE OR REPLACE SQL SECURITY INVOKER VIEW vw_cms_admission_directory AS SELECT sa.*, fd.form_data AS FrontendFormDataJson,
 COALESCE(sa.AcademicCollegeId,sec.college_id) AS AdmissionCollegeId, col.college_name AS AdmissionCollegeName,
 COALESCE(sa.AcademicDepartmentId,sec.department_id) AS AdmissionDepartmentId, dep.department_name AS AdmissionDepartmentName,
 COALESCE(sa.AcademicCourseId,sec.course_id) AS AdmissionCourseId, c.course_name AS AdmissionCourseName,
 COALESCE(sa.AcademicBranchId,sec.branch_id) AS AdmissionBranchId, b.branch_name AS AdmissionBranchName,
 ay.academic_year_name AS AcademicYearName, COALESCE(sa.AcademicSemesterId,sec.semester_id) AS SemesterId,
 sem.semester_number AS SemesterNumber, sem.semester_name AS SemesterName, sec.section_name AS SectionName,
 (SELECT MIN(st.student_id) FROM students st WHERE st.admission_id=sa.AdmissionId AND st.deleted_at IS NULL) AS StudentId
FROM studentadmissions sa
LEFT JOIN student_admission_form_data fd ON fd.admission_id=sa.AdmissionId
LEFT JOIN sections sec ON sec.section_id=sa.SectionId
LEFT JOIN colleges col ON col.college_id=COALESCE(sa.AcademicCollegeId,sec.college_id)
LEFT JOIN departments dep ON dep.department_id=COALESCE(sa.AcademicDepartmentId,sec.department_id)
LEFT JOIN courses c ON c.course_id=COALESCE(sa.AcademicCourseId,sec.course_id)
LEFT JOIN branches b ON b.branch_id=COALESCE(sa.AcademicBranchId,sec.branch_id)
LEFT JOIN semesters sem ON sem.semester_id=COALESCE(sa.AcademicSemesterId,sec.semester_id)
LEFT JOIN academicyears ay ON ay.academic_year_id=sa.AcademicYearId$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetById`$$
CREATE PROCEDURE `sp_StudentAdmission_GetById`(IN p_admission_id BIGINT)
BEGIN
SELECT * FROM vw_cms_admission_directory WHERE AdmissionId=p_admission_id AND IsDeleted=0 LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_list`$$
CREATE PROCEDURE `sp_student_admission_list`(IN p_search VARCHAR(255), IN p_admission_status VARCHAR(50), IN p_page_number INT, IN p_page_size INT)
BEGIN
DECLARE v_offset INT;
SET p_page_number=GREATEST(COALESCE(p_page_number,1),1); SET p_page_size=LEAST(GREATEST(COALESCE(p_page_size,20),1),100);
SET v_offset=(p_page_number-1)*p_page_size;
SELECT v.*,COUNT(*) OVER() AS TotalRecords FROM vw_cms_admission_directory v WHERE IsDeleted=0 AND (NULLIF(TRIM(p_search),'') IS NULL OR CONCAT_WS(' ',RegistrationNo,ApplicationNo,AdmissionNo,FirstName,LastName,StudentEmail,MobileNumber) LIKE CONCAT('%',TRIM(p_search),'%'))
AND (NULLIF(TRIM(p_admission_status),'') IS NULL OR REPLACE(UPPER(AdmissionStatus),' ','_')=REPLACE(UPPER(p_admission_status),' ','_'))
ORDER BY CreatedAt DESC,AdmissionId DESC LIMIT p_page_size OFFSET v_offset;
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_list_v2`$$
CREATE PROCEDURE `sp_student_admission_list_v2`(IN p_search VARCHAR(255), IN p_admission_status VARCHAR(50), IN p_page_number INT, IN p_page_size INT, IN p_course_id BIGINT, IN p_department_id BIGINT, IN p_branch_id BIGINT, IN p_semester_id BIGINT, IN p_academic_year_id BIGINT)
BEGIN
DECLARE v_offset INT;
IF p_page_size=0 THEN SET p_page_size=2147483647; SET p_page_number=1; END IF;
SET v_offset=(p_page_number-1)*p_page_size;
SELECT v.*,COUNT(*) OVER() AS TotalRecords FROM vw_cms_admission_directory v WHERE IsDeleted=0 AND (NULLIF(TRIM(p_search),'') IS NULL OR CONCAT_WS(' ',RegistrationNo,ApplicationNo,AdmissionNo,FirstName,LastName,StudentEmail,MobileNumber) LIKE CONCAT('%',TRIM(p_search),'%'))
AND (NULLIF(TRIM(p_admission_status),'') IS NULL OR REPLACE(UPPER(AdmissionStatus),' ','_')=REPLACE(UPPER(p_admission_status),' ','_'))
AND (p_course_id IS NULL OR AdmissionCourseId=p_course_id)
AND (p_department_id IS NULL OR AdmissionDepartmentId=p_department_id)
AND (p_branch_id IS NULL OR AdmissionBranchId=p_branch_id)
AND (p_semester_id IS NULL OR SemesterId=p_semester_id)
AND (p_academic_year_id IS NULL OR AcademicYearId=p_academic_year_id)
ORDER BY CreatedAt DESC,AdmissionId DESC LIMIT p_page_size OFFSET v_offset;
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetAcademicDetails`$$
CREATE PROCEDURE `sp_StudentAdmission_GetAcademicDetails`(
    IN p_admission_id BIGINT
)
BEGIN
    SELECT
        AdmissionId,
        RegistrationNo,
        AdmissionNo,
        TRIM(CONCAT(COALESCE(FirstName, ''), ' ', COALESCE(LastName, ''))) AS StudentName,
        AcademicCollegeId AS CollegeId, AcademicDepartmentId AS DepartmentId,
        AcademicCourseId AS CourseId, AcademicBranchId AS BranchId, AcademicSemesterId AS SemesterId,
        AdmissionType, EntryType, Regulation, Batch,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        Medium,
        SecondLanguage,
        PreviousSchool,
        PreviousBoard,
        PreviousYear,
        PreviousPercentage,
        PreviousHallTicket,
        UpdatedBy,
        UpdatedAt
    FROM studentadmissions
    WHERE AdmissionId = p_admission_id
      AND IsDeleted = 0
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_UpdateAcademicDetails_v2`$$
CREATE PROCEDURE `sp_StudentAdmission_UpdateAcademicDetails_v2`(
    IN p_admission_id BIGINT,
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_medium VARCHAR(50),
    IN p_second_language VARCHAR(100),
    IN p_previous_school VARCHAR(200),
    IN p_previous_board VARCHAR(100),
    IN p_previous_year VARCHAR(20),
    IN p_previous_percentage DECIMAL(5,2),
    IN p_previous_hall_ticket VARCHAR(100),
    IN p_updated_by BIGINT,
IN p_college_id BIGINT, IN p_department_id BIGINT, IN p_course_id BIGINT, IN p_branch_id BIGINT,
IN p_semester_id BIGINT, IN p_admission_type VARCHAR(50), IN p_entry_type VARCHAR(50), IN p_regulation VARCHAR(50), IN p_batch VARCHAR(50)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM studentadmissions
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student admission record not found.';
    END IF;

    IF p_previous_percentage IS NOT NULL
       AND (p_previous_percentage < 0 OR p_previous_percentage > 100) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Previous percentage must be between 0 and 100.';
    END IF;

    IF p_academic_year_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM academicyears
           WHERE academic_year_id = p_academic_year_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year not found.';
    END IF;

    IF p_section_id IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = DATABASE()
             AND table_name = 'sections'
       )
       AND NOT EXISTS (
           SELECT 1 FROM sections
           WHERE section_id = p_section_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    UPDATE studentadmissions
       SET AcademicCollegeId=COALESCE(p_college_id,AcademicCollegeId), AcademicDepartmentId=COALESCE(p_department_id,AcademicDepartmentId),
           AcademicCourseId=COALESCE(p_course_id,AcademicCourseId), AcademicBranchId=COALESCE(p_branch_id,AcademicBranchId),
           AcademicSemesterId=COALESCE(p_semester_id,AcademicSemesterId), AdmissionType=COALESCE(p_admission_type,AdmissionType),
           EntryType=COALESCE(p_entry_type,EntryType), Regulation=COALESCE(p_regulation,Regulation), Batch=COALESCE(p_batch,Batch),
           BoardId = COALESCE(p_board_id,BoardId),
           AcademicYearId = COALESCE(p_academic_year_id,AcademicYearId),
           AcademicLevelId = p_academic_level_id,
           GroupId = p_group_id,
           SectionId = COALESCE(p_section_id,SectionId),
           Medium = NULLIF(TRIM(p_medium), ''),
           SecondLanguage = NULLIF(TRIM(p_second_language), ''),
           PreviousSchool = NULLIF(TRIM(p_previous_school), ''),
           PreviousBoard = NULLIF(TRIM(p_previous_board), ''),
           PreviousYear = NULLIF(TRIM(p_previous_year), ''),
           PreviousPercentage = p_previous_percentage,
           PreviousHallTicket = NULLIF(TRIM(p_previous_hall_ticket), ''),
           UpdatedBy = p_updated_by,
           UpdatedAt = UTC_TIMESTAMP()
     WHERE AdmissionId = p_admission_id
       AND IsDeleted = 0;

    CALL sp_StudentAdmission_GetAcademicDetails(p_admission_id);
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_form_data_upsert`$$
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
        `form_data` = JSON_MERGE_PATCH(`form_data`, VALUES(`form_data`)),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END$$

CREATE TABLE IF NOT EXISTS entity_status_audit (
 audit_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, entity_type VARCHAR(40) NOT NULL, entity_id BIGINT NOT NULL,
 old_status TINYINT NULL, new_status TINYINT NOT NULL, changed_by BIGINT NULL, changed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX ix_status_audit_entity(entity_type,entity_id,changed_at)
) ENGINE=InnoDB$$
CREATE TABLE IF NOT EXISTS api_activity_logs (
 log_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, correlation_id VARCHAR(100) NOT NULL,
 user_id BIGINT NULL, screen VARCHAR(100) NOT NULL, action_name VARCHAR(160) NOT NULL,
 http_method VARCHAR(10) NOT NULL, route VARCHAR(500) NOT NULL, status_code INT NOT NULL, duration_ms BIGINT NOT NULL,
 occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX ix_activity_time(occurred_at), INDEX ix_activity_screen(screen,occurred_at), INDEX ix_activity_correlation(correlation_id)
) ENGINE=InnoDB$$

CREATE OR REPLACE SQL SECURITY INVOKER VIEW vw_cms_student_links AS
SELECT s.student_id,s.status,s.college_id,s.course_id,s.branch_id,c.department_id,NULL AS semester_id,NULL AS section_id
FROM students s LEFT JOIN courses c ON c.course_id=s.course_id WHERE s.deleted_at IS NULL
UNION
SELECT s.student_id,s.status,s.college_id,sec.course_id,sec.branch_id,sec.department_id,sec.semester_id,sec.section_id
FROM students s JOIN student_section_assignments a ON a.student_id=s.student_id AND a.status=1
JOIN sections sec ON sec.section_id=a.section_id WHERE s.deleted_at IS NULL
UNION
SELECT s.student_id,s.status,s.college_id,sec.course_id,sec.branch_id,sec.department_id,sec.semester_id,sec.section_id
FROM students s JOIN student_sections a ON a.student_id=s.student_id AND a.is_active=1
JOIN sections sec ON sec.section_id=a.section_id WHERE s.deleted_at IS NULL
UNION
SELECT s.student_id,s.status,s.college_id,v.AdmissionCourseId,v.AdmissionBranchId,v.AdmissionDepartmentId,v.SemesterId,v.SectionId
FROM students s JOIN vw_cms_admission_directory v ON v.AdmissionId=s.admission_id WHERE s.deleted_at IS NULL AND v.IsDeleted=0$$

DROP PROCEDURE IF EXISTS `sp_cms_require_active`$$
CREATE PROCEDURE `sp_cms_require_active`(IN p_entity VARCHAR(40), IN p_id BIGINT)
BEGIN
DECLARE v_status INT DEFAULT NULL; DECLARE v_message VARCHAR(128);
IF p_entity='college' THEN
 SELECT status INTO v_status FROM colleges WHERE college_id=p_id AND deleted_at IS NULL FOR SHARE;
ELSEIF p_entity='department' THEN
 SELECT status INTO v_status FROM departments WHERE department_id=p_id AND deleted_at IS NULL FOR SHARE;
ELSEIF p_entity='course' THEN
 SELECT status INTO v_status FROM courses WHERE course_id=p_id AND deleted_at IS NULL FOR SHARE;
ELSEIF p_entity='branch' THEN
 SELECT status INTO v_status FROM branches WHERE branch_id=p_id AND deleted_at IS NULL FOR SHARE;
ELSEIF p_entity='semester' THEN
 SELECT status INTO v_status FROM semesters WHERE semester_id=p_id AND is_archived=0 FOR SHARE;
ELSEIF p_entity='section' THEN
 SELECT status INTO v_status FROM sections WHERE section_id=p_id AND deleted_at IS NULL AND is_archived=0 FOR SHARE;
END IF;
IF v_status IS NULL OR v_status<>1 THEN SET v_message=CONCAT('Select an active ',p_entity,'.'); SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=v_message; END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_check_deactivation`$$
CREATE PROCEDURE `sp_cms_check_deactivation`(IN p_entity VARCHAR(40),IN p_id BIGINT)
BEGIN
DECLARE v_count BIGINT DEFAULT 0; DECLARE v_found BIGINT DEFAULT 0; DECLARE v_message VARCHAR(128);
IF p_entity='department' THEN
SELECT COUNT(*) INTO v_found FROM courses WHERE department_id=p_id AND status=1 AND deleted_at IS NULL FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM branches WHERE department_id=p_id AND status=1 AND deleted_at IS NULL FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM sections WHERE department_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE AdmissionDepartmentId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE department_id=p_id AND status=1; SET v_count=v_count+v_found;
ELSEIF p_entity='course' THEN
SELECT COUNT(*) INTO v_found FROM branches WHERE course_id=p_id AND status=1 AND deleted_at IS NULL FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM semesters WHERE course_id=p_id AND status=1 AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM sections WHERE course_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE AdmissionCourseId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE course_id=p_id AND status=1; SET v_count=v_count+v_found;
ELSEIF p_entity='branch' THEN
SELECT COUNT(*) INTO v_found FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE branch_id=p_id AND status=1; SET v_count=v_count+v_found;
ELSEIF p_entity='semester' THEN
SELECT COUNT(*) INTO v_found FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE semester_id=p_id AND status=1; SET v_count=v_count+v_found;
ELSEIF p_entity='section' THEN
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE SectionId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE section_id=p_id AND status=1; SET v_count=v_count+v_found;
END IF;
IF v_count>0 THEN SET v_message=CONCAT('Cannot deactivate ',p_entity,': active dependent records exist. Reassign or deactivate them first.'); SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=v_message; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_departments_insert$$
CREATE TRIGGER trg_cms_departments_insert BEFORE INSERT ON departments FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 THEN CALL sp_cms_require_active('college',NEW.college_id); END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_departments_update$$
CREATE TRIGGER trg_cms_departments_update BEFORE UPDATE ON departments FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF (OLD.status=1 AND NEW.status=0) OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN CALL sp_cms_check_deactivation('department',OLD.department_id); END IF;
IF NEW.status=1 AND (OLD.status<>1 OR NOT(NEW.college_id<=>OLD.college_id)) THEN CALL sp_cms_require_active('college',NEW.college_id); END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_departments_audit$$
CREATE TRIGGER trg_cms_departments_audit AFTER UPDATE ON departments FOR EACH ROW BEGIN IF NEW.status<>OLD.status THEN INSERT INTO entity_status_audit(entity_type,entity_id,old_status,new_status,changed_by) VALUES('department',NEW.department_id,OLD.status,NEW.status,NEW.updated_by); END IF; END$$

DROP TRIGGER IF EXISTS trg_cms_courses_insert$$
CREATE TRIGGER trg_cms_courses_insert BEFORE INSERT ON courses FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 THEN CALL sp_cms_require_active('college',NEW.college_id); IF NEW.department_id IS NOT NULL THEN CALL sp_cms_require_active('department',NEW.department_id); IF NOT EXISTS(SELECT 1 FROM departments WHERE department_id=NEW.department_id AND college_id=NEW.college_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Department and course must belong to the same college.'; END IF; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_courses_update$$
CREATE TRIGGER trg_cms_courses_update BEFORE UPDATE ON courses FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF (OLD.status=1 AND NEW.status=0) OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN CALL sp_cms_check_deactivation('course',OLD.course_id); END IF;
IF NEW.status=1 AND (OLD.status<>1 OR NOT(NEW.college_id<=>OLD.college_id) OR NOT(NEW.department_id<=>OLD.department_id)) THEN CALL sp_cms_require_active('college',NEW.college_id); IF NEW.department_id IS NOT NULL THEN CALL sp_cms_require_active('department',NEW.department_id); IF NOT EXISTS(SELECT 1 FROM departments WHERE department_id=NEW.department_id AND college_id=NEW.college_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Department and course must belong to the same college.'; END IF; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_courses_audit$$
CREATE TRIGGER trg_cms_courses_audit AFTER UPDATE ON courses FOR EACH ROW BEGIN IF NEW.status<>OLD.status THEN INSERT INTO entity_status_audit(entity_type,entity_id,old_status,new_status,changed_by) VALUES('course',NEW.course_id,OLD.status,NEW.status,NEW.updated_by); END IF; END$$

DROP TRIGGER IF EXISTS trg_cms_branches_insert$$
CREATE TRIGGER trg_cms_branches_insert BEFORE INSERT ON branches FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 THEN CALL sp_cms_require_active('course',NEW.course_id); IF NEW.department_id IS NOT NULL THEN CALL sp_cms_require_active('department',NEW.department_id); IF NOT EXISTS(SELECT 1 FROM departments d JOIN courses c ON c.course_id=NEW.course_id WHERE d.department_id=NEW.department_id AND d.college_id=c.college_id AND (c.department_id IS NULL OR c.department_id=d.department_id)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Branch department must match its course department and college.'; END IF; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_branches_update$$
CREATE TRIGGER trg_cms_branches_update BEFORE UPDATE ON branches FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF (OLD.status=1 AND NEW.status=0) OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN CALL sp_cms_check_deactivation('branch',OLD.branch_id); END IF;
IF NEW.status=1 AND (OLD.status<>1 OR NOT(NEW.course_id<=>OLD.course_id) OR NOT(NEW.department_id<=>OLD.department_id)) THEN CALL sp_cms_require_active('course',NEW.course_id); IF NEW.department_id IS NOT NULL THEN CALL sp_cms_require_active('department',NEW.department_id); IF NOT EXISTS(SELECT 1 FROM departments d JOIN courses c ON c.course_id=NEW.course_id WHERE d.department_id=NEW.department_id AND d.college_id=c.college_id AND (c.department_id IS NULL OR c.department_id=d.department_id)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Branch department must match its course department and college.'; END IF; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_branches_audit$$
CREATE TRIGGER trg_cms_branches_audit AFTER UPDATE ON branches FOR EACH ROW BEGIN IF NEW.status<>OLD.status THEN INSERT INTO entity_status_audit(entity_type,entity_id,old_status,new_status,changed_by) VALUES('branch',NEW.branch_id,OLD.status,NEW.status,NEW.updated_by); END IF; END$$

DROP TRIGGER IF EXISTS trg_cms_semesters_insert$$
CREATE TRIGGER trg_cms_semesters_insert BEFORE INSERT ON semesters FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 THEN CALL sp_cms_require_active('course',NEW.course_id); CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Semester branch must belong to the selected course.'; END IF; IF NEW.semester_number<1 OR NEW.year_number<>CEIL(NEW.semester_number/2) OR (NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.start_date>NEW.end_date) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid semester number, year number or date range.'; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_semesters_update$$
CREATE TRIGGER trg_cms_semesters_update BEFORE UPDATE ON semesters FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF (OLD.status=1 AND NEW.status=0) OR (NEW.is_archived=1 AND OLD.is_archived=0) THEN CALL sp_cms_check_deactivation('semester',OLD.semester_id); END IF;
IF NEW.status=1 AND (OLD.status<>1 OR NOT(NEW.course_id<=>OLD.course_id) OR NOT(NEW.branch_id<=>OLD.branch_id) OR NOT(NEW.academic_year_id<=>OLD.academic_year_id)) THEN CALL sp_cms_require_active('course',NEW.course_id); CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Semester branch must belong to the selected course.'; END IF; IF NEW.semester_number<1 OR NEW.year_number<>CEIL(NEW.semester_number/2) OR (NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.start_date>NEW.end_date) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid semester number, year number or date range.'; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_semesters_audit$$
CREATE TRIGGER trg_cms_semesters_audit AFTER UPDATE ON semesters FOR EACH ROW BEGIN IF NEW.status<>OLD.status THEN INSERT INTO entity_status_audit(entity_type,entity_id,old_status,new_status,changed_by) VALUES('semester',NEW.semester_id,OLD.status,NEW.status,NEW.updated_by); END IF; END$$

DROP TRIGGER IF EXISTS trg_cms_sections_insert$$
CREATE TRIGGER trg_cms_sections_insert BEFORE INSERT ON sections FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 THEN CALL sp_cms_require_active('department',NEW.department_id); IF NEW.course_id IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.course_id); END IF; IF NEW.branch_id IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section branch must belong to the selected course.'; END IF; END IF; IF NEW.semester_id IS NOT NULL THEN CALL sp_cms_require_active('semester',NEW.semester_id); IF NOT EXISTS(SELECT 1 FROM semesters WHERE semester_id=NEW.semester_id AND course_id=NEW.course_id AND branch_id=NEW.branch_id AND academic_year_id=NEW.academic_year_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section semester must match course, branch and academic year.'; END IF; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_sections_update$$
CREATE TRIGGER trg_cms_sections_update BEFORE UPDATE ON sections FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF (OLD.status=1 AND NEW.status=0) OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN CALL sp_cms_check_deactivation('section',OLD.section_id); END IF;
IF NEW.status=1 AND (OLD.status<>1 OR NOT(NEW.college_id<=>OLD.college_id) OR NOT(NEW.department_id<=>OLD.department_id) OR NOT(NEW.course_id<=>OLD.course_id) OR NOT(NEW.branch_id<=>OLD.branch_id) OR NOT(NEW.semester_id<=>OLD.semester_id) OR NOT(NEW.academic_year_id<=>OLD.academic_year_id)) THEN CALL sp_cms_require_active('department',NEW.department_id); IF NEW.course_id IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.course_id); END IF; IF NEW.branch_id IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section branch must belong to the selected course.'; END IF; END IF; IF NEW.semester_id IS NOT NULL THEN CALL sp_cms_require_active('semester',NEW.semester_id); IF NOT EXISTS(SELECT 1 FROM semesters WHERE semester_id=NEW.semester_id AND course_id=NEW.course_id AND branch_id=NEW.branch_id AND academic_year_id=NEW.academic_year_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section semester must match course, branch and academic year.'; END IF; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_sections_audit$$
CREATE TRIGGER trg_cms_sections_audit AFTER UPDATE ON sections FOR EACH ROW BEGIN IF NEW.status<>OLD.status THEN INSERT INTO entity_status_audit(entity_type,entity_id,old_status,new_status,changed_by) VALUES('section',NEW.section_id,OLD.status,NEW.status,NEW.updated_by); END IF; END$$

DROP TRIGGER IF EXISTS trg_cms_students_insert$$
CREATE TRIGGER trg_cms_students_insert BEFORE INSERT ON students FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 THEN CALL sp_cms_require_active('college',NEW.college_id); IF NEW.course_id IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.course_id); IF NOT EXISTS(SELECT 1 FROM courses WHERE course_id=NEW.course_id AND college_id=NEW.college_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student course must belong to the selected college.'; END IF; END IF; IF NEW.branch_id IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student branch must belong to the selected course.'; END IF; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_students_update$$
CREATE TRIGGER trg_cms_students_update BEFORE UPDATE ON students FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 AND (OLD.status<>1 OR NOT(NEW.college_id<=>OLD.college_id) OR NOT(NEW.course_id<=>OLD.course_id) OR NOT(NEW.branch_id<=>OLD.branch_id)) THEN CALL sp_cms_require_active('college',NEW.college_id); IF NEW.course_id IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.course_id); IF NOT EXISTS(SELECT 1 FROM courses WHERE course_id=NEW.course_id AND college_id=NEW.college_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student course must belong to the selected college.'; END IF; END IF; IF NEW.branch_id IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student branch must belong to the selected course.'; END IF; END IF; END IF;
END$$

DROP TRIGGER IF EXISTS trg_cms_students_audit$$
CREATE TRIGGER trg_cms_students_audit AFTER UPDATE ON students FOR EACH ROW BEGIN IF NEW.status<>OLD.status THEN INSERT INTO entity_status_audit(entity_type,entity_id,old_status,new_status,changed_by) VALUES('student',NEW.student_id,OLD.status,NEW.status,NEW.updated_by); END IF; END$$

DROP TRIGGER IF EXISTS trg_cms_admissions_insert$$
CREATE TRIGGER trg_cms_admissions_insert BEFORE INSERT ON studentadmissions FOR EACH ROW BEGIN IF NEW.IsActive=1 THEN IF NEW.AcademicCollegeId IS NOT NULL THEN CALL sp_cms_require_active('college',NEW.AcademicCollegeId); END IF;
IF NEW.AcademicDepartmentId IS NOT NULL THEN CALL sp_cms_require_active('department',NEW.AcademicDepartmentId); END IF;
IF NEW.AcademicCourseId IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.AcademicCourseId); END IF;
IF NEW.AcademicBranchId IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.AcademicBranchId); END IF;
IF NEW.AcademicSemesterId IS NOT NULL THEN CALL sp_cms_require_active('semester',NEW.AcademicSemesterId); END IF;
IF NEW.SectionId IS NOT NULL THEN CALL sp_cms_require_active('section',NEW.SectionId); END IF;
IF NEW.AcademicCourseId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM courses WHERE course_id=NEW.AcademicCourseId AND (NEW.AcademicCollegeId IS NULL OR college_id=NEW.AcademicCollegeId) AND (NEW.AcademicDepartmentId IS NULL OR department_id IS NULL OR department_id=NEW.AcademicDepartmentId)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission course must match its college and department.'; END IF;
IF NEW.AcademicBranchId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.AcademicBranchId AND course_id=NEW.AcademicCourseId) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission branch must belong to the selected course.'; END IF;
IF NEW.AcademicSemesterId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM semesters WHERE semester_id=NEW.AcademicSemesterId AND course_id=NEW.AcademicCourseId AND branch_id=NEW.AcademicBranchId) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission semester must match its course and branch.'; END IF; END IF; END$$

DROP TRIGGER IF EXISTS trg_cms_admissions_update$$
CREATE TRIGGER trg_cms_admissions_update BEFORE UPDATE ON studentadmissions FOR EACH ROW BEGIN IF NEW.IsActive=1 AND (OLD.IsActive=0 OR NOT(NEW.AcademicCollegeId<=>OLD.AcademicCollegeId) OR NOT(NEW.AcademicDepartmentId<=>OLD.AcademicDepartmentId) OR NOT(NEW.AcademicCourseId<=>OLD.AcademicCourseId) OR NOT(NEW.AcademicBranchId<=>OLD.AcademicBranchId) OR NOT(NEW.AcademicSemesterId<=>OLD.AcademicSemesterId) OR NOT(NEW.SectionId<=>OLD.SectionId)) THEN IF NEW.AcademicCollegeId IS NOT NULL THEN CALL sp_cms_require_active('college',NEW.AcademicCollegeId); END IF;
IF NEW.AcademicDepartmentId IS NOT NULL THEN CALL sp_cms_require_active('department',NEW.AcademicDepartmentId); END IF;
IF NEW.AcademicCourseId IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.AcademicCourseId); END IF;
IF NEW.AcademicBranchId IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.AcademicBranchId); END IF;
IF NEW.AcademicSemesterId IS NOT NULL THEN CALL sp_cms_require_active('semester',NEW.AcademicSemesterId); END IF;
IF NEW.SectionId IS NOT NULL THEN CALL sp_cms_require_active('section',NEW.SectionId); END IF;
IF NEW.AcademicCourseId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM courses WHERE course_id=NEW.AcademicCourseId AND (NEW.AcademicCollegeId IS NULL OR college_id=NEW.AcademicCollegeId) AND (NEW.AcademicDepartmentId IS NULL OR department_id IS NULL OR department_id=NEW.AcademicDepartmentId)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission course must match its college and department.'; END IF;
IF NEW.AcademicBranchId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.AcademicBranchId AND course_id=NEW.AcademicCourseId) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission branch must belong to the selected course.'; END IF;
IF NEW.AcademicSemesterId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM semesters WHERE semester_id=NEW.AcademicSemesterId AND course_id=NEW.AcademicCourseId AND branch_id=NEW.AcademicBranchId) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission semester must match its course and branch.'; END IF; END IF; END$$

DROP PROCEDURE IF EXISTS `sp_cms_status_update`$$
CREATE PROCEDURE `sp_cms_status_update`(IN p_entity VARCHAR(40),IN p_id BIGINT,IN p_status TINYINT,IN p_actor BIGINT)
BEGIN
IF p_status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF p_entity='branch' THEN UPDATE branches SET status=p_status,updated_by=p_actor,updated_at=UTC_TIMESTAMP() WHERE branch_id=p_id AND deleted_at IS NULL;
ELSEIF p_entity='semester' THEN UPDATE semesters SET status=p_status,updated_by=p_actor,updated_at=UTC_TIMESTAMP() WHERE semester_id=p_id AND is_archived=0;
ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported status entity.'; END IF;
SELECT ROW_COUNT() AS affectedRows;
END$$

DELIMITER ;

-- END 01_INTEGRATION_PATCH.sql

-- BEGIN 02_DOWNLOADS.sql
USE cms_btech;
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_cms_export$$
CREATE PROCEDURE sp_cms_export(IN p_screen VARCHAR(50),IN p_search VARCHAR(255),IN p_status VARCHAR(50),IN p_college_id BIGINT,IN p_department_id BIGINT,IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,IN p_academic_year_id BIGINT)
BEGIN
IF p_screen='colleges' THEN
SELECT * FROM (SELECT t.`college_id` AS `CollegeId`, t.`college_code` AS `CollegeCode`, t.`college_name` AS `CollegeName`, t.`college_type` AS `CollegeType`, t.`university_name` AS `UniversityName`, t.`email` AS `Email`, t.`mobile` AS `Mobile`, t.`phone` AS `Phone`, t.`principal` AS `Principal`, t.`principal_email` AS `PrincipalEmail`, t.`principal_contact` AS `PrincipalContact`, t.`alternate_contact_number` AS `AlternateContactNumber`, t.`accreditation_status` AS `AccreditationStatus`, t.`accreditation_body` AS `AccreditationBody`, t.`accreditation_grade` AS `AccreditationGrade`, t.`accreditation_number` AS `AccreditationNumber`, t.`valid_from` AS `ValidFrom`, t.`valid_until` AS `ValidUntil`, t.`address_line1` AS `AddressLine1`, t.`address_line2` AS `AddressLine2`, t.`city` AS `City`, t.`area` AS `Area`, t.`district` AS `District`, t.`state` AS `State`, t.`country` AS `Country`, t.`pincode` AS `Pincode`, t.`website` AS `Website`, t.`academic_year_id` AS `AcademicYearId`, t.`timezone` AS `Timezone`, t.`currency_code` AS `CurrencyCode`, t.`logo_path` AS `LogoPath`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy` FROM `colleges` t  WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`CollegeCode`,q.`CollegeName`,q.`UniversityName`,q.`Email`,q.`PrincipalEmail`,q.`CurrencyCode`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='college-settings' THEN
SELECT * FROM (SELECT t.`college_setting_id` AS `CollegeSettingId`, t.`college_id` AS `CollegeId`, t.`college_name` AS `CollegeName`, t.`college_code` AS `CollegeCode`, t.`college_email` AS `CollegeEmail`, t.`phone_number` AS `PhoneNumber`, t.`website` AS `Website`, t.`address_line1` AS `AddressLine1`, t.`address_line2` AS `AddressLine2`, t.`city` AS `City`, t.`state` AS `State`, t.`pincode` AS `Pincode`, t.`academic_year` AS `AcademicYear`, t.`semester` AS `Semester`, t.`institution_type` AS `InstitutionType`, t.`date_format` AS `DateFormat`, t.`time_zone` AS `TimeZone`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy` FROM `college_settings` t  WHERE 1=1) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`CollegeName`,q.`CollegeCode`,q.`CollegeEmail`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='academic-years' THEN
SELECT * FROM (SELECT t.`academic_year_id` AS `AcademicYearId`, t.`academic_year_name` AS `AcademicYearName`, t.`start_date` AS `StartDate`, t.`end_date` AS `EndDate`, t.`status` AS `Status`, t.`is_archived` AS `IsArchived`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, t.`active_guard` AS `ActiveGuard` FROM `academicyears` t  WHERE t.deleted_at IS NULL) q WHERE (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`AcademicYearName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='academic-levels' THEN
SELECT * FROM (SELECT t.`academic_level_id` AS `AcademicLevelId`, t.`academic_year_id` AS `AcademicYearId`, t.`level_type` AS `LevelType`, t.`level_name` AS `LevelName`, t.`level_number` AS `LevelNumber`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy` FROM `academic_levels` t  WHERE 1=1) q WHERE (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`LevelName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='departments' THEN
SELECT * FROM (SELECT t.`department_id` AS `DepartmentId`, t.`college_id` AS `CollegeId`, t.`department_code` AS `DepartmentCode`, t.`department_name` AS `DepartmentName`, t.`description` AS `Description`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, t.`hod_user_id` AS `HodUserId`, c.college_name AS `CollegeName` FROM `departments` t LEFT JOIN colleges c ON c.college_id=t.college_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`DepartmentCode`,q.`DepartmentName`,q.`CollegeName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='courses' THEN
SELECT * FROM (SELECT t.`course_id` AS `CourseId`, t.`college_id` AS `CollegeId`, t.`department_id` AS `DepartmentId`, t.`course_code` AS `CourseCode`, t.`course_name` AS `CourseName`, t.`course_short_name` AS `CourseShortName`, t.`course_type` AS `CourseType`, t.`duration_years` AS `DurationYears`, t.`total_semesters` AS `TotalSemesters`, t.`eligibility` AS `Eligibility`, t.`description` AS `Description`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, d.department_name AS `DepartmentName` FROM `courses` t LEFT JOIN departments d ON d.department_id=t.department_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`CourseCode`,q.`CourseName`,q.`CourseShortName`,q.`DepartmentName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='branches' THEN
SELECT * FROM (SELECT t.`branch_id` AS `BranchId`, t.`course_id` AS `CourseId`, t.`branch_code` AS `BranchCode`, t.`branch_name` AS `BranchName`, t.`short_name` AS `ShortName`, t.`specialization` AS `Specialization`, t.`department_id` AS `DepartmentId`, t.`branch_type` AS `BranchType`, t.`duration` AS `Duration`, t.`total_semesters` AS `TotalSemesters`, t.`intake_capacity` AS `IntakeCapacity`, t.`starting_academic_year_id` AS `StartingAcademicYearId`, t.`description` AS `Description`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, c.college_id AS `CollegeId`, c.course_name AS `CourseName`, d.department_name AS `DepartmentName` FROM `branches` t JOIN courses c ON c.course_id=t.course_id LEFT JOIN departments d ON d.department_id=t.department_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`BranchCode`,q.`BranchName`,q.`ShortName`,q.`CourseName`,q.`DepartmentName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='semesters' THEN
SELECT * FROM (SELECT t.`semester_id` AS `SemesterId`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`semester_number` AS `SemesterNumber`, t.`year_number` AS `YearNumber`, t.`semester_name` AS `SemesterName`, t.`status` AS `Status`, t.`is_archived` AS `IsArchived`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`academic_year_id` AS `AcademicYearId`, t.`start_date` AS `StartDate`, t.`end_date` AS `EndDate`, c.college_id AS `CollegeId`, c.course_name AS `CourseName`, c.department_id AS `DepartmentId`, b.branch_name AS `BranchName` FROM `semesters` t JOIN courses c ON c.course_id=t.course_id JOIN branches b ON b.branch_id=t.branch_id WHERE t.is_archived=0) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_semester_id IS NULL OR q.`SemesterId`=p_semester_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`SemesterName`,q.`CourseName`,q.`BranchName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='sections' THEN
SELECT * FROM (SELECT t.`section_id` AS `SectionId`, t.`college_id` AS `CollegeId`, t.`academic_year_id` AS `AcademicYearId`, t.`department_id` AS `DepartmentId`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`semester` AS `Semester`, t.`semester_id` AS `SemesterId`, t.`section_code` AS `SectionCode`, t.`section_name` AS `SectionName`, t.`capacity` AS `Capacity`, t.`class_teacher_employee_profile_id` AS `ClassTeacherEmployeeProfileId`, t.`room` AS `Room`, t.`shift` AS `Shift`, t.`section_type` AS `SectionType`, t.`status` AS `Status`, t.`is_archived` AS `IsArchived`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy` FROM `sections` t  WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_semester_id IS NULL OR q.`SemesterId`=p_semester_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`SectionCode`,q.`SectionName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='course-structures' THEN
SELECT * FROM (SELECT t.`structure_id` AS `StructureId`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`year_number` AS `YearNumber`, t.`semester_number` AS `SemesterNumber`, t.`semester_name` AS `SemesterName`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, c.college_id AS `CollegeId`, c.course_name AS `CourseName` FROM `course_structures` t JOIN courses c ON c.course_id=t.course_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`SemesterName`,q.`CourseName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='students' THEN
SELECT * FROM (SELECT t.`student_id` AS `StudentId`, t.`admission_id` AS `AdmissionId`, t.`college_id` AS `CollegeId`, t.`student_code` AS `StudentCode`, t.`full_name` AS `FullName`, t.`gender` AS `Gender`, t.`date_of_birth` AS `DateOfBirth`, t.`email` AS `Email`, t.`mobile` AS `Mobile`, t.`blood_group` AS `BloodGroup`, t.`address` AS `Address`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`academic_year_id` AS `AcademicYearId`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, c.course_name AS `CourseName`, c.department_id AS `DepartmentId`, b.branch_name AS `BranchName` FROM `students` t LEFT JOIN courses c ON c.course_id=t.course_id LEFT JOIN branches b ON b.branch_id=t.branch_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`StudentCode`,q.`FullName`,q.`Email`,q.`CourseName`,q.`BranchName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='student-profiles' THEN
SELECT * FROM (SELECT t.`PermanentCountry` AS `PermanentCountry`, t.`PermanentState` AS `PermanentState`, t.`PermanentDistrict` AS `PermanentDistrict`, t.`PermanentCity` AS `PermanentCity`, t.`PermanentPincode` AS `PermanentPincode`, t.`PermanentAddress` AS `PermanentAddress`, t.`PermanentHouseNumber` AS `PermanentHouseNumber`, t.`HouseNumber` AS `HouseNumber`, t.`StudentProfileId` AS `StudentProfileId`, t.`StudentId` AS `StudentId`, t.`AlternateEmail` AS `AlternateEmail`, t.`AlternateMobile` AS `AlternateMobile`, t.`BloodGroup` AS `BloodGroup`, t.`Nationality` AS `Nationality`, t.`Religion` AS `Religion`, t.`Category` AS `Category`, t.`Address` AS `Address`, t.`City` AS `City`, t.`District` AS `District`, t.`State` AS `State`, t.`Country` AS `Country`, t.`Pincode` AS `Pincode`, t.`ProfileStatus` AS `ProfileStatus`, t.`IsProfileCompleted` AS `IsProfileCompleted`, t.`IsVerified` AS `IsVerified`, t.`VerifiedBy` AS `VerifiedBy`, t.`VerifiedAt` AS `VerifiedAt`, t.`ProfileCompletionPercentage` AS `ProfileCompletionPercentage`, t.`Remarks` AS `Remarks`, t.`IsActive` AS `IsActive`, t.`IsDeleted` AS `IsDeleted`, t.`CreatedBy` AS `CreatedBy`, t.`CreatedAt` AS `CreatedAt`, t.`UpdatedBy` AS `UpdatedBy`, t.`UpdatedAt` AS `UpdatedAt`, t.`DeletedBy` AS `DeletedBy`, t.`DeletedAt` AS `DeletedAt`, s.college_id AS `CollegeId`, s.full_name AS `FullName`, s.course_id AS `CourseId`, s.branch_id AS `BranchId`, s.academic_year_id AS `AcademicYearId` FROM `student_profiles` t JOIN students s ON s.student_id=t.StudentId WHERE t.IsDeleted=0 AND s.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`AlternateEmail`,q.`FullName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='student-admissions' THEN
SELECT * FROM (SELECT `AdmissionId` AS `AdmissionId`, `RegistrationNo` AS `RegistrationNo`, `AdmissionNo` AS `AdmissionNo`, `FirstName` AS `FirstName`, `LastName` AS `LastName`, `Gender` AS `Gender`, `DateOfBirth` AS `DateOfBirth`, `StudentEmail` AS `StudentEmail`, `MobileNumber` AS `MobileNumber`, `AdmissionType` AS `AdmissionType`, `EntryType` AS `EntryType`, `Regulation` AS `Regulation`, `Batch` AS `Batch`, `AdmissionStatus` AS `Status`, `AcademicYearId` AS `AcademicYearId`, `AcademicYearName` AS `AcademicYearName`, `AdmissionCollegeId` AS `CollegeId`, `AdmissionCollegeName` AS `CollegeName`, `AdmissionDepartmentId` AS `DepartmentId`, `AdmissionDepartmentName` AS `DepartmentName`, `AdmissionCourseId` AS `CourseId`, `AdmissionCourseName` AS `CourseName`, `AdmissionBranchId` AS `BranchId`, `AdmissionBranchName` AS `BranchName`, `SemesterId` AS `SemesterId`, `SemesterName` AS `SemesterName`, `SectionId` AS `SectionId`, `SectionName` AS `SectionName`, `IsActive` AS `IsActive`, `CreatedAt` AS `CreatedAt`, `UpdatedAt` AS `UpdatedAt` FROM vw_cms_admission_directory WHERE IsDeleted=0) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_semester_id IS NULL OR q.`SemesterId`=p_semester_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`RegistrationNo`,q.`AdmissionNo`,q.`FirstName`,q.`LastName`,q.`StudentEmail`,q.`AcademicYearName`,q.`CollegeName`,q.`DepartmentName`,q.`CourseName`,q.`BranchName`,q.`SemesterName`,q.`SectionName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='promotions' THEN
SELECT * FROM (SELECT t.`promotion_id` AS `PromotionId`, t.`student_id` AS `StudentId`, t.`from_academic_year_id` AS `FromAcademicYearId`, t.`to_academic_year_id` AS `ToAcademicYearId`, t.`from_course_id` AS `FromCourseId`, t.`to_course_id` AS `ToCourseId`, t.`from_branch_id` AS `FromBranchId`, t.`to_branch_id` AS `ToBranchId`, t.`from_semester` AS `FromSemester`, t.`to_semester` AS `ToSemester`, t.`promotion_status` AS `PromotionStatus`, t.`decision` AS `Decision`, t.`decision_date` AS `DecisionDate`, t.`decision_by` AS `DecisionBy`, t.`remarks` AS `Remarks`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, t.`college_id` AS `CollegeId`, t.`from_section_id` AS `FromSectionId`, t.`to_section_id` AS `ToSectionId`, t.`attendance_percentage` AS `AttendancePercentage`, t.`total_marks` AS `TotalMarks`, t.`obtained_marks` AS `ObtainedMarks`, t.`marks_percentage` AS `MarksPercentage`, t.`passed_subjects` AS `PassedSubjects`, t.`failed_subjects` AS `FailedSubjects`, t.`backlog_count` AS `BacklogCount`, t.`promotion_eligibility` AS `PromotionEligibility`, t.`eligibility_remarks` AS `EligibilityRemarks`, t.`promotion_type` AS `PromotionType`, t.`promotion_date` AS `PromotionDate`, t.`effective_date` AS `EffectiveDate`, t.`promotion_reason` AS `PromotionReason`, t.`rejection_reason` AS `RejectionReason`, t.`approved_at` AS `ApprovedAt`, t.`is_final` AS `IsFinal`, t.`promotion_order` AS `PromotionOrder`, t.`is_active` AS `IsActive`, s.full_name AS `StudentName` FROM `student_promotions` t JOIN students s ON s.student_id=t.student_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`StudentName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='users' THEN
SELECT * FROM (SELECT t.`user_id` AS `UserId`, t.`college_id` AS `CollegeId`, t.`employee_user_id` AS `EmployeeUserId`, t.`full_name` AS `FullName`, t.`email` AS `Email`, t.`mobile` AS `Mobile`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`updated_at` AS `UpdatedAt` FROM `users` t  WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`FullName`,q.`Email`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='roles' THEN
SELECT * FROM (SELECT t.`role_id` AS `RoleId`, t.`role_name` AS `RoleName`, t.`role_code` AS `RoleCode`, t.`description` AS `Description`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy` FROM `roles` t  WHERE t.deleted_at IS NULL) q WHERE (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`RoleName`,q.`RoleCode`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='faculty' THEN
SELECT * FROM (SELECT t.`employee_profile_id` AS `EmployeeProfileId`, t.`user_id` AS `UserId`, t.`department_id` AS `DepartmentId`, t.`designation` AS `Designation`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`updated_at` AS `UpdatedAt`, u.college_id AS `CollegeId`, u.full_name AS `FullName`, u.employee_user_id AS `EmployeeUserId` FROM `employee_profiles` t JOIN users u ON u.user_id=t.user_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`FullName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSEIF p_screen='fee-structures' THEN
SELECT * FROM (SELECT t.`fee_master_id` AS `FeeMasterId`, t.`academic_year_id` AS `AcademicYearId`, t.`department_id` AS `DepartmentId`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`semester_id` AS `SemesterId`, t.`admission_type` AS `AdmissionType`, t.`quota` AS `Quota`, t.`student_category` AS `StudentCategory`, t.`tuition_fee` AS `TuitionFee`, t.`admission_fee` AS `AdmissionFee`, t.`effective_from` AS `EffectiveFrom`, t.`effective_to` AS `EffectiveTo`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, c.college_id AS `CollegeId` FROM `fee_master_structures` t JOIN courses c ON c.course_id=t.course_id WHERE 1=1) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_semester_id IS NULL OR q.`SemesterId`=p_semester_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) LIMIT 100001;
ELSEIF p_screen='hostel-fees' THEN
SELECT * FROM (SELECT t.`hostel_fee_master_id` AS `HostelFeeMasterId`, t.`academic_year_id` AS `AcademicYearId`, t.`hostel_type` AS `HostelType`, t.`room_type` AS `RoomType`, t.`amount` AS `Amount`, t.`effective_from` AS `EffectiveFrom`, t.`effective_to` AS `EffectiveTo`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy` FROM `hostel_fee_master` t  WHERE 1=1) q WHERE (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) LIMIT 100001;
ELSEIF p_screen='transport-fees' THEN
SELECT * FROM (SELECT t.`transport_fee_master_id` AS `TransportFeeMasterId`, t.`academic_year_id` AS `AcademicYearId`, t.`route_id` AS `RouteId`, t.`route_code` AS `RouteCode`, t.`route_name` AS `RouteName`, t.`amount` AS `Amount`, t.`effective_from` AS `EffectiveFrom`, t.`effective_to` AS `EffectiveTo`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy` FROM `transport_fee_master` t  WHERE 1=1) q WHERE (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (p_status IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER(p_status)) AND (NULLIF(p_search,'') IS NULL OR CONCAT_WS(' ',q.`RouteCode`,q.`RouteName`) LIKE CONCAT('%',p_search,'%')) LIMIT 100001;
ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported export screen.'; END IF;
END$$
DELIMITER ;

-- END 02_DOWNLOADS.sql

-- BEGIN 03_OPERATIONS.sql
USE cms_btech;
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cms_log_api_activity$$
CREATE PROCEDURE sp_cms_log_api_activity(IN p_correlation VARCHAR(100),IN p_user_id BIGINT,IN p_screen VARCHAR(100),IN p_action VARCHAR(160),IN p_method VARCHAR(10),IN p_route VARCHAR(500),IN p_status INT,IN p_duration BIGINT) BEGIN
INSERT INTO api_activity_logs(correlation_id,user_id,screen,action_name,http_method,route,status_code,duration_ms) VALUES(p_correlation,p_user_id,p_screen,p_action,p_method,p_route,p_status,p_duration);
END$$

DROP PROCEDURE IF EXISTS sp_cms_activity_list$$
CREATE PROCEDURE sp_cms_activity_list(IN p_screen VARCHAR(100),IN p_correlation VARCHAR(100),IN p_limit INT) BEGIN
SELECT log_id AS logId,correlation_id AS correlationId,user_id AS userId,screen,action_name AS actionName,http_method AS method,route,status_code AS statusCode,duration_ms AS durationMs,occurred_at AS occurredAt FROM api_activity_logs WHERE (p_screen IS NULL OR screen=p_screen) AND (p_correlation IS NULL OR correlation_id=p_correlation) ORDER BY log_id DESC LIMIT p_limit;
END$$

DROP PROCEDURE IF EXISTS sp_cms_status_history$$
CREATE PROCEDURE sp_cms_status_history(IN p_entity VARCHAR(40),IN p_id BIGINT) BEGIN
SELECT audit_id AS auditId,entity_type AS entityType,entity_id AS entityId,old_status AS oldStatus,new_status AS newStatus,changed_by AS changedBy,changed_at AS changedAt FROM entity_status_audit WHERE entity_type=p_entity AND entity_id=p_id ORDER BY audit_id DESC;
END$$

DROP PROCEDURE IF EXISTS sp_cms_dependency_impact$$
CREATE PROCEDURE sp_cms_dependency_impact(IN p_entity VARCHAR(40),IN p_id BIGINT) BEGIN
IF p_entity='departments' THEN
SELECT department_id AS id,status,(SELECT COUNT(*) FROM courses WHERE department_id=p_id AND status=1 AND deleted_at IS NULL) AS activeCoursesCount,(SELECT COUNT(*) FROM branches WHERE department_id=p_id AND status=1 AND deleted_at IS NULL) AS activeBranchesCount,(SELECT COUNT(*) FROM sections WHERE department_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) AS activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionDepartmentId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(*) FROM courses WHERE department_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM branches WHERE department_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM sections WHERE department_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionDepartmentId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM departments WHERE department_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSEIF p_entity='courses' THEN
SELECT course_id AS id,status,(SELECT COUNT(*) FROM branches WHERE course_id=p_id AND status=1 AND deleted_at IS NULL) AS activeBranchesCount,(SELECT COUNT(*) FROM semesters WHERE course_id=p_id AND status=1 AND is_archived=0) AS activeSemestersCount,(SELECT COUNT(*) FROM sections WHERE course_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) AS activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionCourseId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(*) FROM branches WHERE course_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM semesters WHERE course_id=p_id AND status=1 AND is_archived=0)+(SELECT COUNT(*) FROM sections WHERE course_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionCourseId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM courses WHERE course_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSEIF p_entity='branches' THEN
SELECT branch_id AS id,status,(SELECT COUNT(*) FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0) AS activeSemestersCount,(SELECT COUNT(*) FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) AS activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(*) FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0)+(SELECT COUNT(*) FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM branches WHERE branch_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSEIF p_entity='semesters' THEN
SELECT semester_id AS id,status,(SELECT COUNT(*) FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) AS activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(*) FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM semesters WHERE semester_id=p_id AND is_archived=0 LIMIT 1;
ELSEIF p_entity='sections' THEN
SELECT section_id AS id,status,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SectionId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SectionId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM sections WHERE section_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSEIF p_entity='students' THEN
SELECT student_id AS id,status,0 AS studentCount,0 AS associatedStudentCount,0 AS activeStudentCount,0 AS activeAdmissionCount,(0)=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM students WHERE student_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported dependency entity.'; END IF;
END$$

DELIMITER ;
-- END 03_OPERATIONS.sql

-- BEGIN 04_PROFILE_ADDRESSES.sql
USE cms_btech;
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cms_address_columns$$
CREATE PROCEDURE sp_cms_address_columns(IN p_table VARCHAR(64),IN p_column VARCHAR(64),IN p_definition VARCHAR(200)) BEGIN
IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=p_table AND column_name=p_column) THEN
SET @cms_address_ddl=CONCAT('ALTER TABLE `',p_table,'` ADD COLUMN `',p_column,'` ',p_definition);
PREPARE cms_address_stmt FROM @cms_address_ddl; EXECUTE cms_address_stmt; DEALLOCATE PREPARE cms_address_stmt; END IF; END$$

CALL sp_cms_address_columns('employee_profiles','house_number','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('employee_profiles','permanent_house_number','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('employee_profiles','permanent_address','VARCHAR(500) NULL')$$
CALL sp_cms_address_columns('employee_profiles','permanent_pincode','VARCHAR(10) NULL')$$
CALL sp_cms_address_columns('employee_profiles','permanent_city','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('employee_profiles','permanent_district','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('employee_profiles','permanent_state','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('employee_profiles','permanent_country','VARCHAR(100) NULL DEFAULT ''India''')$$
CALL sp_cms_address_columns('student_profiles','HouseNumber','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('student_profiles','PermanentHouseNumber','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('student_profiles','PermanentAddress','TEXT NULL')$$
CALL sp_cms_address_columns('student_profiles','PermanentPincode','VARCHAR(10) NULL')$$
CALL sp_cms_address_columns('student_profiles','PermanentCity','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('student_profiles','PermanentDistrict','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('student_profiles','PermanentState','VARCHAR(100) NULL')$$
CALL sp_cms_address_columns('student_profiles','PermanentCountry','VARCHAR(100) NULL DEFAULT ''India''')$$
DROP PROCEDURE sp_cms_address_columns$$
DROP PROCEDURE IF EXISTS sp_student_profile_personal_get$$
CREATE PROCEDURE `sp_student_profile_personal_get`(
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
        sp.HouseNumber AS house_number,
        sp.PermanentHouseNumber AS permanent_house_number,
        sp.PermanentAddress AS permanent_address,
        sp.PermanentPincode AS permanent_pincode,
        sp.PermanentCity AS permanent_city,
        sp.PermanentDistrict AS permanent_district,
        sp.PermanentState AS permanent_state,
        sp.PermanentCountry AS permanent_country,

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
DROP PROCEDURE IF EXISTS sp_student_profile_personal_update_v2$$
CREATE PROCEDURE `sp_student_profile_personal_update_v2`(
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
    IN p_user_agent VARCHAR(500),
IN p_house_number VARCHAR(100),
IN p_permanent_house_number VARCHAR(100),
IN p_permanent_address TEXT,
IN p_permanent_pincode VARCHAR(100),
IN p_permanent_city VARCHAR(100),
IN p_permanent_district VARCHAR(100),
IN p_permanent_state VARCHAR(100),
IN p_permanent_country VARCHAR(100)
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
    DECLARE v_old_house_number VARCHAR(100);
    DECLARE v_old_permanent_house_number VARCHAR(100);
    DECLARE v_old_permanent_address TEXT;
    DECLARE v_old_permanent_pincode VARCHAR(100);
    DECLARE v_old_permanent_city VARCHAR(100);
    DECLARE v_old_permanent_district VARCHAR(100);
    DECLARE v_old_permanent_state VARCHAR(100);
    DECLARE v_old_permanent_country VARCHAR(100);

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
        sp.Pincode,
        sp.HouseNumber,
        sp.PermanentHouseNumber,
        sp.PermanentAddress,
        sp.PermanentPincode,
        sp.PermanentCity,
        sp.PermanentDistrict,
        sp.PermanentState,
        sp.PermanentCountry
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
        v_old_pincode,
        v_old_house_number,
        v_old_permanent_house_number,
        v_old_permanent_address,
        v_old_permanent_pincode,
        v_old_permanent_city,
        v_old_permanent_district,
        v_old_permanent_state,
        v_old_permanent_country
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

    IF p_house_number IS NOT NULL AND NOT(p_house_number<=>v_old_house_number) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','HouseNumber'); SET v_old_values=JSON_SET(v_old_values,'$.HouseNumber',v_old_house_number); SET v_new_values=JSON_SET(v_new_values,'$.HouseNumber',p_house_number); END IF;
    IF p_permanent_house_number IS NOT NULL AND NOT(p_permanent_house_number<=>v_old_permanent_house_number) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentHouseNumber'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentHouseNumber',v_old_permanent_house_number); SET v_new_values=JSON_SET(v_new_values,'$.PermanentHouseNumber',p_permanent_house_number); END IF;
    IF p_permanent_address IS NOT NULL AND NOT(p_permanent_address<=>v_old_permanent_address) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentAddress'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentAddress',v_old_permanent_address); SET v_new_values=JSON_SET(v_new_values,'$.PermanentAddress',p_permanent_address); END IF;
    IF p_permanent_pincode IS NOT NULL AND NOT(p_permanent_pincode<=>v_old_permanent_pincode) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentPincode'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentPincode',v_old_permanent_pincode); SET v_new_values=JSON_SET(v_new_values,'$.PermanentPincode',p_permanent_pincode); END IF;
    IF p_permanent_city IS NOT NULL AND NOT(p_permanent_city<=>v_old_permanent_city) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentCity'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentCity',v_old_permanent_city); SET v_new_values=JSON_SET(v_new_values,'$.PermanentCity',p_permanent_city); END IF;
    IF p_permanent_district IS NOT NULL AND NOT(p_permanent_district<=>v_old_permanent_district) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentDistrict'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentDistrict',v_old_permanent_district); SET v_new_values=JSON_SET(v_new_values,'$.PermanentDistrict',p_permanent_district); END IF;
    IF p_permanent_state IS NOT NULL AND NOT(p_permanent_state<=>v_old_permanent_state) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentState'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentState',v_old_permanent_state); SET v_new_values=JSON_SET(v_new_values,'$.PermanentState',p_permanent_state); END IF;
    IF p_permanent_country IS NOT NULL AND NOT(p_permanent_country<=>v_old_permanent_country) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentCountry'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentCountry',v_old_permanent_country); SET v_new_values=JSON_SET(v_new_values,'$.PermanentCountry',p_permanent_country); END IF;
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

    UPDATE student_profiles SET HouseNumber=COALESCE(p_house_number,HouseNumber), PermanentHouseNumber=COALESCE(p_permanent_house_number,PermanentHouseNumber), PermanentAddress=COALESCE(p_permanent_address,PermanentAddress), PermanentPincode=COALESCE(p_permanent_pincode,PermanentPincode), PermanentCity=COALESCE(p_permanent_city,PermanentCity), PermanentDistrict=COALESCE(p_permanent_district,PermanentDistrict), PermanentState=COALESCE(p_permanent_state,PermanentState), PermanentCountry=COALESCE(p_permanent_country,PermanentCountry) WHERE StudentId=p_student_id;

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
-- END 04_PROFILE_ADDRESSES.sql

-- BEGIN 05_PROFILE_FORM.sql
USE cms_btech;
DELIMITER $$

CREATE TABLE IF NOT EXISTS student_profile_form_data (
student_id BIGINT NOT NULL PRIMARY KEY,form_data JSON NOT NULL,updated_by BIGINT NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_profile_form_student FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE RESTRICT
) ENGINE=InnoDB$$
DROP PROCEDURE IF EXISTS sp_student_profile_full_update_v2$$
CREATE PROCEDURE `sp_student_profile_full_update_v2`(
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
    IN p_user_agent VARCHAR(500), IN p_form_data LONGTEXT, IN p_profile_photo LONGTEXT
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
        'MotherOccupation', p.`mother_occupation`, 'ScreenForm', (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id)
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
        'MotherOccupation', p.`mother_occupation`, 'ScreenForm', (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id)
    ) INTO v_new_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    IF p_form_data IS NOT NULL THEN
        IF JSON_VALID(p_form_data)=0 OR JSON_TYPE(CAST(p_form_data AS JSON))<>'OBJECT' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student form must be a JSON object.'; END IF;
        INSERT INTO student_profile_form_data(student_id,form_data,updated_by,updated_at)
        VALUES(p_student_id,CAST(p_form_data AS JSON),p_changed_by,UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE form_data=JSON_MERGE_PATCH(form_data,VALUES(form_data)),updated_by=p_changed_by,updated_at=UTC_TIMESTAMP();
    END IF;
    UPDATE student_profiles SET ProfilePhoto=COALESCE(p_profile_photo,ProfilePhoto),
        HouseNumber=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.houseNumber')),'null'),HouseNumber),
        PermanentHouseNumber=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.houseNumber')),'null'),PermanentHouseNumber),
        PermanentAddress=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.line1')),'null'),PermanentAddress),
        PermanentCity=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.city')),'null'),PermanentCity),
        PermanentDistrict=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.district')),'null'),PermanentDistrict),
        PermanentState=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.state')),'null'),PermanentState),
        PermanentCountry=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.country')),'null'),PermanentCountry),
        PermanentPincode=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.pincode')),'null'),PermanentPincode),
        City=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.city')),'null'),City),
        District=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.district')),'null'),District),
        State=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.state')),'null'),State),
        Pincode=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.pincode')),'null'),Pincode),
        Country=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.country')),'null'),Country),
        AlternateEmail=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.alternateEmail')),'null'),AlternateEmail),
        AlternateMobile=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.alternateMobile')),'null'),AlternateMobile),
        Nationality=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.personal.nationality')),'null'),Nationality),
        Religion=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.personal.religion')),'null'),Religion),
        Category=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.personal.category')),'null'),Category)
    WHERE StudentId=p_student_id;
    SET v_new_values=JSON_SET(v_new_values,'$.ScreenForm',(SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id));

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
            'MotherEmail', 'MotherOccupation', 'ScreenForm'
        ),
        v_old_values, v_new_values,
        COALESCE(NULLIF(TRIM(p_change_reason), ''), 'Student profile updated from the profile screen.'),
        'API', p_changed_by, UTC_TIMESTAMP(6),
        LEFT(p_ip_address, 45), LEFT(p_user_agent, 500)
    );

    COMMIT;
    SELECT 1 AS `Updated`;
END$$
DROP PROCEDURE IF EXISTS sp_student_profile_get_preview$$
CREATE PROCEDURE `sp_student_profile_get_preview`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT
)
BEGIN

    SELECT
        (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id) AS FrontendFormDataJson,

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
DROP PROCEDURE IF EXISTS sp_student_profile_get_all$$
CREATE PROCEDURE `sp_student_profile_get_all`(
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
        (p_college_id=0 OR s.college_id = p_college_id)
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
-- END 05_PROFILE_FORM.sql

-- BEGIN 06_AADHAAR_UNIQUENESS.sql
-- MySQL 8.x. Run against your selected cms_btech database.
-- Preserves admission 7 as requested. No other duplicate ownership is guessed.
-- Re-running is safe when the unique index is already installed.
DELIMITER $$
DROP PROCEDURE IF EXISTS cms_apply_aadhaar_uniqueness$$
CREATE PROCEDURE cms_apply_aadhaar_uniqueness()
BEGIN
    DECLARE v_has_unique INT DEFAULT 0;
    DECLARE v_duplicates INT DEFAULT 0;

    -- Do not clear the supplied identifier if its intended owner is missing.
    IF EXISTS (SELECT 1 FROM studentadmissions
               WHERE AdmissionId = 7 AND TRIM(AadhaarNumber) = '591971610392') THEN
        UPDATE studentadmissions
        SET AadhaarNumber = NULL
        WHERE TRIM(AadhaarNumber) = '591971610392' AND AdmissionId <> 7;
    END IF;

    -- Empty identifiers represent missing data. MySQL permits multiple NULLs.
    UPDATE studentadmissions SET AadhaarNumber = NULL
    WHERE AadhaarNumber IS NOT NULL AND TRIM(AadhaarNumber) = '';
    UPDATE studentadmissions SET AadhaarNumber = TRIM(AadhaarNumber)
    WHERE AadhaarNumber IS NOT NULL AND BINARY AadhaarNumber <> BINARY TRIM(AadhaarNumber);

    SELECT COUNT(*) INTO v_duplicates FROM (
        SELECT AadhaarNumber FROM studentadmissions
        WHERE AadhaarNumber IS NOT NULL
        GROUP BY AadhaarNumber HAVING COUNT(*) > 1
    ) duplicates_found;
    IF v_duplicates > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
            'Other duplicate Aadhaar numbers remain. Review the duplicate report in START_HERE.md, resolve ownership, then rerun.';
    END IF;

    SELECT COUNT(*) INTO v_has_unique FROM (
        SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'studentadmissions'
          AND NON_UNIQUE = 0
        GROUP BY INDEX_NAME
        HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME) = 'AadhaarNumber'
          AND MAX(SUB_PART) IS NULL
    ) existing_unique_index;
    IF v_has_unique = 0 THEN
        ALTER TABLE studentadmissions
        ADD CONSTRAINT UQ_studentadmissions_AadhaarNumber UNIQUE (AadhaarNumber);
    END IF;
END$$
CALL cms_apply_aadhaar_uniqueness()$$
DROP PROCEDURE cms_apply_aadhaar_uniqueness$$
DELIMITER ;

-- END 06_AADHAAR_UNIQUENESS.sql

-- BEGIN 09_COLLATION_COMPATIBILITY.sql
-- Explicit parameter collation handles the mixed collations in the supplied dump.
USE cms_btech;
SET NAMES utf8mb4;
DELIMITER $$
DROP PROCEDURE IF EXISTS `sp_AcademicLevel`$$
CREATE PROCEDURE `sp_AcademicLevel`(
    IN p_action VARCHAR(20),
    IN p_academic_level_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_level_name VARCHAR(100),
    IN p_level_type VARCHAR(20),
    IN p_level_number INT,
    IN p_status TINYINT
)
BEGIN

    IF (p_action COLLATE utf8mb4_unicode_ci) = 'ADD' THEN

        INSERT INTO academic_levels
        (
            academic_year_id,
            level_name,
            level_type,
            level_number,
            status,
            created_at
        )
        VALUES
        (
            p_academic_year_id,
            (p_level_name COLLATE utf8mb4_unicode_ci),
            (p_level_type COLLATE utf8mb4_unicode_ci),
            p_level_number,
            p_status,
            NOW()
        );

    ELSEIF (p_action COLLATE utf8mb4_unicode_ci) = 'LIST' THEN

        SELECT *
        FROM academic_levels
        ORDER BY level_type, level_number;
    ELSEIF (p_action COLLATE utf8mb4_unicode_ci) = 'GET' THEN
        SELECT *
        FROM academic_levels
        WHERE academic_level_id = p_academic_level_id;

    ELSEIF (p_action COLLATE utf8mb4_unicode_ci) = 'UPDATE' THEN

        UPDATE academic_levels
        SET
            academic_year_id = p_academic_year_id,
            level_name = (p_level_name COLLATE utf8mb4_unicode_ci),
            level_type = (p_level_type COLLATE utf8mb4_unicode_ci),
            level_number = p_level_number,
            status = p_status
        WHERE academic_level_id = p_academic_level_id;

    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_Activate`$$
CREATE PROCEDURE `sp_AcademicYear_Activate`(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
    ) THEN
        SELECT * FROM academicyears WHERE 1 = 0;
    ELSE
        START TRANSACTION;

        UPDATE academicyears
        SET status = 0,
            is_archived = 1,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE academic_year_id <> p_academic_year_id
          AND status = 1
          AND is_archived = 0
          AND deleted_at IS NULL;

        UPDATE academicyears
        SET status = 1,
            is_archived = 0,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL;

        COMMIT;

        SELECT * FROM academicyears
        WHERE academic_year_id = p_academic_year_id;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_Add`$$
CREATE PROCEDURE `sp_AcademicYear_Add`(
    IN p_academic_year_name VARCHAR(50),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_created_by BIGINT
)
BEGIN
    IF (p_academic_year_name COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_academic_year_name COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name is required.';
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date must be greater than start date.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_name = TRIM((p_academic_year_name COLLATE utf8mb4_unicode_ci))
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name already exists.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE deleted_at IS NULL
          AND NOT (p_end_date < start_date OR p_start_date > end_date)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year dates overlap an existing academic year.';
    END IF;

    -- New records are upcoming. Activate only through the activate operation.
    INSERT INTO academicyears (
        academic_year_name, start_date, end_date, status, is_archived,
        created_at, created_by
    ) VALUES (
        TRIM((p_academic_year_name COLLATE utf8mb4_unicode_ci)), p_start_date, p_end_date, 0, 0,
        UTC_TIMESTAMP(), p_created_by
    );

    SELECT * FROM academicyears WHERE academic_year_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_Archive`$$
CREATE PROCEDURE `sp_AcademicYear_Archive`(

    IN p_academic_year_id BIGINT,

    IN p_updated_by BIGINT

)
BEGIN

    UPDATE academicyears

    SET

        is_archived = 1,

        status = 0,

        updated_at = NOW(),

        updated_by = p_updated_by

    WHERE academic_year_id = p_academic_year_id

      AND deleted_at IS NULL

      AND is_archived = 0;
 
    IF ROW_COUNT() = 0 THEN

        SELECT *

        FROM academicyears

        WHERE 1 = 0;

    ELSE

        SELECT *

        FROM academicyears

        WHERE academic_year_id = p_academic_year_id;

    END IF;

END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_Dashboard`$$
CREATE PROCEDURE `sp_AcademicYear_Dashboard`(
    IN p_search VARCHAR(100),
    IN p_filter VARCHAR(20)
)
BEGIN

    /* 1. Active Academic Year */
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL
      AND status = 1
      AND is_archived = 0
    ORDER BY start_date DESC
    LIMIT 1;


    /* 2. Dashboard Counts */
    SELECT
        COUNT(*) AS total_academic_years,

        SUM(
            CASE
                WHEN status = 1 AND is_archived = 0
                THEN 1 ELSE 0
            END
        ) AS active_years,

        SUM(
            CASE
                WHEN status = 0 AND is_archived = 0
                THEN 1 ELSE 0
            END
        ) AS upcoming_years,

        SUM(
            CASE
                WHEN is_archived = 1
                THEN 1 ELSE 0
            END
        ) AS archived_years

    FROM academicyears
    WHERE deleted_at IS NULL;


    /* 3. Academic Year Register */
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL

      AND (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL
            OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''
            OR academic_year_name
                LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
          )

      AND (
            (p_filter COLLATE utf8mb4_unicode_ci) IS NULL
            OR TRIM((p_filter COLLATE utf8mb4_unicode_ci)) = ''
            OR LOWER(TRIM((p_filter COLLATE utf8mb4_unicode_ci))) = 'all'

            OR (
                LOWER(TRIM((p_filter COLLATE utf8mb4_unicode_ci))) = 'active'
                AND status = 1
                AND is_archived = 0
            )

            OR (
                LOWER(TRIM((p_filter COLLATE utf8mb4_unicode_ci))) = 'upcoming'
                AND status = 0
                AND is_archived = 0
            )

            OR (
                LOWER(TRIM((p_filter COLLATE utf8mb4_unicode_ci))) = 'archived'
                AND is_archived = 1
            )
          )

    ORDER BY start_date DESC;

END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_Deactivate`$$
CREATE PROCEDURE `sp_AcademicYear_Deactivate`(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE academicyears
    SET status = 0,
        is_archived = 1,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL;

    SELECT * FROM academicyears
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL;
END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_Edit`$$
CREATE PROCEDURE `sp_AcademicYear_Edit`(
    IN p_academic_year_id BIGINT,
    IN p_academic_year_name VARCHAR(50),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
          AND is_archived = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year not found.';
    END IF;

    IF (p_academic_year_name COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_academic_year_name COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name is required.';
    END IF;

    IF p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date must be greater than start date.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_name = TRIM((p_academic_year_name COLLATE utf8mb4_unicode_ci))
          AND academic_year_id <> p_academic_year_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name already exists.';
    END IF;

    UPDATE academicyears
    SET academic_year_name = TRIM((p_academic_year_name COLLATE utf8mb4_unicode_ci)),
        start_date = p_start_date,
        end_date = p_end_date,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id;

    SELECT * FROM academicyears WHERE academic_year_id = p_academic_year_id;
END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_GenerateNext`$$
CREATE PROCEDURE `sp_AcademicYear_GenerateNext`(
    IN p_activate_immediately TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_last_year_name VARCHAR(50);
    DECLARE v_last_start_date DATE;
    DECLARE v_last_end_date DATE;

    DECLARE v_new_start_date DATE;
    DECLARE v_new_end_date DATE;

    DECLARE v_start_year INT;
    DECLARE v_end_year INT;

    DECLARE v_new_year_name VARCHAR(50);
    DECLARE v_new_id BIGINT;

    /* Get latest academic year */
    SELECT
        academic_year_name,
        start_date,
        end_date
    INTO
        v_last_year_name,
        v_last_start_date,
        v_last_end_date
    FROM academicyears
    WHERE deleted_at IS NULL
    ORDER BY end_date DESC
    LIMIT 1;

    /* If no academic year exists */
    IF v_last_start_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No academic year available to generate next year.';
    END IF;

    /* Generate next dates */
    SET v_new_start_date = DATE_ADD(v_last_start_date, INTERVAL 1 YEAR);
    SET v_new_end_date = DATE_ADD(v_last_end_date, INTERVAL 1 YEAR);

    SET v_start_year = YEAR(v_new_start_date);
    SET v_end_year = YEAR(v_new_end_date);

    /* Example: 2029-30 */
    SET v_new_year_name =
        CONCAT(
            v_start_year,
            '-',
            RIGHT(v_end_year, 2)
        );

    /* Prevent duplicate */
    IF EXISTS(
        SELECT 1
        FROM academicyears
        WHERE academic_year_name = v_new_year_name
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Next academic year already exists.';
    END IF;

    /* If activateImmediately = 1,
       deactivate current active year */
    IF p_activate_immediately = 1 THEN

        UPDATE academicyears
        SET
            status = 0,
            is_archived = 1,
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_created_by
        WHERE status = 1
          AND deleted_at IS NULL;

    END IF;

    /* Insert generated year */
    INSERT INTO academicyears
    (
        academic_year_name,
        start_date,
        end_date,
        status,
        is_archived,
        created_at,
        created_by
    )
    VALUES
    (
        v_new_year_name,
        v_new_start_date,
        v_new_end_date,

        CASE
            WHEN p_activate_immediately = 1
            THEN 1
            ELSE 0
        END,

        0,
        UTC_TIMESTAMP(),
        p_created_by
    );

    SET v_new_id = LAST_INSERT_ID();

    /* Return generated academic year */
    SELECT *
    FROM academicyears
    WHERE academic_year_id = v_new_id;

END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_GetById`$$
CREATE PROCEDURE `sp_AcademicYear_GetById`(
    IN p_academic_year_id BIGINT
)
BEGIN
    SELECT *
    FROM academicyears
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_AcademicYear_List`$$
CREATE PROCEDURE `sp_AcademicYear_List`(
    IN p_search VARCHAR(100),
    IN p_filter VARCHAR(20)
)
BEGIN
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL
      AND (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''
         OR academic_year_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
      )
      AND (
            (p_filter COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_filter COLLATE utf8mb4_unicode_ci)) = '' OR LOWER(TRIM((p_filter COLLATE utf8mb4_unicode_ci))) = 'all'
         OR (LOWER(TRIM((p_filter COLLATE utf8mb4_unicode_ci))) = 'active' AND status = 1 AND is_archived = 0)
         OR (LOWER(TRIM((p_filter COLLATE utf8mb4_unicode_ci))) = 'upcoming' AND status = 0 AND is_archived = 0)
         OR (LOWER(TRIM((p_filter COLLATE utf8mb4_unicode_ci))) = 'archived' AND is_archived = 1)
      )
    ORDER BY start_date DESC, academic_year_id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_assign_college_to_user`$$
CREATE PROCEDURE `sp_assign_college_to_user`(
    IN p_user_id BIGINT,
    IN p_college_setting_id BIGINT,
    IN p_assigned_by BIGINT
)
BEGIN

    DECLARE v_mapping_id BIGINT DEFAULT NULL;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_college_exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_user_exists
    FROM users
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL;

    IF v_user_exists = 0 THEN

        SELECT
            FALSE AS success,
            'User not found or inactive.' AS message;

    ELSE

        SELECT COUNT(*)
        INTO v_college_exists
        FROM college_settings
        WHERE college_setting_id = p_college_setting_id
          AND status = 1;

        IF v_college_exists = 0 THEN

            SELECT
                FALSE AS success,
                'College not found or inactive.' AS message;

        ELSE

            SELECT college_user_mapping_id
            INTO v_mapping_id
            FROM college_user_mappings
            WHERE user_id = p_user_id
              AND college_setting_id = p_college_setting_id
            LIMIT 1;

            IF v_mapping_id IS NOT NULL THEN

                UPDATE college_user_mappings
                SET
                    status = 1,
                    assigned_at = CURRENT_TIMESTAMP,
                    assigned_by = p_assigned_by,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = p_assigned_by,
                    removed_at = NULL,
                    removed_by = NULL
                WHERE college_user_mapping_id = v_mapping_id;

            ELSE

                INSERT INTO college_user_mappings
                (
                    user_id,
                    college_setting_id,
                    status,
                    assigned_at,
                    assigned_by
                )
                VALUES
                (
                    p_user_id,
                    p_college_setting_id,
                    1,
                    CURRENT_TIMESTAMP,
                    p_assigned_by
                );

            END IF;

            SELECT
                TRUE AS success,
                'College mapped to user successfully.' AS message;

        END IF;

    END IF;

END$$

DROP PROCEDURE IF EXISTS `sp_branch_create`$$
CREATE PROCEDURE `sp_branch_create`(
    IN p_course_id BIGINT,
    IN p_branch_code VARCHAR(50),
    IN p_branch_name VARCHAR(150),
    IN p_short_name VARCHAR(50),
    IN p_specialization VARCHAR(150),
    IN p_department_id BIGINT,
    IN p_branch_type VARCHAR(50),
    IN p_duration INT,
    IN p_total_semesters INT,
    IN p_intake_capacity INT,
    IN p_starting_academic_year_id BIGINT,
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM courses
        WHERE course_id = p_course_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course not found.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM branches
        WHERE course_id = p_course_id
          AND branch_code = UPPER(TRIM((p_branch_code COLLATE utf8mb4_unicode_ci)))
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch code already exists for this course.';
    END IF;

    INSERT INTO branches (
        course_id, branch_code, branch_name, short_name, specialization,
        department_id, branch_type, duration, total_semesters,
        intake_capacity, starting_academic_year_id, description,
        status, created_at, created_by
    ) VALUES (
        p_course_id, UPPER(TRIM((p_branch_code COLLATE utf8mb4_unicode_ci))), TRIM((p_branch_name COLLATE utf8mb4_unicode_ci)),
        (p_short_name COLLATE utf8mb4_unicode_ci), (p_specialization COLLATE utf8mb4_unicode_ci), p_department_id, (p_branch_type COLLATE utf8mb4_unicode_ci),
        p_duration, p_total_semesters, p_intake_capacity,
        p_starting_academic_year_id, (p_description COLLATE utf8mb4_unicode_ci),
        COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_branch_delete`$$
CREATE PROCEDURE `sp_branch_delete`(
    IN p_branch_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    UPDATE branches
    SET status = 0,
        deleted_at = UTC_TIMESTAMP(),
        deleted_by = p_deleted_by
    WHERE branch_id = p_branch_id
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_branch_get_all`$$
CREATE PROCEDURE `sp_branch_get_all`()
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.deleted_at IS NULL
    ORDER BY b.branch_id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_branch_get_by_course`$$
CREATE PROCEDURE `sp_branch_get_by_course`(
    IN p_course_id BIGINT
)
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.course_id = p_course_id
      AND b.deleted_at IS NULL
    ORDER BY b.branch_name, b.branch_id;
END$$

DROP PROCEDURE IF EXISTS `sp_branch_get_by_id`$$
CREATE PROCEDURE `sp_branch_get_by_id`(
    IN p_branch_id BIGINT
)
BEGIN
    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = p_branch_id
      AND b.deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_branch_update`$$
CREATE PROCEDURE `sp_branch_update`(
    IN p_branch_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_code VARCHAR(50),
    IN p_branch_name VARCHAR(150),
    IN p_short_name VARCHAR(50),
    IN p_specialization VARCHAR(150),
    IN p_department_id BIGINT,
    IN p_branch_type VARCHAR(50),
    IN p_duration INT,
    IN p_total_semesters INT,
    IN p_intake_capacity INT,
    IN p_starting_academic_year_id BIGINT,
    IN p_description VARCHAR(500),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM branches
        WHERE course_id = p_course_id
          AND branch_code = UPPER(TRIM((p_branch_code COLLATE utf8mb4_unicode_ci)))
          AND branch_id <> p_branch_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Branch code already exists for this course.';
    END IF;

    UPDATE branches
    SET course_id = p_course_id,
        branch_code = UPPER(TRIM((p_branch_code COLLATE utf8mb4_unicode_ci))),
        branch_name = TRIM((p_branch_name COLLATE utf8mb4_unicode_ci)),
        short_name = (p_short_name COLLATE utf8mb4_unicode_ci),
        specialization = (p_specialization COLLATE utf8mb4_unicode_ci),
        department_id = p_department_id,
        branch_type = (p_branch_type COLLATE utf8mb4_unicode_ci),
        duration = p_duration,
        total_semesters = p_total_semesters,
        intake_capacity = p_intake_capacity,
        starting_academic_year_id = p_starting_academic_year_id,
        description = (p_description COLLATE utf8mb4_unicode_ci),
        status = COALESCE(p_status, status),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE branch_id = p_branch_id
      AND deleted_at IS NULL;

    SELECT b.*, c.course_code, c.course_name, d.department_name
    FROM branches b
    LEFT JOIN courses c ON c.course_id = b.course_id
    LEFT JOIN departments d ON d.department_id = b.department_id
    WHERE b.branch_id = p_branch_id
      AND b.deleted_at IS NULL;
END$$

DROP PROCEDURE IF EXISTS `sp_change_user_password`$$
CREATE PROCEDURE `sp_change_user_password`(
    IN p_user_id BIGINT,
    IN p_new_password_hash VARCHAR(255)
)
BEGIN
    UPDATE users
    SET
        password_hash = (p_new_password_hash COLLATE utf8mb4_unicode_ci),
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_user_id
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS affected_rows;
END$$

DROP PROCEDURE IF EXISTS `sp_College_CodeExists`$$
CREATE PROCEDURE `sp_College_CodeExists`(
    IN p_college_code VARCHAR(50),
    IN p_exclude_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM colleges
        WHERE college_code = TRIM((p_college_code COLLATE utf8mb4_unicode_ci))
          AND deleted_at IS NULL
          AND (p_exclude_id IS NULL OR college_id <> p_exclude_id)
    ) AS code_exists;
END$$

DROP PROCEDURE IF EXISTS `sp_College_Create`$$
CREATE PROCEDURE `sp_College_Create`(
    IN p_college_code VARCHAR(50),
    IN p_college_name VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_phone VARCHAR(20),
    IN p_principal VARCHAR(200),
    IN p_principal_email VARCHAR(150),
    IN p_principal_contact VARCHAR(10),
    IN p_alternate_contact_number VARCHAR(10),
    IN p_accreditation_status VARCHAR(30),
    IN p_accreditation_body VARCHAR(80),
    IN p_accreditation_grade VARCHAR(20),
    IN p_accreditation_number VARCHAR(50),
    IN p_valid_from DATE,
    IN p_valid_until DATE,
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_area VARCHAR(150),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_website VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_timezone VARCHAR(100),
    IN p_currency_code VARCHAR(10),
    IN p_logo_path VARCHAR(500),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF (p_college_code COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_college_code COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College code is required.';
    END IF;

    IF (p_college_name COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_college_name COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College name is required.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM colleges
        WHERE college_code = TRIM((p_college_code COLLATE utf8mb4_unicode_ci))
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College code already exists.';
    END IF;

    IF NULLIF(TRIM((p_accreditation_status COLLATE utf8mb4_unicode_ci)), '') IS NOT NULL
       AND TRIM((p_accreditation_status COLLATE utf8mb4_unicode_ci)) NOT IN (
           'Accredited', 'Not Accredited', 'Under Review', 'Expired'
       ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid accreditation status.';
    END IF;

    IF p_valid_from IS NOT NULL
       AND p_valid_until IS NOT NULL
       AND p_valid_until < p_valid_from THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid until must be on or after valid from.';
    END IF;

    INSERT INTO colleges (
        college_code, college_name, college_type, university_name,
        email, mobile, phone, principal, principal_email,
        principal_contact, alternate_contact_number,
        accreditation_status, accreditation_body, accreditation_grade,
        accreditation_number, valid_from, valid_until,
        address_line1, address_line2, city, area, district,
        state, country, pincode, website, academic_year_id,
        timezone, currency_code, logo_path, status, created_at, created_by
    ) VALUES (
        UPPER(TRIM((p_college_code COLLATE utf8mb4_unicode_ci))), TRIM((p_college_name COLLATE utf8mb4_unicode_ci)), (p_college_type COLLATE utf8mb4_unicode_ci),
        (p_university_name COLLATE utf8mb4_unicode_ci), (p_email COLLATE utf8mb4_unicode_ci), (p_mobile COLLATE utf8mb4_unicode_ci), (p_phone COLLATE utf8mb4_unicode_ci), (p_principal COLLATE utf8mb4_unicode_ci),
        (p_principal_email COLLATE utf8mb4_unicode_ci), (p_principal_contact COLLATE utf8mb4_unicode_ci), (p_alternate_contact_number COLLATE utf8mb4_unicode_ci),
        NULLIF(TRIM((p_accreditation_status COLLATE utf8mb4_unicode_ci)), ''), (p_accreditation_body COLLATE utf8mb4_unicode_ci), (p_accreditation_grade COLLATE utf8mb4_unicode_ci),
        (p_accreditation_number COLLATE utf8mb4_unicode_ci), p_valid_from, p_valid_until,
        (p_address_line1 COLLATE utf8mb4_unicode_ci), (p_address_line2 COLLATE utf8mb4_unicode_ci), (p_city COLLATE utf8mb4_unicode_ci), (p_area COLLATE utf8mb4_unicode_ci), (p_district COLLATE utf8mb4_unicode_ci),
        (p_state COLLATE utf8mb4_unicode_ci), (p_country COLLATE utf8mb4_unicode_ci), (p_pincode COLLATE utf8mb4_unicode_ci), (p_website COLLATE utf8mb4_unicode_ci), p_academic_year_id,
        COALESCE(NULLIF(TRIM((p_timezone COLLATE utf8mb4_unicode_ci)), ''), 'Asia/Kolkata'),
        COALESCE(NULLIF(TRIM((p_currency_code COLLATE utf8mb4_unicode_ci)), ''), 'INR'),
        (p_logo_path COLLATE utf8mb4_unicode_ci), COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT *
    FROM colleges
    WHERE college_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_College_Delete`$$
CREATE PROCEDURE `sp_College_Delete`(
    IN p_college_id BIGINT,
    IN p_deleted_by BIGINT
)
main_block: BEGIN
    DECLARE v_affected_rows INT DEFAULT 0;

    -- Roll back all changes if any statement fails.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate the College/Institution master record.
    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    )
    THEN
        SELECT
            0 AS Deleted,
            'College not found or already deleted.' AS Message;

        LEAVE main_block;
    END IF;

    START TRANSACTION;

    -- Soft-delete the College/Institution master.
    UPDATE colleges
    SET
        status = 0,
        deleted_at = UTC_TIMESTAMP(),
        deleted_by = p_deleted_by,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_deleted_by
    WHERE college_id = p_college_id
      AND deleted_at IS NULL;

    SET v_affected_rows = ROW_COUNT();

    -- Deactivate the connected College Settings record.
    UPDATE college_settings
    SET
        status = 0,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_deleted_by
    WHERE college_id = p_college_id;

    -- Deactivate active user-college mappings.
    UPDATE college_user_mappings mapping_record

    INNER JOIN college_settings setting_record
        ON setting_record.college_setting_id =
           mapping_record.college_setting_id

    SET
        mapping_record.status = 0,
        mapping_record.removed_at = UTC_TIMESTAMP(),
        mapping_record.removed_by = p_deleted_by,
        mapping_record.updated_at = UTC_TIMESTAMP(),
        mapping_record.updated_by = p_deleted_by

    WHERE setting_record.college_id = p_college_id
      AND mapping_record.status = 1;

    COMMIT;

    SELECT
        CASE
            WHEN v_affected_rows > 0 THEN 1
            ELSE 0
        END AS Deleted,

        CASE
            WHEN v_affected_rows > 0
                THEN 'College deleted successfully.'
            ELSE 'College could not be deleted.'
        END AS Message;
END$$

DROP PROCEDURE IF EXISTS `sp_College_GetAll`$$
CREATE PROCEDURE `sp_College_GetAll`(
    IN p_search VARCHAR(200),
    IN p_status TINYINT
)
BEGIN
    SELECT *
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''
         OR college_code LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR college_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR university_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR city LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
      )
    ORDER BY college_name, college_id;
END$$

DROP PROCEDURE IF EXISTS `sp_College_GetByCode`$$
CREATE PROCEDURE `sp_College_GetByCode`(
    IN p_college_code VARCHAR(50)
)
BEGIN
    SELECT *
    FROM colleges
    WHERE college_code = TRIM((p_college_code COLLATE utf8mb4_unicode_ci))
      AND deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_College_GetById`$$
CREATE PROCEDURE `sp_College_GetById`(
    IN p_college_id BIGINT
)
BEGIN
    SELECT *
    FROM colleges
    WHERE college_id = p_college_id
      AND deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_College_Search`$$
CREATE PROCEDURE `sp_College_Search`(
    IN p_query VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_status TINYINT,
    IN p_page_number INT,
    IN p_page_size INT,
    IN p_sort_by VARCHAR(50),
    IN p_sort_direction VARCHAR(10)
)
BEGIN
    DECLARE v_page INT DEFAULT 1;
    DECLARE v_size INT DEFAULT 10;
    DECLARE v_offset INT DEFAULT 0;

    SET v_page = GREATEST(COALESCE(p_page_number, 1), 1);
    SET v_size = LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 100);
    SET v_offset = (v_page - 1) * v_size;

    SELECT *
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND ((p_college_type COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_college_type COLLATE utf8mb4_unicode_ci)) = '' OR college_type LIKE CONCAT('%', TRIM((p_college_type COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_university_name COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_university_name COLLATE utf8mb4_unicode_ci)) = '' OR university_name LIKE CONCAT('%', TRIM((p_university_name COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_city COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_city COLLATE utf8mb4_unicode_ci)) = '' OR city LIKE CONCAT('%', TRIM((p_city COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_state COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_state COLLATE utf8mb4_unicode_ci)) = '' OR state LIKE CONCAT('%', TRIM((p_state COLLATE utf8mb4_unicode_ci)), '%'))
      AND (
            (p_query COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_query COLLATE utf8mb4_unicode_ci)) = ''
         OR college_code LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR college_name LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR email LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR mobile LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
      )
    ORDER BY
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'collegecode' THEN college_code END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'collegecode' THEN college_code END ASC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'city' THEN city END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'city' THEN city END ASC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'status' THEN status END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'status' THEN status END ASC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'createdat' THEN created_at END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'createdat' THEN created_at END ASC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER(COALESCE((p_sort_by COLLATE utf8mb4_unicode_ci), 'collegename')) = 'collegename' THEN college_name END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER(COALESCE((p_sort_by COLLATE utf8mb4_unicode_ci), 'collegename')) = 'collegename' THEN college_name END ASC,
        college_id DESC
    LIMIT v_offset, v_size;

    SELECT COUNT(*) AS total_count
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND ((p_college_type COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_college_type COLLATE utf8mb4_unicode_ci)) = '' OR college_type LIKE CONCAT('%', TRIM((p_college_type COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_university_name COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_university_name COLLATE utf8mb4_unicode_ci)) = '' OR university_name LIKE CONCAT('%', TRIM((p_university_name COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_city COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_city COLLATE utf8mb4_unicode_ci)) = '' OR city LIKE CONCAT('%', TRIM((p_city COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_state COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_state COLLATE utf8mb4_unicode_ci)) = '' OR state LIKE CONCAT('%', TRIM((p_state COLLATE utf8mb4_unicode_ci)), '%'))
      AND (
            (p_query COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_query COLLATE utf8mb4_unicode_ci)) = ''
         OR college_code LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR college_name LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR email LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR mobile LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
      );
END$$

DROP PROCEDURE IF EXISTS `sp_college_settings_create`$$
CREATE PROCEDURE `sp_college_settings_create`(
    IN p_college_id BIGINT,
    IN p_college_email VARCHAR(150),
    IN p_phone_number VARCHAR(20),
    IN p_website VARCHAR(200),
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_academic_year VARCHAR(20),
    IN p_semester VARCHAR(50),
    IN p_institution_type VARCHAR(100),
    IN p_date_format VARCHAR(30),
    IN p_time_zone VARCHAR(100),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    -- Confirm the college exists in the master.
    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College not found in College/Institution master.';
    END IF;

    -- Only one Settings row is allowed per college.
    IF EXISTS
    (
        SELECT 1
        FROM college_settings
        WHERE college_id = p_college_id
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College settings already exist for this college.';
    END IF;

    -- Name and code are selected directly from colleges.
    INSERT INTO college_settings
    (
        college_id,
        college_name,
        college_code,
        college_email,
        phone_number,
        website,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        academic_year,
        semester,
        institution_type,
        date_format,
        time_zone,
        status,
        created_by
    )
    SELECT
        c.college_id,
        c.college_name,
        c.college_code,
        (p_college_email COLLATE utf8mb4_unicode_ci),
        (p_phone_number COLLATE utf8mb4_unicode_ci),
        (p_website COLLATE utf8mb4_unicode_ci),
        (p_address_line1 COLLATE utf8mb4_unicode_ci),
        (p_address_line2 COLLATE utf8mb4_unicode_ci),
        (p_city COLLATE utf8mb4_unicode_ci),
        (p_state COLLATE utf8mb4_unicode_ci),
        (p_pincode COLLATE utf8mb4_unicode_ci),
        (p_academic_year COLLATE utf8mb4_unicode_ci),
        (p_semester COLLATE utf8mb4_unicode_ci),
        (p_institution_type COLLATE utf8mb4_unicode_ci),

        COALESCE(
            NULLIF((p_date_format COLLATE utf8mb4_unicode_ci), ''),
            'dd-MM-yyyy'
        ),

        COALESCE(
            NULLIF((p_time_zone COLLATE utf8mb4_unicode_ci), ''),
            'Asia/Kolkata'
        ),

        COALESCE(
            p_status,
            1
        ),

        p_created_by

    FROM colleges c

    WHERE c.college_id = p_college_id
      AND c.deleted_at IS NULL;

    -- Return the newly created Settings record.
    CALL sp_college_settings_get_by_id(
        LAST_INSERT_ID()
    );
END$$

DROP PROCEDURE IF EXISTS `sp_college_settings_get_all`$$
CREATE PROCEDURE `sp_college_settings_get_all`()
BEGIN
    SELECT
        cs.college_setting_id AS CollegeSettingId,

        cs.college_id AS CollegeId,

        -- College identity comes from the master
        c.college_name AS CollegeName,
        c.college_code AS CollegeCode,

        -- Settings-specific information
        cs.college_email AS CollegeEmail,
        cs.phone_number AS PhoneNumber,
        cs.website AS Website,
        cs.address_line1 AS AddressLine1,
        cs.address_line2 AS AddressLine2,
        cs.city AS City,
        cs.state AS State,
        cs.pincode AS Pincode,
        cs.academic_year AS AcademicYear,
        cs.semester AS Semester,
        cs.institution_type AS InstitutionType,
        cs.date_format AS DateFormat,
        cs.time_zone AS TimeZone,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy

    FROM college_settings cs

    INNER JOIN colleges c
        ON c.college_id = cs.college_id

    WHERE c.deleted_at IS NULL

    ORDER BY
        c.college_name,
        c.college_id;
END$$

DROP PROCEDURE IF EXISTS `sp_college_settings_get_by_college`$$
CREATE PROCEDURE `sp_college_settings_get_by_college`(
    IN p_college_id BIGINT
)
BEGIN
    SELECT
        cs.college_setting_id AS CollegeSettingId,

        cs.college_id AS CollegeId,

        -- Name and code come from the master
        c.college_name AS CollegeName,
        c.college_code AS CollegeCode,

        cs.college_email AS CollegeEmail,
        cs.phone_number AS PhoneNumber,
        cs.website AS Website,
        cs.address_line1 AS AddressLine1,
        cs.address_line2 AS AddressLine2,
        cs.city AS City,
        cs.state AS State,
        cs.pincode AS Pincode,
        cs.academic_year AS AcademicYear,
        cs.semester AS Semester,
        cs.institution_type AS InstitutionType,
        cs.date_format AS DateFormat,
        cs.time_zone AS TimeZone,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy

    FROM college_settings cs

    INNER JOIN colleges c
        ON c.college_id = cs.college_id

    WHERE cs.college_id = p_college_id

      AND c.deleted_at IS NULL;
END$$

DROP PROCEDURE IF EXISTS `sp_college_settings_get_by_id`$$
CREATE PROCEDURE `sp_college_settings_get_by_id`(
    IN p_college_setting_id BIGINT
)
BEGIN
    SELECT
        cs.college_setting_id AS CollegeSettingId,

        cs.college_id AS CollegeId,

        -- Identity comes from the College/Institution master
        c.college_name AS CollegeName,
        c.college_code AS CollegeCode,

        cs.college_email AS CollegeEmail,
        cs.phone_number AS PhoneNumber,
        cs.website AS Website,
        cs.address_line1 AS AddressLine1,
        cs.address_line2 AS AddressLine2,
        cs.city AS City,
        cs.state AS State,
        cs.pincode AS Pincode,
        cs.academic_year AS AcademicYear,
        cs.semester AS Semester,
        cs.institution_type AS InstitutionType,
        cs.date_format AS DateFormat,
        cs.time_zone AS TimeZone,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy

    FROM college_settings cs

    INNER JOIN colleges c
        ON c.college_id = cs.college_id

    WHERE cs.college_setting_id =
          p_college_setting_id

      AND c.deleted_at IS NULL;
END$$

DROP PROCEDURE IF EXISTS `sp_college_settings_update`$$
CREATE PROCEDURE `sp_college_settings_update`(
    IN p_college_setting_id BIGINT,
    IN p_college_id BIGINT,
    IN p_college_email VARCHAR(150),
    IN p_phone_number VARCHAR(20),
    IN p_website VARCHAR(200),
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_academic_year VARCHAR(20),
    IN p_semester VARCHAR(50),
    IN p_institution_type VARCHAR(100),
    IN p_date_format VARCHAR(30),
    IN p_time_zone VARCHAR(100),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    -- Confirm that the Settings record exists.
    IF NOT EXISTS
    (
        SELECT 1
        FROM college_settings
        WHERE college_setting_id =
              p_college_setting_id
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College settings record not found.';
    END IF;

    -- Confirm that the supplied college exists in the master.
    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College not found in College/Institution master.';
    END IF;

    -- Prevent another Settings record from using the same college.
    IF EXISTS
    (
        SELECT 1
        FROM college_settings
        WHERE college_id = p_college_id
          AND college_setting_id <>
              p_college_setting_id
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'College settings already exist for this college.';
    END IF;

    UPDATE college_settings cs

    INNER JOIN colleges c
        ON c.college_id = p_college_id

    SET
        -- Master mapping
        cs.college_id =
            c.college_id,

        -- Always synchronize identity from the master
        cs.college_name =
            c.college_name,

        cs.college_code =
            c.college_code,

        -- Settings-specific fields
        cs.college_email =
            (p_college_email COLLATE utf8mb4_unicode_ci),

        cs.phone_number =
            (p_phone_number COLLATE utf8mb4_unicode_ci),

        cs.website =
            (p_website COLLATE utf8mb4_unicode_ci),

        cs.address_line1 =
            (p_address_line1 COLLATE utf8mb4_unicode_ci),

        cs.address_line2 =
            (p_address_line2 COLLATE utf8mb4_unicode_ci),

        cs.city =
            (p_city COLLATE utf8mb4_unicode_ci),

        cs.state =
            (p_state COLLATE utf8mb4_unicode_ci),

        cs.pincode =
            (p_pincode COLLATE utf8mb4_unicode_ci),

        cs.academic_year =
            (p_academic_year COLLATE utf8mb4_unicode_ci),

        cs.semester =
            (p_semester COLLATE utf8mb4_unicode_ci),

        cs.institution_type =
            (p_institution_type COLLATE utf8mb4_unicode_ci),

        cs.date_format =
            COALESCE(
                NULLIF((p_date_format COLLATE utf8mb4_unicode_ci), ''),
                'dd-MM-yyyy'
            ),

        cs.time_zone =
            COALESCE(
                NULLIF((p_time_zone COLLATE utf8mb4_unicode_ci), ''),
                'Asia/Kolkata'
            ),

        cs.status =
            COALESCE(
                p_status,
                1
            ),

        cs.updated_by =
            p_updated_by,

        cs.updated_at =
            UTC_TIMESTAMP()

    WHERE cs.college_setting_id =
          p_college_setting_id;

    -- Return the updated Settings record.
    CALL sp_college_settings_get_by_id(
        p_college_setting_id
    );
END$$

DROP PROCEDURE IF EXISTS `sp_College_Update`$$
CREATE PROCEDURE `sp_College_Update`(
    IN p_college_id BIGINT,
    IN p_college_code VARCHAR(50),
    IN p_college_name VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_phone VARCHAR(20),
    IN p_principal VARCHAR(200),
    IN p_principal_email VARCHAR(150),
    IN p_principal_contact VARCHAR(10),
    IN p_alternate_contact_number VARCHAR(10),
    IN p_accreditation_status VARCHAR(30),
    IN p_accreditation_body VARCHAR(80),
    IN p_accreditation_grade VARCHAR(20),
    IN p_accreditation_number VARCHAR(50),
    IN p_valid_from DATE,
    IN p_valid_until DATE,
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_area VARCHAR(150),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_website VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_timezone VARCHAR(100),
    IN p_currency_code VARCHAR(10),
    IN p_logo_path VARCHAR(500),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SELECT * FROM colleges WHERE 1 = 0;
    ELSE
        IF EXISTS (
            SELECT 1 FROM colleges
            WHERE college_code = TRIM((p_college_code COLLATE utf8mb4_unicode_ci))
              AND college_id <> p_college_id
              AND deleted_at IS NULL
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'College code already exists.';
        END IF;

        IF NULLIF(TRIM((p_accreditation_status COLLATE utf8mb4_unicode_ci)), '') IS NOT NULL
           AND TRIM((p_accreditation_status COLLATE utf8mb4_unicode_ci)) NOT IN (
               'Accredited', 'Not Accredited', 'Under Review', 'Expired'
           ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Invalid accreditation status.';
        END IF;

        IF p_valid_from IS NOT NULL
           AND p_valid_until IS NOT NULL
           AND p_valid_until < p_valid_from THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Valid until must be on or after valid from.';
        END IF;

        UPDATE colleges
        SET college_code = UPPER(TRIM((p_college_code COLLATE utf8mb4_unicode_ci))),
            college_name = TRIM((p_college_name COLLATE utf8mb4_unicode_ci)),
            college_type = (p_college_type COLLATE utf8mb4_unicode_ci),
            university_name = (p_university_name COLLATE utf8mb4_unicode_ci),
            email = (p_email COLLATE utf8mb4_unicode_ci),
            mobile = (p_mobile COLLATE utf8mb4_unicode_ci),
            phone = (p_phone COLLATE utf8mb4_unicode_ci),
            principal = (p_principal COLLATE utf8mb4_unicode_ci),
            principal_email = (p_principal_email COLLATE utf8mb4_unicode_ci),
            principal_contact = (p_principal_contact COLLATE utf8mb4_unicode_ci),
            alternate_contact_number = (p_alternate_contact_number COLLATE utf8mb4_unicode_ci),
            accreditation_status = NULLIF(TRIM((p_accreditation_status COLLATE utf8mb4_unicode_ci)), ''),
            accreditation_body = (p_accreditation_body COLLATE utf8mb4_unicode_ci),
            accreditation_grade = (p_accreditation_grade COLLATE utf8mb4_unicode_ci),
            accreditation_number = (p_accreditation_number COLLATE utf8mb4_unicode_ci),
            valid_from = p_valid_from,
            valid_until = p_valid_until,
            address_line1 = (p_address_line1 COLLATE utf8mb4_unicode_ci),
            address_line2 = (p_address_line2 COLLATE utf8mb4_unicode_ci),
            city = (p_city COLLATE utf8mb4_unicode_ci),
            area = (p_area COLLATE utf8mb4_unicode_ci),
            district = (p_district COLLATE utf8mb4_unicode_ci),
            state = (p_state COLLATE utf8mb4_unicode_ci),
            country = (p_country COLLATE utf8mb4_unicode_ci),
            pincode = (p_pincode COLLATE utf8mb4_unicode_ci),
            website = (p_website COLLATE utf8mb4_unicode_ci),
            academic_year_id = p_academic_year_id,
            timezone = COALESCE(NULLIF(TRIM((p_timezone COLLATE utf8mb4_unicode_ci)), ''), timezone),
            currency_code = COALESCE(NULLIF(TRIM((p_currency_code COLLATE utf8mb4_unicode_ci)), ''), currency_code),
            logo_path = (p_logo_path COLLATE utf8mb4_unicode_ci),
            status = COALESCE(p_status, status),
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE college_id = p_college_id;

        SELECT *
        FROM colleges
        WHERE college_id = p_college_id;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_College_UpdateStatus`$$
CREATE PROCEDURE `sp_College_UpdateStatus`(
    IN p_college_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE colleges
    SET status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE college_id = p_college_id
      AND deleted_at IS NULL;

    SELECT *
    FROM colleges
    WHERE college_id = p_college_id
      AND deleted_at IS NULL;
END$$

DROP PROCEDURE IF EXISTS `sp_CourseSemesterMapping_Add`$$
CREATE PROCEDURE `sp_CourseSemesterMapping_Add`(
    IN p_course_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_course_id IS NULL OR p_course_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course ID is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1     
        FROM course_semester_mappings
        WHERE course_id = p_course_id
          AND semester_id = p_semester_id
          AND status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course is already mapped to this semester.';
    END IF;

    INSERT INTO course_semester_mappings
    (
        course_id,
        semester_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_course_id,
        p_semester_id,
        1,
        NOW(),
        p_created_by
    );

    SELECT *
    FROM course_semester_mappings
    WHERE course_semester_mapping_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_CourseSemesterMapping_Edit`$$
CREATE PROCEDURE `sp_CourseSemesterMapping_Edit`(
    IN p_course_semester_mapping_id BIGINT,
    IN p_course_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM course_semester_mappings
        WHERE course_semester_mapping_id =
              p_course_semester_mapping_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course semester mapping not found.';
    END IF;

    IF p_course_id IS NULL OR p_course_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course ID is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM course_semester_mappings
        WHERE course_id = p_course_id
          AND semester_id = p_semester_id
          AND course_semester_mapping_id <>
              p_course_semester_mapping_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course is already mapped to this semester.';
    END IF;

    UPDATE course_semester_mappings
    SET
        course_id = p_course_id,
        semester_id = p_semester_id,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE course_semester_mapping_id =
          p_course_semester_mapping_id;

    CALL sp_CourseSemesterMapping_GetById(
        p_course_semester_mapping_id
    );
END$$

DROP PROCEDURE IF EXISTS `sp_CourseSemesterMapping_GetById`$$
CREATE PROCEDURE `sp_CourseSemesterMapping_GetById`(
    IN p_course_semester_mapping_id BIGINT
)
BEGIN
    SELECT
        course_semester_mapping_id,
        course_id,
        semester_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM course_semester_mappings
    WHERE course_semester_mapping_id =
          p_course_semester_mapping_id
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_CourseSemesterMapping_List`$$
CREATE PROCEDURE `sp_CourseSemesterMapping_List`()
BEGIN
    SELECT
        course_semester_mapping_id,
        course_id,
        semester_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM course_semester_mappings
    ORDER BY course_id ASC, semester_id ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_course_code_exists`$$
CREATE PROCEDURE `sp_course_code_exists`(
    IN p_course_code VARCHAR(50),
    IN p_exclude_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM((p_course_code COLLATE utf8mb4_unicode_ci)))
          AND deleted_at IS NULL
          AND (p_exclude_id IS NULL OR course_id <> p_exclude_id)
    ) AS code_exists;
END$$

DROP PROCEDURE IF EXISTS `sp_course_create`$$
CREATE PROCEDURE `sp_course_create`(
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
        WHERE department_id = p_department_id AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Department not found.';
    END IF;

    IF p_duration_years <= 0 OR p_total_semesters <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duration and total semesters must be greater than zero.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM((p_course_code COLLATE utf8mb4_unicode_ci)))
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course code already exists.';
    END IF;

    INSERT INTO courses (
        college_id, department_id, course_code, course_name,
        course_short_name, course_type, duration_years, total_semesters,
        eligibility, description, status, created_at, created_by
    ) VALUES (
        p_college_id, p_department_id, UPPER(TRIM((p_course_code COLLATE utf8mb4_unicode_ci))),
        TRIM((p_course_name COLLATE utf8mb4_unicode_ci)), (p_course_short_name COLLATE utf8mb4_unicode_ci), (p_course_type COLLATE utf8mb4_unicode_ci),
        p_duration_years, p_total_semesters, (p_eligibility COLLATE utf8mb4_unicode_ci), (p_description COLLATE utf8mb4_unicode_ci),
        COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_course_get_all`$$
CREATE PROCEDURE `sp_course_get_all`(
    IN p_search VARCHAR(200),
    IN p_status TINYINT,
    IN p_college_id BIGINT,
    IN p_department_id BIGINT
)
BEGIN
    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_college_id IS NULL OR c.college_id = p_college_id)
      AND (p_department_id IS NULL OR c.department_id = p_department_id)
      AND (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''
         OR c.course_code LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR c.course_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR c.course_short_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR d.department_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
      )
    ORDER BY c.course_name, c.course_id;
END$$

DROP PROCEDURE IF EXISTS `sp_course_get_by_id`$$
CREATE PROCEDURE `sp_course_get_by_id`(
    IN p_course_id BIGINT
)
BEGIN
    SELECT c.*, co.college_name, d.department_name
    FROM courses c
    LEFT JOIN colleges co ON co.college_id = c.college_id
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.course_id = p_course_id
      AND c.deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_course_structure_create`$$
CREATE PROCEDURE `sp_course_structure_create`(
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_year_number INT,
    IN p_semester_number INT,
    IN p_semester_name VARCHAR(100),
    IN p_created_by BIGINT
)
BEGIN
    INSERT INTO course_structures
    (
        course_id,
        branch_id,
        year_number,
        semester_number,
        semester_name,
        created_by
    )
    VALUES
    (
        p_course_id,
        p_branch_id,
        p_year_number,
        p_semester_number,
        (p_semester_name COLLATE utf8mb4_unicode_ci),
        p_created_by
    );

    SELECT *
    FROM course_structures
    WHERE structure_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_course_structure_delete`$$
CREATE PROCEDURE `sp_course_structure_delete`(
    IN p_structure_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET
        status = 0,
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = p_deleted_by
    WHERE structure_id = p_structure_id
      AND deleted_at IS NULL;

    SELECT *
    FROM course_structures
    WHERE structure_id = p_structure_id;
END$$

DROP PROCEDURE IF EXISTS `sp_course_structure_get_all`$$
CREATE PROCEDURE `sp_course_structure_get_all`()
BEGIN
    SELECT
        cs.structure_id,
        cs.course_id,
        c.course_code,
        c.course_name,
        cs.branch_id,
        b.branch_code,
        b.branch_name,
        cs.year_number,
        cs.semester_number,
        cs.semester_name,
        cs.status,
        cs.created_at,
        cs.updated_at
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.deleted_at IS NULL
    ORDER BY
        cs.course_id,
        cs.branch_id,
        cs.year_number,
        cs.semester_number;
END$$

DROP PROCEDURE IF EXISTS `sp_course_structure_get_by_course`$$
CREATE PROCEDURE `sp_course_structure_get_by_course`(
    IN p_course_id BIGINT
)
BEGIN
    SELECT
        cs.structure_id,
        cs.course_id,
        c.course_code,
        c.course_name,
        cs.branch_id,
        b.branch_code,
        b.branch_name,
        cs.year_number,
        cs.semester_number,
        cs.semester_name,
        cs.status,
        cs.created_at,
        cs.updated_at
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.course_id = p_course_id
      AND cs.deleted_at IS NULL
    ORDER BY
        cs.branch_id,
        cs.year_number,
        cs.semester_number;
END$$

DROP PROCEDURE IF EXISTS `sp_course_structure_get_by_id`$$
CREATE PROCEDURE `sp_course_structure_get_by_id`(
    IN p_structure_id BIGINT
)
BEGIN
    SELECT
        cs.structure_id,
        cs.course_id,
        c.course_code,
        c.course_name,
        cs.branch_id,
        b.branch_code,
        b.branch_name,
        cs.year_number,
        cs.semester_number,
        cs.semester_name,
        cs.status,
        cs.created_at,
        cs.updated_at
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.structure_id = p_structure_id
      AND cs.deleted_at IS NULL;
END$$

DROP PROCEDURE IF EXISTS `sp_course_structure_update`$$
CREATE PROCEDURE `sp_course_structure_update`(
    IN p_structure_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_year_number INT,
    IN p_semester_number INT,
    IN p_semester_name VARCHAR(100),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET
        course_id = p_course_id,
        branch_id = p_branch_id,
        year_number = p_year_number,
        semester_number = p_semester_number,
        semester_name = (p_semester_name COLLATE utf8mb4_unicode_ci),
        status = p_status,
        updated_by = p_updated_by
    WHERE structure_id = p_structure_id
      AND deleted_at IS NULL;

    SELECT *
    FROM course_structures
    WHERE structure_id = p_structure_id;
END$$

DROP PROCEDURE IF EXISTS `sp_course_update`$$
CREATE PROCEDURE `sp_course_update`(
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
    IF EXISTS (
        SELECT 1 FROM courses
        WHERE course_code = UPPER(TRIM((p_course_code COLLATE utf8mb4_unicode_ci)))
          AND course_id <> p_course_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course code already exists.';
    END IF;

    UPDATE courses
    SET college_id = p_college_id,
        department_id = p_department_id,
        course_code = UPPER(TRIM((p_course_code COLLATE utf8mb4_unicode_ci))),
        course_name = TRIM((p_course_name COLLATE utf8mb4_unicode_ci)),
        course_short_name = (p_course_short_name COLLATE utf8mb4_unicode_ci),
        course_type = (p_course_type COLLATE utf8mb4_unicode_ci),
        duration_years = p_duration_years,
        total_semesters = p_total_semesters,
        eligibility = (p_eligibility COLLATE utf8mb4_unicode_ci),
        description = (p_description COLLATE utf8mb4_unicode_ci),
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

DROP PROCEDURE IF EXISTS `sp_course_update_status`$$
CREATE PROCEDURE `sp_course_update_status`(
    IN p_course_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE courses
    SET status = p_status,
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

DROP PROCEDURE IF EXISTS `sp_CreateRole`$$
CREATE PROCEDURE `sp_CreateRole`(
    IN p_RoleName VARCHAR(100),
    IN p_RoleCode VARCHAR(50),
    IN p_Description VARCHAR(255),
    IN p_CreatedBy BIGINT
)
BEGIN
    INSERT INTO roles
    (
        role_name,
        role_code,
        description,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        (p_RoleName COLLATE utf8mb4_unicode_ci),
        (p_RoleCode COLLATE utf8mb4_unicode_ci),
        (p_Description COLLATE utf8mb4_unicode_ci),
        1,
        CURRENT_TIMESTAMP,
        p_CreatedBy
    );

    SELECT LAST_INSERT_ID() AS role_id;
END$$

DROP PROCEDURE IF EXISTS `sp_CreateStudentPromotion`$$
CREATE PROCEDURE `sp_CreateStudentPromotion`(
    IN p_StudentId BIGINT,
    IN p_BranchId BIGINT,
    IN p_AcademicYearId BIGINT,
    IN p_CurrentSemester INT,
    IN p_NextSemester INT,
    IN p_EligibilityStatus VARCHAR(50),
    IN p_Remarks VARCHAR(500),
    IN p_CreatedBy BIGINT
)
BEGIN

    INSERT INTO student_promotions
    (
        StudentId,
        BranchId,
        AcademicYearId,
        CurrentSemester,
        NextSemester,
        EligibilityStatus,
        PromotionStatus,
        Remarks,
        CreatedAt,
        CreatedBy
    )
    VALUES
    (
        p_StudentId,
        p_BranchId,
        p_AcademicYearId,
        p_CurrentSemester,
        p_NextSemester,
        (p_EligibilityStatus COLLATE utf8mb4_unicode_ci),
        'Promoted',
        (p_Remarks COLLATE utf8mb4_unicode_ci),
        NOW(),
        p_CreatedBy
    );

    SELECT
        PromotionId,
        StudentId,
        BranchId,
        AcademicYearId,
        CurrentSemester,
        NextSemester,
        EligibilityStatus,
        PromotionStatus,
        Remarks,
        CreatedAt,
        CreatedBy
    FROM student_promotions
    WHERE PromotionId = LAST_INSERT_ID();

END$$

DROP PROCEDURE IF EXISTS `sp_CreateUserRoleMapping`$$
CREATE PROCEDURE `sp_CreateUserRoleMapping`(
    IN p_UserId BIGINT,
    IN p_RoleId BIGINT,
    IN p_AssignedBy BIGINT
)
BEGIN
    INSERT INTO user_role_mapping
    (
        user_id,
        role_id,
        assigned_by
    )
    VALUES
    (
        p_UserId,
        p_RoleId,
        p_AssignedBy
    );

    SELECT LAST_INSERT_ID() AS MappingId;
END$$

DROP PROCEDURE IF EXISTS `sp_create_college_settings`$$
CREATE PROCEDURE `sp_create_college_settings`(

    IN p_college_name VARCHAR(200),

    IN p_college_code VARCHAR(50),

    IN p_college_email VARCHAR(150),

    IN p_phone_number VARCHAR(20),

    IN p_website VARCHAR(200),

    IN p_address_line1 VARCHAR(255),

    IN p_address_line2 VARCHAR(255),

    IN p_city VARCHAR(100),

    IN p_state VARCHAR(100),

    IN p_pincode VARCHAR(10),

    IN p_academic_year VARCHAR(20),

    IN p_semester VARCHAR(50),

    IN p_institution_type VARCHAR(100),

    IN p_date_format VARCHAR(30),

    IN p_time_zone VARCHAR(100),

    IN p_created_by BIGINT

)
BEGIN
 
    INSERT INTO college_settings

    (

        college_name,

        college_code,

        college_email,

        phone_number,

        website,

        address_line1,

        address_line2,

        city,

        state,

        pincode,

        academic_year,

        semester,

        institution_type,

        date_format,

        time_zone,

        status,

        created_by

    )

    VALUES

    (

        (p_college_name COLLATE utf8mb4_unicode_ci),

        (p_college_code COLLATE utf8mb4_unicode_ci),

        (p_college_email COLLATE utf8mb4_unicode_ci),

        (p_phone_number COLLATE utf8mb4_unicode_ci),

        (p_website COLLATE utf8mb4_unicode_ci),

        (p_address_line1 COLLATE utf8mb4_unicode_ci),

        (p_address_line2 COLLATE utf8mb4_unicode_ci),

        (p_city COLLATE utf8mb4_unicode_ci),

        (p_state COLLATE utf8mb4_unicode_ci),

        (p_pincode COLLATE utf8mb4_unicode_ci),

        (p_academic_year COLLATE utf8mb4_unicode_ci),

        (p_semester COLLATE utf8mb4_unicode_ci),

        (p_institution_type COLLATE utf8mb4_unicode_ci),

        (p_date_format COLLATE utf8mb4_unicode_ci),

        (p_time_zone COLLATE utf8mb4_unicode_ci),

        1,

        p_created_by

    );
 
    SELECT LAST_INSERT_ID() AS college_setting_id;
 
END$$

DROP PROCEDURE IF EXISTS `sp_create_course_structure`$$
CREATE PROCEDURE `sp_create_course_structure`(
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_year_number INT,
    IN p_semester_number INT,
    IN p_semester_name VARCHAR(100),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    INSERT INTO course_structures
    (
        course_id,
        branch_id,
        year_number,
        semester_number,
        semester_name,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_course_id,
        p_branch_id,
        p_year_number,
        p_semester_number,
        (p_semester_name COLLATE utf8mb4_unicode_ci),
        COALESCE(p_status, 1),
        UTC_TIMESTAMP(),
        p_created_by
    );

    CALL sp_get_course_structure_by_id(LAST_INSERT_ID());
END$$

DROP PROCEDURE IF EXISTS `sp_create_otp`$$
CREATE PROCEDURE `sp_create_otp`(

    IN p_user_id BIGINT,

    IN p_identifier VARCHAR(150),

    IN p_otp_hash VARCHAR(255),

    IN p_otp_type VARCHAR(50),

    IN p_delivery_method VARCHAR(20),

    IN p_expiry_minutes INT,

    IN p_max_attempts INT

)
BEGIN
 
    -- Deactivate previous active OTPs

    UPDATE otp_verifications

    SET

        status = 0

    WHERE identifier = (p_identifier COLLATE utf8mb4_unicode_ci)

      AND otp_type = (p_otp_type COLLATE utf8mb4_unicode_ci)

      AND status = 1;
 
    -- Insert new OTP

    INSERT INTO otp_verifications

    (

        user_id,

        identifier,

        otp_hash,

        otp_type,

        delivery_method,

        expires_at,

        attempts,

        max_attempts,

        status

    )

    VALUES

    (

        p_user_id,

        (p_identifier COLLATE utf8mb4_unicode_ci),

        (p_otp_hash COLLATE utf8mb4_unicode_ci),

        (p_otp_type COLLATE utf8mb4_unicode_ci),

        (p_delivery_method COLLATE utf8mb4_unicode_ci),

        DATE_ADD(

            CURRENT_TIMESTAMP,

            INTERVAL p_expiry_minutes MINUTE

        ),

        0,

        p_max_attempts,

        1

    );
 
    SELECT LAST_INSERT_ID() AS otp_verification_id;
 
END$$

DROP PROCEDURE IF EXISTS `sp_create_role`$$
CREATE PROCEDURE `sp_create_role`(

    IN p_role_name VARCHAR(100),

    IN p_role_code VARCHAR(50),

    IN p_description VARCHAR(255),

    IN p_created_by BIGINT

)
BEGIN
 
    INSERT INTO roles

    (

        role_name,

        role_code,

        description,

        status,

        created_by

    )

    VALUES

    (

        (p_role_name COLLATE utf8mb4_unicode_ci),

        (p_role_code COLLATE utf8mb4_unicode_ci),

        (p_description COLLATE utf8mb4_unicode_ci),

        1,

        p_created_by

    );
 
    SELECT LAST_INSERT_ID() AS role_id;
 
END$$

DROP PROCEDURE IF EXISTS `sp_deactivate_college_settings`$$
CREATE PROCEDURE `sp_deactivate_college_settings`(

    IN p_college_setting_id BIGINT,

    IN p_updated_by BIGINT

)
BEGIN
 
    UPDATE college_settings

    SET

        status = 0,

        updated_at = CURRENT_TIMESTAMP,

        updated_by = p_updated_by

    WHERE college_setting_id = p_college_setting_id;
 
    SELECT ROW_COUNT() AS affected_rows;
 
END$$

DROP PROCEDURE IF EXISTS `sp_deactivate_role`$$
CREATE PROCEDURE `sp_deactivate_role`(

    IN p_role_id BIGINT,

    IN p_updated_by BIGINT

)
BEGIN
 
    UPDATE roles

    SET

        status = 0,

        deleted_at = CURRENT_TIMESTAMP,

        deleted_by = p_updated_by,

        updated_at = CURRENT_TIMESTAMP,

        updated_by = p_updated_by

    WHERE role_id = p_role_id

      AND deleted_at IS NULL;
 
    SELECT ROW_COUNT() AS affected_rows;
 
END$$

DROP PROCEDURE IF EXISTS `sp_delete_course_structure`$$
CREATE PROCEDURE `sp_delete_course_structure`(
    IN p_structure_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET
        status = 0,
        deleted_at = UTC_TIMESTAMP(),
        deleted_by = p_deleted_by,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_deleted_by
    WHERE structure_id = p_structure_id
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_student_academic_details`$$
CREATE PROCEDURE `sp_delete_student_academic_details`(
    IN p_AcademicId INT
)
BEGIN

    DELETE FROM student_academic_details
    WHERE AcademicId = p_AcademicId;

END$$

DROP PROCEDURE IF EXISTS `sp_Department_Add`$$
CREATE PROCEDURE `sp_Department_Add`(
    IN p_department_name VARCHAR(100),
    IN p_department_code VARCHAR(50),
    IN p_college_id BIGINT,
    IN p_hod_user_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    IF (p_department_name COLLATE utf8mb4_unicode_ci) IS NULL
       OR TRIM((p_department_name COLLATE utf8mb4_unicode_ci)) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department name is required.';
    END IF;

    IF p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM departments
        WHERE department_name = TRIM((p_department_name COLLATE utf8mb4_unicode_ci))
          AND college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department already exists for this college.';
    END IF;

    INSERT INTO departments
    (
        department_name,
        department_code,
        college_id,
        hod_user_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        TRIM((p_department_name COLLATE utf8mb4_unicode_ci)),
        NULLIF(TRIM((p_department_code COLLATE utf8mb4_unicode_ci)), ''),
        p_college_id,
        p_hod_user_id,
        1,
        NOW(),
        p_created_by
    );

    SELECT *
    FROM departments
    WHERE department_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_Department_AssignHod`$$
CREATE PROCEDURE `sp_Department_AssignHod`(
    IN p_department_id BIGINT,
    IN p_employee_profile_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN

    DECLARE v_user_id BIGINT DEFAULT NULL;
    DECLARE v_employee_department_id BIGINT DEFAULT NULL;
    DECLARE v_department_exists INT DEFAULT 0;
    DECLARE v_employee_exists INT DEFAULT 0;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_hod_role_exists INT DEFAULT 0;

    /* =====================================================
       1. Validate Department
       ===================================================== */

    SELECT COUNT(*)
    INTO v_department_exists
    FROM departments
    WHERE department_id = p_department_id
      AND status = 1
      AND deleted_at IS NULL;

    IF v_department_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Department not found or inactive.';

    END IF;


    /* =====================================================
       2. Get Employee Profile + User ID
       ===================================================== */

    SELECT
        ep.department_id,
        ep.user_id
    INTO
        v_employee_department_id,
        v_user_id
    FROM employee_profiles ep
    WHERE ep.employee_profile_id = p_employee_profile_id
      AND ep.status = 1
      AND ep.deleted_at IS NULL
    LIMIT 1;


    IF v_user_id IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Employee profile not found or inactive.';

    END IF;


    /* =====================================================
       3. Validate Employee Belongs to Department
       ===================================================== */

    IF v_employee_department_id <> p_department_id THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Employee does not belong to the selected department.';

    END IF;


    /* =====================================================
       4. Validate User
       ===================================================== */

    SELECT COUNT(*)
    INTO v_user_exists
    FROM users u
    WHERE u.user_id = v_user_id
      AND u.status = 1
      AND u.deleted_at IS NULL;

    IF v_user_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Employee user account is inactive.';

    END IF;


    /* =====================================================
       5. Validate HOD Role
       ===================================================== */

    SELECT COUNT(*)
    INTO v_hod_role_exists
    FROM user_roles ur

    INNER JOIN roles r
        ON r.role_id = ur.role_id

    WHERE ur.user_id = v_user_id
      AND ur.status = 1
      AND r.role_code = 'HOD'
      AND r.status = 1
      AND r.deleted_at IS NULL;


    IF v_hod_role_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Selected employee does not have HOD role.';

    END IF;


    /* =====================================================
       6. Assign HOD
       ===================================================== */

    UPDATE departments
    SET
        hod_user_id = v_user_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE department_id = p_department_id;


    /* =====================================================
       7. Return Assigned HOD
       ===================================================== */

    SELECT

        d.department_id AS DepartmentId,

        d.department_name AS DepartmentName,

        ep.employee_profile_id AS HodEmployeeProfileId,

        u.user_id AS UserId,

        u.employee_user_id AS EmployeeUserId,

        u.full_name AS FullName,

        u.email AS Email,

        u.mobile AS Mobile,

        ep.designation AS Designation

    FROM departments d

    INNER JOIN users u
        ON u.user_id = d.hod_user_id

    INNER JOIN employee_profiles ep
        ON ep.user_id = d.hod_user_id

    WHERE d.department_id = p_department_id;

END$$

DROP PROCEDURE IF EXISTS `sp_Department_Edit`$$
CREATE PROCEDURE `sp_Department_Edit`(
    IN p_department_id BIGINT,
    IN p_department_name VARCHAR(100),
    IN p_department_code VARCHAR(50),
    IN p_college_id BIGINT,
    IN p_hod_user_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department not found.';
    END IF;

    IF (p_department_name COLLATE utf8mb4_unicode_ci) IS NULL
       OR TRIM((p_department_name COLLATE utf8mb4_unicode_ci)) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department name is required.';
    END IF;

    IF p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM departments
        WHERE department_name = TRIM((p_department_name COLLATE utf8mb4_unicode_ci))
          AND college_id = p_college_id
          AND department_id <> p_department_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department already exists for this college.';
    END IF;

    UPDATE departments
    SET
        department_name = TRIM((p_department_name COLLATE utf8mb4_unicode_ci)),
        department_code = NULLIF(TRIM((p_department_code COLLATE utf8mb4_unicode_ci)), ''),
        college_id = p_college_id,
        hod_user_id = p_hod_user_id,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE department_id = p_department_id;

    CALL sp_Department_GetById(p_department_id);
END$$

DROP PROCEDURE IF EXISTS `sp_Department_GetById`$$
CREATE PROCEDURE `sp_Department_GetById`(
    IN p_department_id BIGINT
)
BEGIN
    SELECT
        department_id,
        department_name,
        department_code,
        college_id,
        hod_user_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at,
        deleted_by
    FROM departments
    WHERE department_id = p_department_id
      AND deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_Department_GetHod`$$
CREATE PROCEDURE `sp_Department_GetHod`(
    IN p_department_id BIGINT
)
BEGIN

    SELECT

        d.department_id AS DepartmentId,

        d.department_name AS DepartmentName,

        ep.employee_profile_id AS HodEmployeeProfileId,

        u.user_id AS UserId,

        u.employee_user_id AS EmployeeUserId,

        u.full_name AS HodName,

        u.email AS Email,

        u.mobile AS Mobile,

        ep.designation AS Designation

    FROM departments d

    LEFT JOIN users u
        ON u.user_id = d.hod_user_id

    LEFT JOIN employee_profiles ep
        ON ep.user_id = d.hod_user_id

    WHERE d.department_id = p_department_id
      AND d.status = 1
      AND d.deleted_at IS NULL;

END$$

DROP PROCEDURE IF EXISTS `sp_Department_GetHodCandidates`$$
CREATE PROCEDURE `sp_Department_GetHodCandidates`(
    IN p_department_id BIGINT
)
BEGIN

    SELECT DISTINCT

        ep.employee_profile_id AS EmployeeProfileId,

        u.user_id AS UserId,

        u.employee_user_id AS EmployeeUserId,

        u.full_name AS FullName,

        u.email AS Email,

        u.mobile AS Mobile,

        ep.designation AS Designation

    FROM employee_profiles ep

    INNER JOIN users u
        ON u.user_id = ep.user_id

    INNER JOIN user_roles ur
        ON ur.user_id = u.user_id

    INNER JOIN roles r
        ON r.role_id = ur.role_id

    WHERE ep.department_id = p_department_id

      AND ep.status = 1
      AND ep.deleted_at IS NULL

      AND u.status = 1
      AND u.deleted_at IS NULL

      AND ur.status = 1

      AND r.role_code = 'HOD'
      AND r.status = 1
      AND r.deleted_at IS NULL

    ORDER BY u.full_name;

END$$

DROP PROCEDURE IF EXISTS `sp_Department_List`$$
CREATE PROCEDURE `sp_Department_List`()
BEGIN
    SELECT
        department_id,
        department_name,
        department_code,
        college_id,
        hod_user_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by,
        deleted_at,
        deleted_by
    FROM departments
    WHERE deleted_at IS NULL
    ORDER BY department_name ASC, department_id ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_Department_RemoveHod`$$
CREATE PROCEDURE `sp_Department_RemoveHod`(
    IN p_department_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department not found.';

    END IF;


    UPDATE departments

    SET
        hod_employee_profile_id = NULL,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by

    WHERE department_id = p_department_id;


    SELECT
        department_id AS DepartmentId,
        department_name AS DepartmentName,
        hod_employee_profile_id AS HodEmployeeProfileId

    FROM departments

    WHERE department_id = p_department_id;

END$$

DROP PROCEDURE IF EXISTS `sp_Department_UpdateStatus`$$
CREATE PROCEDURE `sp_Department_UpdateStatus`(
    IN p_department_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department not found.';
    END IF;

    UPDATE departments
    SET
        status = p_status,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE department_id = p_department_id;

    SELECT *
    FROM departments
    WHERE department_id = p_department_id;
END$$

DROP PROCEDURE IF EXISTS `sp_GetAllRoles`$$
CREATE PROCEDURE `sp_GetAllRoles`()
BEGIN
    SELECT
        role_id,
        role_name,
        role_code,
        description,
        status,
        created_at,
        created_by
    FROM roles
    ORDER BY role_id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_GetCollegeLogo`$$
CREATE PROCEDURE `sp_GetCollegeLogo`()
BEGIN
    SELECT
        Id,
        LogoPath
    FROM Colleges
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetEligibleStudents`$$
CREATE PROCEDURE `sp_GetEligibleStudents`(
    IN p_BranchId BIGINT,
    IN p_AcademicYearId BIGINT,
    IN p_CurrentSemester INT
)
BEGIN

    SELECT
        s.StudentId,
        s.FullName AS StudentName,
        s.BranchId,
        s.AcademicYearId,
        p_CurrentSemester AS CurrentSemester,
        p_CurrentSemester + 1 AS NextSemester,
        'Eligible' AS EligibilityStatus

    FROM students s

    WHERE s.BranchId = p_BranchId
      AND s.AcademicYearId = p_AcademicYearId
      AND s.Status = 1
      AND s.DeletedAt IS NULL;
END$$

DROP PROCEDURE IF EXISTS `sp_GetRoleById`$$
CREATE PROCEDURE `sp_GetRoleById`(
    IN p_RoleId BIGINT
)
BEGIN
    SELECT
        role_id,
        role_name,
        role_code,
        description,
        status,
        created_at,
        created_by
    FROM roles
    WHERE role_id = p_RoleId;
END$$

DROP PROCEDURE IF EXISTS `sp_GetStudentEligibility`$$
CREATE PROCEDURE `sp_GetStudentEligibility`(
    IN p_StudentId BIGINT
)
BEGIN

    SELECT
        s.StudentId,
        s.FullName AS StudentName,
        s.BranchId,
        s.AcademicYearId,
        'Eligible' AS EligibilityStatus

    FROM students s

    WHERE s.StudentId = p_StudentId
      AND s.Status = 1
      AND s.DeletedAt IS NULL;

END$$

DROP PROCEDURE IF EXISTS `sp_GetUserByEmail`$$
CREATE PROCEDURE `sp_GetUserByEmail`(
    IN p_Email VARCHAR(255)
)
BEGIN
    SELECT
        Id,
        Email
    FROM Users
    WHERE Email = (p_Email COLLATE utf8mb4_unicode_ci)
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_GetUserRoles`$$
CREATE PROCEDURE `sp_GetUserRoles`(
    IN p_UserId BIGINT
)
BEGIN
    SELECT
        urm.user_id,
        urm.role_id,
        r.role_name,
        r.role_code,
        urm.assigned_by
    FROM user_role_mapping urm
    INNER JOIN roles r
        ON urm.role_id = r.role_id
    WHERE urm.user_id = p_UserId;
END$$

DROP PROCEDURE IF EXISTS `sp_GetValidResetToken`$$
CREATE PROCEDURE `sp_GetValidResetToken`(
    IN p_Token VARCHAR(255)
)
BEGIN
    SELECT
        Id,
        UserId,
        Token,
        Expiry
    FROM PasswordResetTokens
    WHERE Token = (p_Token COLLATE utf8mb4_unicode_ci)
      AND Expiry > CURRENT_TIMESTAMP
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_get_active_otp`$$
CREATE PROCEDURE `sp_get_active_otp`(

    IN p_identifier VARCHAR(150),

    IN p_otp_type VARCHAR(50)

)
BEGIN
 
    SELECT

        otp_verification_id,

        user_id,

        identifier,

        otp_hash,

        otp_type,

        delivery_method,

        expires_at,

        verified_at,

        attempts,

        max_attempts,

        status,

        created_at

    FROM otp_verifications

    WHERE identifier = (p_identifier COLLATE utf8mb4_unicode_ci)

      AND otp_type = (p_otp_type COLLATE utf8mb4_unicode_ci)

      AND status = 1

      AND verified_at IS NULL

      AND expires_at >= CURRENT_TIMESTAMP

    ORDER BY created_at DESC

    LIMIT 1;
 
END$$

DROP PROCEDURE IF EXISTS `sp_get_all_college_settings`$$
CREATE PROCEDURE `sp_get_all_college_settings`()
BEGIN
 
    SELECT

        college_setting_id,

        college_name,

        college_code,

        college_email,

        phone_number,

        website,

        address_line1,

        address_line2,

        city,

        state,

        pincode,

        academic_year,

        semester,

        institution_type,

        date_format,

        time_zone,

        status,

        created_at,

        created_by,

        updated_at,

        updated_by

    FROM college_settings

    WHERE status = 1

    ORDER BY college_setting_id;
 
END$$

DROP PROCEDURE IF EXISTS `sp_get_all_college_user_mappings`$$
CREATE PROCEDURE `sp_get_all_college_user_mappings`()
BEGIN
    SELECT
        m.college_user_mapping_id,
        m.user_id,
        m.college_setting_id,
        c.college_name,
        c.college_code,
        m.status,
        m.assigned_at,
        m.assigned_by,
        m.updated_at,
        m.updated_by,
        m.removed_at,
        m.removed_by
    FROM college_user_mappings m
    INNER JOIN college_settings c
        ON c.college_setting_id = m.college_setting_id
    ORDER BY m.college_user_mapping_id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_get_all_roles`$$
CREATE PROCEDURE `sp_get_all_roles`()
BEGIN
 
    SELECT

        role_id,

        role_name,

        role_code,

        description,

        status,

        created_at,

        created_by,

        updated_at,

        updated_by,

        deleted_at,

        deleted_by

    FROM roles

    WHERE status = 1

      AND deleted_at IS NULL

    ORDER BY role_id;
 
END$$

DROP PROCEDURE IF EXISTS `sp_get_college_settings`$$
CREATE PROCEDURE `sp_get_college_settings`(

    IN p_college_setting_id BIGINT

)
BEGIN
 
    SELECT

        college_setting_id,

        college_name,

        college_code,

        college_email,

        phone_number,

        website,

        address_line1,

        address_line2,

        city,

        state,

        pincode,

        academic_year,

        semester,

        institution_type,

        date_format,

        time_zone,

        status,

        created_at,

        created_by,

        updated_at,

        updated_by

    FROM college_settings

    WHERE college_setting_id = p_college_setting_id

      AND status = 1;
 
END$$

DROP PROCEDURE IF EXISTS `sp_get_course_structures`$$
CREATE PROCEDURE `sp_get_course_structures`()
BEGIN
    SELECT
        cs.structure_id AS StructureId,
        cs.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,
        cs.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,
        cs.year_number AS YearNumber,
        cs.semester_number AS SemesterNumber,
        cs.semester_name AS SemesterName,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.status = 1
      AND cs.deleted_at IS NULL
    ORDER BY
        cs.course_id,
        cs.branch_id,
        cs.year_number,
        cs.semester_number,
        cs.structure_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_course_structure_by_id`$$
CREATE PROCEDURE `sp_get_course_structure_by_id`(
    IN p_structure_id BIGINT
)
BEGIN
    SELECT
        cs.structure_id AS StructureId,
        cs.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,
        cs.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,
        cs.year_number AS YearNumber,
        cs.semester_number AS SemesterNumber,
        cs.semester_name AS SemesterName,
        cs.status AS Status,
        cs.created_at AS CreatedAt,
        cs.created_by AS CreatedBy,
        cs.updated_at AS UpdatedAt,
        cs.updated_by AS UpdatedBy
    FROM course_structures cs
    LEFT JOIN courses c
        ON c.course_id = cs.course_id
    LEFT JOIN branches b
        ON b.branch_id = cs.branch_id
    WHERE cs.structure_id = p_structure_id
      AND cs.deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_get_employee_profile`$$
CREATE PROCEDURE `sp_get_employee_profile`(
    IN p_user_id BIGINT
)
BEGIN

    SELECT
        employee_profile_id AS EmployeeProfileId,
        user_id AS UserId,
        date_of_birth AS DateOfBirth,
        gender AS Gender,
        department_id AS DepartmentId,
        designation AS Designation,
        address AS Address,
        pincode AS Pincode,
        city AS City,
        district AS District,
        state AS State,
        about_me AS AboutMe,
        profile_image_path AS ProfileImagePath,
        status AS Status,
        created_at AS CreatedAt,
        updated_at AS UpdatedAt
    FROM employee_profiles
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
    LIMIT 1;

END$$

DROP PROCEDURE IF EXISTS `sp_get_role_by_id`$$
CREATE PROCEDURE `sp_get_role_by_id`(

    IN p_role_id BIGINT

)
BEGIN
 
    SELECT

        role_id,

        role_name,

        role_code,

        description,

        status,

        created_at,

        created_by,

        updated_at,

        updated_by,

        deleted_at,

        deleted_by

    FROM roles

    WHERE role_id = p_role_id

      AND deleted_at IS NULL;
 
END$$

DROP PROCEDURE IF EXISTS `sp_get_student_academic_by_id`$$
CREATE PROCEDURE `sp_get_student_academic_by_id`(
    IN p_AcademicId INT
)
BEGIN

    SELECT
        AcademicId,
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    FROM student_academic_details
    WHERE AcademicId = p_AcademicId;

END$$

DROP PROCEDURE IF EXISTS `sp_get_student_academic_details`$$
CREATE PROCEDURE `sp_get_student_academic_details`()
BEGIN

    SELECT
        AcademicId,
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    FROM student_academic_details
    ORDER BY AcademicId;

END$$

DROP PROCEDURE IF EXISTS `sp_get_user_college_mappings`$$
CREATE PROCEDURE `sp_get_user_college_mappings`(
    IN p_user_id BIGINT
)
BEGIN
    SELECT
        m.college_user_mapping_id,
        m.user_id,
        m.college_setting_id,
        c.college_name,
        c.college_code,
        m.status,
        m.assigned_at,
        m.assigned_by,
        m.updated_at,
        m.updated_by,
        m.removed_at,
        m.removed_by
    FROM college_user_mappings m
    INNER JOIN college_settings c
        ON c.college_setting_id = m.college_setting_id
    WHERE m.user_id = p_user_id
    ORDER BY m.college_user_mapping_id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_get_user_password_hash`$$
CREATE PROCEDURE `sp_get_user_password_hash`(
    IN p_user_id BIGINT
)
BEGIN
    SELECT
        user_id,
        password_hash,
        status,
        deleted_at
    FROM users
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_increment_otp_attempt`$$
CREATE PROCEDURE `sp_increment_otp_attempt`(

    IN p_otp_verification_id BIGINT

)
BEGIN
 
    UPDATE otp_verifications

    SET

        attempts = attempts + 1,

        status =

            CASE

                WHEN attempts + 1 >= max_attempts

                THEN 0

                ELSE status

            END

    WHERE otp_verification_id = p_otp_verification_id

      AND status = 1;
 
    SELECT

        otp_verification_id,

        attempts,

        max_attempts,

        status

    FROM otp_verifications

    WHERE otp_verification_id = p_otp_verification_id;
 
END$$

DROP PROCEDURE IF EXISTS `sp_insert_student_academic_details`$$
CREATE PROCEDURE `sp_insert_student_academic_details`(
    IN p_RollNumber VARCHAR(20),
    IN p_RegistrationNumber VARCHAR(30),
    IN p_AdmissionNumber VARCHAR(30),
    IN p_Course VARCHAR(100),
    IN p_Branch VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Semester INT,
    IN p_Section VARCHAR(10),
    IN p_AcademicYear VARCHAR(20)
)
BEGIN

    INSERT INTO student_academic_details
    (
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    )
    VALUES
    (
        (p_RollNumber COLLATE utf8mb4_unicode_ci),
        (p_RegistrationNumber COLLATE utf8mb4_unicode_ci),
        (p_AdmissionNumber COLLATE utf8mb4_unicode_ci),
        (p_Course COLLATE utf8mb4_unicode_ci),
        (p_Branch COLLATE utf8mb4_unicode_ci),
        (p_Department COLLATE utf8mb4_unicode_ci),
        p_Semester,
        (p_Section COLLATE utf8mb4_unicode_ci),
        (p_AcademicYear COLLATE utf8mb4_unicode_ci)
    );

END$$

DROP PROCEDURE IF EXISTS `sp_login_get_user`$$
CREATE PROCEDURE `sp_login_get_user`(
    IN p_login_id VARCHAR(150)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
)
BEGIN

    SELECT
        u.user_id,
        u.employee_user_id,
        u.full_name,
        u.email,
        u.mobile,
        u.password_hash,
        u.status,
        u.deleted_at
    FROM users u
    WHERE u.deleted_at IS NULL
      AND (
            u.employee_user_id = TRIM((p_login_id COLLATE utf8mb4_unicode_ci))
            OR u.email = TRIM((p_login_id COLLATE utf8mb4_unicode_ci))
            OR u.mobile = TRIM((p_login_id COLLATE utf8mb4_unicode_ci))
          )
    LIMIT 1;

END$$

DROP PROCEDURE IF EXISTS `sp_ProfileChangeAudit_Create`$$
CREATE PROCEDURE `sp_ProfileChangeAudit_Create`(
    IN p_user_id BIGINT,
    IN p_changed_by BIGINT,
    IN p_changed_information JSON
)
BEGIN
    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid user id is required.';
    END IF;

    IF p_changed_by IS NULL OR p_changed_by <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid changed-by user id is required.';
    END IF;

    IF p_changed_information IS NULL OR JSON_LENGTH(p_changed_information) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Changed information is required.';
    END IF;

    INSERT INTO profile_change_audits
    (
        user_id,
        changed_by,
        changed_at,
        changed_information
    )
    VALUES
    (
        p_user_id,
        p_changed_by,
        UTC_TIMESTAMP(),
        p_changed_information
    );

    SELECT LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_ProfileChangeAudit_GetByUserId`$$
CREATE PROCEDURE `sp_ProfileChangeAudit_GetByUserId`(
    IN p_user_id BIGINT
)
BEGIN
    SELECT
        a.profile_change_audit_id,
        a.user_id,
        a.changed_by,
        u.full_name AS changed_by_name,
        a.changed_at,
        a.changed_information
    FROM profile_change_audits a
    LEFT JOIN users u
        ON u.user_id = a.changed_by
    WHERE a.user_id = p_user_id
    ORDER BY a.changed_at DESC, a.profile_change_audit_id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_remove_college_from_user`$$
CREATE PROCEDURE `sp_remove_college_from_user`(
    IN p_user_id BIGINT,
    IN p_college_setting_id BIGINT,
    IN p_removed_by BIGINT
)
BEGIN

    UPDATE college_user_mappings
    SET
        status = 0,
        removed_at = CURRENT_TIMESTAMP,
        removed_by = p_removed_by,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_removed_by
    WHERE user_id = p_user_id
      AND college_setting_id = p_college_setting_id
      AND status = 1;

    IF ROW_COUNT() > 0 THEN

        SELECT
            TRUE AS success,
            'College mapping removed successfully.' AS message;

    ELSE

        SELECT
            FALSE AS success,
            'Active college mapping not found.' AS message;

    END IF;

END$$

DROP PROCEDURE IF EXISTS `sp_ResetPassword`$$
CREATE PROCEDURE `sp_ResetPassword`(
    IN p_UserId BIGINT,
    IN p_PasswordHash VARCHAR(500)
)
BEGIN
    UPDATE Users
    SET PasswordHash = (p_PasswordHash COLLATE utf8mb4_unicode_ci)
    WHERE Id = p_UserId;

    SELECT ROW_COUNT() AS RowsAffected;
END$$

DROP PROCEDURE IF EXISTS `sp_Section_AssignClassTeacher`$$
CREATE PROCEDURE `sp_Section_AssignClassTeacher`(
    IN p_section_id BIGINT,
    IN p_employee_profile_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT;
    DECLARE v_employee_college_id BIGINT;

    SELECT college_id
      INTO v_college_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    SELECT u.college_id
      INTO v_employee_college_id
    FROM employee_profiles ep
    INNER JOIN users u ON u.user_id = ep.user_id
    WHERE ep.employee_profile_id = p_employee_profile_id
      AND ep.deleted_at IS NULL
      AND ep.status = 1
      AND u.deleted_at IS NULL
      AND u.status = 1
    LIMIT 1;

    IF v_employee_college_id IS NULL AND NOT EXISTS (
        SELECT 1
        FROM employee_profiles ep
        INNER JOIN users u ON u.user_id = ep.user_id
        WHERE ep.employee_profile_id = p_employee_profile_id
          AND ep.deleted_at IS NULL
          AND ep.status = 1
          AND u.deleted_at IS NULL
          AND u.status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active employee profile not found.';
    END IF;

    IF v_employee_college_id IS NOT NULL AND v_employee_college_id <> v_college_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Teacher belongs to a different college.';
    END IF;

    UPDATE sections
    SET class_teacher_employee_profile_id = p_employee_profile_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND deleted_at IS NULL;

    CALL sp_Section_GetClassTeacher(p_section_id);
END$$

DROP PROCEDURE IF EXISTS `sp_Section_AssignStudents`$$
CREATE PROCEDURE `sp_Section_AssignStudents`(
    IN p_section_id BIGINT,
    IN p_student_ids_json JSON,
    IN p_assigned_by BIGINT
)
BEGIN
    DECLARE v_capacity INT;
    DECLARE v_current_count INT DEFAULT 0;
    DECLARE v_new_count INT DEFAULT 0;
    DECLARE v_selected_count INT DEFAULT 0;
    DECLARE v_valid_count INT DEFAULT 0;
    DECLARE v_college_id BIGINT;
    DECLARE v_academic_year_id BIGINT;
    DECLARE v_course_id BIGINT;
    DECLARE v_branch_id BIGINT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
        RESIGNAL;
    END;

    IF p_student_ids_json IS NULL OR JSON_LENGTH(p_student_ids_json) = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Select at least one student.';
    END IF;

    START TRANSACTION;

    SELECT capacity, college_id, academic_year_id, course_id, branch_id
      INTO v_capacity, v_college_id, v_academic_year_id, v_course_id, v_branch_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1
    FOR UPDATE;

    IF v_capacity IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
    CREATE TEMPORARY TABLE tmp_student_ids
    (
        student_id BIGINT NOT NULL PRIMARY KEY
    );

    INSERT IGNORE INTO tmp_student_ids(student_id)
    SELECT jt.student_id
    FROM JSON_TABLE(
        p_student_ids_json,
        '$[*]' COLUMNS(student_id BIGINT PATH '$')
    ) jt
    WHERE jt.student_id > 0;

    SELECT COUNT(*) INTO v_selected_count
    FROM tmp_student_ids;

    IF v_selected_count = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No valid StudentIds were supplied.';
    END IF;

    SELECT COUNT(*) INTO v_valid_count
    FROM students st
    INNER JOIN tmp_student_ids t ON t.student_id = st.student_id
    WHERE st.deleted_at IS NULL
      AND st.status = 1
      AND st.college_id = v_college_id
      AND st.academic_year_id = v_academic_year_id
      AND (v_course_id IS NULL OR st.course_id = v_course_id)
      AND (v_branch_id IS NULL OR st.branch_id = v_branch_id);

    IF v_valid_count <> v_selected_count THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'One or more students are invalid or do not belong to the section course/branch/academic year.';
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM student_section_assignments
    WHERE section_id = p_section_id
      AND status = 1;

    SELECT COUNT(*) INTO v_new_count
    FROM tmp_student_ids t
    WHERE NOT EXISTS (
        SELECT 1
        FROM student_section_assignments ssa
        WHERE ssa.student_id = t.student_id
          AND ssa.section_id = p_section_id
          AND ssa.status = 1
    );

    IF v_current_count + v_new_count > v_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section capacity exceeded.';
    END IF;

    /* Preserve history when moving a student from another section. */
    UPDATE student_section_assignments ssa
    INNER JOIN tmp_student_ids t ON t.student_id = ssa.student_id
    SET ssa.status = 0,
        ssa.removed_at = UTC_TIMESTAMP(),
        ssa.removed_by = p_assigned_by
    WHERE ssa.status = 1
      AND ssa.section_id <> p_section_id;

    INSERT INTO student_section_assignments
    (
        student_id,
        section_id,
        academic_year_id,
        status,
        assigned_at,
        assigned_by
    )
    SELECT
        t.student_id,
        p_section_id,
        v_academic_year_id,
        1,
        UTC_TIMESTAMP(),
        p_assigned_by
    FROM tmp_student_ids t
    WHERE NOT EXISTS (
        SELECT 1
        FROM student_section_assignments ssa
        WHERE ssa.student_id = t.student_id
          AND ssa.section_id = p_section_id
          AND ssa.status = 1
    );

    COMMIT;

    SELECT
        p_section_id AS SectionId,
        v_capacity AS Capacity,
        v_current_count AS PreviouslyAssigned,
        v_new_count AS NewlyAssigned,
        v_current_count + v_new_count AS TotalAssigned,
        v_capacity - (v_current_count + v_new_count) AS AvailableSeats;

    DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
END$$

DROP PROCEDURE IF EXISTS `sp_section_create`$$
CREATE PROCEDURE `sp_section_create`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_section_code VARCHAR(20),
    IN p_section_name VARCHAR(100),
    IN p_capacity INT,
    IN p_created_by BIGINT
)
BEGIN

    /* =====================================================
       BASIC VALIDATION
       ===================================================== */

    IF p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College is required.';
    END IF;

    IF p_academic_year_id IS NULL OR p_academic_year_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year is required.';
    END IF;

    IF p_department_id IS NULL OR p_department_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department is required.';
    END IF;

    IF p_course_id IS NULL OR p_course_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course is required.';
    END IF;

    IF p_branch_id IS NULL OR p_branch_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Branch is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester is required.';
    END IF;

    IF (p_section_code COLLATE utf8mb4_unicode_ci) IS NULL
       OR TRIM((p_section_code COLLATE utf8mb4_unicode_ci)) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section code is required.';
    END IF;

    IF (p_section_name COLLATE utf8mb4_unicode_ci) IS NULL
       OR TRIM((p_section_name COLLATE utf8mb4_unicode_ci)) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section name is required.';
    END IF;

    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section capacity must be greater than zero.';
    END IF;


    /* =====================================================
       COLLEGE
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM colleges
        WHERE college_id = p_college_id
          AND status = 1
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'College does not exist or is inactive.';

    END IF;


    /* =====================================================
       ACADEMIC YEAR
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND status = 1
          AND is_archived = 0
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Academic year does not exist or is inactive.';

    END IF;


    /* =====================================================
       DEPARTMENT → COLLEGE
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND college_id = p_college_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Department does not belong to the selected college.';

    END IF;


    /* =====================================================
       COURSE → COLLEGE + DEPARTMENT
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM courses
        WHERE course_id = p_course_id
          AND college_id = p_college_id
          AND department_id = p_department_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Course does not belong to the selected college and department.';

    END IF;


    /* =====================================================
       BRANCH → COURSE + DEPARTMENT
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM branches
        WHERE branch_id = p_branch_id
          AND course_id = p_course_id
          AND department_id = p_department_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Branch does not belong to the selected course and department.';

    END IF;


    /* =====================================================
       SEMESTER → BRANCH
       ===================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM semesters
        WHERE semester_id = p_semester_id
          AND branch_id = p_branch_id
          AND status = 1
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Semester does not belong to the selected branch.';

    END IF;


    /* =====================================================
       DUPLICATE SECTION
       ===================================================== */

    IF EXISTS
    (
        SELECT 1
        FROM sections
        WHERE academic_year_id = p_academic_year_id
          AND department_id = p_department_id
          AND course_id = p_course_id
          AND branch_id = p_branch_id
          AND semester_id = p_semester_id
          AND LOWER(TRIM(section_code))
              = LOWER(TRIM((p_section_code COLLATE utf8mb4_unicode_ci)))
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section code already exists for the selected semester.';

    END IF;


    /* =====================================================
       INSERT
       ===================================================== */

    INSERT INTO sections
    (
        college_id,
        academic_year_id,
        department_id,
        course_id,
        branch_id,
        semester_id,
        section_code,
        section_name,
        capacity,
        status,
        is_archived,
        created_at,
        created_by
    )
    VALUES
    (
        p_college_id,
        p_academic_year_id,
        p_department_id,
        p_course_id,
        p_branch_id,
        p_semester_id,
        TRIM((p_section_code COLLATE utf8mb4_unicode_ci)),
        TRIM((p_section_name COLLATE utf8mb4_unicode_ci)),
        p_capacity,
        1,
        0,
        UTC_TIMESTAMP(),
        p_created_by
    );


    SELECT LAST_INSERT_ID() AS SectionId;

END$$

DROP PROCEDURE IF EXISTS `sp_section_delete`$$
CREATE PROCEDURE `sp_section_delete`(
    IN p_section_id BIGINT,
    IN p_deleted_by BIGINT
)
BEGIN

    DECLARE v_student_count INT DEFAULT 0;


    IF NOT EXISTS
    (
        SELECT 1
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';

    END IF;


    SELECT COUNT(*)
    INTO v_student_count
    FROM student_sections
    WHERE section_id = p_section_id
      AND is_active = 1;


    IF v_student_count > 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section cannot be archived because active students are assigned to it.';

    END IF;


    UPDATE sections

    SET
        is_archived = 1,
        status = 0,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_deleted_by

    WHERE section_id = p_section_id;


    SELECT ROW_COUNT() AS AffectedRows;

END$$

DROP PROCEDURE IF EXISTS `sp_section_exists`$$
CREATE PROCEDURE `sp_section_exists`(
    IN p_academic_year_id BIGINT,
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_section_code VARCHAR(20),
    IN p_exclude_section_id BIGINT
)
BEGIN

    SELECT
        COUNT(*) AS RecordCount

    FROM sections

    WHERE academic_year_id = p_academic_year_id
      AND department_id = p_department_id
      AND course_id = p_course_id
      AND branch_id = p_branch_id
      AND semester_id = p_semester_id
      AND LOWER(section_code) = LOWER(TRIM((p_section_code COLLATE utf8mb4_unicode_ci)))
      AND is_archived = 0
      AND
      (
          p_exclude_section_id IS NULL
          OR section_id <> p_exclude_section_id
      );

END$$

DROP PROCEDURE IF EXISTS `sp_Section_GetCapacity`$$
CREATE PROCEDURE `sp_Section_GetCapacity`(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        COUNT(ssa.student_section_assignment_id) AS AssignedStudents,
        GREATEST(s.capacity - COUNT(ssa.student_section_assignment_id), 0) AS AvailableSeats,
        CASE
            WHEN COUNT(ssa.student_section_assignment_id) >= s.capacity THEN TRUE
            ELSE FALSE
        END AS IsFull
    FROM sections s
    LEFT JOIN student_section_assignments ssa
        ON ssa.section_id = s.section_id
       AND ssa.status = 1
    WHERE s.section_id = p_section_id
      AND s.deleted_at IS NULL
    GROUP BY s.section_id, s.section_name, s.capacity;
END$$

DROP PROCEDURE IF EXISTS `sp_Section_GetClassTeacher`$$
CREATE PROCEDURE `sp_Section_GetClassTeacher`(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.section_name AS SectionName,
        ep.employee_profile_id AS EmployeeProfileId,
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        d.department_name AS DepartmentName,
        ep.designation AS Designation,
        u.email AS Email,
        u.mobile AS Mobile
    FROM sections s
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    LEFT JOIN departments d
        ON d.department_id = ep.department_id
       AND d.deleted_at IS NULL
    WHERE s.section_id = p_section_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_Section_GetClassTeacherCandidates`$$
CREATE PROCEDURE `sp_Section_GetClassTeacherCandidates`(
    IN p_section_id BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT;

    SELECT college_id
      INTO v_college_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    SELECT
        ep.employee_profile_id AS EmployeeProfileId,
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        d.department_name AS DepartmentName,
        ep.designation AS Designation,
        u.email AS Email,
        u.mobile AS Mobile
    FROM employee_profiles ep
    INNER JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
       AND u.status = 1
    LEFT JOIN departments d
        ON d.department_id = ep.department_id
       AND d.deleted_at IS NULL
    WHERE ep.deleted_at IS NULL
      AND ep.status = 1
      AND (u.college_id = v_college_id OR u.college_id IS NULL)
    ORDER BY u.full_name;
END$$

DROP PROCEDURE IF EXISTS `sp_Section_GetStudentCandidates`$$
CREATE PROCEDURE `sp_Section_GetStudentCandidates`(
    IN p_section_id BIGINT,
    IN p_search VARCHAR(150)
)
BEGIN
    DECLARE v_college_id BIGINT;
    DECLARE v_academic_year_id BIGINT;
    DECLARE v_course_id BIGINT;
    DECLARE v_branch_id BIGINT;

    SELECT college_id, academic_year_id, course_id, branch_id
      INTO v_college_id, v_academic_year_id, v_course_id, v_branch_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    SELECT
        st.student_id AS StudentId,
        st.student_code AS StudentCode,
        st.full_name AS FullName,
        st.email AS Email,
        st.mobile AS Mobile,
        st.college_id AS CollegeId,
        st.course_id AS CourseId,
        st.branch_id AS BranchId,
        st.academic_year_id AS AcademicYearId
    FROM students st
    WHERE st.deleted_at IS NULL
      AND st.status = 1
      AND st.college_id = v_college_id
      AND st.academic_year_id = v_academic_year_id
      AND (v_course_id IS NULL OR st.course_id = v_course_id)
      AND (v_branch_id IS NULL OR st.branch_id = v_branch_id)
      AND (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''
            OR st.student_code LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
            OR st.full_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
          )
      AND NOT EXISTS (
            SELECT 1
            FROM student_section_assignments x
            WHERE x.student_id = st.student_id
              AND x.status = 1
          )
    ORDER BY st.full_name;
END$$

DROP PROCEDURE IF EXISTS `sp_Section_GetStudents`$$
CREATE PROCEDURE `sp_Section_GetStudents`(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        ssa.student_section_assignment_id AS AssignmentId,
        st.student_id AS StudentId,
        st.student_code AS StudentCode,
        st.full_name AS FullName,
        st.email AS Email,
        st.mobile AS Mobile,
        ssa.assigned_at AS AssignedAt,
        ssa.assigned_by AS AssignedBy
    FROM student_section_assignments ssa
    INNER JOIN students st
        ON st.student_id = ssa.student_id
       AND st.deleted_at IS NULL
    WHERE ssa.section_id = p_section_id
      AND ssa.status = 1
    ORDER BY st.full_name;
END$$

DROP PROCEDURE IF EXISTS `sp_section_get_all`$$
CREATE PROCEDURE `sp_section_get_all`()
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

        sem.semester_id AS SemesterId,
        COALESCE(sem.semester_number, s.semester) AS SemesterNumber,
        COALESCE(
            sem.semester_name,
            CONCAT('Semester ', s.semester)
        ) AS SemesterName,

        s.section_code AS SectionCode,
        s.section_name AS SectionName,

        s.capacity AS Capacity,

        /* Enrollment */
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,

        /* Available Seats */
        GREATEST(
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,

        /* Capacity Status */
        CASE

            WHEN
                (
                    SELECT COUNT(*)
                    FROM student_section_assignments ssa
                    WHERE ssa.section_id = s.section_id
                      AND ssa.academic_year_id = s.academic_year_id
                      AND ssa.status = 1
                ) >= s.capacity
            THEN 'FULL'

            WHEN
                (
                    SELECT COUNT(*)
                    FROM student_section_assignments ssa
                    WHERE ssa.section_id = s.section_id
                      AND ssa.academic_year_id = s.academic_year_id
                      AND ssa.status = 1
                ) >= CEIL(s.capacity * 0.90)
            THEN 'NEAR_FULL'

            ELSE 'AVAILABLE'

        END AS CapacityStatus,

        /* Faculty Advisor */
        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,

        u.full_name AS FacultyAdvisorName,

        /* Room */
        s.room AS Room,

        /* Shift */
        s.shift AS Shift,

        /* Section Type */
        s.section_type AS SectionType,

        s.status AS Status,
        s.is_archived AS IsArchived,

        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,

        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy

    FROM sections s

    INNER JOIN colleges col
        ON col.college_id = s.college_id

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN semesters sem
        ON sem.semester_id = COALESCE(
            (
                SELECT candidate.semester_id
                FROM semesters candidate
                WHERE candidate.course_id = s.course_id
                  AND candidate.branch_id = s.branch_id
                  AND candidate.semester_number = s.semester
                  AND candidate.status = 1
                  AND candidate.is_archived = 0
                ORDER BY
                    (candidate.academic_year_id = s.academic_year_id) DESC,
                    candidate.semester_id DESC
                LIMIT 1
            ),
            s.semester_id
        )

    /* Faculty Advisor */
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL

    WHERE s.is_archived = 0

    ORDER BY
        d.department_name,
        c.course_name,
        b.branch_name,
        COALESCE(sem.semester_number, s.semester),
        s.section_code;

END$$

DROP PROCEDURE IF EXISTS `sp_section_get_by_id`$$
CREATE PROCEDURE `sp_section_get_by_id`(
    IN p_section_id BIGINT
)
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

        sem.semester_id AS SemesterId,
        COALESCE(sem.semester_number, s.semester) AS SemesterNumber,
        COALESCE(
            sem.semester_name,
            CONCAT('Semester ', s.semester)
        ) AS SemesterName,

        s.section_code AS SectionCode,
        s.section_name AS SectionName,

        s.capacity AS Capacity,

        /* Enrollment */
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,

        /* Available Seats */
        GREATEST(
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,

        /* Faculty Advisor */
        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,

        u.full_name AS FacultyAdvisorName,

        /* Room */
        s.room AS Room,

        /* Shift */
        s.shift AS Shift,

        /* Section Type */
        s.section_type AS SectionType,

        s.status AS Status,
        s.is_archived AS IsArchived,

        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,

        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy

    FROM sections s

    INNER JOIN colleges col
        ON col.college_id = s.college_id

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN semesters sem
        ON sem.semester_id = COALESCE(
            (
                SELECT candidate.semester_id
                FROM semesters candidate
                WHERE candidate.course_id = s.course_id
                  AND candidate.branch_id = s.branch_id
                  AND candidate.semester_number = s.semester
                  AND candidate.status = 1
                  AND candidate.is_archived = 0
                ORDER BY
                    (candidate.academic_year_id = s.academic_year_id) DESC,
                    candidate.semester_id DESC
                LIMIT 1
            ),
            s.semester_id
        )

    /* Faculty Advisor */
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL

    WHERE s.section_id = p_section_id
      AND s.is_archived = 0;

END$$

DROP PROCEDURE IF EXISTS `sp_section_get_current_strength`$$
CREATE PROCEDURE `sp_section_get_current_strength`(
    IN p_section_id BIGINT
)
BEGIN

    SELECT COUNT(*) AS CurrentStrength

    FROM student_sections

    WHERE section_id = p_section_id
      AND is_active = 1;

END$$

DROP PROCEDURE IF EXISTS `sp_section_get_entity_by_id`$$
CREATE PROCEDURE `sp_section_get_entity_by_id`(
    IN p_section_id BIGINT
)
BEGIN

    SELECT
        section_id AS SectionId,
        college_id AS CollegeId,
        academic_year_id AS AcademicYearId,
        department_id AS DepartmentId,
        course_id AS CourseId,
        branch_id AS BranchId,
        semester_id AS SemesterId,

        section_code AS SectionCode,
        section_name AS SectionName,

        capacity AS Capacity,

        status AS Status,
        is_archived AS IsArchived,

        created_at AS CreatedAt,
        created_by AS CreatedBy,

        updated_at AS UpdatedAt,
        updated_by AS UpdatedBy

    FROM sections

    WHERE section_id = p_section_id
      AND is_archived = 0;

END$$

DROP PROCEDURE IF EXISTS `sp_section_get_summary`$$
CREATE PROCEDURE `sp_section_get_summary`()
BEGIN

    SELECT
        COUNT(*) AS TotalSections,

        COALESCE(
            SUM(
                CASE
                    WHEN s.status = 1 THEN 1
                    ELSE 0
                END
            ),
            0
        ) AS ActiveSections,

        COALESCE(
            SUM(s.capacity),
            0
        ) AS TotalCapacity,

        COALESCE(
            SUM(
                CASE
                    WHEN s.class_teacher_employee_profile_id IS NULL
                         OR s.class_teacher_employee_profile_id = 0
                    THEN 1
                    ELSE 0
                END
            ),
            0
        ) AS UnassignedAdvisors

    FROM sections s

    WHERE s.is_archived = 0;

END$$

DROP PROCEDURE IF EXISTS `sp_Section_RemoveClassTeacher`$$
CREATE PROCEDURE `sp_Section_RemoveClassTeacher`(
    IN p_section_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE sections
    SET class_teacher_employee_profile_id = NULL,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND class_teacher_employee_profile_id IS NOT NULL;

    SELECT ROW_COUNT() AS affected_rows;
END$$

DROP PROCEDURE IF EXISTS `sp_Section_RemoveStudent`$$
CREATE PROCEDURE `sp_Section_RemoveStudent`(
    IN p_section_id BIGINT,
    IN p_student_id BIGINT,
    IN p_removed_by BIGINT
)
BEGIN
    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_removed_by
    WHERE section_id = p_section_id
      AND student_id = p_student_id
      AND status = 1;

    SELECT ROW_COUNT() AS affected_rows;
END$$

DROP PROCEDURE IF EXISTS `sp_section_search`$$
CREATE PROCEDURE `sp_section_search`(
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
        sem.semester_id AS SemesterId,
        COALESCE(
            sem.semester_name,
            CONCAT('Semester ', s.semester)
        ) AS SemesterName,
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
            s.capacity -
            (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ),
            0
        ) AS AvailableSeats,

        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived

    FROM sections s

    INNER JOIN colleges col
        ON col.college_id = s.college_id

    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    INNER JOIN departments d
        ON d.department_id = s.department_id

    INNER JOIN courses c
        ON c.course_id = s.course_id

    INNER JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN semesters sem
        ON sem.semester_id = COALESCE(
            (
                SELECT candidate.semester_id
                FROM semesters candidate
                WHERE candidate.course_id = s.course_id
                  AND candidate.branch_id = s.branch_id
                  AND candidate.semester_number = s.semester
                  AND candidate.status = 1
                  AND candidate.is_archived = 0
                ORDER BY
                    (candidate.academic_year_id = s.academic_year_id) DESC,
                    candidate.semester_id DESC
                LIMIT 1
            ),
            s.semester_id
        )

    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL

    WHERE s.is_archived = 0

      AND
      (
          (p_search COLLATE utf8mb4_unicode_ci) IS NULL
          OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''
          OR s.section_code LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
          OR s.section_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
          OR d.department_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
          OR c.course_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
          OR b.branch_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
          OR COALESCE(
                sem.semester_name,
                CONCAT('Semester ', s.semester)
             ) LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
      )

      AND
      (
          p_department_id IS NULL
          OR s.department_id = p_department_id
      )

      AND
      (
          p_course_id IS NULL
          OR s.course_id = p_course_id
      )

      AND
      (
          p_branch_id IS NULL
          OR s.branch_id = p_branch_id
      )

      AND
      (
          p_semester_id IS NULL
          OR s.semester_id = p_semester_id
      )

      AND
      (
          p_status IS NULL
          OR s.status = p_status
      )

    ORDER BY s.section_code;

END$$

DROP PROCEDURE IF EXISTS `sp_section_update`$$
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
    IF NULLIF(TRIM((p_section_name COLLATE utf8mb4_unicode_ci)), '') IS NULL
       OR NULLIF(TRIM((p_section_code COLLATE utf8mb4_unicode_ci)), '') IS NULL THEN
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
          AND LOWER(TRIM(duplicate_section.`section_code`)) = LOWER(TRIM((p_section_code COLLATE utf8mb4_unicode_ci)))
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
        `section_name` = TRIM((p_section_name COLLATE utf8mb4_unicode_ci)),
        `section_code` = TRIM((p_section_code COLLATE utf8mb4_unicode_ci)),
        `capacity` = p_capacity,
        `class_teacher_employee_profile_id` = p_class_teacher_employee_profile_id,
        `room` = NULLIF(TRIM((p_room COLLATE utf8mb4_unicode_ci)), ''),
        `shift` = NULLIF(TRIM((p_shift COLLATE utf8mb4_unicode_ci)), ''),
        `section_type` = NULLIF(TRIM((p_section_type COLLATE utf8mb4_unicode_ci)), ''),
        `status` = IF(COALESCE(p_status, 0) = 1, 1, 0),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by
    WHERE `section_id` = p_section_id
      AND `is_archived` = 0
      AND `deleted_at` IS NULL;

    SELECT 1 AS `AffectedRows`;
END$$

DROP PROCEDURE IF EXISTS `sp_section_update_status`$$
CREATE PROCEDURE `sp_section_update_status`(
    IN p_section_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN

    IF p_status NOT IN (0,1) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid section status.';

    END IF;


    IF NOT EXISTS
    (
        SELECT 1
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';

    END IF;


    UPDATE sections

    SET
        status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by

    WHERE section_id = p_section_id
      AND is_archived = 0;


    SELECT ROW_COUNT() AS AffectedRows;

END$$

DROP PROCEDURE IF EXISTS `sp_section_validate_capacity`$$
CREATE PROCEDURE `sp_section_validate_capacity`(
    IN p_section_id BIGINT,
    IN p_capacity INT
)
BEGIN

    DECLARE v_current_strength INT DEFAULT 0;
    DECLARE v_section_exists INT DEFAULT 0;
    DECLARE v_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_error_message VARCHAR(255);


    /* =========================================================
       1. Validate capacity
       ========================================================= */

    IF p_capacity IS NULL OR p_capacity <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section capacity must be greater than zero.';

    END IF;


    /* =========================================================
       2. Validate existing section
       ========================================================= */

    IF p_section_id IS NOT NULL
       AND p_section_id > 0 THEN

        SELECT COUNT(*)
        INTO v_section_exists
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0;


        IF v_section_exists = 0 THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Section not found.';

        END IF;


        /* =====================================================
           3. Get academic year of section
           ===================================================== */

        SELECT academic_year_id
        INTO v_academic_year_id
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0
        LIMIT 1;


        /* =====================================================
           4. Get current active student count
           ===================================================== */

        SELECT COUNT(*)
        INTO v_current_strength
        FROM student_sections
        WHERE section_id = p_section_id
          AND academic_year_id = v_academic_year_id
          AND is_active = 1;


        /* =====================================================
           5. Validate proposed capacity
           ===================================================== */

        IF p_capacity < v_current_strength THEN

            SET v_error_message = CONCAT(
                'Section capacity cannot be less than current student count of ',
                v_current_strength,
                '.'
            );

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = v_error_message;

        END IF;

    END IF;


    /* =========================================================
       6. Return validation result
       ========================================================= */

    SELECT
        TRUE AS IsValid,
        p_capacity AS Capacity,
        v_current_strength AS CurrentStrength,
        GREATEST(
            p_capacity - v_current_strength,
            0
        ) AS AvailableSeats;

END$$

DROP PROCEDURE IF EXISTS `sp_StudentAcademicDetails_GetById`$$
CREATE PROCEDURE `sp_StudentAcademicDetails_GetById`(
    IN p_academic_id INT
)
BEGIN
    SELECT
        AcademicId,
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    FROM student_academic_details
    WHERE AcademicId = p_academic_id
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAcademicDetails_Update`$$
CREATE PROCEDURE `sp_StudentAcademicDetails_Update`(
    IN p_academic_id INT,
    IN p_roll_number VARCHAR(20),
    IN p_registration_number VARCHAR(30),
    IN p_admission_number VARCHAR(30),
    IN p_course VARCHAR(100),
    IN p_branch VARCHAR(100),
    IN p_department VARCHAR(100),
    IN p_semester INT,
    IN p_section VARCHAR(10),
    IN p_academic_year VARCHAR(20)
)
BEGIN
    IF p_academic_id IS NULL OR p_academic_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid academic ID is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE AcademicId = p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student academic information not found.';
    END IF;

    IF (p_roll_number COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_roll_number COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Roll number is required.';
    END IF;

    IF (p_registration_number COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_registration_number COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number is required.';
    END IF;

    IF (p_admission_number COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_admission_number COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF (p_course COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_course COLLATE utf8mb4_unicode_ci)) = ''
       OR (p_branch COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_branch COLLATE utf8mb4_unicode_ci)) = ''
       OR (p_department COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_department COLLATE utf8mb4_unicode_ci)) = ''
       OR (p_section COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_section COLLATE utf8mb4_unicode_ci)) = ''
       OR (p_academic_year COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_academic_year COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Course, branch, department, section and academic year are required.';
    END IF;

    IF p_semester IS NULL OR p_semester <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Semester must be greater than 0.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE RegistrationNumber = TRIM((p_registration_number COLLATE utf8mb4_unicode_ci))
          AND AcademicId <> p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number already exists.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE AdmissionNumber = TRIM((p_admission_number COLLATE utf8mb4_unicode_ci))
          AND AcademicId <> p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number already exists.';
    END IF;

    UPDATE student_academic_details
    SET
        RollNumber = TRIM((p_roll_number COLLATE utf8mb4_unicode_ci)),
        RegistrationNumber = TRIM((p_registration_number COLLATE utf8mb4_unicode_ci)),
        AdmissionNumber = TRIM((p_admission_number COLLATE utf8mb4_unicode_ci)),
        Course = TRIM((p_course COLLATE utf8mb4_unicode_ci)),
        Branch = TRIM((p_branch COLLATE utf8mb4_unicode_ci)),
        Department = TRIM((p_department COLLATE utf8mb4_unicode_ci)),
        Semester = p_semester,
        Section = TRIM((p_section COLLATE utf8mb4_unicode_ci)),
        AcademicYear = TRIM((p_academic_year COLLATE utf8mb4_unicode_ci))
    WHERE AcademicId = p_academic_id;

    CALL sp_StudentAcademicDetails_GetById(p_academic_id);
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAcademicInformation_GetById`$$
CREATE PROCEDURE `sp_StudentAcademicInformation_GetById`(
    IN p_academic_id INT
)
BEGIN
    SELECT
        AcademicId,
        RollNumber,
        RegistrationNumber,
        AdmissionNumber,
        Course,
        Branch,
        Department,
        Semester,
        Section,
        AcademicYear
    FROM student_academic_details
    WHERE AcademicId = p_academic_id
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAcademicInformation_Update`$$
CREATE PROCEDURE `sp_StudentAcademicInformation_Update`(
    IN p_academic_id INT,
    IN p_roll_number VARCHAR(20),
    IN p_registration_number VARCHAR(30),
    IN p_admission_number VARCHAR(30),
    IN p_course VARCHAR(100),
    IN p_branch VARCHAR(100),
    IN p_department VARCHAR(100),
    IN p_semester INT,
    IN p_section VARCHAR(10),
    IN p_academic_year VARCHAR(20)
)
BEGIN
    IF p_academic_id IS NULL OR p_academic_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid academic ID is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE AcademicId = p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student academic information not found.';
    END IF;

    IF (p_roll_number COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_roll_number COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Roll number is required.';
    END IF;

    IF (p_registration_number COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_registration_number COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number is required.';
    END IF;

    IF (p_admission_number COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_admission_number COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF (p_course COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_course COLLATE utf8mb4_unicode_ci)) = ''
       OR (p_branch COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_branch COLLATE utf8mb4_unicode_ci)) = ''
       OR (p_department COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_department COLLATE utf8mb4_unicode_ci)) = ''
       OR (p_section COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_section COLLATE utf8mb4_unicode_ci)) = ''
       OR (p_academic_year COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_academic_year COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Course, branch, department, section and academic year are required.';
    END IF;

    IF p_semester IS NULL OR p_semester <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Semester must be greater than 0.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE RegistrationNumber = TRIM((p_registration_number COLLATE utf8mb4_unicode_ci))
          AND AcademicId <> p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Registration number already exists.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_academic_details
        WHERE AdmissionNumber = TRIM((p_admission_number COLLATE utf8mb4_unicode_ci))
          AND AcademicId <> p_academic_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Admission number already exists.';
    END IF;

    UPDATE student_academic_details
    SET
        RollNumber = TRIM((p_roll_number COLLATE utf8mb4_unicode_ci)),
        RegistrationNumber = TRIM((p_registration_number COLLATE utf8mb4_unicode_ci)),
        AdmissionNumber = TRIM((p_admission_number COLLATE utf8mb4_unicode_ci)),
        Course = TRIM((p_course COLLATE utf8mb4_unicode_ci)),
        Branch = TRIM((p_branch COLLATE utf8mb4_unicode_ci)),
        Department = TRIM((p_department COLLATE utf8mb4_unicode_ci)),
        Semester = p_semester,
        Section = TRIM((p_section COLLATE utf8mb4_unicode_ci)),
        AcademicYear = TRIM((p_academic_year COLLATE utf8mb4_unicode_ci))
    WHERE AcademicId = p_academic_id;

    CALL sp_StudentAcademicInformation_GetById(p_academic_id);
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_Create`$$
CREATE PROCEDURE `sp_StudentAdmission_Create`(
    IN p_registration_no VARCHAR(500),
    IN p_registration_date DATE,
    IN p_application_no VARCHAR(500),
    IN p_application_date DATE,
    IN p_admission_no VARCHAR(500),
    IN p_admission_date DATE,
    IN p_admission_type VARCHAR(500),
    IN p_admission_quota VARCHAR(500),
    IN p_medium VARCHAR(500),
    IN p_scholarship_status VARCHAR(500),
    IN p_first_name VARCHAR(500),
    IN p_last_name VARCHAR(500),
    IN p_gender VARCHAR(500),
    IN p_date_of_birth DATE,
    IN p_blood_group VARCHAR(500),
    IN p_student_photo VARCHAR(500),
    IN p_email VARCHAR(500),
    IN p_student_email VARCHAR(500),
    IN p_mobile_number VARCHAR(500),
    IN p_aadhaar_number VARCHAR(500),
    IN p_nationality VARCHAR(500),
    IN p_religion VARCHAR(500),
    IN p_category VARCHAR(500),
    IN p_father_name VARCHAR(500),
    IN p_mother_name VARCHAR(500),
    IN p_guardian_name VARCHAR(500),
    IN p_occupation VARCHAR(500),
    IN p_annual_income DECIMAL(15,2),
    IN p_mother_email VARCHAR(500),
    IN p_guardian_mobile VARCHAR(500),
    IN p_guardian_email VARCHAR(500),
    IN p_address TEXT,
    IN p_city VARCHAR(500),
    IN p_district VARCHAR(500),
    IN p_state VARCHAR(500),
    IN p_pincode VARCHAR(500),
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_second_language VARCHAR(500),
    IN p_previous_school VARCHAR(500),
    IN p_previous_board VARCHAR(500),
    IN p_previous_year VARCHAR(500),
    IN p_previous_percentage DECIMAL(15,2),
    IN p_previous_hall_ticket VARCHAR(500),
    IN p_birth_certificate VARCHAR(500),
    IN p_transfer_certificate VARCHAR(500),
    IN p_study_certificate VARCHAR(500),
    IN p_aadhaar_document VARCHAR(500),
    IN p_community_certificate VARCHAR(500),
    IN p_income_certificate VARCHAR(500),
    IN p_passport_photo VARCHAR(500),
    IN p_marks_memo VARCHAR(500),
    IN p_caste_certificate VARCHAR(500),
    IN p_tenth_certificate VARCHAR(500),
    IN p_status VARCHAR(500),
    IN p_admission_status VARCHAR(500),
    IN p_interview_required TINYINT,
    IN p_admission_fee_amount DECIMAL(15,2),
    IN p_remarks TEXT,
    IN p_is_active TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF (p_first_name COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_first_name COLLATE utf8mb4_unicode_ci)) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'First name is required.';
    END IF;

    IF (p_gender COLLATE utf8mb4_unicode_ci) NOT IN ('Male', 'Female', 'Other') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gender must be Male, Female, or Other.';
    END IF;

    IF (p_registration_no COLLATE utf8mb4_unicode_ci) IS NOT NULL AND TRIM((p_registration_no COLLATE utf8mb4_unicode_ci)) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE RegistrationNo = TRIM((p_registration_no COLLATE utf8mb4_unicode_ci)) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registration number already exists.';
    END IF;

    IF (p_application_no COLLATE utf8mb4_unicode_ci) IS NOT NULL AND TRIM((p_application_no COLLATE utf8mb4_unicode_ci)) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE ApplicationNo = TRIM((p_application_no COLLATE utf8mb4_unicode_ci)) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application number already exists.';
    END IF;

    IF (p_admission_no COLLATE utf8mb4_unicode_ci) IS NOT NULL AND TRIM((p_admission_no COLLATE utf8mb4_unicode_ci)) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE AdmissionNo = TRIM((p_admission_no COLLATE utf8mb4_unicode_ci)) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number already exists.';
    END IF;

    INSERT INTO studentadmissions
    (
        RegistrationNo,
        RegistrationDate,
        ApplicationNo,
        ApplicationDate,
        AdmissionNo,
        AdmissionDate,
        AdmissionType,
        AdmissionQuota,
        Medium,
        ScholarshipStatus,
        FirstName,
        LastName,
        Gender,
        DateOfBirth,
        BloodGroup,
        StudentPhoto,
        Email,
        StudentEmail,
        MobileNumber,
        AadhaarNumber,
        Nationality,
        Religion,
        Category,
        FatherName,
        MotherName,
        GuardianName,
        Occupation,
        AnnualIncome,
        MotherEmail,
        GuardianMobile,
        GuardianEmail,
        Address,
        City,
        District,
        State,
        Pincode,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        SecondLanguage,
        PreviousSchool,
        PreviousBoard,
        PreviousYear,
        PreviousPercentage,
        PreviousHallTicket,
        BirthCertificate,
        TransferCertificate,
        StudyCertificate,
        AadhaarDocument,
        CommunityCertificate,
        IncomeCertificate,
        PassportPhoto,
        MarksMemo,
        CasteCertificate,
        TenthCertificate,
        Status,
        AdmissionStatus,
        InterviewRequired,
        AdmissionFeeAmount,
        Remarks,
        IsActive,
        CreatedBy,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        (p_registration_no COLLATE utf8mb4_unicode_ci),
        p_registration_date,
        (p_application_no COLLATE utf8mb4_unicode_ci),
        p_application_date,
        (p_admission_no COLLATE utf8mb4_unicode_ci),
        p_admission_date,
        (p_admission_type COLLATE utf8mb4_unicode_ci),
        (p_admission_quota COLLATE utf8mb4_unicode_ci),
        (p_medium COLLATE utf8mb4_unicode_ci),
        (p_scholarship_status COLLATE utf8mb4_unicode_ci),
        (p_first_name COLLATE utf8mb4_unicode_ci),
        (p_last_name COLLATE utf8mb4_unicode_ci),
        (p_gender COLLATE utf8mb4_unicode_ci),
        p_date_of_birth,
        (p_blood_group COLLATE utf8mb4_unicode_ci),
        (p_student_photo COLLATE utf8mb4_unicode_ci),
        (p_email COLLATE utf8mb4_unicode_ci),
        (p_student_email COLLATE utf8mb4_unicode_ci),
        (p_mobile_number COLLATE utf8mb4_unicode_ci),
        (p_aadhaar_number COLLATE utf8mb4_unicode_ci),
        (p_nationality COLLATE utf8mb4_unicode_ci),
        (p_religion COLLATE utf8mb4_unicode_ci),
        (p_category COLLATE utf8mb4_unicode_ci),
        (p_father_name COLLATE utf8mb4_unicode_ci),
        (p_mother_name COLLATE utf8mb4_unicode_ci),
        (p_guardian_name COLLATE utf8mb4_unicode_ci),
        (p_occupation COLLATE utf8mb4_unicode_ci),
        p_annual_income,
        (p_mother_email COLLATE utf8mb4_unicode_ci),
        (p_guardian_mobile COLLATE utf8mb4_unicode_ci),
        (p_guardian_email COLLATE utf8mb4_unicode_ci),
        (p_address COLLATE utf8mb4_unicode_ci),
        (p_city COLLATE utf8mb4_unicode_ci),
        (p_district COLLATE utf8mb4_unicode_ci),
        (p_state COLLATE utf8mb4_unicode_ci),
        (p_pincode COLLATE utf8mb4_unicode_ci),
        p_board_id,
        p_academic_year_id,
        p_academic_level_id,
        p_group_id,
        p_section_id,
        (p_second_language COLLATE utf8mb4_unicode_ci),
        (p_previous_school COLLATE utf8mb4_unicode_ci),
        (p_previous_board COLLATE utf8mb4_unicode_ci),
        (p_previous_year COLLATE utf8mb4_unicode_ci),
        p_previous_percentage,
        (p_previous_hall_ticket COLLATE utf8mb4_unicode_ci),
        (p_birth_certificate COLLATE utf8mb4_unicode_ci),
        (p_transfer_certificate COLLATE utf8mb4_unicode_ci),
        (p_study_certificate COLLATE utf8mb4_unicode_ci),
        (p_aadhaar_document COLLATE utf8mb4_unicode_ci),
        (p_community_certificate COLLATE utf8mb4_unicode_ci),
        (p_income_certificate COLLATE utf8mb4_unicode_ci),
        (p_passport_photo COLLATE utf8mb4_unicode_ci),
        (p_marks_memo COLLATE utf8mb4_unicode_ci),
        (p_caste_certificate COLLATE utf8mb4_unicode_ci),
        (p_tenth_certificate COLLATE utf8mb4_unicode_ci),
        (p_status COLLATE utf8mb4_unicode_ci),
        (p_admission_status COLLATE utf8mb4_unicode_ci),
        p_interview_required,
        p_admission_fee_amount,
        (p_remarks COLLATE utf8mb4_unicode_ci),
        p_is_active,
        p_created_by,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );

    SELECT * FROM studentadmissions WHERE AdmissionId = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetAcademicDetails`$$
CREATE PROCEDURE `sp_StudentAdmission_GetAcademicDetails`(
    IN p_admission_id BIGINT
)
BEGIN
    SELECT
        AdmissionId,
        RegistrationNo,
        AdmissionNo,
        TRIM(CONCAT(COALESCE(FirstName, ''), ' ', COALESCE(LastName, ''))) AS StudentName,
        AcademicCollegeId AS CollegeId, AcademicDepartmentId AS DepartmentId,
        AcademicCourseId AS CourseId, AcademicBranchId AS BranchId, AcademicSemesterId AS SemesterId,
        AdmissionType, EntryType, Regulation, Batch,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        Medium,
        SecondLanguage,
        PreviousSchool,
        PreviousBoard,
        PreviousYear,
        PreviousPercentage,
        PreviousHallTicket,
        UpdatedBy,
        UpdatedAt
    FROM studentadmissions
    WHERE AdmissionId = p_admission_id
      AND IsDeleted = 0
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_GetById`$$
CREATE PROCEDURE `sp_StudentAdmission_GetById`(IN p_admission_id BIGINT)
BEGIN
SELECT * FROM vw_cms_admission_directory WHERE AdmissionId=p_admission_id AND IsDeleted=0 LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_Update`$$
CREATE PROCEDURE `sp_StudentAdmission_Update`(
    IN p_admission_id BIGINT,
    IN p_registration_no VARCHAR(500),
    IN p_registration_date DATE,
    IN p_application_no VARCHAR(500),
    IN p_application_date DATE,
    IN p_admission_no VARCHAR(500),
    IN p_admission_date DATE,
    IN p_admission_type VARCHAR(500),
    IN p_admission_quota VARCHAR(500),
    IN p_medium VARCHAR(500),
    IN p_scholarship_status VARCHAR(500),
    IN p_first_name VARCHAR(500),
    IN p_last_name VARCHAR(500),
    IN p_gender VARCHAR(500),
    IN p_date_of_birth DATE,
    IN p_blood_group VARCHAR(500),
    IN p_student_photo VARCHAR(500),
    IN p_email VARCHAR(500),
    IN p_student_email VARCHAR(500),
    IN p_mobile_number VARCHAR(500),
    IN p_aadhaar_number VARCHAR(500),
    IN p_nationality VARCHAR(500),
    IN p_religion VARCHAR(500),
    IN p_category VARCHAR(500),
    IN p_father_name VARCHAR(500),
    IN p_mother_name VARCHAR(500),
    IN p_guardian_name VARCHAR(500),
    IN p_occupation VARCHAR(500),
    IN p_annual_income DECIMAL(15,2),
    IN p_mother_email VARCHAR(500),
    IN p_guardian_mobile VARCHAR(500),
    IN p_guardian_email VARCHAR(500),
    IN p_address TEXT,
    IN p_city VARCHAR(500),
    IN p_district VARCHAR(500),
    IN p_state VARCHAR(500),
    IN p_pincode VARCHAR(500),
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_second_language VARCHAR(500),
    IN p_previous_school VARCHAR(500),
    IN p_previous_board VARCHAR(500),
    IN p_previous_year VARCHAR(500),
    IN p_previous_percentage DECIMAL(15,2),
    IN p_previous_hall_ticket VARCHAR(500),
    IN p_birth_certificate VARCHAR(500),
    IN p_transfer_certificate VARCHAR(500),
    IN p_study_certificate VARCHAR(500),
    IN p_aadhaar_document VARCHAR(500),
    IN p_community_certificate VARCHAR(500),
    IN p_income_certificate VARCHAR(500),
    IN p_passport_photo VARCHAR(500),
    IN p_marks_memo VARCHAR(500),
    IN p_caste_certificate VARCHAR(500),
    IN p_tenth_certificate VARCHAR(500),
    IN p_status VARCHAR(500),
    IN p_admission_status VARCHAR(500),
    IN p_interview_required TINYINT,
    IN p_admission_fee_amount DECIMAL(15,2),
    IN p_remarks TEXT,
    IN p_is_active TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM studentadmissions
        WHERE AdmissionId = p_admission_id AND IsDeleted = 0
    ) THEN
        SELECT * FROM studentadmissions WHERE 1 = 0;
    ELSE
        IF (p_registration_no COLLATE utf8mb4_unicode_ci) IS NOT NULL AND TRIM((p_registration_no COLLATE utf8mb4_unicode_ci)) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE RegistrationNo = TRIM((p_registration_no COLLATE utf8mb4_unicode_ci)) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registration number already exists.';
        END IF;

        IF (p_application_no COLLATE utf8mb4_unicode_ci) IS NOT NULL AND TRIM((p_application_no COLLATE utf8mb4_unicode_ci)) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE ApplicationNo = TRIM((p_application_no COLLATE utf8mb4_unicode_ci)) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application number already exists.';
        END IF;

        IF (p_admission_no COLLATE utf8mb4_unicode_ci) IS NOT NULL AND TRIM((p_admission_no COLLATE utf8mb4_unicode_ci)) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE AdmissionNo = TRIM((p_admission_no COLLATE utf8mb4_unicode_ci)) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number already exists.';
        END IF;

        UPDATE studentadmissions
        SET
        RegistrationNo = (p_registration_no COLLATE utf8mb4_unicode_ci),
        RegistrationDate = p_registration_date,
        ApplicationNo = (p_application_no COLLATE utf8mb4_unicode_ci),
        ApplicationDate = p_application_date,
        AdmissionNo = (p_admission_no COLLATE utf8mb4_unicode_ci),
        AdmissionDate = p_admission_date,
        AdmissionType = (p_admission_type COLLATE utf8mb4_unicode_ci),
        AdmissionQuota = (p_admission_quota COLLATE utf8mb4_unicode_ci),
        Medium = (p_medium COLLATE utf8mb4_unicode_ci),
        ScholarshipStatus = (p_scholarship_status COLLATE utf8mb4_unicode_ci),
        FirstName = (p_first_name COLLATE utf8mb4_unicode_ci),
        LastName = (p_last_name COLLATE utf8mb4_unicode_ci),
        Gender = (p_gender COLLATE utf8mb4_unicode_ci),
        DateOfBirth = p_date_of_birth,
        BloodGroup = (p_blood_group COLLATE utf8mb4_unicode_ci),
        StudentPhoto = (p_student_photo COLLATE utf8mb4_unicode_ci),
        Email = (p_email COLLATE utf8mb4_unicode_ci),
        StudentEmail = (p_student_email COLLATE utf8mb4_unicode_ci),
        MobileNumber = (p_mobile_number COLLATE utf8mb4_unicode_ci),
        AadhaarNumber = (p_aadhaar_number COLLATE utf8mb4_unicode_ci),
        Nationality = (p_nationality COLLATE utf8mb4_unicode_ci),
        Religion = (p_religion COLLATE utf8mb4_unicode_ci),
        Category = (p_category COLLATE utf8mb4_unicode_ci),
        FatherName = (p_father_name COLLATE utf8mb4_unicode_ci),
        MotherName = (p_mother_name COLLATE utf8mb4_unicode_ci),
        GuardianName = (p_guardian_name COLLATE utf8mb4_unicode_ci),
        Occupation = (p_occupation COLLATE utf8mb4_unicode_ci),
        AnnualIncome = p_annual_income,
        MotherEmail = (p_mother_email COLLATE utf8mb4_unicode_ci),
        GuardianMobile = (p_guardian_mobile COLLATE utf8mb4_unicode_ci),
        GuardianEmail = (p_guardian_email COLLATE utf8mb4_unicode_ci),
        Address = (p_address COLLATE utf8mb4_unicode_ci),
        City = (p_city COLLATE utf8mb4_unicode_ci),
        District = (p_district COLLATE utf8mb4_unicode_ci),
        State = (p_state COLLATE utf8mb4_unicode_ci),
        Pincode = (p_pincode COLLATE utf8mb4_unicode_ci),
        BoardId = p_board_id,
        AcademicYearId = p_academic_year_id,
        AcademicLevelId = p_academic_level_id,
        GroupId = p_group_id,
        SectionId = p_section_id,
        SecondLanguage = (p_second_language COLLATE utf8mb4_unicode_ci),
        PreviousSchool = (p_previous_school COLLATE utf8mb4_unicode_ci),
        PreviousBoard = (p_previous_board COLLATE utf8mb4_unicode_ci),
        PreviousYear = (p_previous_year COLLATE utf8mb4_unicode_ci),
        PreviousPercentage = p_previous_percentage,
        PreviousHallTicket = (p_previous_hall_ticket COLLATE utf8mb4_unicode_ci),
        BirthCertificate = (p_birth_certificate COLLATE utf8mb4_unicode_ci),
        TransferCertificate = (p_transfer_certificate COLLATE utf8mb4_unicode_ci),
        StudyCertificate = (p_study_certificate COLLATE utf8mb4_unicode_ci),
        AadhaarDocument = (p_aadhaar_document COLLATE utf8mb4_unicode_ci),
        CommunityCertificate = (p_community_certificate COLLATE utf8mb4_unicode_ci),
        IncomeCertificate = (p_income_certificate COLLATE utf8mb4_unicode_ci),
        PassportPhoto = (p_passport_photo COLLATE utf8mb4_unicode_ci),
        MarksMemo = (p_marks_memo COLLATE utf8mb4_unicode_ci),
        CasteCertificate = (p_caste_certificate COLLATE utf8mb4_unicode_ci),
        TenthCertificate = (p_tenth_certificate COLLATE utf8mb4_unicode_ci),
        Status = (p_status COLLATE utf8mb4_unicode_ci),
        AdmissionStatus = (p_admission_status COLLATE utf8mb4_unicode_ci),
        InterviewRequired = p_interview_required,
        AdmissionFeeAmount = p_admission_fee_amount,
        Remarks = (p_remarks COLLATE utf8mb4_unicode_ci),
        IsActive = p_is_active,
            UpdatedBy = p_updated_by,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0;

        SELECT * FROM studentadmissions WHERE AdmissionId = p_admission_id;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_UpdateAcademicDetails`$$
CREATE PROCEDURE `sp_StudentAdmission_UpdateAcademicDetails`(
    IN p_admission_id BIGINT,
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_medium VARCHAR(50),
    IN p_second_language VARCHAR(100),
    IN p_previous_school VARCHAR(200),
    IN p_previous_board VARCHAR(100),
    IN p_previous_year VARCHAR(20),
    IN p_previous_percentage DECIMAL(5,2),
    IN p_previous_hall_ticket VARCHAR(100),
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM studentadmissions
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student admission record not found.';
    END IF;

    IF p_previous_percentage IS NOT NULL
       AND (p_previous_percentage < 0 OR p_previous_percentage > 100) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Previous percentage must be between 0 and 100.';
    END IF;

    IF p_academic_year_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM academicyears
           WHERE academic_year_id = p_academic_year_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year not found.';
    END IF;

    IF p_section_id IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = DATABASE()
             AND table_name = 'sections'
       )
       AND NOT EXISTS (
           SELECT 1 FROM sections
           WHERE section_id = p_section_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    UPDATE studentadmissions
       SET BoardId = p_board_id,
           AcademicYearId = p_academic_year_id,
           AcademicLevelId = p_academic_level_id,
           GroupId = p_group_id,
           SectionId = p_section_id,
           Medium = NULLIF(TRIM((p_medium COLLATE utf8mb4_unicode_ci)), ''),
           SecondLanguage = NULLIF(TRIM((p_second_language COLLATE utf8mb4_unicode_ci)), ''),
           PreviousSchool = NULLIF(TRIM((p_previous_school COLLATE utf8mb4_unicode_ci)), ''),
           PreviousBoard = NULLIF(TRIM((p_previous_board COLLATE utf8mb4_unicode_ci)), ''),
           PreviousYear = NULLIF(TRIM((p_previous_year COLLATE utf8mb4_unicode_ci)), ''),
           PreviousPercentage = p_previous_percentage,
           PreviousHallTicket = NULLIF(TRIM((p_previous_hall_ticket COLLATE utf8mb4_unicode_ci)), ''),
           UpdatedBy = p_updated_by,
           UpdatedAt = UTC_TIMESTAMP()
     WHERE AdmissionId = p_admission_id
       AND IsDeleted = 0;

    CALL sp_StudentAdmission_GetAcademicDetails(p_admission_id);
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_get`$$
CREATE PROCEDURE `sp_student_admission_fee_get`(IN p_admission_id BIGINT)
BEGIN
    SELECT
        sa.`AdmissionId`,
        COALESCE(fs.`tuition_fee`, 0.00) AS `TuitionFee`,
        COALESCE(NULLIF(fs.`admission_fee`, 0.00), NULLIF(sa.`AdmissionFeeAmount`, 0.00), 0.00) AS `AdmissionFee`,
        COALESCE(fs.`hostel_fee`, 0.00) AS `HostelFee`,
        COALESCE(fs.`transportation_fee`, 0.00) AS `TransportationFee`,
        COALESCE(fs.`scholarship_amount`, 0.00) AS `ScholarshipAmount`,
        GREATEST(COALESCE(fs.`tuition_fee`,0.00)
          + COALESCE(NULLIF(fs.`admission_fee`,0.00), NULLIF(sa.`AdmissionFeeAmount`,0.00),0.00)
          + COALESCE(fs.`hostel_fee`,0.00) + COALESCE(fs.`transportation_fee`,0.00)
          - COALESCE(fs.`scholarship_amount`,0.00), 0.00) AS `FirstYearTotal`,
        COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid`=1,sa.`AdmissionFeeAmount`,0.00),0.00) AS `AmountPaid`,
        GREATEST(COALESCE(fs.`tuition_fee`,0.00)
          + COALESCE(NULLIF(fs.`admission_fee`,0.00), NULLIF(sa.`AdmissionFeeAmount`,0.00),0.00)
          + COALESCE(fs.`hostel_fee`,0.00) + COALESCE(fs.`transportation_fee`,0.00)
          - COALESCE(fs.`scholarship_amount`,0.00)
          - COALESCE(fs.`amount_paid`,IF(sa.`AdmissionFeePaid`=1,sa.`AdmissionFeeAmount`,0.00),0.00),0.00) AS `BalanceAmount`,
        COALESCE(fs.`payment_plan`,'ONE_TIME') AS `PaymentPlan`,
        COALESCE(fs.`payment_status`,IF(sa.`AdmissionFeePaid`=1,'PAID','PENDING')) AS `PaymentStatus`,
        COALESCE(fs.`updated_at`,sa.`UpdatedAt`) AS `UpdatedAt`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_fee_structures` fs ON fs.`admission_id`=sa.`AdmissionId`
    WHERE sa.`AdmissionId`=p_admission_id AND sa.`IsDeleted`=0;
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_resolve_and_save`$$
CREATE PROCEDURE `sp_student_admission_fee_resolve_and_save`(
    IN p_admission_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_department_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_admission_type VARCHAR(50),
    IN p_resolved_admission_type VARCHAR(50),
    IN p_quota VARCHAR(100),
    IN p_student_category VARCHAR(100),
    IN p_hostel_required TINYINT,
    IN p_hostel_type VARCHAR(100),
    IN p_room_type VARCHAR(100),
    IN p_transport_required TINYINT,
    IN p_route_id BIGINT,
    IN p_route_code VARCHAR(50),
    IN p_route_name VARCHAR(150),
    IN p_scholarship_amount DECIMAL(12,2),
    IN p_payment_plan VARCHAR(50),
    IN p_payment_status VARCHAR(50),
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_department_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_semester_id BIGINT DEFAULT NULL;
    DECLARE v_effective_date DATE DEFAULT CURDATE();
    DECLARE v_admission_type VARCHAR(50) DEFAULT NULL;
    DECLARE v_quota VARCHAR(100) DEFAULT NULL;
    DECLARE v_student_category VARCHAR(100) DEFAULT NULL;

    DECLARE v_fee_master_id BIGINT DEFAULT NULL;
    DECLARE v_hostel_fee_master_id BIGINT DEFAULT NULL;
    DECLARE v_transport_fee_master_id BIGINT DEFAULT NULL;
    DECLARE v_tuition_fee DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_admission_fee DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_hostel_fee DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_transport_fee DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_scholarship DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_total DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_net DECIMAL(12,2) DEFAULT 0.00;

    SELECT COUNT(*) INTO v_exists
    FROM `studentadmissions`
    WHERE `AdmissionId` = p_admission_id
      AND `IsDeleted` = 0;

    IF v_exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student admission not found.';
    END IF;

    -- Resolve saved admission context first; request values override it.
    SELECT
        COALESCE(p_academic_year_id, sa.`AcademicYearId`, sec.`academic_year_id`),
        COALESCE(p_course_id, sec.`course_id`),
        COALESCE(p_department_id, sec.`department_id`),
        COALESCE(p_branch_id, sec.`branch_id`),
        COALESCE(p_semester_id, sec.`semester_id`),
        COALESCE(sa.`AdmissionDate`, sa.`RegistrationDate`, CURDATE()),
        COALESCE(NULLIF(TRIM((p_resolved_admission_type COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_admission_type COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM(sa.`AdmissionType`), '')),
        COALESCE(NULLIF(TRIM((p_quota COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM(sa.`AdmissionQuota`), '')),
        COALESCE(NULLIF(TRIM((p_student_category COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM(sa.`Category`), ''))
    INTO
        v_academic_year_id,
        v_course_id,
        v_department_id,
        v_branch_id,
        v_semester_id,
        v_effective_date,
        v_admission_type,
        v_quota,
        v_student_category
    FROM `studentadmissions` sa
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    WHERE sa.`AdmissionId` = p_admission_id
    LIMIT 1;

    -- Counseling maps to Regular unless EntryType/resolved value already supplied.
    IF LOWER(COALESCE(v_admission_type,'')) = 'counseling' THEN
        SET v_admission_type = 'Regular';
    END IF;

    -- Match the ACTIVE academic fee structure. Nullable master dimensions are wildcards.
    SELECT
        fm.`fee_master_id`, fm.`tuition_fee`, fm.`admission_fee`
    INTO
        v_fee_master_id, v_tuition_fee, v_admission_fee
    FROM `fee_master_structures` fm
    WHERE fm.`status` = 1
      AND (fm.`academic_year_id` IS NULL OR fm.`academic_year_id` = v_academic_year_id)
      AND (fm.`department_id` IS NULL OR fm.`department_id` = v_department_id)
      AND (fm.`course_id` IS NULL OR fm.`course_id` = v_course_id)
      AND (fm.`branch_id` IS NULL OR fm.`branch_id` = v_branch_id)
      AND (fm.`semester_id` IS NULL OR fm.`semester_id` = v_semester_id)
      AND (fm.`admission_type` IS NULL OR TRIM(fm.`admission_type`) = '' OR LOWER(TRIM(fm.`admission_type`)) = LOWER(TRIM(COALESCE(v_admission_type,''))))
      AND (fm.`quota` IS NULL OR TRIM(fm.`quota`) = '' OR LOWER(TRIM(fm.`quota`)) = LOWER(TRIM(COALESCE(v_quota,''))))
      AND (fm.`student_category` IS NULL OR TRIM(fm.`student_category`) = '' OR LOWER(TRIM(fm.`student_category`)) = LOWER(TRIM(COALESCE(v_student_category,''))))
      AND (fm.`effective_from` IS NULL OR fm.`effective_from` <= v_effective_date)
      AND (fm.`effective_to` IS NULL OR fm.`effective_to` >= v_effective_date)
    ORDER BY
      (fm.`academic_year_id` IS NOT NULL) DESC,
      (fm.`course_id` IS NOT NULL) DESC,
      (fm.`department_id` IS NOT NULL) DESC,
      (fm.`branch_id` IS NOT NULL) DESC,
      (fm.`semester_id` IS NOT NULL) DESC,
      (fm.`admission_type` IS NOT NULL AND TRIM(fm.`admission_type`) <> '') DESC,
      (fm.`quota` IS NOT NULL AND TRIM(fm.`quota`) <> '') DESC,
      (fm.`student_category` IS NOT NULL AND TRIM(fm.`student_category`) <> '') DESC,
      COALESCE(fm.`effective_from`, '1000-01-01') DESC,
      fm.`fee_master_id` DESC
    LIMIT 1;

    -- Hostel fee applies only when hostel is selected.
    IF COALESCE(p_hostel_required,0) = 1 THEN
        SELECT hm.`hostel_fee_master_id`, hm.`amount`
        INTO v_hostel_fee_master_id, v_hostel_fee
        FROM `hostel_fee_master` hm
        WHERE hm.`status` = 1
          AND (hm.`academic_year_id` IS NULL OR hm.`academic_year_id` = v_academic_year_id)
          AND (hm.`hostel_type` IS NULL OR TRIM(hm.`hostel_type`) = '' OR LOWER(TRIM(hm.`hostel_type`)) = LOWER(TRIM(COALESCE((p_hostel_type COLLATE utf8mb4_unicode_ci),''))))
          AND LOWER(REPLACE(REPLACE(TRIM(hm.`room_type`),' Bed Sharing',' Sharing'),'2 Sharing','Double Sharing'))
              = LOWER(REPLACE(REPLACE(TRIM(COALESCE((p_room_type COLLATE utf8mb4_unicode_ci),'')),' Bed Sharing',' Sharing'),'2 Sharing','Double Sharing'))
          AND (hm.`effective_from` IS NULL OR hm.`effective_from` <= v_effective_date)
          AND (hm.`effective_to` IS NULL OR hm.`effective_to` >= v_effective_date)
        ORDER BY
          (hm.`academic_year_id` IS NOT NULL) DESC,
          (hm.`hostel_type` IS NOT NULL AND TRIM(hm.`hostel_type`) <> '') DESC,
          COALESCE(hm.`effective_from`, '1000-01-01') DESC,
          hm.`hostel_fee_master_id` DESC
        LIMIT 1;
    ELSE
        SET v_hostel_fee = 0.00;
    END IF;

    -- Transport fee applies only when transportation is selected.
    IF COALESCE(p_transport_required,0) = 1 THEN
        SELECT tm.`transport_fee_master_id`, tm.`amount`
        INTO v_transport_fee_master_id, v_transport_fee
        FROM `transport_fee_master` tm
        WHERE tm.`status` = 1
          AND (tm.`academic_year_id` IS NULL OR tm.`academic_year_id` = v_academic_year_id)
          AND (
                (p_route_id IS NOT NULL AND tm.`route_id` = p_route_id)
             OR (NULLIF(TRIM((p_route_code COLLATE utf8mb4_unicode_ci)),'') IS NOT NULL AND LOWER(TRIM(tm.`route_code`)) = LOWER(TRIM((p_route_code COLLATE utf8mb4_unicode_ci))))
             OR (NULLIF(TRIM((p_route_name COLLATE utf8mb4_unicode_ci)),'') IS NOT NULL AND LOWER(TRIM(tm.`route_name`)) = LOWER(TRIM((p_route_name COLLATE utf8mb4_unicode_ci))))
          )
          AND (tm.`effective_from` IS NULL OR tm.`effective_from` <= v_effective_date)
          AND (tm.`effective_to` IS NULL OR tm.`effective_to` >= v_effective_date)
        ORDER BY
          (tm.`academic_year_id` IS NOT NULL) DESC,
          COALESCE(tm.`effective_from`, '1000-01-01') DESC,
          tm.`transport_fee_master_id` DESC
        LIMIT 1;
    ELSE
        SET v_transport_fee = 0.00;
    END IF;

    SET v_scholarship = GREATEST(COALESCE(p_scholarship_amount,0.00),0.00);
    SET v_total = COALESCE(v_tuition_fee,0.00) + COALESCE(v_admission_fee,0.00)
                + COALESCE(v_hostel_fee,0.00) + COALESCE(v_transport_fee,0.00);
    SET v_net = GREATEST(v_total - v_scholarship, 0.00);

    INSERT INTO `student_admission_service_selections` (
        `admission_id`,`hostel_required`,`hostel_type`,`room_type`,
        `transportation_required`,`route_id`,`route_code`,`route_name`,
        `created_by`,`updated_by`
    ) VALUES (
        p_admission_id, COALESCE(p_hostel_required,0), (p_hostel_type COLLATE utf8mb4_unicode_ci), (p_room_type COLLATE utf8mb4_unicode_ci),
        COALESCE(p_transport_required,0), p_route_id, (p_route_code COLLATE utf8mb4_unicode_ci), (p_route_name COLLATE utf8mb4_unicode_ci),
        p_updated_by, p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `hostel_required` = VALUES(`hostel_required`),
        `hostel_type` = VALUES(`hostel_type`),
        `room_type` = VALUES(`room_type`),
        `transportation_required` = VALUES(`transportation_required`),
        `route_id` = VALUES(`route_id`),
        `route_code` = VALUES(`route_code`),
        `route_name` = VALUES(`route_name`),
        `updated_by` = VALUES(`updated_by`),
        `updated_at` = CURRENT_TIMESTAMP;

    -- Reuse the existing admission-level fee table. No existing table/API is removed.
    INSERT INTO `student_admission_fee_structures` (
        `admission_id`,`tuition_fee`,`admission_fee`,`hostel_fee`,`transportation_fee`,
        `scholarship_amount`,`payment_plan`,`payment_status`,`created_by`,`updated_by`
    ) VALUES (
        p_admission_id,
        COALESCE(v_tuition_fee,0.00),
        COALESCE(v_admission_fee,0.00),
        COALESCE(v_hostel_fee,0.00),
        COALESCE(v_transport_fee,0.00),
        v_scholarship,
        COALESCE(NULLIF(TRIM((p_payment_plan COLLATE utf8mb4_unicode_ci)),''),'ONE_TIME'),
        COALESCE(NULLIF(TRIM((p_payment_status COLLATE utf8mb4_unicode_ci)),''),'PENDING'),
        p_updated_by,
        p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `tuition_fee` = VALUES(`tuition_fee`),
        `admission_fee` = VALUES(`admission_fee`),
        `hostel_fee` = VALUES(`hostel_fee`),
        `transportation_fee` = VALUES(`transportation_fee`),
        `scholarship_amount` = VALUES(`scholarship_amount`),
        `payment_plan` = VALUES(`payment_plan`),
        `payment_status` = VALUES(`payment_status`),
        `updated_by` = VALUES(`updated_by`),
        `updated_at` = CURRENT_TIMESTAMP;

    SELECT
        p_admission_id AS `AdmissionId`,
        v_fee_master_id AS `AcademicFeeMasterId`,
        v_hostel_fee_master_id AS `HostelFeeMasterId`,
        v_transport_fee_master_id AS `TransportFeeMasterId`,
        COALESCE(v_tuition_fee,0.00) AS `TuitionFee`,
        COALESCE(v_admission_fee,0.00) AS `AdmissionFee`,
        COALESCE(v_hostel_fee,0.00) AS `HostelFee`,
        COALESCE(v_transport_fee,0.00) AS `TransportationFee`,
        v_scholarship AS `ScholarshipAmount`,
        v_total AS `FirstYearTotal`,
        v_net AS `NetPayable`,
        CAST(COALESCE(p_hostel_required,0) AS UNSIGNED) AS `HostelRequired`,
        CAST(COALESCE(p_transport_required,0) AS UNSIGNED) AS `TransportationRequired`,
        COALESCE(v_admission_type,'') AS `ResolvedAdmissionType`,
        'FEE_MASTER_RESOLVER' AS `Source`,
        COALESCE(NULLIF(TRIM((p_payment_plan COLLATE utf8mb4_unicode_ci)),''),'ONE_TIME') AS `PaymentPlan`,
        COALESCE(NULLIF(TRIM((p_payment_status COLLATE utf8mb4_unicode_ci)),''),'PENDING') AS `PaymentStatus`;
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_structure_get`$$
CREATE PROCEDURE `sp_student_admission_fee_structure_get`(IN p_admission_id BIGINT)
BEGIN
    SELECT
        sa.`AdmissionId`,
        fs.`fee_structure_id` AS `FeeStructureId`,
        sa.`AcademicYearId`,
        sec.`course_id` AS `CourseId`,
        sec.`department_id` AS `DepartmentId`,
        sec.`branch_id` AS `BranchId`,
        sec.`semester_id` AS `SemesterId`,
        sa.`AdmissionType`,
        sa.`AdmissionQuota` AS `Quota`,
        sa.`Category` AS `StudentCategory`,
        COALESCE(sa.`AdmissionDate`, sa.`ApplicationDate`, sa.`RegistrationDate`) AS `EffectiveDate`,
        CASE WHEN sa.`AcademicYearId` IS NOT NULL AND sec.`course_id` IS NOT NULL
                  AND sec.`department_id` IS NOT NULL AND sec.`branch_id` IS NOT NULL
                  AND sec.`semester_id` IS NOT NULL THEN 1 ELSE 0 END AS `AcademicContextValid`,
        CASE WHEN fs.`fee_structure_id` IS NOT NULL THEN 'ASSIGNED_ADMISSION_FEE_STRUCTURE'
             ELSE 'ADMISSION_FALLBACK' END AS `Source`,
        COALESCE(fs.`tuition_fee`, 0.00) AS `TuitionFee`,
        COALESCE(NULLIF(fs.`admission_fee`, 0.00), NULLIF(sa.`AdmissionFeeAmount`, 0.00), 0.00) AS `AdmissionFee`,
        COALESCE(fs.`hostel_fee`, 0.00) AS `HostelFee`,
        COALESCE(fs.`transportation_fee`, 0.00) AS `TransportationFee`,
        COALESCE(fs.`scholarship_amount`, 0.00) AS `ScholarshipAmount`,
        COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid` = 1, sa.`AdmissionFeeAmount`, 0.00), 0.00) AS `AmountPaid`,
        GREATEST(COALESCE(fs.`tuition_fee`,0.00)
          + COALESCE(NULLIF(fs.`admission_fee`,0.00), NULLIF(sa.`AdmissionFeeAmount`,0.00),0.00)
          + COALESCE(fs.`hostel_fee`,0.00) + COALESCE(fs.`transportation_fee`,0.00)
          - COALESCE(fs.`scholarship_amount`,0.00), 0.00) AS `TotalFee`,
        GREATEST(COALESCE(fs.`tuition_fee`,0.00)
          + COALESCE(NULLIF(fs.`admission_fee`,0.00), NULLIF(sa.`AdmissionFeeAmount`,0.00),0.00)
          + COALESCE(fs.`hostel_fee`,0.00) + COALESCE(fs.`transportation_fee`,0.00)
          - COALESCE(fs.`scholarship_amount`,0.00)
          - COALESCE(fs.`amount_paid`, IF(sa.`AdmissionFeePaid`=1,sa.`AdmissionFeeAmount`,0.00),0.00), 0.00) AS `BalanceAmount`,
        COALESCE(fs.`payment_plan`, 'ONE_TIME') AS `PaymentPlan`,
        COALESCE(fs.`payment_status`, IF(sa.`AdmissionFeePaid`=1,'PAID','PENDING')) AS `PaymentStatus`,
        COALESCE(fs.`updated_at`, sa.`UpdatedAt`) AS `UpdatedAt`
    FROM `studentadmissions` sa
    LEFT JOIN `student_admission_fee_structures` fs ON fs.`admission_id` = sa.`AdmissionId`
    LEFT JOIN `sections` sec ON sec.`section_id` = sa.`SectionId`
    WHERE sa.`AdmissionId` = p_admission_id AND sa.`IsDeleted` = 0
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_fee_upsert`$$
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
        COALESCE(p_scholarship_amount, 0), COALESCE(NULLIF(TRIM((p_payment_plan COLLATE utf8mb4_unicode_ci)), ''), 'ONE_TIME'),
        COALESCE(NULLIF(UPPER(TRIM((p_payment_status COLLATE utf8mb4_unicode_ci))), ''), 'PENDING'),
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

DROP PROCEDURE IF EXISTS `sp_student_admission_form_data_upsert`$$
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
    IF (p_form_data COLLATE utf8mb4_unicode_ci) IS NULL OR JSON_VALID((p_form_data COLLATE utf8mb4_unicode_ci)) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission formData must be valid JSON.';
    END IF;

    INSERT INTO `student_admission_form_data` (
        `admission_id`, `form_data`, `created_at`, `created_by`, `updated_at`, `updated_by`
    ) VALUES (
        p_admission_id, CAST((p_form_data COLLATE utf8mb4_unicode_ci) AS JSON), UTC_TIMESTAMP(), p_updated_by,
        UTC_TIMESTAMP(), p_updated_by
    )
    ON DUPLICATE KEY UPDATE
        `form_data` = JSON_MERGE_PATCH(`form_data`, VALUES(`form_data`)),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_updated_by;
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_list`$$
CREATE PROCEDURE `sp_student_admission_list`(IN p_search VARCHAR(255), IN p_admission_status VARCHAR(50), IN p_page_number INT, IN p_page_size INT)
BEGIN
DECLARE v_offset INT;
SET p_page_number=GREATEST(COALESCE(p_page_number,1),1); SET p_page_size=LEAST(GREATEST(COALESCE(p_page_size,20),1),100);
SET v_offset=(p_page_number-1)*p_page_size;
SELECT v.*,COUNT(*) OVER() AS TotalRecords FROM vw_cms_admission_directory v WHERE IsDeleted=0 AND (NULLIF(TRIM((p_search COLLATE utf8mb4_unicode_ci)),'') IS NULL OR CONCAT_WS(' ',RegistrationNo,ApplicationNo,AdmissionNo,FirstName,LastName,StudentEmail,MobileNumber) LIKE CONCAT('%',TRIM((p_search COLLATE utf8mb4_unicode_ci)),'%'))
AND (NULLIF(TRIM((p_admission_status COLLATE utf8mb4_unicode_ci)),'') IS NULL OR REPLACE(UPPER(AdmissionStatus),' ','_')=REPLACE(UPPER((p_admission_status COLLATE utf8mb4_unicode_ci)),' ','_'))
ORDER BY CreatedAt DESC,AdmissionId DESC LIMIT p_page_size OFFSET v_offset;
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_get`$$
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

DROP PROCEDURE IF EXISTS `sp_student_admission_previous_education_upsert`$$
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
    SET v_level = UPPER(TRIM((p_qualification_level COLLATE utf8mb4_unicode_ci)));

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
        p_admission_id, v_level, NULLIF(TRIM((p_qualification COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_board_or_university COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_institution COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_roll_number COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_passing_year COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_stream COLLATE utf8mb4_unicode_ci)), ''), p_score, UTC_TIMESTAMP(), p_updated_by,
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

DROP PROCEDURE IF EXISTS `sp_student_admission_submit`$$
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

DROP PROCEDURE IF EXISTS `sp_student_code_exists`$$
CREATE PROCEDURE `sp_student_code_exists`(
    IN p_student_code VARCHAR(50),
    IN p_exclude_student_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM students
        WHERE student_code = TRIM((p_student_code COLLATE utf8mb4_unicode_ci))
          AND deleted_at IS NULL
          AND (p_exclude_student_id IS NULL OR student_id <> p_exclude_student_id)
    ) AS exists_value;
END$$

DROP PROCEDURE IF EXISTS `sp_student_create`$$
CREATE PROCEDURE `sp_student_create`(
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

    IF TRIM(IFNULL((p_student_code COLLATE utf8mb4_unicode_ci), '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code is required.';
    END IF;

    IF TRIM(IFNULL((p_full_name COLLATE utf8mb4_unicode_ci), '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;

    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF EXISTS(
        SELECT 1 FROM students
        WHERE student_code = TRIM((p_student_code COLLATE utf8mb4_unicode_ci))
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
        UPPER(TRIM((p_student_code COLLATE utf8mb4_unicode_ci))),
        TRIM((p_full_name COLLATE utf8mb4_unicode_ci)),
        NULLIF(TRIM((p_gender COLLATE utf8mb4_unicode_ci)), ''),
        p_date_of_birth,
        NULLIF(TRIM((p_email COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_mobile COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_blood_group COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_address COLLATE utf8mb4_unicode_ci)), ''),
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

DROP PROCEDURE IF EXISTS `sp_student_documents_get_by_student_id`$$
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

DROP PROCEDURE IF EXISTS `sp_student_document_create`$$
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
    IF NULLIF(TRIM((p_document_type COLLATE utf8mb4_unicode_ci)), '') IS NULL
       OR NULLIF(TRIM((p_file_name COLLATE utf8mb4_unicode_ci)), '') IS NULL
       OR NULLIF(TRIM((p_file_path COLLATE utf8mb4_unicode_ci)), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Document type, file name and file path are required.';
    END IF;

    INSERT INTO `student_document_files` (
        `student_id`, `document_type`, `file_name`, `file_path`,
        `content_type`, `file_size`, `uploaded_date`, `created_by`
    ) VALUES (
        p_student_id, TRIM((p_document_type COLLATE utf8mb4_unicode_ci)), TRIM((p_file_name COLLATE utf8mb4_unicode_ci)), TRIM((p_file_path COLLATE utf8mb4_unicode_ci)),
        NULLIF(TRIM((p_content_type COLLATE utf8mb4_unicode_ci)), ''), p_file_size, UTC_TIMESTAMP(), p_created_by
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

DROP PROCEDURE IF EXISTS `sp_student_document_delete`$$
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

DROP PROCEDURE IF EXISTS `sp_student_document_get_by_id`$$
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

DROP PROCEDURE IF EXISTS `sp_student_get_all`$$
CREATE PROCEDURE `sp_student_get_all`(
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

DROP PROCEDURE IF EXISTS `sp_student_get_by_id`$$
CREATE PROCEDURE `sp_student_get_by_id`(
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

DROP PROCEDURE IF EXISTS `sp_student_profile_full_update`$$
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
    IF NULLIF(TRIM((p_full_name COLLATE utf8mb4_unicode_ci)), '') IS NULL THEN
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
            p_student_id, (p_blood_group COLLATE utf8mb4_unicode_ci), (p_address COLLATE utf8mb4_unicode_ci), 1, 0,
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
    SET `full_name` = TRIM((p_full_name COLLATE utf8mb4_unicode_ci)),
        `gender` = COALESCE(NULLIF(TRIM((p_gender COLLATE utf8mb4_unicode_ci)), ''), `gender`),
        `date_of_birth` = COALESCE(p_date_of_birth, `date_of_birth`),
        `email` = COALESCE(NULLIF(TRIM((p_email COLLATE utf8mb4_unicode_ci)), ''), `email`),
        `mobile` = COALESCE(NULLIF(TRIM((p_mobile COLLATE utf8mb4_unicode_ci)), ''), `mobile`),
        `blood_group` = COALESCE(NULLIF(TRIM((p_blood_group COLLATE utf8mb4_unicode_ci)), ''), `blood_group`),
        `address` = COALESCE(NULLIF(TRIM((p_address COLLATE utf8mb4_unicode_ci)), ''), `address`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_changed_by
    WHERE `student_id` = p_student_id AND `college_id` = p_college_id;

    UPDATE `student_profiles`
    SET `BloodGroup` = COALESCE(NULLIF(TRIM((p_blood_group COLLATE utf8mb4_unicode_ci)), ''), `BloodGroup`),
        `Address` = COALESCE(NULLIF(TRIM((p_address COLLATE utf8mb4_unicode_ci)), ''), `Address`),
        `UpdatedBy` = p_changed_by,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `StudentProfileId` = v_profile_id;

    INSERT INTO `student_parents` (
        `student_id`, `father_name`, `father_mobile`, `father_email`,
        `father_occupation`, `mother_name`, `mother_mobile`, `mother_email`,
        `mother_occupation`, `created_at`, `updated_at`
    ) VALUES (
        p_student_id, NULLIF(TRIM((p_father_name COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_father_mobile COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_father_email COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_father_occupation COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_mother_name COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_mother_mobile COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_mother_email COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_mother_occupation COLLATE utf8mb4_unicode_ci)), ''),
        UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        `father_name` = COALESCE(NULLIF(TRIM((p_father_name COLLATE utf8mb4_unicode_ci)), ''), `father_name`),
        `father_mobile` = COALESCE(NULLIF(TRIM((p_father_mobile COLLATE utf8mb4_unicode_ci)), ''), `father_mobile`),
        `father_email` = COALESCE(NULLIF(TRIM((p_father_email COLLATE utf8mb4_unicode_ci)), ''), `father_email`),
        `father_occupation` = COALESCE(NULLIF(TRIM((p_father_occupation COLLATE utf8mb4_unicode_ci)), ''), `father_occupation`),
        `mother_name` = COALESCE(NULLIF(TRIM((p_mother_name COLLATE utf8mb4_unicode_ci)), ''), `mother_name`),
        `mother_mobile` = COALESCE(NULLIF(TRIM((p_mother_mobile COLLATE utf8mb4_unicode_ci)), ''), `mother_mobile`),
        `mother_email` = COALESCE(NULLIF(TRIM((p_mother_email COLLATE utf8mb4_unicode_ci)), ''), `mother_email`),
        `mother_occupation` = COALESCE(NULLIF(TRIM((p_mother_occupation COLLATE utf8mb4_unicode_ci)), ''), `mother_occupation`),
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
        COALESCE(NULLIF(TRIM((p_change_reason COLLATE utf8mb4_unicode_ci)), ''), 'Student profile updated from the profile screen.'),
        'API', p_changed_by, UTC_TIMESTAMP(6),
        LEFT((p_ip_address COLLATE utf8mb4_unicode_ci), 45), LEFT((p_user_agent COLLATE utf8mb4_unicode_ci), 500)
    );

    COMMIT;
    SELECT 1 AS `Updated`;
END$$

DROP PROCEDURE IF EXISTS `sp_student_profile_get_all`$$
CREATE PROCEDURE `sp_student_profile_get_all`(
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
        (p_college_id=0 OR s.college_id = p_college_id)
        AND s.deleted_at IS NULL

        -- Search
        AND
        (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL
            OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''

            OR s.full_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR s.student_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR s.mobile LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR s.email LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR sa.RegistrationNo LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR sa.AdmissionNo LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
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

DROP PROCEDURE IF EXISTS `sp_student_profile_get_preview`$$
CREATE PROCEDURE `sp_student_profile_get_preview`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT
)
BEGIN

    SELECT
        (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id) AS FrontendFormDataJson,

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

DROP PROCEDURE IF EXISTS `sp_student_profile_personal_get`$$
CREATE PROCEDURE `sp_student_profile_personal_get`(
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
        sp.HouseNumber AS house_number,
        sp.PermanentHouseNumber AS permanent_house_number,
        sp.PermanentAddress AS permanent_address,
        sp.PermanentPincode AS permanent_pincode,
        sp.PermanentCity AS permanent_city,
        sp.PermanentDistrict AS permanent_district,
        sp.PermanentState AS permanent_state,
        sp.PermanentCountry AS permanent_country,

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

DROP PROCEDURE IF EXISTS `sp_student_profile_personal_update`$$
CREATE PROCEDURE `sp_student_profile_personal_update`(
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

    IF (p_full_name COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_full_name COLLATE utf8mb4_unicode_ci) <=> v_old_full_name) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'FullName');
        SET v_old_values = JSON_SET(v_old_values, '$.FullName', v_old_full_name);
        SET v_new_values = JSON_SET(v_new_values, '$.FullName', (p_full_name COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_gender COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_gender COLLATE utf8mb4_unicode_ci) <=> v_old_gender) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Gender');
        SET v_old_values = JSON_SET(v_old_values, '$.Gender', v_old_gender);
        SET v_new_values = JSON_SET(v_new_values, '$.Gender', (p_gender COLLATE utf8mb4_unicode_ci));
    END IF;
    IF p_date_of_birth IS NOT NULL AND NOT (p_date_of_birth <=> v_old_date_of_birth) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'DateOfBirth');
        SET v_old_values = JSON_SET(v_old_values, '$.DateOfBirth', v_old_date_of_birth);
        SET v_new_values = JSON_SET(v_new_values, '$.DateOfBirth', p_date_of_birth);
    END IF;
    IF (p_email COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_email COLLATE utf8mb4_unicode_ci) <=> v_old_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Email');
        SET v_old_values = JSON_SET(v_old_values, '$.Email', v_old_email);
        SET v_new_values = JSON_SET(v_new_values, '$.Email', (p_email COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_mobile COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_mobile COLLATE utf8mb4_unicode_ci) <=> v_old_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Mobile');
        SET v_old_values = JSON_SET(v_old_values, '$.Mobile', v_old_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.Mobile', (p_mobile COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_profile_photo COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_profile_photo COLLATE utf8mb4_unicode_ci) <=> v_old_profile_photo) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'ProfilePhoto');
        SET v_old_values = JSON_SET(v_old_values, '$.ProfilePhoto', v_old_profile_photo);
        SET v_new_values = JSON_SET(v_new_values, '$.ProfilePhoto', (p_profile_photo COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_alternate_email COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_alternate_email COLLATE utf8mb4_unicode_ci) <=> v_old_alternate_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateEmail');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateEmail', v_old_alternate_email);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateEmail', (p_alternate_email COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_alternate_mobile COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_alternate_mobile COLLATE utf8mb4_unicode_ci) <=> v_old_alternate_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateMobile');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateMobile', v_old_alternate_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateMobile', (p_alternate_mobile COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_blood_group COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_blood_group COLLATE utf8mb4_unicode_ci) <=> v_old_blood_group) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'BloodGroup');
        SET v_old_values = JSON_SET(v_old_values, '$.BloodGroup', v_old_blood_group);
        SET v_new_values = JSON_SET(v_new_values, '$.BloodGroup', (p_blood_group COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_nationality COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_nationality COLLATE utf8mb4_unicode_ci) <=> v_old_nationality) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Nationality');
        SET v_old_values = JSON_SET(v_old_values, '$.Nationality', v_old_nationality);
        SET v_new_values = JSON_SET(v_new_values, '$.Nationality', (p_nationality COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_religion COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_religion COLLATE utf8mb4_unicode_ci) <=> v_old_religion) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Religion');
        SET v_old_values = JSON_SET(v_old_values, '$.Religion', v_old_religion);
        SET v_new_values = JSON_SET(v_new_values, '$.Religion', (p_religion COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_category COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_category COLLATE utf8mb4_unicode_ci) <=> v_old_category) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Category');
        SET v_old_values = JSON_SET(v_old_values, '$.Category', v_old_category);
        SET v_new_values = JSON_SET(v_new_values, '$.Category', (p_category COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_address COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_address COLLATE utf8mb4_unicode_ci) <=> v_old_address) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Address');
        SET v_old_values = JSON_SET(v_old_values, '$.Address', v_old_address);
        SET v_new_values = JSON_SET(v_new_values, '$.Address', (p_address COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_city COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_city COLLATE utf8mb4_unicode_ci) <=> v_old_city) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'City');
        SET v_old_values = JSON_SET(v_old_values, '$.City', v_old_city);
        SET v_new_values = JSON_SET(v_new_values, '$.City', (p_city COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_district COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_district COLLATE utf8mb4_unicode_ci) <=> v_old_district) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'District');
        SET v_old_values = JSON_SET(v_old_values, '$.District', v_old_district);
        SET v_new_values = JSON_SET(v_new_values, '$.District', (p_district COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_state COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_state COLLATE utf8mb4_unicode_ci) <=> v_old_state) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'State');
        SET v_old_values = JSON_SET(v_old_values, '$.State', v_old_state);
        SET v_new_values = JSON_SET(v_new_values, '$.State', (p_state COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_country COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_country COLLATE utf8mb4_unicode_ci) <=> v_old_country) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Country');
        SET v_old_values = JSON_SET(v_old_values, '$.Country', v_old_country);
        SET v_new_values = JSON_SET(v_new_values, '$.Country', (p_country COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_pincode COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_pincode COLLATE utf8mb4_unicode_ci) <=> v_old_pincode) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Pincode');
        SET v_old_values = JSON_SET(v_old_values, '$.Pincode', v_old_pincode);
        SET v_new_values = JSON_SET(v_new_values, '$.Pincode', (p_pincode COLLATE utf8mb4_unicode_ci));
    END IF;

    IF JSON_LENGTH(v_changed_fields) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No personal-information values changed.';
    END IF;

    UPDATE students
    SET
        full_name = COALESCE((p_full_name COLLATE utf8mb4_unicode_ci), full_name),
        gender = COALESCE((p_gender COLLATE utf8mb4_unicode_ci), gender),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        email = COALESCE((p_email COLLATE utf8mb4_unicode_ci), email),
        mobile = COALESCE((p_mobile COLLATE utf8mb4_unicode_ci), mobile),
        blood_group = COALESCE((p_blood_group COLLATE utf8mb4_unicode_ci), blood_group),
        address = COALESCE((p_address COLLATE utf8mb4_unicode_ci), address),
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
            p_student_id, (p_profile_photo COLLATE utf8mb4_unicode_ci), (p_alternate_email COLLATE utf8mb4_unicode_ci), (p_alternate_mobile COLLATE utf8mb4_unicode_ci),
            (p_blood_group COLLATE utf8mb4_unicode_ci), (p_nationality COLLATE utf8mb4_unicode_ci), (p_religion COLLATE utf8mb4_unicode_ci), (p_category COLLATE utf8mb4_unicode_ci), (p_address COLLATE utf8mb4_unicode_ci),
            (p_city COLLATE utf8mb4_unicode_ci), (p_district COLLATE utf8mb4_unicode_ci), (p_state COLLATE utf8mb4_unicode_ci), COALESCE((p_country COLLATE utf8mb4_unicode_ci), 'India'), (p_pincode COLLATE utf8mb4_unicode_ci),
            1, 0, p_changed_by, UTC_TIMESTAMP()
        );

        SET v_profile_id = LAST_INSERT_ID();
    ELSE
        UPDATE student_profiles
        SET
            ProfilePhoto = COALESCE((p_profile_photo COLLATE utf8mb4_unicode_ci), ProfilePhoto),
            AlternateEmail = COALESCE((p_alternate_email COLLATE utf8mb4_unicode_ci), AlternateEmail),
            AlternateMobile = COALESCE((p_alternate_mobile COLLATE utf8mb4_unicode_ci), AlternateMobile),
            BloodGroup = COALESCE((p_blood_group COLLATE utf8mb4_unicode_ci), BloodGroup),
            Nationality = COALESCE((p_nationality COLLATE utf8mb4_unicode_ci), Nationality),
            Religion = COALESCE((p_religion COLLATE utf8mb4_unicode_ci), Religion),
            Category = COALESCE((p_category COLLATE utf8mb4_unicode_ci), Category),
            Address = COALESCE((p_address COLLATE utf8mb4_unicode_ci), Address),
            City = COALESCE((p_city COLLATE utf8mb4_unicode_ci), City),
            District = COALESCE((p_district COLLATE utf8mb4_unicode_ci), District),
            State = COALESCE((p_state COLLATE utf8mb4_unicode_ci), State),
            Country = COALESCE((p_country COLLATE utf8mb4_unicode_ci), Country),
            Pincode = COALESCE((p_pincode COLLATE utf8mb4_unicode_ci), Pincode),
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
        NULLIF(TRIM((p_change_reason COLLATE utf8mb4_unicode_ci)), ''),
        'Profile API',
        p_changed_by,
        UTC_TIMESTAMP(6),
        (p_ip_address COLLATE utf8mb4_unicode_ci),
        (p_user_agent COLLATE utf8mb4_unicode_ci)
    );

    COMMIT;

    CALL sp_student_profile_personal_get(p_student_id);
END$$

DROP PROCEDURE IF EXISTS `sp_student_promote`$$
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
          AND al.level_type = (v_course_type COLLATE utf8mb4_unicode_ci)
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

DROP PROCEDURE IF EXISTS `sp_student_promotion_dashboard`$$
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

DROP PROCEDURE IF EXISTS `sp_student_promotion_directory`$$
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
      AND (NULLIF(TRIM((p_search COLLATE utf8mb4_unicode_ci)), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%'))
    ORDER BY s.`full_name`, s.`student_id`
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `students` s
    WHERE s.`status` = 1 AND s.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (p_academic_year_id IS NULL OR s.`academic_year_id` = p_academic_year_id)
      AND (p_course_id IS NULL OR s.`course_id` = p_course_id)
      AND (p_branch_id IS NULL OR s.`branch_id` = p_branch_id)
      AND (NULLIF(TRIM((p_search COLLATE utf8mb4_unicode_ci)), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%'));
END$$

DROP PROCEDURE IF EXISTS `sp_student_promotion_get_by_id`$$
CREATE PROCEDURE `sp_student_promotion_get_by_id`(
    IN p_promotion_id BIGINT
)
BEGIN
    SELECT
        p.promotion_id,
        p.student_id,
        s.student_code,
        s.full_name AS student_name,
        COALESCE(p.college_id, s.college_id) AS college_id,
        p.from_academic_year_id,
        fay.academic_year_name AS from_academic_year_name,
        p.to_academic_year_id,
        tay.academic_year_name AS to_academic_year_name,
        p.from_course_id,
        fc.course_name AS from_course_name,
        p.to_course_id,
        tc.course_name AS to_course_name,
        p.from_branch_id,
        fb.branch_name AS from_branch_name,
        p.to_branch_id,
        tb.branch_name AS to_branch_name,
        p.from_semester,
        p.to_semester,
        p.from_section_id,
        fs.section_name AS from_section_name,
        p.to_section_id,
        ts.section_name AS to_section_name,
        p.promotion_status,
        p.decision,
        p.decision_date,
        p.decision_by,
        u.full_name AS decision_by_name,
        p.promotion_type,
        p.promotion_date,
        p.effective_date,
        p.promotion_reason,
        p.remarks,
        p.is_final,
        p.promotion_order,
        p.created_at,
        p.created_by
    FROM student_promotions p
    INNER JOIN students s
        ON s.student_id = p.student_id
    INNER JOIN academicyears fay
        ON fay.academic_year_id = p.from_academic_year_id
    INNER JOIN academicyears tay
        ON tay.academic_year_id = p.to_academic_year_id
    LEFT JOIN courses fc
        ON fc.course_id = p.from_course_id
    LEFT JOIN courses tc
        ON tc.course_id = p.to_course_id
    LEFT JOIN branches fb
        ON fb.branch_id = p.from_branch_id
    LEFT JOIN branches tb
        ON tb.branch_id = p.to_branch_id
    LEFT JOIN sections fs
        ON fs.section_id = p.from_section_id
    LEFT JOIN sections ts
        ON ts.section_id = p.to_section_id
    LEFT JOIN users u
        ON u.user_id = p.decision_by
    WHERE p.promotion_id = p_promotion_id
      AND p.deleted_at IS NULL
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_student_promotion_get_eligible`$$
CREATE PROCEDURE `sp_student_promotion_get_eligible`(
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
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL
            OR (p_search COLLATE utf8mb4_unicode_ci) = ''

            OR st.student_code LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR st.full_name LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR st.email LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR st.mobile LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR sa.RegistrationNo LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR sa.AdmissionNo LIKE CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
        )

    ORDER BY
        st.full_name ASC;

END$$

DROP PROCEDURE IF EXISTS `sp_student_promotion_get_failed_detained`$$
CREATE PROCEDURE `sp_student_promotion_get_failed_detained`(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester INT,
    IN p_search VARCHAR(150),
    IN p_outcome VARCHAR(20)
)
BEGIN

    /*
        Validate outcome
    */

    IF (p_outcome COLLATE utf8mb4_unicode_ci) NOT IN
    (
        'FAILED',
        'DETAINED'
    )
    THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Invalid outcome.';

    END IF;


    /*
        Validate academic year
    */

    IF NOT EXISTS
    (
        SELECT 1
        FROM academicyears ay
        WHERE ay.academic_year_id =
              p_academic_year_id

          AND ay.deleted_at IS NULL
    )
    THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Academic year does not exist.';

    END IF;


    /*
        Get failed / detained students
    */

    SELECT

        sp.promotion_id
            AS PromotionId,

        st.student_id
            AS StudentId,

        st.student_code
            AS StudentCode,

        st.full_name
            AS StudentName,

        st.email
            AS Email,

        st.mobile
            AS Mobile,

        st.college_id
            AS CollegeId,

        sp.from_academic_year_id
            AS AcademicYearId,

        ay.academic_year_name
            AS AcademicYearName,

        sp.from_course_id
            AS CourseId,

        c.course_code
            AS CourseCode,

        c.course_name
            AS CourseName,

        sp.from_branch_id
            AS BranchId,

        b.branch_code
            AS BranchCode,

        b.branch_name
            AS BranchName,

        sp.from_section_id
            AS SectionId,

        sec.section_name
            AS SectionName,

        sp.from_semester
            AS Semester,

        sp.attendance_percentage
            AS AttendancePercentage,

        sp.total_marks
            AS TotalMarks,

        sp.obtained_marks
            AS ObtainedMarks,

        sp.marks_percentage
            AS MarksPercentage,

        sp.passed_subjects
            AS PassedSubjects,

        sp.failed_subjects
            AS FailedSubjects,

        sp.backlog_count
            AS BacklogCount,

        sp.promotion_eligibility
            AS PromotionEligibility,

        sp.promotion_type
            AS PromotionType,

        sp.eligibility_remarks
            AS EligibilityRemarks,

        sp.remarks
            AS Remarks,

        (p_outcome COLLATE utf8mb4_unicode_ci)
            AS Outcome

    FROM student_promotions sp

    INNER JOIN students st
        ON st.student_id =
           sp.student_id

       AND st.deleted_at IS NULL

       AND st.status = 1

    INNER JOIN academicyears ay
        ON ay.academic_year_id =
           sp.from_academic_year_id

       AND ay.deleted_at IS NULL

    LEFT JOIN courses c
        ON c.course_id =
           sp.from_course_id

       AND c.deleted_at IS NULL

    LEFT JOIN branches b
        ON b.branch_id =
           sp.from_branch_id

       AND b.deleted_at IS NULL

    LEFT JOIN sections sec
        ON sec.section_id =
           sp.from_section_id

       AND sec.deleted_at IS NULL

    WHERE

        /*
            College isolation
        */

        sp.college_id =
            p_college_id

        /*
            Academic year
        */

        AND sp.from_academic_year_id =
            p_academic_year_id

        /*
            Ignore deleted promotion records
        */

        AND sp.deleted_at IS NULL

        /*
            Active promotion record
        */

        AND sp.is_active = 1

        /*
            Optional course
        */

        AND
        (
            p_course_id IS NULL

            OR sp.from_course_id =
               p_course_id
        )

        /*
            Optional branch
        */

        AND
        (
            p_branch_id IS NULL

            OR sp.from_branch_id =
               p_branch_id
        )

        /*
            Optional semester
        */

        AND
        (
            p_semester IS NULL

            OR sp.from_semester =
               p_semester
        )

        /*
            Search
        */

        AND
        (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL

            OR (p_search COLLATE utf8mb4_unicode_ci) = ''

            OR st.student_code LIKE
               CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR st.full_name LIKE
               CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR st.email LIKE
               CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')

            OR st.mobile LIKE
               CONCAT('%', (p_search COLLATE utf8mb4_unicode_ci), '%')
        )

        /*
            FAILED
        */

        AND
        (
            (
                (p_outcome COLLATE utf8mb4_unicode_ci) = 'FAILED'

                AND
                (
                    UPPER(
                        COALESCE(
                            sp.promotion_eligibility,
                            ''
                        )
                    ) = 'FAILED'

                    OR COALESCE(
                        sp.failed_subjects,
                        0
                    ) > 0
                )
            )

            OR

            /*
                DETAINED
            */

            (
                (p_outcome COLLATE utf8mb4_unicode_ci) = 'DETAINED'

                AND
                (
                    UPPER(
                        COALESCE(
                            sp.promotion_eligibility,
                            ''
                        )
                    ) = 'DETAINED'

                    OR UPPER(
                        COALESCE(
                            sp.promotion_type,
                            ''
                        )
                    ) = 'DETAINED'
                )
            )
        )

    ORDER BY
        st.full_name ASC,
        sp.promotion_id DESC;

END$$

DROP PROCEDURE IF EXISTS `sp_student_promotion_get_history`$$
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

DROP PROCEDURE IF EXISTS `sp_student_promotion_history_directory`$$
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
      AND (NULLIF(TRIM((p_search COLLATE utf8mb4_unicode_ci)), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%'))
      AND (NULLIF(TRIM((p_status COLLATE utf8mb4_unicode_ci)), '') IS NULL OR UPPER((p_status COLLATE utf8mb4_unicode_ci)) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM((p_status COLLATE utf8mb4_unicode_ci))))
    ORDER BY sp.`created_at` DESC, sp.`promotion_id` DESC
    LIMIT p_page_size OFFSET v_offset;

    SELECT COUNT(*) AS `TotalRecords`
    FROM `student_promotions` sp
    INNER JOIN `students` s ON s.`student_id` = sp.`student_id`
    WHERE sp.`deleted_at` IS NULL
      AND (p_college_id IS NULL OR s.`college_id` = p_college_id)
      AND (NULLIF(TRIM((p_search COLLATE utf8mb4_unicode_ci)), '') IS NULL
           OR s.`student_code` LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
           OR s.`full_name` LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%'))
      AND (NULLIF(TRIM((p_status COLLATE utf8mb4_unicode_ci)), '') IS NULL OR UPPER((p_status COLLATE utf8mb4_unicode_ci)) = 'ALL'
           OR sp.`promotion_status` = UPPER(TRIM((p_status COLLATE utf8mb4_unicode_ci))));
END$$

DROP PROCEDURE IF EXISTS `sp_student_search`$$
CREATE PROCEDURE `sp_student_search`(
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
    SET v_search = CONCAT('%', TRIM(IFNULL((p_query COLLATE utf8mb4_unicode_ci), '')), '%');

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

DROP PROCEDURE IF EXISTS `sp_student_update`$$
CREATE PROCEDURE `sp_student_update`(
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

    IF TRIM(IFNULL((p_student_code COLLATE utf8mb4_unicode_ci), '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student code is required.';
    END IF;

    IF TRIM(IFNULL((p_full_name COLLATE utf8mb4_unicode_ci), '')) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;

    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF EXISTS(
        SELECT 1 FROM students
        WHERE student_code = TRIM((p_student_code COLLATE utf8mb4_unicode_ci))
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
        student_code = UPPER(TRIM((p_student_code COLLATE utf8mb4_unicode_ci))),
        full_name = TRIM((p_full_name COLLATE utf8mb4_unicode_ci)),
        gender = NULLIF(TRIM((p_gender COLLATE utf8mb4_unicode_ci)), ''),
        date_of_birth = p_date_of_birth,
        email = NULLIF(TRIM((p_email COLLATE utf8mb4_unicode_ci)), ''),
        mobile = NULLIF(TRIM((p_mobile COLLATE utf8mb4_unicode_ci)), ''),
        blood_group = NULLIF(TRIM((p_blood_group COLLATE utf8mb4_unicode_ci)), ''),
        address = NULLIF(TRIM((p_address COLLATE utf8mb4_unicode_ci)), ''),
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

DROP PROCEDURE IF EXISTS `sp_student_update_status`$$
CREATE PROCEDURE `sp_student_update_status`(
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

DROP PROCEDURE IF EXISTS `sp_student_validate_references`$$
CREATE PROCEDURE `sp_student_validate_references`(
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

DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_Add`$$
CREATE PROCEDURE `sp_SubjectAssignment_Add`(
    IN p_subject_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_subject_id IS NULL OR p_subject_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject ID is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM subject_semester_assignments
        WHERE subject_id = p_subject_id
          AND semester_id = p_semester_id
          AND status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Subject is already assigned to this semester.';
    END IF;

    INSERT INTO subject_semester_assignments
    (
        subject_id,
        semester_id,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_subject_id,
        p_semester_id,
        1,
        NOW(),
        p_created_by
    );

    SELECT *
    FROM subject_semester_assignments
    WHERE subject_semester_assignment_id =
          LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_Edit`$$
CREATE PROCEDURE `sp_SubjectAssignment_Edit`(
    IN p_subject_semester_assignment_id BIGINT,
    IN p_subject_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM subject_semester_assignments
        WHERE subject_semester_assignment_id =
              p_subject_semester_assignment_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject assignment not found.';
    END IF;

    IF p_subject_id IS NULL OR p_subject_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject ID is required.';
    END IF;

    IF p_semester_id IS NULL OR p_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Semester ID is required.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM subject_semester_assignments
        WHERE subject_id = p_subject_id
          AND semester_id = p_semester_id
          AND subject_semester_assignment_id <>
              p_subject_semester_assignment_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Subject is already assigned to this semester.';
    END IF;

    UPDATE subject_semester_assignments
    SET
        subject_id = p_subject_id,
        semester_id = p_semester_id,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE subject_semester_assignment_id =
          p_subject_semester_assignment_id;

    CALL sp_SubjectAssignment_GetById(
        p_subject_semester_assignment_id
    );
END$$

DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_GetById`$$
CREATE PROCEDURE `sp_SubjectAssignment_GetById`(
    IN p_subject_semester_assignment_id BIGINT
)
BEGIN
    SELECT
        subject_semester_assignment_id,
        subject_id,
        semester_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM subject_semester_assignments
    WHERE subject_semester_assignment_id =
          p_subject_semester_assignment_id
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_List`$$
CREATE PROCEDURE `sp_SubjectAssignment_List`()
BEGIN
    SELECT
        subject_semester_assignment_id,
        subject_id,
        semester_id,
        status,
        created_at,
        created_by,
        updated_at,
        updated_by
    FROM subject_semester_assignments
    ORDER BY subject_id ASC, semester_id ASC;
END$$

DROP PROCEDURE IF EXISTS `sp_SubjectAssignment_UpdateStatus`$$
CREATE PROCEDURE `sp_SubjectAssignment_UpdateStatus`(
    IN p_subject_semester_assignment_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF p_status NOT IN (0, 1) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Status must be 0 or 1.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM subject_semester_assignments
        WHERE subject_semester_assignment_id =
              p_subject_semester_assignment_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject assignment not found.';
    END IF;

    UPDATE subject_semester_assignments
    SET
        status = p_status,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE subject_semester_assignment_id =
          p_subject_semester_assignment_id;

    SELECT *
    FROM subject_semester_assignments
    WHERE subject_semester_assignment_id =
          p_subject_semester_assignment_id;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateCollegeLogo`$$
CREATE PROCEDURE `sp_UpdateCollegeLogo`(
    IN p_Id BIGINT,
    IN p_LogoPath VARCHAR(500)
)
BEGIN
    UPDATE Colleges
    SET LogoPath = (p_LogoPath COLLATE utf8mb4_unicode_ci)
    WHERE Id = p_Id;

    SELECT ROW_COUNT() AS RowsAffected;
END$$

DROP PROCEDURE IF EXISTS `sp_UpdateRole`$$
CREATE PROCEDURE `sp_UpdateRole`(
    IN p_RoleId BIGINT,
    IN p_RoleName VARCHAR(100),
    IN p_RoleCode VARCHAR(50),
    IN p_Description VARCHAR(255),
    IN p_Status TINYINT
)
BEGIN
    UPDATE roles
    SET
        role_name = (p_RoleName COLLATE utf8mb4_unicode_ci),
        role_code = (p_RoleCode COLLATE utf8mb4_unicode_ci),
        description = (p_Description COLLATE utf8mb4_unicode_ci),
        status = p_Status
    WHERE role_id = p_RoleId;

    SELECT ROW_COUNT() AS RowsAffected;
END$$

DROP PROCEDURE IF EXISTS `sp_update_college_settings`$$
CREATE PROCEDURE `sp_update_college_settings`(

    IN p_college_setting_id BIGINT,

    IN p_college_name VARCHAR(200),

    IN p_college_code VARCHAR(50),

    IN p_college_email VARCHAR(150),

    IN p_phone_number VARCHAR(20),

    IN p_website VARCHAR(200),

    IN p_address_line1 VARCHAR(255),

    IN p_address_line2 VARCHAR(255),

    IN p_city VARCHAR(100),

    IN p_state VARCHAR(100),

    IN p_pincode VARCHAR(10),

    IN p_academic_year VARCHAR(20),

    IN p_semester VARCHAR(50),

    IN p_institution_type VARCHAR(100),

    IN p_date_format VARCHAR(30),

    IN p_time_zone VARCHAR(100),

    IN p_updated_by BIGINT

)
BEGIN
 
    UPDATE college_settings

    SET

        college_name = (p_college_name COLLATE utf8mb4_unicode_ci),

        college_code = (p_college_code COLLATE utf8mb4_unicode_ci),

        college_email = (p_college_email COLLATE utf8mb4_unicode_ci),

        phone_number = (p_phone_number COLLATE utf8mb4_unicode_ci),

        website = (p_website COLLATE utf8mb4_unicode_ci),

        address_line1 = (p_address_line1 COLLATE utf8mb4_unicode_ci),

        address_line2 = (p_address_line2 COLLATE utf8mb4_unicode_ci),

        city = (p_city COLLATE utf8mb4_unicode_ci),

        state = (p_state COLLATE utf8mb4_unicode_ci),

        pincode = (p_pincode COLLATE utf8mb4_unicode_ci),

        academic_year = (p_academic_year COLLATE utf8mb4_unicode_ci),

        semester = (p_semester COLLATE utf8mb4_unicode_ci),

        institution_type = (p_institution_type COLLATE utf8mb4_unicode_ci),

        date_format = (p_date_format COLLATE utf8mb4_unicode_ci),

        time_zone = (p_time_zone COLLATE utf8mb4_unicode_ci),

        updated_at = CURRENT_TIMESTAMP,

        updated_by = p_updated_by

    WHERE college_setting_id = p_college_setting_id;
 
    SELECT ROW_COUNT() AS affected_rows;
 
END$$

DROP PROCEDURE IF EXISTS `sp_update_course_structure`$$
CREATE PROCEDURE `sp_update_course_structure`(
    IN p_structure_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_year_number INT,
    IN p_semester_number INT,
    IN p_semester_name VARCHAR(100),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE course_structures
    SET
        course_id = p_course_id,
        branch_id = p_branch_id,
        year_number = p_year_number,
        semester_number = p_semester_number,
        semester_name = (p_semester_name COLLATE utf8mb4_unicode_ci),
        status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE structure_id = p_structure_id
      AND deleted_at IS NULL;

    CALL sp_get_course_structure_by_id(p_structure_id);
END$$

DROP PROCEDURE IF EXISTS `sp_update_employee_profile`$$
CREATE PROCEDURE `sp_update_employee_profile`(
    IN p_user_id BIGINT,
    IN p_date_of_birth DATE,
    IN p_gender VARCHAR(20),
    IN p_department_id BIGINT,
    IN p_designation VARCHAR(150),
    IN p_address VARCHAR(500),
    IN p_pincode VARCHAR(10),
    IN p_city VARCHAR(100),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_about_me VARCHAR(1000)
)
BEGIN

    UPDATE employee_profiles
    SET
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        gender = COALESCE((p_gender COLLATE utf8mb4_unicode_ci), gender),
        department_id = COALESCE(p_department_id, department_id),
        designation = COALESCE((p_designation COLLATE utf8mb4_unicode_ci), designation),
        address = COALESCE((p_address COLLATE utf8mb4_unicode_ci), address),
        pincode = COALESCE((p_pincode COLLATE utf8mb4_unicode_ci), pincode),
        city = COALESCE((p_city COLLATE utf8mb4_unicode_ci), city),
        district = COALESCE((p_district COLLATE utf8mb4_unicode_ci), district),
        state = COALESCE((p_state COLLATE utf8mb4_unicode_ci), state),
        about_me = COALESCE((p_about_me COLLATE utf8mb4_unicode_ci), about_me),
        updated_at = UTC_TIMESTAMP()
    WHERE user_id = p_user_id
      AND deleted_at IS NULL;

END$$

DROP PROCEDURE IF EXISTS `sp_update_role`$$
CREATE PROCEDURE `sp_update_role`(

    IN p_role_id BIGINT,

    IN p_role_name VARCHAR(100),

    IN p_role_code VARCHAR(50),

    IN p_description VARCHAR(255),

    IN p_updated_by BIGINT

)
BEGIN
 
    UPDATE roles

    SET

        role_name = (p_role_name COLLATE utf8mb4_unicode_ci),

        role_code = (p_role_code COLLATE utf8mb4_unicode_ci),

        description = (p_description COLLATE utf8mb4_unicode_ci),

        updated_at = CURRENT_TIMESTAMP,

        updated_by = p_updated_by

    WHERE role_id = p_role_id

      AND deleted_at IS NULL;
 
    SELECT ROW_COUNT() AS affected_rows;
 
END$$

DROP PROCEDURE IF EXISTS `sp_update_student_academic_details`$$
CREATE PROCEDURE `sp_update_student_academic_details`(
    IN p_AcademicId INT,
    IN p_RollNumber VARCHAR(20),
    IN p_RegistrationNumber VARCHAR(30),
    IN p_AdmissionNumber VARCHAR(30),
    IN p_Course VARCHAR(100),
    IN p_Branch VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Semester INT,
    IN p_Section VARCHAR(10),
    IN p_AcademicYear VARCHAR(20)
)
BEGIN

    UPDATE student_academic_details
    SET
        RollNumber = (p_RollNumber COLLATE utf8mb4_unicode_ci),
        RegistrationNumber = (p_RegistrationNumber COLLATE utf8mb4_unicode_ci),
        AdmissionNumber = (p_AdmissionNumber COLLATE utf8mb4_unicode_ci),
        Course = (p_Course COLLATE utf8mb4_unicode_ci),
        Branch = (p_Branch COLLATE utf8mb4_unicode_ci),
        Department = (p_Department COLLATE utf8mb4_unicode_ci),
        Semester = p_Semester,
        Section = (p_Section COLLATE utf8mb4_unicode_ci),
        AcademicYear = (p_AcademicYear COLLATE utf8mb4_unicode_ci)
    WHERE AcademicId = p_AcademicId;

END$$

DROP PROCEDURE IF EXISTS `sp_user_find_for_password_reset`$$
CREATE PROCEDURE `sp_user_find_for_password_reset`(
    IN p_identifier VARCHAR(150)
)
BEGIN
    -- Explicit COLLATE prevents Error 1267 when an imported database mixes
    -- utf8mb4_unicode_ci with utf8mb4_0900_ai_ci.
    SELECT
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        u.email AS Email,
        u.mobile AS Mobile,
        u.status AS Status,
        GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code) AS Roles
    FROM users u
    LEFT JOIN user_roles ur
        ON ur.user_id = u.user_id
       AND ur.status = 1
       AND ur.removed_at IS NULL
    LEFT JOIN roles r
        ON r.role_id = ur.role_id
       AND r.status = 1
       AND r.deleted_at IS NULL
    WHERE u.deleted_at IS NULL
      AND (
            u.employee_user_id COLLATE utf8mb4_unicode_ci =
                (p_identifier COLLATE utf8mb4_unicode_ci) COLLATE utf8mb4_unicode_ci
         OR u.email COLLATE utf8mb4_unicode_ci =
                (p_identifier COLLATE utf8mb4_unicode_ci) COLLATE utf8mb4_unicode_ci
         OR u.mobile COLLATE utf8mb4_unicode_ci =
                (p_identifier COLLATE utf8mb4_unicode_ci) COLLATE utf8mb4_unicode_ci
      )
    GROUP BY
        u.user_id,
        u.employee_user_id,
        u.full_name,
        u.email,
        u.mobile,
        u.status
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_user_update_password_hash`$$
CREATE PROCEDURE `sp_user_update_password_hash`(
    IN p_user_id BIGINT,
    IN p_password_hash VARCHAR(255),
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE users
    SET password_hash = (p_password_hash COLLATE utf8mb4_unicode_ci),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_verify_otp`$$
CREATE PROCEDURE `sp_verify_otp`(

    IN p_otp_verification_id BIGINT

)
BEGIN
 
    UPDATE otp_verifications

    SET

        verified_at = CURRENT_TIMESTAMP,

        status = 0

    WHERE otp_verification_id = p_otp_verification_id

      AND status = 1

      AND verified_at IS NULL

      AND expires_at >= CURRENT_TIMESTAMP

      AND attempts < max_attempts;
 
    IF ROW_COUNT() > 0 THEN
 
        SELECT

            TRUE AS success,

            'OTP verified successfully' AS message;
 
    ELSE
 
        SELECT

            FALSE AS success,

            'OTP is invalid, expired, or maximum attempts exceeded'

            AS message;
 
    END IF;
 
END$$

DROP PROCEDURE IF EXISTS `sp_student_admission_list_v2`$$
CREATE PROCEDURE `sp_student_admission_list_v2`(IN p_search VARCHAR(255), IN p_admission_status VARCHAR(50), IN p_page_number INT, IN p_page_size INT, IN p_course_id BIGINT, IN p_department_id BIGINT, IN p_branch_id BIGINT, IN p_semester_id BIGINT, IN p_academic_year_id BIGINT)
BEGIN
DECLARE v_offset INT;
IF p_page_size=0 THEN SET p_page_size=2147483647; SET p_page_number=1; END IF;
SET v_offset=(p_page_number-1)*p_page_size;
SELECT v.*,COUNT(*) OVER() AS TotalRecords FROM vw_cms_admission_directory v WHERE IsDeleted=0 AND (NULLIF(TRIM((p_search COLLATE utf8mb4_unicode_ci)),'') IS NULL OR CONCAT_WS(' ',RegistrationNo,ApplicationNo,AdmissionNo,FirstName,LastName,StudentEmail,MobileNumber) LIKE CONCAT('%',TRIM((p_search COLLATE utf8mb4_unicode_ci)),'%'))
AND (NULLIF(TRIM((p_admission_status COLLATE utf8mb4_unicode_ci)),'') IS NULL OR REPLACE(UPPER(AdmissionStatus),' ','_')=REPLACE(UPPER((p_admission_status COLLATE utf8mb4_unicode_ci)),' ','_'))
AND (p_course_id IS NULL OR AdmissionCourseId=p_course_id)
AND (p_department_id IS NULL OR AdmissionDepartmentId=p_department_id)
AND (p_branch_id IS NULL OR AdmissionBranchId=p_branch_id)
AND (p_semester_id IS NULL OR SemesterId=p_semester_id)
AND (p_academic_year_id IS NULL OR AcademicYearId=p_academic_year_id)
ORDER BY CreatedAt DESC,AdmissionId DESC LIMIT p_page_size OFFSET v_offset;
END$$

DROP PROCEDURE IF EXISTS `sp_StudentAdmission_UpdateAcademicDetails_v2`$$
CREATE PROCEDURE `sp_StudentAdmission_UpdateAcademicDetails_v2`(
    IN p_admission_id BIGINT,
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_medium VARCHAR(50),
    IN p_second_language VARCHAR(100),
    IN p_previous_school VARCHAR(200),
    IN p_previous_board VARCHAR(100),
    IN p_previous_year VARCHAR(20),
    IN p_previous_percentage DECIMAL(5,2),
    IN p_previous_hall_ticket VARCHAR(100),
    IN p_updated_by BIGINT,
IN p_college_id BIGINT, IN p_department_id BIGINT, IN p_course_id BIGINT, IN p_branch_id BIGINT,
IN p_semester_id BIGINT, IN p_admission_type VARCHAR(50), IN p_entry_type VARCHAR(50), IN p_regulation VARCHAR(50), IN p_batch VARCHAR(50)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM studentadmissions
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student admission record not found.';
    END IF;

    IF p_previous_percentage IS NOT NULL
       AND (p_previous_percentage < 0 OR p_previous_percentage > 100) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Previous percentage must be between 0 and 100.';
    END IF;

    IF p_academic_year_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM academicyears
           WHERE academic_year_id = p_academic_year_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year not found.';
    END IF;

    IF p_section_id IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = DATABASE()
             AND table_name = 'sections'
       )
       AND NOT EXISTS (
           SELECT 1 FROM sections
           WHERE section_id = p_section_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    UPDATE studentadmissions
       SET AcademicCollegeId=COALESCE(p_college_id,AcademicCollegeId), AcademicDepartmentId=COALESCE(p_department_id,AcademicDepartmentId),
           AcademicCourseId=COALESCE(p_course_id,AcademicCourseId), AcademicBranchId=COALESCE(p_branch_id,AcademicBranchId),
           AcademicSemesterId=COALESCE(p_semester_id,AcademicSemesterId), AdmissionType=COALESCE((p_admission_type COLLATE utf8mb4_unicode_ci),AdmissionType),
           EntryType=COALESCE((p_entry_type COLLATE utf8mb4_unicode_ci),EntryType), Regulation=COALESCE((p_regulation COLLATE utf8mb4_unicode_ci),Regulation), Batch=COALESCE((p_batch COLLATE utf8mb4_unicode_ci),Batch),
           BoardId = COALESCE(p_board_id,BoardId),
           AcademicYearId = COALESCE(p_academic_year_id,AcademicYearId),
           AcademicLevelId = p_academic_level_id,
           GroupId = p_group_id,
           SectionId = COALESCE(p_section_id,SectionId),
           Medium = NULLIF(TRIM((p_medium COLLATE utf8mb4_unicode_ci)), ''),
           SecondLanguage = NULLIF(TRIM((p_second_language COLLATE utf8mb4_unicode_ci)), ''),
           PreviousSchool = NULLIF(TRIM((p_previous_school COLLATE utf8mb4_unicode_ci)), ''),
           PreviousBoard = NULLIF(TRIM((p_previous_board COLLATE utf8mb4_unicode_ci)), ''),
           PreviousYear = NULLIF(TRIM((p_previous_year COLLATE utf8mb4_unicode_ci)), ''),
           PreviousPercentage = p_previous_percentage,
           PreviousHallTicket = NULLIF(TRIM((p_previous_hall_ticket COLLATE utf8mb4_unicode_ci)), ''),
           UpdatedBy = p_updated_by,
           UpdatedAt = UTC_TIMESTAMP()
     WHERE AdmissionId = p_admission_id
       AND IsDeleted = 0;

    CALL sp_StudentAdmission_GetAcademicDetails(p_admission_id);
END$$

DROP PROCEDURE IF EXISTS `sp_cms_require_active`$$
CREATE PROCEDURE `sp_cms_require_active`(IN p_entity VARCHAR(40), IN p_id BIGINT)
BEGIN
DECLARE v_status INT DEFAULT NULL; DECLARE v_message VARCHAR(128);
IF (p_entity COLLATE utf8mb4_unicode_ci)='college' THEN
 SELECT status INTO v_status FROM colleges WHERE college_id=p_id AND deleted_at IS NULL FOR SHARE;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='department' THEN
 SELECT status INTO v_status FROM departments WHERE department_id=p_id AND deleted_at IS NULL FOR SHARE;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='course' THEN
 SELECT status INTO v_status FROM courses WHERE course_id=p_id AND deleted_at IS NULL FOR SHARE;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='branch' THEN
 SELECT status INTO v_status FROM branches WHERE branch_id=p_id AND deleted_at IS NULL FOR SHARE;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='semester' THEN
 SELECT status INTO v_status FROM semesters WHERE semester_id=p_id AND is_archived=0 FOR SHARE;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='section' THEN
 SELECT status INTO v_status FROM sections WHERE section_id=p_id AND deleted_at IS NULL AND is_archived=0 FOR SHARE;
END IF;
IF v_status IS NULL OR v_status<>1 THEN SET v_message=CONCAT('Select an active ',(p_entity COLLATE utf8mb4_unicode_ci),'.'); SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=v_message; END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_check_deactivation`$$
CREATE PROCEDURE `sp_cms_check_deactivation`(IN p_entity VARCHAR(40),IN p_id BIGINT)
BEGIN
DECLARE v_count BIGINT DEFAULT 0; DECLARE v_found BIGINT DEFAULT 0; DECLARE v_message VARCHAR(128);
IF (p_entity COLLATE utf8mb4_unicode_ci)='department' THEN
SELECT COUNT(*) INTO v_found FROM courses WHERE department_id=p_id AND status=1 AND deleted_at IS NULL FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM branches WHERE department_id=p_id AND status=1 AND deleted_at IS NULL FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM sections WHERE department_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE AdmissionDepartmentId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE department_id=p_id AND status=1; SET v_count=v_count+v_found;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='course' THEN
SELECT COUNT(*) INTO v_found FROM branches WHERE course_id=p_id AND status=1 AND deleted_at IS NULL FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM semesters WHERE course_id=p_id AND status=1 AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM sections WHERE course_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE AdmissionCourseId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE course_id=p_id AND status=1; SET v_count=v_count+v_found;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='branch' THEN
SELECT COUNT(*) INTO v_found FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE branch_id=p_id AND status=1; SET v_count=v_count+v_found;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='semester' THEN
SELECT COUNT(*) INTO v_found FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0 FOR SHARE; SET v_count=v_count+v_found;
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE semester_id=p_id AND status=1; SET v_count=v_count+v_found;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='section' THEN
SELECT COUNT(*) INTO v_found FROM vw_cms_admission_directory WHERE SectionId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn'); SET v_count=v_count+v_found;
SELECT COUNT(DISTINCT student_id) INTO v_found FROM vw_cms_student_links WHERE section_id=p_id AND status=1; SET v_count=v_count+v_found;
END IF;
IF v_count>0 THEN SET v_message=CONCAT('Cannot deactivate ',(p_entity COLLATE utf8mb4_unicode_ci),': active dependent records exist. Reassign or deactivate them first.'); SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=v_message; END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_status_update`$$
CREATE PROCEDURE `sp_cms_status_update`(IN p_entity VARCHAR(40),IN p_id BIGINT,IN p_status TINYINT,IN p_actor BIGINT)
BEGIN
IF p_status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF (p_entity COLLATE utf8mb4_unicode_ci)='branch' THEN UPDATE branches SET status=p_status,updated_by=p_actor,updated_at=UTC_TIMESTAMP() WHERE branch_id=p_id AND deleted_at IS NULL;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='semester' THEN UPDATE semesters SET status=p_status,updated_by=p_actor,updated_at=UTC_TIMESTAMP() WHERE semester_id=p_id AND is_archived=0;
ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported status entity.'; END IF;
SELECT ROW_COUNT() AS affectedRows;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_export`$$
CREATE PROCEDURE sp_cms_export(IN p_screen VARCHAR(50),IN p_search VARCHAR(255),IN p_status VARCHAR(50),IN p_college_id BIGINT,IN p_department_id BIGINT,IN p_course_id BIGINT,IN p_branch_id BIGINT,IN p_semester_id BIGINT,IN p_academic_year_id BIGINT)
BEGIN
IF (p_screen COLLATE utf8mb4_unicode_ci)='colleges' THEN
SELECT * FROM (SELECT t.`college_id` AS `CollegeId`, t.`college_code` AS `CollegeCode`, t.`college_name` AS `CollegeName`, t.`college_type` AS `CollegeType`, t.`university_name` AS `UniversityName`, t.`email` AS `Email`, t.`mobile` AS `Mobile`, t.`phone` AS `Phone`, t.`principal` AS `Principal`, t.`principal_email` AS `PrincipalEmail`, t.`principal_contact` AS `PrincipalContact`, t.`alternate_contact_number` AS `AlternateContactNumber`, t.`accreditation_status` AS `AccreditationStatus`, t.`accreditation_body` AS `AccreditationBody`, t.`accreditation_grade` AS `AccreditationGrade`, t.`accreditation_number` AS `AccreditationNumber`, t.`valid_from` AS `ValidFrom`, t.`valid_until` AS `ValidUntil`, t.`address_line1` AS `AddressLine1`, t.`address_line2` AS `AddressLine2`, t.`city` AS `City`, t.`area` AS `Area`, t.`district` AS `District`, t.`state` AS `State`, t.`country` AS `Country`, t.`pincode` AS `Pincode`, t.`website` AS `Website`, t.`academic_year_id` AS `AcademicYearId`, t.`timezone` AS `Timezone`, t.`currency_code` AS `CurrencyCode`, t.`logo_path` AS `LogoPath`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy` FROM `colleges` t  WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`CollegeCode`,q.`CollegeName`,q.`UniversityName`,q.`Email`,q.`PrincipalEmail`,q.`CurrencyCode`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='college-settings' THEN
SELECT * FROM (SELECT t.`college_setting_id` AS `CollegeSettingId`, t.`college_id` AS `CollegeId`, t.`college_name` AS `CollegeName`, t.`college_code` AS `CollegeCode`, t.`college_email` AS `CollegeEmail`, t.`phone_number` AS `PhoneNumber`, t.`website` AS `Website`, t.`address_line1` AS `AddressLine1`, t.`address_line2` AS `AddressLine2`, t.`city` AS `City`, t.`state` AS `State`, t.`pincode` AS `Pincode`, t.`academic_year` AS `AcademicYear`, t.`semester` AS `Semester`, t.`institution_type` AS `InstitutionType`, t.`date_format` AS `DateFormat`, t.`time_zone` AS `TimeZone`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy` FROM `college_settings` t  WHERE 1=1) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`CollegeName`,q.`CollegeCode`,q.`CollegeEmail`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='academic-years' THEN
SELECT * FROM (SELECT t.`academic_year_id` AS `AcademicYearId`, t.`academic_year_name` AS `AcademicYearName`, t.`start_date` AS `StartDate`, t.`end_date` AS `EndDate`, t.`status` AS `Status`, t.`is_archived` AS `IsArchived`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, t.`active_guard` AS `ActiveGuard` FROM `academicyears` t  WHERE t.deleted_at IS NULL) q WHERE (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`AcademicYearName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='academic-levels' THEN
SELECT * FROM (SELECT t.`academic_level_id` AS `AcademicLevelId`, t.`academic_year_id` AS `AcademicYearId`, t.`level_type` AS `LevelType`, t.`level_name` AS `LevelName`, t.`level_number` AS `LevelNumber`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy` FROM `academic_levels` t  WHERE 1=1) q WHERE (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`LevelName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='departments' THEN
SELECT * FROM (SELECT t.`department_id` AS `DepartmentId`, t.`college_id` AS `CollegeId`, t.`department_code` AS `DepartmentCode`, t.`department_name` AS `DepartmentName`, t.`description` AS `Description`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, t.`hod_user_id` AS `HodUserId`, c.college_name AS `CollegeName` FROM `departments` t LEFT JOIN colleges c ON c.college_id=t.college_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`DepartmentCode`,q.`DepartmentName`,q.`CollegeName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='courses' THEN
SELECT * FROM (SELECT t.`course_id` AS `CourseId`, t.`college_id` AS `CollegeId`, t.`department_id` AS `DepartmentId`, t.`course_code` AS `CourseCode`, t.`course_name` AS `CourseName`, t.`course_short_name` AS `CourseShortName`, t.`course_type` AS `CourseType`, t.`duration_years` AS `DurationYears`, t.`total_semesters` AS `TotalSemesters`, t.`eligibility` AS `Eligibility`, t.`description` AS `Description`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, d.department_name AS `DepartmentName` FROM `courses` t LEFT JOIN departments d ON d.department_id=t.department_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`CourseCode`,q.`CourseName`,q.`CourseShortName`,q.`DepartmentName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='branches' THEN
SELECT * FROM (SELECT t.`branch_id` AS `BranchId`, t.`course_id` AS `CourseId`, t.`branch_code` AS `BranchCode`, t.`branch_name` AS `BranchName`, t.`short_name` AS `ShortName`, t.`specialization` AS `Specialization`, t.`department_id` AS `DepartmentId`, t.`branch_type` AS `BranchType`, t.`duration` AS `Duration`, t.`total_semesters` AS `TotalSemesters`, t.`intake_capacity` AS `IntakeCapacity`, t.`starting_academic_year_id` AS `StartingAcademicYearId`, t.`description` AS `Description`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, c.college_id AS `CollegeId`, c.course_name AS `CourseName`, d.department_name AS `DepartmentName` FROM `branches` t JOIN courses c ON c.course_id=t.course_id LEFT JOIN departments d ON d.department_id=t.department_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`BranchCode`,q.`BranchName`,q.`ShortName`,q.`CourseName`,q.`DepartmentName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='semesters' THEN
SELECT * FROM (SELECT t.`semester_id` AS `SemesterId`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`semester_number` AS `SemesterNumber`, t.`year_number` AS `YearNumber`, t.`semester_name` AS `SemesterName`, t.`status` AS `Status`, t.`is_archived` AS `IsArchived`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`academic_year_id` AS `AcademicYearId`, t.`start_date` AS `StartDate`, t.`end_date` AS `EndDate`, c.college_id AS `CollegeId`, c.course_name AS `CourseName`, c.department_id AS `DepartmentId`, b.branch_name AS `BranchName` FROM `semesters` t JOIN courses c ON c.course_id=t.course_id JOIN branches b ON b.branch_id=t.branch_id WHERE t.is_archived=0) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_semester_id IS NULL OR q.`SemesterId`=p_semester_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`SemesterName`,q.`CourseName`,q.`BranchName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='sections' THEN
SELECT * FROM (SELECT t.`section_id` AS `SectionId`, t.`college_id` AS `CollegeId`, t.`academic_year_id` AS `AcademicYearId`, t.`department_id` AS `DepartmentId`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`semester` AS `Semester`, t.`semester_id` AS `SemesterId`, t.`section_code` AS `SectionCode`, t.`section_name` AS `SectionName`, t.`capacity` AS `Capacity`, t.`class_teacher_employee_profile_id` AS `ClassTeacherEmployeeProfileId`, t.`room` AS `Room`, t.`shift` AS `Shift`, t.`section_type` AS `SectionType`, t.`status` AS `Status`, t.`is_archived` AS `IsArchived`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy` FROM `sections` t  WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_semester_id IS NULL OR q.`SemesterId`=p_semester_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`SectionCode`,q.`SectionName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='course-structures' THEN
SELECT * FROM (SELECT t.`structure_id` AS `StructureId`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`year_number` AS `YearNumber`, t.`semester_number` AS `SemesterNumber`, t.`semester_name` AS `SemesterName`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, c.college_id AS `CollegeId`, c.course_name AS `CourseName` FROM `course_structures` t JOIN courses c ON c.course_id=t.course_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`SemesterName`,q.`CourseName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='students' THEN
SELECT * FROM (SELECT t.`student_id` AS `StudentId`, t.`admission_id` AS `AdmissionId`, t.`college_id` AS `CollegeId`, t.`student_code` AS `StudentCode`, t.`full_name` AS `FullName`, t.`gender` AS `Gender`, t.`date_of_birth` AS `DateOfBirth`, t.`email` AS `Email`, t.`mobile` AS `Mobile`, t.`blood_group` AS `BloodGroup`, t.`address` AS `Address`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`academic_year_id` AS `AcademicYearId`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, c.course_name AS `CourseName`, c.department_id AS `DepartmentId`, b.branch_name AS `BranchName` FROM `students` t LEFT JOIN courses c ON c.course_id=t.course_id LEFT JOIN branches b ON b.branch_id=t.branch_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`StudentCode`,q.`FullName`,q.`Email`,q.`CourseName`,q.`BranchName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='student-profiles' THEN
SELECT * FROM (SELECT t.`PermanentCountry` AS `PermanentCountry`, t.`PermanentState` AS `PermanentState`, t.`PermanentDistrict` AS `PermanentDistrict`, t.`PermanentCity` AS `PermanentCity`, t.`PermanentPincode` AS `PermanentPincode`, t.`PermanentAddress` AS `PermanentAddress`, t.`PermanentHouseNumber` AS `PermanentHouseNumber`, t.`HouseNumber` AS `HouseNumber`, t.`StudentProfileId` AS `StudentProfileId`, t.`StudentId` AS `StudentId`, t.`AlternateEmail` AS `AlternateEmail`, t.`AlternateMobile` AS `AlternateMobile`, t.`BloodGroup` AS `BloodGroup`, t.`Nationality` AS `Nationality`, t.`Religion` AS `Religion`, t.`Category` AS `Category`, t.`Address` AS `Address`, t.`City` AS `City`, t.`District` AS `District`, t.`State` AS `State`, t.`Country` AS `Country`, t.`Pincode` AS `Pincode`, t.`ProfileStatus` AS `ProfileStatus`, t.`IsProfileCompleted` AS `IsProfileCompleted`, t.`IsVerified` AS `IsVerified`, t.`VerifiedBy` AS `VerifiedBy`, t.`VerifiedAt` AS `VerifiedAt`, t.`ProfileCompletionPercentage` AS `ProfileCompletionPercentage`, t.`Remarks` AS `Remarks`, t.`IsActive` AS `IsActive`, t.`IsDeleted` AS `IsDeleted`, t.`CreatedBy` AS `CreatedBy`, t.`CreatedAt` AS `CreatedAt`, t.`UpdatedBy` AS `UpdatedBy`, t.`UpdatedAt` AS `UpdatedAt`, t.`DeletedBy` AS `DeletedBy`, t.`DeletedAt` AS `DeletedAt`, s.college_id AS `CollegeId`, s.full_name AS `FullName`, s.course_id AS `CourseId`, s.branch_id AS `BranchId`, s.academic_year_id AS `AcademicYearId` FROM `student_profiles` t JOIN students s ON s.student_id=t.StudentId WHERE t.IsDeleted=0 AND s.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`AlternateEmail`,q.`FullName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='student-admissions' THEN
SELECT * FROM (SELECT `AdmissionId` AS `AdmissionId`, `RegistrationNo` AS `RegistrationNo`, `AdmissionNo` AS `AdmissionNo`, `FirstName` AS `FirstName`, `LastName` AS `LastName`, `Gender` AS `Gender`, `DateOfBirth` AS `DateOfBirth`, `StudentEmail` AS `StudentEmail`, `MobileNumber` AS `MobileNumber`, `AdmissionType` AS `AdmissionType`, `EntryType` AS `EntryType`, `Regulation` AS `Regulation`, `Batch` AS `Batch`, `AdmissionStatus` AS `Status`, `AcademicYearId` AS `AcademicYearId`, `AcademicYearName` AS `AcademicYearName`, `AdmissionCollegeId` AS `CollegeId`, `AdmissionCollegeName` AS `CollegeName`, `AdmissionDepartmentId` AS `DepartmentId`, `AdmissionDepartmentName` AS `DepartmentName`, `AdmissionCourseId` AS `CourseId`, `AdmissionCourseName` AS `CourseName`, `AdmissionBranchId` AS `BranchId`, `AdmissionBranchName` AS `BranchName`, `SemesterId` AS `SemesterId`, `SemesterName` AS `SemesterName`, `SectionId` AS `SectionId`, `SectionName` AS `SectionName`, `IsActive` AS `IsActive`, `CreatedAt` AS `CreatedAt`, `UpdatedAt` AS `UpdatedAt` FROM vw_cms_admission_directory WHERE IsDeleted=0) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_semester_id IS NULL OR q.`SemesterId`=p_semester_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`RegistrationNo`,q.`AdmissionNo`,q.`FirstName`,q.`LastName`,q.`StudentEmail`,q.`AcademicYearName`,q.`CollegeName`,q.`DepartmentName`,q.`CourseName`,q.`BranchName`,q.`SemesterName`,q.`SectionName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='promotions' THEN
SELECT * FROM (SELECT t.`promotion_id` AS `PromotionId`, t.`student_id` AS `StudentId`, t.`from_academic_year_id` AS `FromAcademicYearId`, t.`to_academic_year_id` AS `ToAcademicYearId`, t.`from_course_id` AS `FromCourseId`, t.`to_course_id` AS `ToCourseId`, t.`from_branch_id` AS `FromBranchId`, t.`to_branch_id` AS `ToBranchId`, t.`from_semester` AS `FromSemester`, t.`to_semester` AS `ToSemester`, t.`promotion_status` AS `PromotionStatus`, t.`decision` AS `Decision`, t.`decision_date` AS `DecisionDate`, t.`decision_by` AS `DecisionBy`, t.`remarks` AS `Remarks`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy`, t.`college_id` AS `CollegeId`, t.`from_section_id` AS `FromSectionId`, t.`to_section_id` AS `ToSectionId`, t.`attendance_percentage` AS `AttendancePercentage`, t.`total_marks` AS `TotalMarks`, t.`obtained_marks` AS `ObtainedMarks`, t.`marks_percentage` AS `MarksPercentage`, t.`passed_subjects` AS `PassedSubjects`, t.`failed_subjects` AS `FailedSubjects`, t.`backlog_count` AS `BacklogCount`, t.`promotion_eligibility` AS `PromotionEligibility`, t.`eligibility_remarks` AS `EligibilityRemarks`, t.`promotion_type` AS `PromotionType`, t.`promotion_date` AS `PromotionDate`, t.`effective_date` AS `EffectiveDate`, t.`promotion_reason` AS `PromotionReason`, t.`rejection_reason` AS `RejectionReason`, t.`approved_at` AS `ApprovedAt`, t.`is_final` AS `IsFinal`, t.`promotion_order` AS `PromotionOrder`, t.`is_active` AS `IsActive`, s.full_name AS `StudentName` FROM `student_promotions` t JOIN students s ON s.student_id=t.student_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`StudentName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='users' THEN
SELECT * FROM (SELECT t.`user_id` AS `UserId`, t.`college_id` AS `CollegeId`, t.`employee_user_id` AS `EmployeeUserId`, t.`full_name` AS `FullName`, t.`email` AS `Email`, t.`mobile` AS `Mobile`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`updated_at` AS `UpdatedAt` FROM `users` t  WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`FullName`,q.`Email`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='roles' THEN
SELECT * FROM (SELECT t.`role_id` AS `RoleId`, t.`role_name` AS `RoleName`, t.`role_code` AS `RoleCode`, t.`description` AS `Description`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, t.`deleted_at` AS `DeletedAt`, t.`deleted_by` AS `DeletedBy` FROM `roles` t  WHERE t.deleted_at IS NULL) q WHERE ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`RoleName`,q.`RoleCode`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='faculty' THEN
SELECT * FROM (SELECT t.`employee_profile_id` AS `EmployeeProfileId`, t.`user_id` AS `UserId`, t.`department_id` AS `DepartmentId`, t.`designation` AS `Designation`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`updated_at` AS `UpdatedAt`, u.college_id AS `CollegeId`, u.full_name AS `FullName`, u.employee_user_id AS `EmployeeUserId` FROM `employee_profiles` t JOIN users u ON u.user_id=t.user_id WHERE t.deleted_at IS NULL) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`FullName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='fee-structures' THEN
SELECT * FROM (SELECT t.`fee_master_id` AS `FeeMasterId`, t.`academic_year_id` AS `AcademicYearId`, t.`department_id` AS `DepartmentId`, t.`course_id` AS `CourseId`, t.`branch_id` AS `BranchId`, t.`semester_id` AS `SemesterId`, t.`admission_type` AS `AdmissionType`, t.`quota` AS `Quota`, t.`student_category` AS `StudentCategory`, t.`tuition_fee` AS `TuitionFee`, t.`admission_fee` AS `AdmissionFee`, t.`effective_from` AS `EffectiveFrom`, t.`effective_to` AS `EffectiveTo`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy`, c.college_id AS `CollegeId` FROM `fee_master_structures` t JOIN courses c ON c.course_id=t.course_id WHERE 1=1) q WHERE (p_college_id IS NULL OR q.`CollegeId`=p_college_id) AND (p_department_id IS NULL OR q.`DepartmentId`=p_department_id) AND (p_course_id IS NULL OR q.`CourseId`=p_course_id) AND (p_branch_id IS NULL OR q.`BranchId`=p_branch_id) AND (p_semester_id IS NULL OR q.`SemesterId`=p_semester_id) AND (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='hostel-fees' THEN
SELECT * FROM (SELECT t.`hostel_fee_master_id` AS `HostelFeeMasterId`, t.`academic_year_id` AS `AcademicYearId`, t.`hostel_type` AS `HostelType`, t.`room_type` AS `RoomType`, t.`amount` AS `Amount`, t.`effective_from` AS `EffectiveFrom`, t.`effective_to` AS `EffectiveTo`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy` FROM `hostel_fee_master` t  WHERE 1=1) q WHERE (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) LIMIT 100001;
ELSEIF (p_screen COLLATE utf8mb4_unicode_ci)='transport-fees' THEN
SELECT * FROM (SELECT t.`transport_fee_master_id` AS `TransportFeeMasterId`, t.`academic_year_id` AS `AcademicYearId`, t.`route_id` AS `RouteId`, t.`route_code` AS `RouteCode`, t.`route_name` AS `RouteName`, t.`amount` AS `Amount`, t.`effective_from` AS `EffectiveFrom`, t.`effective_to` AS `EffectiveTo`, t.`status` AS `Status`, t.`created_at` AS `CreatedAt`, t.`created_by` AS `CreatedBy`, t.`updated_at` AS `UpdatedAt`, t.`updated_by` AS `UpdatedBy` FROM `transport_fee_master` t  WHERE 1=1) q WHERE (p_academic_year_id IS NULL OR q.`AcademicYearId`=p_academic_year_id) AND ((p_status COLLATE utf8mb4_unicode_ci) IS NULL OR LOWER(CAST(q.Status AS CHAR))=LOWER((p_status COLLATE utf8mb4_unicode_ci))) AND (NULLIF((p_search COLLATE utf8mb4_unicode_ci),'') IS NULL OR CONCAT_WS(' ',q.`RouteCode`,q.`RouteName`) LIKE CONCAT('%',(p_search COLLATE utf8mb4_unicode_ci),'%')) LIMIT 100001;
ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported export screen.'; END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_log_api_activity`$$
CREATE PROCEDURE sp_cms_log_api_activity(IN p_correlation VARCHAR(100),IN p_user_id BIGINT,IN p_screen VARCHAR(100),IN p_action VARCHAR(160),IN p_method VARCHAR(10),IN p_route VARCHAR(500),IN p_status INT,IN p_duration BIGINT) BEGIN
INSERT INTO api_activity_logs(correlation_id,user_id,screen,action_name,http_method,route,status_code,duration_ms) VALUES((p_correlation COLLATE utf8mb4_unicode_ci),p_user_id,(p_screen COLLATE utf8mb4_unicode_ci),(p_action COLLATE utf8mb4_unicode_ci),(p_method COLLATE utf8mb4_unicode_ci),(p_route COLLATE utf8mb4_unicode_ci),p_status,p_duration);
END$$

DROP PROCEDURE IF EXISTS `sp_cms_activity_list`$$
CREATE PROCEDURE sp_cms_activity_list(IN p_screen VARCHAR(100),IN p_correlation VARCHAR(100),IN p_limit INT) BEGIN
SELECT log_id AS logId,correlation_id AS correlationId,user_id AS userId,screen,action_name AS actionName,http_method AS method,route,status_code AS statusCode,duration_ms AS durationMs,occurred_at AS occurredAt FROM api_activity_logs WHERE ((p_screen COLLATE utf8mb4_unicode_ci) IS NULL OR screen=(p_screen COLLATE utf8mb4_unicode_ci)) AND ((p_correlation COLLATE utf8mb4_unicode_ci) IS NULL OR correlation_id=(p_correlation COLLATE utf8mb4_unicode_ci)) ORDER BY log_id DESC LIMIT p_limit;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_status_history`$$
CREATE PROCEDURE sp_cms_status_history(IN p_entity VARCHAR(40),IN p_id BIGINT) BEGIN
SELECT audit_id AS auditId,entity_type AS entityType,entity_id AS entityId,old_status AS oldStatus,new_status AS newStatus,changed_by AS changedBy,changed_at AS changedAt FROM entity_status_audit WHERE entity_type=(p_entity COLLATE utf8mb4_unicode_ci) AND entity_id=p_id ORDER BY audit_id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_dependency_impact`$$
CREATE PROCEDURE sp_cms_dependency_impact(IN p_entity VARCHAR(40),IN p_id BIGINT) BEGIN
IF (p_entity COLLATE utf8mb4_unicode_ci)='departments' THEN
SELECT department_id AS id,status,(SELECT COUNT(*) FROM courses WHERE department_id=p_id AND status=1 AND deleted_at IS NULL) AS activeCoursesCount,(SELECT COUNT(*) FROM branches WHERE department_id=p_id AND status=1 AND deleted_at IS NULL) AS activeBranchesCount,(SELECT COUNT(*) FROM sections WHERE department_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) AS activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionDepartmentId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(*) FROM courses WHERE department_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM branches WHERE department_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM sections WHERE department_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionDepartmentId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM departments WHERE department_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='courses' THEN
SELECT course_id AS id,status,(SELECT COUNT(*) FROM branches WHERE course_id=p_id AND status=1 AND deleted_at IS NULL) AS activeBranchesCount,(SELECT COUNT(*) FROM semesters WHERE course_id=p_id AND status=1 AND is_archived=0) AS activeSemestersCount,(SELECT COUNT(*) FROM sections WHERE course_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) AS activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionCourseId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(*) FROM branches WHERE course_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM semesters WHERE course_id=p_id AND status=1 AND is_archived=0)+(SELECT COUNT(*) FROM sections WHERE course_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionCourseId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM courses WHERE course_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='branches' THEN
SELECT branch_id AS id,status,(SELECT COUNT(*) FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0) AS activeSemestersCount,(SELECT COUNT(*) FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) AS activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(*) FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0)+(SELECT COUNT(*) FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM branches WHERE branch_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='semesters' THEN
SELECT semester_id AS id,status,(SELECT COUNT(*) FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) AS activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(*) FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM semesters WHERE semester_id=p_id AND is_archived=0 LIMIT 1;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='sections' THEN
SELECT section_id AS id,status,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id) AS studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id) AS associatedStudentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id AND status=1) AS activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SectionId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')) AS activeAdmissionCount,((SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SectionId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN ('Rejected','Cancelled','Withdrawn')))=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM sections WHERE section_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSEIF (p_entity COLLATE utf8mb4_unicode_ci)='students' THEN
SELECT student_id AS id,status,0 AS studentCount,0 AS associatedStudentCount,0 AS activeStudentCount,0 AS activeAdmissionCount,(0)=0 AS canDeactivate,'No cascade. Active dependencies must be reassigned or deactivated first. Historical records remain available.' AS policy FROM students WHERE student_id=p_id AND deleted_at IS NULL LIMIT 1;
ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported dependency entity.'; END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_student_profile_personal_update_v2`$$
CREATE PROCEDURE `sp_student_profile_personal_update_v2`(
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
    IN p_user_agent VARCHAR(500),
IN p_house_number VARCHAR(100),
IN p_permanent_house_number VARCHAR(100),
IN p_permanent_address TEXT,
IN p_permanent_pincode VARCHAR(100),
IN p_permanent_city VARCHAR(100),
IN p_permanent_district VARCHAR(100),
IN p_permanent_state VARCHAR(100),
IN p_permanent_country VARCHAR(100)
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
    DECLARE v_old_house_number VARCHAR(100);
    DECLARE v_old_permanent_house_number VARCHAR(100);
    DECLARE v_old_permanent_address TEXT;
    DECLARE v_old_permanent_pincode VARCHAR(100);
    DECLARE v_old_permanent_city VARCHAR(100);
    DECLARE v_old_permanent_district VARCHAR(100);
    DECLARE v_old_permanent_state VARCHAR(100);
    DECLARE v_old_permanent_country VARCHAR(100);

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
        sp.Pincode,
        sp.HouseNumber,
        sp.PermanentHouseNumber,
        sp.PermanentAddress,
        sp.PermanentPincode,
        sp.PermanentCity,
        sp.PermanentDistrict,
        sp.PermanentState,
        sp.PermanentCountry
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
        v_old_pincode,
        v_old_house_number,
        v_old_permanent_house_number,
        v_old_permanent_address,
        v_old_permanent_pincode,
        v_old_permanent_city,
        v_old_permanent_district,
        v_old_permanent_state,
        v_old_permanent_country
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF (p_full_name COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_full_name COLLATE utf8mb4_unicode_ci) <=> v_old_full_name) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'FullName');
        SET v_old_values = JSON_SET(v_old_values, '$.FullName', v_old_full_name);
        SET v_new_values = JSON_SET(v_new_values, '$.FullName', (p_full_name COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_gender COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_gender COLLATE utf8mb4_unicode_ci) <=> v_old_gender) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Gender');
        SET v_old_values = JSON_SET(v_old_values, '$.Gender', v_old_gender);
        SET v_new_values = JSON_SET(v_new_values, '$.Gender', (p_gender COLLATE utf8mb4_unicode_ci));
    END IF;
    IF p_date_of_birth IS NOT NULL AND NOT (p_date_of_birth <=> v_old_date_of_birth) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'DateOfBirth');
        SET v_old_values = JSON_SET(v_old_values, '$.DateOfBirth', v_old_date_of_birth);
        SET v_new_values = JSON_SET(v_new_values, '$.DateOfBirth', p_date_of_birth);
    END IF;
    IF (p_email COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_email COLLATE utf8mb4_unicode_ci) <=> v_old_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Email');
        SET v_old_values = JSON_SET(v_old_values, '$.Email', v_old_email);
        SET v_new_values = JSON_SET(v_new_values, '$.Email', (p_email COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_mobile COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_mobile COLLATE utf8mb4_unicode_ci) <=> v_old_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Mobile');
        SET v_old_values = JSON_SET(v_old_values, '$.Mobile', v_old_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.Mobile', (p_mobile COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_profile_photo COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_profile_photo COLLATE utf8mb4_unicode_ci) <=> v_old_profile_photo) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'ProfilePhoto');
        SET v_old_values = JSON_SET(v_old_values, '$.ProfilePhoto', v_old_profile_photo);
        SET v_new_values = JSON_SET(v_new_values, '$.ProfilePhoto', (p_profile_photo COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_alternate_email COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_alternate_email COLLATE utf8mb4_unicode_ci) <=> v_old_alternate_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateEmail');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateEmail', v_old_alternate_email);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateEmail', (p_alternate_email COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_alternate_mobile COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_alternate_mobile COLLATE utf8mb4_unicode_ci) <=> v_old_alternate_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateMobile');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateMobile', v_old_alternate_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateMobile', (p_alternate_mobile COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_blood_group COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_blood_group COLLATE utf8mb4_unicode_ci) <=> v_old_blood_group) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'BloodGroup');
        SET v_old_values = JSON_SET(v_old_values, '$.BloodGroup', v_old_blood_group);
        SET v_new_values = JSON_SET(v_new_values, '$.BloodGroup', (p_blood_group COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_nationality COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_nationality COLLATE utf8mb4_unicode_ci) <=> v_old_nationality) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Nationality');
        SET v_old_values = JSON_SET(v_old_values, '$.Nationality', v_old_nationality);
        SET v_new_values = JSON_SET(v_new_values, '$.Nationality', (p_nationality COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_religion COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_religion COLLATE utf8mb4_unicode_ci) <=> v_old_religion) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Religion');
        SET v_old_values = JSON_SET(v_old_values, '$.Religion', v_old_religion);
        SET v_new_values = JSON_SET(v_new_values, '$.Religion', (p_religion COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_category COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_category COLLATE utf8mb4_unicode_ci) <=> v_old_category) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Category');
        SET v_old_values = JSON_SET(v_old_values, '$.Category', v_old_category);
        SET v_new_values = JSON_SET(v_new_values, '$.Category', (p_category COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_address COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_address COLLATE utf8mb4_unicode_ci) <=> v_old_address) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Address');
        SET v_old_values = JSON_SET(v_old_values, '$.Address', v_old_address);
        SET v_new_values = JSON_SET(v_new_values, '$.Address', (p_address COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_city COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_city COLLATE utf8mb4_unicode_ci) <=> v_old_city) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'City');
        SET v_old_values = JSON_SET(v_old_values, '$.City', v_old_city);
        SET v_new_values = JSON_SET(v_new_values, '$.City', (p_city COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_district COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_district COLLATE utf8mb4_unicode_ci) <=> v_old_district) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'District');
        SET v_old_values = JSON_SET(v_old_values, '$.District', v_old_district);
        SET v_new_values = JSON_SET(v_new_values, '$.District', (p_district COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_state COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_state COLLATE utf8mb4_unicode_ci) <=> v_old_state) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'State');
        SET v_old_values = JSON_SET(v_old_values, '$.State', v_old_state);
        SET v_new_values = JSON_SET(v_new_values, '$.State', (p_state COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_country COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_country COLLATE utf8mb4_unicode_ci) <=> v_old_country) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Country');
        SET v_old_values = JSON_SET(v_old_values, '$.Country', v_old_country);
        SET v_new_values = JSON_SET(v_new_values, '$.Country', (p_country COLLATE utf8mb4_unicode_ci));
    END IF;
    IF (p_pincode COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT ((p_pincode COLLATE utf8mb4_unicode_ci) <=> v_old_pincode) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Pincode');
        SET v_old_values = JSON_SET(v_old_values, '$.Pincode', v_old_pincode);
        SET v_new_values = JSON_SET(v_new_values, '$.Pincode', (p_pincode COLLATE utf8mb4_unicode_ci));
    END IF;

    IF (p_house_number COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT((p_house_number COLLATE utf8mb4_unicode_ci)<=>v_old_house_number) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','HouseNumber'); SET v_old_values=JSON_SET(v_old_values,'$.HouseNumber',v_old_house_number); SET v_new_values=JSON_SET(v_new_values,'$.HouseNumber',(p_house_number COLLATE utf8mb4_unicode_ci)); END IF;
    IF (p_permanent_house_number COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT((p_permanent_house_number COLLATE utf8mb4_unicode_ci)<=>v_old_permanent_house_number) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentHouseNumber'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentHouseNumber',v_old_permanent_house_number); SET v_new_values=JSON_SET(v_new_values,'$.PermanentHouseNumber',(p_permanent_house_number COLLATE utf8mb4_unicode_ci)); END IF;
    IF (p_permanent_address COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT((p_permanent_address COLLATE utf8mb4_unicode_ci)<=>v_old_permanent_address) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentAddress'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentAddress',v_old_permanent_address); SET v_new_values=JSON_SET(v_new_values,'$.PermanentAddress',(p_permanent_address COLLATE utf8mb4_unicode_ci)); END IF;
    IF (p_permanent_pincode COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT((p_permanent_pincode COLLATE utf8mb4_unicode_ci)<=>v_old_permanent_pincode) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentPincode'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentPincode',v_old_permanent_pincode); SET v_new_values=JSON_SET(v_new_values,'$.PermanentPincode',(p_permanent_pincode COLLATE utf8mb4_unicode_ci)); END IF;
    IF (p_permanent_city COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT((p_permanent_city COLLATE utf8mb4_unicode_ci)<=>v_old_permanent_city) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentCity'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentCity',v_old_permanent_city); SET v_new_values=JSON_SET(v_new_values,'$.PermanentCity',(p_permanent_city COLLATE utf8mb4_unicode_ci)); END IF;
    IF (p_permanent_district COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT((p_permanent_district COLLATE utf8mb4_unicode_ci)<=>v_old_permanent_district) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentDistrict'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentDistrict',v_old_permanent_district); SET v_new_values=JSON_SET(v_new_values,'$.PermanentDistrict',(p_permanent_district COLLATE utf8mb4_unicode_ci)); END IF;
    IF (p_permanent_state COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT((p_permanent_state COLLATE utf8mb4_unicode_ci)<=>v_old_permanent_state) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentState'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentState',v_old_permanent_state); SET v_new_values=JSON_SET(v_new_values,'$.PermanentState',(p_permanent_state COLLATE utf8mb4_unicode_ci)); END IF;
    IF (p_permanent_country COLLATE utf8mb4_unicode_ci) IS NOT NULL AND NOT((p_permanent_country COLLATE utf8mb4_unicode_ci)<=>v_old_permanent_country) THEN
SET v_changed_fields=JSON_ARRAY_APPEND(v_changed_fields,'$','PermanentCountry'); SET v_old_values=JSON_SET(v_old_values,'$.PermanentCountry',v_old_permanent_country); SET v_new_values=JSON_SET(v_new_values,'$.PermanentCountry',(p_permanent_country COLLATE utf8mb4_unicode_ci)); END IF;
    IF JSON_LENGTH(v_changed_fields) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No personal-information values changed.';
    END IF;

    UPDATE students
    SET
        full_name = COALESCE((p_full_name COLLATE utf8mb4_unicode_ci), full_name),
        gender = COALESCE((p_gender COLLATE utf8mb4_unicode_ci), gender),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        email = COALESCE((p_email COLLATE utf8mb4_unicode_ci), email),
        mobile = COALESCE((p_mobile COLLATE utf8mb4_unicode_ci), mobile),
        blood_group = COALESCE((p_blood_group COLLATE utf8mb4_unicode_ci), blood_group),
        address = COALESCE((p_address COLLATE utf8mb4_unicode_ci), address),
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
            p_student_id, (p_profile_photo COLLATE utf8mb4_unicode_ci), (p_alternate_email COLLATE utf8mb4_unicode_ci), (p_alternate_mobile COLLATE utf8mb4_unicode_ci),
            (p_blood_group COLLATE utf8mb4_unicode_ci), (p_nationality COLLATE utf8mb4_unicode_ci), (p_religion COLLATE utf8mb4_unicode_ci), (p_category COLLATE utf8mb4_unicode_ci), (p_address COLLATE utf8mb4_unicode_ci),
            (p_city COLLATE utf8mb4_unicode_ci), (p_district COLLATE utf8mb4_unicode_ci), (p_state COLLATE utf8mb4_unicode_ci), COALESCE((p_country COLLATE utf8mb4_unicode_ci), 'India'), (p_pincode COLLATE utf8mb4_unicode_ci),
            1, 0, p_changed_by, UTC_TIMESTAMP()
        );

        SET v_profile_id = LAST_INSERT_ID();
    ELSE
        UPDATE student_profiles
        SET
            ProfilePhoto = COALESCE((p_profile_photo COLLATE utf8mb4_unicode_ci), ProfilePhoto),
            AlternateEmail = COALESCE((p_alternate_email COLLATE utf8mb4_unicode_ci), AlternateEmail),
            AlternateMobile = COALESCE((p_alternate_mobile COLLATE utf8mb4_unicode_ci), AlternateMobile),
            BloodGroup = COALESCE((p_blood_group COLLATE utf8mb4_unicode_ci), BloodGroup),
            Nationality = COALESCE((p_nationality COLLATE utf8mb4_unicode_ci), Nationality),
            Religion = COALESCE((p_religion COLLATE utf8mb4_unicode_ci), Religion),
            Category = COALESCE((p_category COLLATE utf8mb4_unicode_ci), Category),
            Address = COALESCE((p_address COLLATE utf8mb4_unicode_ci), Address),
            City = COALESCE((p_city COLLATE utf8mb4_unicode_ci), City),
            District = COALESCE((p_district COLLATE utf8mb4_unicode_ci), District),
            State = COALESCE((p_state COLLATE utf8mb4_unicode_ci), State),
            Country = COALESCE((p_country COLLATE utf8mb4_unicode_ci), Country),
            Pincode = COALESCE((p_pincode COLLATE utf8mb4_unicode_ci), Pincode),
            UpdatedBy = p_changed_by,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StudentProfileId = v_profile_id;
    END IF;

    UPDATE student_profiles SET HouseNumber=COALESCE((p_house_number COLLATE utf8mb4_unicode_ci),HouseNumber), PermanentHouseNumber=COALESCE((p_permanent_house_number COLLATE utf8mb4_unicode_ci),PermanentHouseNumber), PermanentAddress=COALESCE((p_permanent_address COLLATE utf8mb4_unicode_ci),PermanentAddress), PermanentPincode=COALESCE((p_permanent_pincode COLLATE utf8mb4_unicode_ci),PermanentPincode), PermanentCity=COALESCE((p_permanent_city COLLATE utf8mb4_unicode_ci),PermanentCity), PermanentDistrict=COALESCE((p_permanent_district COLLATE utf8mb4_unicode_ci),PermanentDistrict), PermanentState=COALESCE((p_permanent_state COLLATE utf8mb4_unicode_ci),PermanentState), PermanentCountry=COALESCE((p_permanent_country COLLATE utf8mb4_unicode_ci),PermanentCountry) WHERE StudentId=p_student_id;

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
        NULLIF(TRIM((p_change_reason COLLATE utf8mb4_unicode_ci)), ''),
        'Profile API',
        p_changed_by,
        UTC_TIMESTAMP(6),
        (p_ip_address COLLATE utf8mb4_unicode_ci),
        (p_user_agent COLLATE utf8mb4_unicode_ci)
    );

    COMMIT;

    CALL sp_student_profile_personal_get(p_student_id);
END$$

DROP PROCEDURE IF EXISTS `sp_student_profile_full_update_v2`$$
CREATE PROCEDURE `sp_student_profile_full_update_v2`(
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
    IN p_user_agent VARCHAR(500), IN p_form_data LONGTEXT, IN p_profile_photo LONGTEXT
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
    IF NULLIF(TRIM((p_full_name COLLATE utf8mb4_unicode_ci)), '') IS NULL THEN
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
            p_student_id, (p_blood_group COLLATE utf8mb4_unicode_ci), (p_address COLLATE utf8mb4_unicode_ci), 1, 0,
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
        'MotherOccupation', p.`mother_occupation`, 'ScreenForm', (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id)
    ) INTO v_old_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    UPDATE `students`
    SET `full_name` = TRIM((p_full_name COLLATE utf8mb4_unicode_ci)),
        `gender` = COALESCE(NULLIF(TRIM((p_gender COLLATE utf8mb4_unicode_ci)), ''), `gender`),
        `date_of_birth` = COALESCE(p_date_of_birth, `date_of_birth`),
        `email` = COALESCE(NULLIF(TRIM((p_email COLLATE utf8mb4_unicode_ci)), ''), `email`),
        `mobile` = COALESCE(NULLIF(TRIM((p_mobile COLLATE utf8mb4_unicode_ci)), ''), `mobile`),
        `blood_group` = COALESCE(NULLIF(TRIM((p_blood_group COLLATE utf8mb4_unicode_ci)), ''), `blood_group`),
        `address` = COALESCE(NULLIF(TRIM((p_address COLLATE utf8mb4_unicode_ci)), ''), `address`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_changed_by
    WHERE `student_id` = p_student_id AND `college_id` = p_college_id;

    UPDATE `student_profiles`
    SET `BloodGroup` = COALESCE(NULLIF(TRIM((p_blood_group COLLATE utf8mb4_unicode_ci)), ''), `BloodGroup`),
        `Address` = COALESCE(NULLIF(TRIM((p_address COLLATE utf8mb4_unicode_ci)), ''), `Address`),
        `UpdatedBy` = p_changed_by,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `StudentProfileId` = v_profile_id;

    INSERT INTO `student_parents` (
        `student_id`, `father_name`, `father_mobile`, `father_email`,
        `father_occupation`, `mother_name`, `mother_mobile`, `mother_email`,
        `mother_occupation`, `created_at`, `updated_at`
    ) VALUES (
        p_student_id, NULLIF(TRIM((p_father_name COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_father_mobile COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_father_email COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_father_occupation COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_mother_name COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_mother_mobile COLLATE utf8mb4_unicode_ci)), ''),
        NULLIF(TRIM((p_mother_email COLLATE utf8mb4_unicode_ci)), ''), NULLIF(TRIM((p_mother_occupation COLLATE utf8mb4_unicode_ci)), ''),
        UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        `father_name` = COALESCE(NULLIF(TRIM((p_father_name COLLATE utf8mb4_unicode_ci)), ''), `father_name`),
        `father_mobile` = COALESCE(NULLIF(TRIM((p_father_mobile COLLATE utf8mb4_unicode_ci)), ''), `father_mobile`),
        `father_email` = COALESCE(NULLIF(TRIM((p_father_email COLLATE utf8mb4_unicode_ci)), ''), `father_email`),
        `father_occupation` = COALESCE(NULLIF(TRIM((p_father_occupation COLLATE utf8mb4_unicode_ci)), ''), `father_occupation`),
        `mother_name` = COALESCE(NULLIF(TRIM((p_mother_name COLLATE utf8mb4_unicode_ci)), ''), `mother_name`),
        `mother_mobile` = COALESCE(NULLIF(TRIM((p_mother_mobile COLLATE utf8mb4_unicode_ci)), ''), `mother_mobile`),
        `mother_email` = COALESCE(NULLIF(TRIM((p_mother_email COLLATE utf8mb4_unicode_ci)), ''), `mother_email`),
        `mother_occupation` = COALESCE(NULLIF(TRIM((p_mother_occupation COLLATE utf8mb4_unicode_ci)), ''), `mother_occupation`),
        `updated_at` = UTC_TIMESTAMP();

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`, 'ScreenForm', (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id)
    ) INTO v_new_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    IF (p_form_data COLLATE utf8mb4_unicode_ci) IS NOT NULL THEN
        IF JSON_VALID((p_form_data COLLATE utf8mb4_unicode_ci))=0 OR JSON_TYPE(CAST((p_form_data COLLATE utf8mb4_unicode_ci) AS JSON))<>'OBJECT' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student form must be a JSON object.'; END IF;
        INSERT INTO student_profile_form_data(student_id,form_data,updated_by,updated_at)
        VALUES(p_student_id,CAST((p_form_data COLLATE utf8mb4_unicode_ci) AS JSON),p_changed_by,UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE form_data=JSON_MERGE_PATCH(form_data,VALUES(form_data)),updated_by=p_changed_by,updated_at=UTC_TIMESTAMP();
    END IF;
    UPDATE student_profiles SET ProfilePhoto=COALESCE((p_profile_photo COLLATE utf8mb4_unicode_ci),ProfilePhoto),
        HouseNumber=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.currentAddress.houseNumber')),'null'),HouseNumber),
        PermanentHouseNumber=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.permanentAddress.houseNumber')),'null'),PermanentHouseNumber),
        PermanentAddress=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.permanentAddress.line1')),'null'),PermanentAddress),
        PermanentCity=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.permanentAddress.city')),'null'),PermanentCity),
        PermanentDistrict=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.permanentAddress.district')),'null'),PermanentDistrict),
        PermanentState=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.permanentAddress.state')),'null'),PermanentState),
        PermanentCountry=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.permanentAddress.country')),'null'),PermanentCountry),
        PermanentPincode=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.permanentAddress.pincode')),'null'),PermanentPincode),
        City=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.currentAddress.city')),'null'),City),
        District=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.currentAddress.district')),'null'),District),
        State=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.currentAddress.state')),'null'),State),
        Pincode=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.currentAddress.pincode')),'null'),Pincode),
        Country=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.currentAddress.country')),'null'),Country),
        AlternateEmail=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.alternateEmail')),'null'),AlternateEmail),
        AlternateMobile=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.contact.alternateMobile')),'null'),AlternateMobile),
        Nationality=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.personal.nationality')),'null'),Nationality),
        Religion=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.personal.religion')),'null'),Religion),
        Category=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT((p_form_data COLLATE utf8mb4_unicode_ci),'$.personal.category')),'null'),Category)
    WHERE StudentId=p_student_id;
    SET v_new_values=JSON_SET(v_new_values,'$.ScreenForm',(SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id));

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
            'MotherEmail', 'MotherOccupation', 'ScreenForm'
        ),
        v_old_values, v_new_values,
        COALESCE(NULLIF(TRIM((p_change_reason COLLATE utf8mb4_unicode_ci)), ''), 'Student profile updated from the profile screen.'),
        'API', p_changed_by, UTC_TIMESTAMP(6),
        LEFT((p_ip_address COLLATE utf8mb4_unicode_ci), 45), LEFT((p_user_agent COLLATE utf8mb4_unicode_ci), 500)
    );

    COMMIT;
    SELECT 1 AS `Updated`;
END$$

DELIMITER ;
-- END 09_COLLATION_COMPATIBILITY.sql

-- BEGIN CMS API CONTRACT PATCH 2026-09-09
USE cms_btech;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cms_add_student_promotion_column$$
CREATE PROCEDURE sp_cms_add_student_promotion_column(IN p_name VARCHAR(64), IN p_definition VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'student_promotions'
          AND column_name = p_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE student_promotions ADD COLUMN `', p_name, '` ', p_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CALL sp_cms_add_student_promotion_column('from_semester_id', 'BIGINT NULL AFTER from_semester')$$
CALL sp_cms_add_student_promotion_column('to_semester_id', 'BIGINT NULL AFTER to_semester')$$
DROP PROCEDURE sp_cms_add_student_promotion_column$$

DROP PROCEDURE IF EXISTS sp_student_promote_contract$$
CREATE PROCEDURE sp_student_promote_contract(
    IN p_student_id BIGINT,
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
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_created_by IS NULL OR p_created_by <= 0 OR NOT EXISTS (
        SELECT 1 FROM users u
        WHERE u.user_id = p_created_by AND u.status = 1 AND u.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    IF COALESCE(p_manage_transaction, 1) = 1 THEN
        START TRANSACTION;
    END IF;

    SELECT s.college_id, s.course_id, s.branch_id, s.academic_year_id, ay.start_date, c.total_semesters
      INTO v_college_id, v_course_id, v_branch_id, v_from_academic_year_id, v_from_academic_year_start, v_total_semesters
    FROM students s
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id AND ay.deleted_at IS NULL
    INNER JOIN courses c ON c.course_id = s.course_id AND c.deleted_at IS NULL
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
      AND s.status = 1
    LIMIT 1
    FOR UPDATE;

    IF v_from_academic_year_id IS NULL OR v_course_id IS NULL OR v_branch_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student academic mapping is incomplete.';
    END IF;

    SELECT ssa.student_section_assignment_id,
           sec.section_id,
           sec.semester_id,
           COALESCE(sec.semester, sem.semester_number)
      INTO v_from_assignment_id, v_from_section_id, v_from_semester_id, v_from_semester
    FROM student_section_assignments ssa
    INNER JOIN sections sec ON sec.section_id = ssa.section_id AND sec.deleted_at IS NULL
    LEFT JOIN semesters sem ON sem.semester_id = sec.semester_id
    WHERE ssa.student_id = p_student_id
      AND ssa.status = 1
    ORDER BY ssa.assigned_at DESC, ssa.student_section_assignment_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_from_assignment_id IS NULL OR v_from_semester IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The student has no active semester/section assignment.';
    END IF;

    SET v_is_graduation = IF(COALESCE(p_degree_conferred, 0) = 1 OR v_from_semester >= v_total_semesters, 1, 0);

    IF p_target_academic_year_id IS NOT NULL THEN
        SET v_to_academic_year_id = p_target_academic_year_id;
    ELSEIF v_is_graduation = 1 OR MOD(v_from_semester, 2) = 1 THEN
        SET v_to_academic_year_id = v_from_academic_year_id;
    ELSE
        SELECT ay.academic_year_id INTO v_to_academic_year_id
        FROM academicyears ay
        WHERE ay.start_date > v_from_academic_year_start
          AND ay.deleted_at IS NULL
          AND ay.is_archived = 0
        ORDER BY ay.start_date, ay.academic_year_id
        LIMIT 1;
    END IF;

    IF v_to_academic_year_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target academic year could not be resolved.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM academicyears ay
        WHERE ay.academic_year_id = v_to_academic_year_id
          AND ay.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TargetAcademicYearId is invalid.';
    END IF;

    IF v_is_graduation = 1 THEN
        SET v_to_semester_id = COALESCE(p_target_semester_id, v_from_semester_id);
        SET v_to_semester = v_from_semester;
        SET v_to_section_id = NULL;
    ELSE
        SET v_to_semester_id = p_target_semester_id;

        IF v_to_semester_id IS NULL THEN
            SELECT sem.semester_id, sem.semester_number
              INTO v_to_semester_id, v_to_semester
            FROM semesters sem
            WHERE sem.branch_id = v_branch_id
              AND sem.semester_number = v_from_semester + 1
              AND sem.status = 1
              AND sem.is_archived = 0
            ORDER BY sem.semester_id
            LIMIT 1;
        ELSE
            SELECT sem.semester_number
              INTO v_to_semester
            FROM semesters sem
            WHERE sem.semester_id = v_to_semester_id
              AND sem.branch_id = v_branch_id
              AND sem.status = 1
              AND sem.is_archived = 0
            LIMIT 1;
        END IF;

        IF v_to_semester_id IS NULL OR v_to_semester IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TargetSemesterId is invalid for the student branch.';
        END IF;

        IF v_to_semester <> v_from_semester + 1 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target semester must be the immediate next semester.';
        END IF;

        SET v_to_section_id = p_target_section_id;

        IF v_to_section_id IS NULL THEN
            SELECT sec.section_id
              INTO v_to_section_id
            FROM sections sec
            WHERE sec.college_id = v_college_id
              AND sec.academic_year_id = v_to_academic_year_id
              AND sec.course_id = v_course_id
              AND sec.branch_id = v_branch_id
              AND (sec.semester_id = v_to_semester_id OR sec.semester = v_to_semester)
              AND sec.status = 1
              AND sec.is_archived = 0
              AND sec.deleted_at IS NULL
              AND (SELECT COUNT(*) FROM student_section_assignments x WHERE x.section_id = sec.section_id AND x.status = 1) < sec.capacity
            ORDER BY sec.section_id
            LIMIT 1
            FOR UPDATE;
        ELSE
            IF NOT EXISTS (
                SELECT 1 FROM sections sec
                WHERE sec.section_id = v_to_section_id
                  AND sec.college_id = v_college_id
                  AND sec.academic_year_id = v_to_academic_year_id
                  AND sec.course_id = v_course_id
                  AND sec.branch_id = v_branch_id
                  AND (sec.semester_id = v_to_semester_id OR sec.semester = v_to_semester)
                  AND sec.status = 1
                  AND sec.is_archived = 0
                  AND sec.deleted_at IS NULL
                  AND (SELECT COUNT(*) FROM student_section_assignments x WHERE x.section_id = sec.section_id AND x.status = 1) < sec.capacity
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TargetSectionId is invalid, inactive, mismatched, or full.';
            END IF;
        END IF;

        IF v_to_section_id IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No valid target section with capacity is available.';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = v_from_academic_year_id
          AND sp.from_semester = v_from_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND sp.promotion_status IN ('PENDING','APPROVED')
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This student already has a promotion record for the current semester.';
    END IF;

    SELECT COALESCE(MAX(sp.promotion_order), 0) + 1
      INTO v_promotion_order
    FROM student_promotions sp
    WHERE sp.student_id = p_student_id AND sp.deleted_at IS NULL;

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
        v_from_academic_year_id, v_to_academic_year_id,
        v_course_id, v_course_id,
        v_branch_id, v_branch_id,
        v_from_section_id, v_to_section_id,
        v_from_semester, v_from_semester_id,
        v_to_semester, v_to_semester_id,
        'APPROVED', 'APPROVE', UTC_TIMESTAMP(), p_created_by,
        NULLIF(TRIM(p_remarks), ''),
        UPPER(COALESCE(NULLIF(TRIM(p_eligibility_status),''),'ELIGIBLE')),
        CASE WHEN v_is_graduation = 1 THEN 'Degree requirements completed.' ELSE 'Promotion approved.' END,
        CASE WHEN v_is_graduation = 1 THEN 'GRADUATION' ELSE 'SEMESTER' END,
        UTC_TIMESTAMP(), UTC_TIMESTAMP(),
        CASE WHEN v_is_graduation = 1 THEN 'Degree conferred after final semester.' ELSE 'Academic progression.' END,
        UTC_TIMESTAMP(), v_is_graduation, v_promotion_order,
        1, UTC_TIMESTAMP(), p_created_by
    );

    SET v_promotion_id = LAST_INSERT_ID();

    UPDATE student_section_assignments
    SET status = 0, removed_at = UTC_TIMESTAMP(), removed_by = p_created_by
    WHERE student_section_assignment_id = v_from_assignment_id AND status = 1;

    IF v_is_graduation = 0 THEN
        INSERT INTO student_section_assignments(student_id, section_id, academic_year_id, status, assigned_at, assigned_by)
        VALUES(p_student_id, v_to_section_id, v_to_academic_year_id, 1, UTC_TIMESTAMP(), p_created_by);
    END IF;

    UPDATE students
    SET academic_year_id = v_to_academic_year_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_created_by
    WHERE student_id = p_student_id AND deleted_at IS NULL;

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
        IF(sp.promotion_type='GRADUATION', TRUE, FALSE) AS IsGraduated,
        IF(sp.promotion_type='GRADUATION', TRUE, FALSE) AS DegreeConferred,
        CASE WHEN sp.promotion_type='GRADUATION' THEN COALESCE(p_degree_conferred_at, sp.effective_date) ELSE NULL END AS DegreeConferredAt
    FROM student_promotions sp
    INNER JOIN students st ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay ON tay.academic_year_id = sp.to_academic_year_id
    WHERE sp.promotion_id = v_promotion_id;
END$$

DELIMITER ;

-- END CMS API CONTRACT PATCH 2026-09-09
