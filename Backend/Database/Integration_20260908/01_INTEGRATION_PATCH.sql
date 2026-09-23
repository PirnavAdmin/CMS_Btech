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
