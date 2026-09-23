USE cms_btech;
DELIMITER $$

-- Safe upgrades for an already-existing database.
DROP PROCEDURE IF EXISTS `sp_cms_add_column_if_missing`$$
CREATE PROCEDURE `sp_cms_add_column_if_missing`(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=p_table AND column_name=p_column) THEN
    SET @ddl = CONCAT('ALTER TABLE `', REPLACE(p_table,'`',''), '` ADD COLUMN `', REPLACE(p_column,'`',''), '` ', p_definition);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
CALL sp_cms_add_column_if_missing('student_parents','guardian_name','VARCHAR(150) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','guardian_mobile','VARCHAR(20) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','guardian_email','VARCHAR(150) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','occupation','VARCHAR(150) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','annual_income','DECIMAL(15,2) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','address','VARCHAR(500) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','city','VARCHAR(100) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','district','VARCHAR(100) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','state','VARCHAR(100) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','pincode','VARCHAR(10) NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','current_address_json','JSON NULL')$$
CALL sp_cms_add_column_if_missing('student_parents','permanent_address_json','JSON NULL')$$
DROP PROCEDURE IF EXISTS `sp_cms_add_column_if_missing`$$

-- Partial academic updates preserve existing values when the frontend omits fields.
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
    IF NOT EXISTS (SELECT 1 FROM studentadmissions WHERE AdmissionId=p_admission_id AND IsDeleted=0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student admission record not found.';
    END IF;
    IF p_previous_percentage IS NOT NULL AND (p_previous_percentage<0 OR p_previous_percentage>100) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Previous percentage must be between 0 and 100.';
    END IF;
    IF p_academic_year_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM academicyears WHERE academic_year_id=p_academic_year_id AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Academic year not found.';
    END IF;
    IF p_course_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM courses WHERE course_id=p_course_id AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course not found.';
    END IF;
    IF p_branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM branches WHERE branch_id=p_branch_id AND deleted_at IS NULL AND (p_course_id IS NULL OR course_id=p_course_id)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Branch is invalid for the selected course.';
    END IF;
    IF p_semester_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM semesters WHERE semester_id=p_semester_id AND is_archived=0
          AND (p_course_id IS NULL OR course_id=p_course_id)
          AND (p_branch_id IS NULL OR branch_id=p_branch_id)
          AND (p_academic_year_id IS NULL OR academic_year_id=p_academic_year_id)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Semester is invalid for the selected course/branch/academic year.';
    END IF;
    IF p_section_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM sections WHERE section_id=p_section_id AND deleted_at IS NULL
          AND (p_course_id IS NULL OR course_id=p_course_id)
          AND (p_branch_id IS NULL OR branch_id=p_branch_id)
          AND (p_semester_id IS NULL OR semester_id=p_semester_id)
          AND (p_academic_year_id IS NULL OR academic_year_id=p_academic_year_id)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section is invalid for the selected academic mapping.';
    END IF;

    UPDATE studentadmissions SET
      AcademicCollegeId=COALESCE(p_college_id,AcademicCollegeId),
      AcademicDepartmentId=COALESCE(p_department_id,AcademicDepartmentId),
      AcademicCourseId=COALESCE(p_course_id,AcademicCourseId),
      AcademicBranchId=COALESCE(p_branch_id,AcademicBranchId),
      AcademicSemesterId=COALESCE(p_semester_id,AcademicSemesterId),
      AdmissionType=COALESCE(NULLIF(TRIM(p_admission_type),''),AdmissionType),
      EntryType=COALESCE(NULLIF(TRIM(p_entry_type),''),EntryType),
      Regulation=COALESCE(NULLIF(TRIM(p_regulation),''),Regulation),
      Batch=COALESCE(NULLIF(TRIM(p_batch),''),Batch),
      BoardId=COALESCE(p_board_id,BoardId),
      AcademicYearId=COALESCE(p_academic_year_id,AcademicYearId),
      AcademicLevelId=COALESCE(p_academic_level_id,AcademicLevelId),
      GroupId=COALESCE(p_group_id,GroupId),
      SectionId=COALESCE(p_section_id,SectionId),
      Medium=COALESCE(NULLIF(TRIM(p_medium),''),Medium),
      SecondLanguage=COALESCE(NULLIF(TRIM(p_second_language),''),SecondLanguage),
      PreviousSchool=COALESCE(NULLIF(TRIM(p_previous_school),''),PreviousSchool),
      PreviousBoard=COALESCE(NULLIF(TRIM(p_previous_board),''),PreviousBoard),
      PreviousYear=COALESCE(NULLIF(TRIM(p_previous_year),''),PreviousYear),
      PreviousPercentage=COALESCE(p_previous_percentage,PreviousPercentage),
      PreviousHallTicket=COALESCE(NULLIF(TRIM(p_previous_hall_ticket),''),PreviousHallTicket),
      UpdatedBy=p_updated_by, UpdatedAt=UTC_TIMESTAMP()
    WHERE AdmissionId=p_admission_id AND IsDeleted=0;
    CALL sp_StudentAdmission_GetAcademicDetails(p_admission_id);
END$$

DROP PROCEDURE IF EXISTS `sp_cms_dependency_impact`$$
CREATE PROCEDURE `sp_cms_dependency_impact`(IN p_entity VARCHAR(40), IN p_id BIGINT)
BEGIN
  IF p_entity='colleges' THEN
    SELECT college_id AS id,status,
      (SELECT COUNT(*) FROM departments WHERE college_id=p_id AND status=1 AND deleted_at IS NULL) activeDepartmentsCount,
      (SELECT COUNT(*) FROM courses WHERE college_id=p_id AND status=1 AND deleted_at IS NULL) activeCoursesCount,
      (SELECT COUNT(*) FROM sections WHERE college_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) activeSectionsCount,
      (SELECT COUNT(*) FROM students WHERE college_id=p_id AND status=1 AND deleted_at IS NULL) activeStudentCount,
      (SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionCollegeId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) activeAdmissionCount,
      ((SELECT COUNT(*) FROM departments WHERE college_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM courses WHERE college_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM sections WHERE college_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(*) FROM students WHERE college_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionCollegeId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')))=0 canDeactivate,
      'BLOCK: active dependencies must be reassigned/deactivated first; no cascade delete.' policy
    FROM colleges WHERE college_id=p_id AND deleted_at IS NULL LIMIT 1;
  ELSEIF p_entity='academic-years' THEN
    SELECT academic_year_id AS id,status,
      (SELECT COUNT(*) FROM semesters WHERE academic_year_id=p_id AND status=1 AND is_archived=0) activeSemestersCount,
      (SELECT COUNT(*) FROM sections WHERE academic_year_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) activeSectionsCount,
      (SELECT COUNT(*) FROM students WHERE academic_year_id=p_id AND status=1 AND deleted_at IS NULL) activeStudentCount,
      (SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AcademicYearId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) activeAdmissionCount,
      ((SELECT COUNT(*) FROM semesters WHERE academic_year_id=p_id AND status=1 AND is_archived=0)+(SELECT COUNT(*) FROM sections WHERE academic_year_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(*) FROM students WHERE academic_year_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AcademicYearId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')))=0 canDeactivate,
      'BLOCK: active dependencies must be reassigned/deactivated first; no cascade delete.' policy
    FROM academicyears WHERE academic_year_id=p_id AND deleted_at IS NULL LIMIT 1;
  ELSEIF p_entity='departments' THEN
    SELECT department_id AS id,status,(SELECT COUNT(*) FROM courses WHERE department_id=p_id AND status=1 AND deleted_at IS NULL) activeCoursesCount,(SELECT COUNT(*) FROM branches WHERE department_id=p_id AND status=1 AND deleted_at IS NULL) activeBranchesCount,(SELECT COUNT(*) FROM sections WHERE department_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id) studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id AND status=1) activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionDepartmentId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) activeAdmissionCount,((SELECT COUNT(*) FROM courses WHERE department_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM branches WHERE department_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM sections WHERE department_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE department_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionDepartmentId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')))=0 canDeactivate,'BLOCK: active dependencies must be reassigned/deactivated first; no cascade delete.' policy FROM departments WHERE department_id=p_id AND deleted_at IS NULL LIMIT 1;
  ELSEIF p_entity='courses' THEN
    SELECT course_id AS id,status,(SELECT COUNT(*) FROM branches WHERE course_id=p_id AND status=1 AND deleted_at IS NULL) activeBranchesCount,(SELECT COUNT(*) FROM semesters WHERE course_id=p_id AND status=1 AND is_archived=0) activeSemestersCount,(SELECT COUNT(*) FROM sections WHERE course_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id) studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id AND status=1) activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionCourseId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) activeAdmissionCount,((SELECT COUNT(*) FROM branches WHERE course_id=p_id AND status=1 AND deleted_at IS NULL)+(SELECT COUNT(*) FROM semesters WHERE course_id=p_id AND status=1 AND is_archived=0)+(SELECT COUNT(*) FROM sections WHERE course_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE course_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionCourseId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')))=0 canDeactivate,'BLOCK: active dependencies must be reassigned/deactivated first; no cascade delete.' policy FROM courses WHERE course_id=p_id AND deleted_at IS NULL LIMIT 1;
  ELSEIF p_entity='branches' THEN
    SELECT branch_id AS id,status,(SELECT COUNT(*) FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0) activeSemestersCount,(SELECT COUNT(*) FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id) studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id AND status=1) activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) activeAdmissionCount,((SELECT COUNT(*) FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0)+(SELECT COUNT(*) FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE branch_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')))=0 canDeactivate,'BLOCK: active dependencies must be reassigned/deactivated first; no cascade delete.' policy FROM branches WHERE branch_id=p_id AND deleted_at IS NULL LIMIT 1;
  ELSEIF p_entity='semesters' THEN
    SELECT semester_id AS id,status,(SELECT COUNT(*) FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0) activeSectionsCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id) studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id AND status=1) activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) activeAdmissionCount,((SELECT COUNT(*) FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)+(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE semester_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')))=0 canDeactivate,'BLOCK: active dependencies must be reassigned/deactivated first; no cascade delete.' policy FROM semesters WHERE semester_id=p_id AND is_archived=0 LIMIT 1;
  ELSEIF p_entity='sections' THEN
    SELECT section_id AS id,status,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id) studentCount,(SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id AND status=1) activeStudentCount,(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SectionId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) activeAdmissionCount,((SELECT COUNT(DISTINCT student_id) FROM vw_cms_student_links WHERE section_id=p_id AND status=1)+(SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SectionId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')))=0 canDeactivate,'BLOCK: active dependencies must be reassigned/deactivated first; no cascade delete.' policy FROM sections WHERE section_id=p_id AND deleted_at IS NULL LIMIT 1;
  ELSEIF p_entity='students' THEN
    SELECT student_id AS id,status,0 studentCount,0 activeStudentCount,0 activeAdmissionCount,TRUE canDeactivate,'Student status can be changed without deleting history.' policy FROM students WHERE student_id=p_id AND deleted_at IS NULL LIMIT 1;
  ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported dependency entity.';
  END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_cms_status_update`$$
CREATE PROCEDURE `sp_cms_status_update`(IN p_entity VARCHAR(40),IN p_id BIGINT,IN p_status TINYINT,IN p_actor BIGINT)
BEGIN
  DECLARE v_blockers INT DEFAULT 0;
  IF p_status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
  IF p_entity='branch' THEN
    IF p_status=0 THEN
      SELECT (SELECT COUNT(*) FROM semesters WHERE branch_id=p_id AND status=1 AND is_archived=0)
           + (SELECT COUNT(*) FROM sections WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)
           + (SELECT COUNT(*) FROM students WHERE branch_id=p_id AND status=1 AND deleted_at IS NULL)
           + (SELECT COUNT(*) FROM vw_cms_admission_directory WHERE AdmissionBranchId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) INTO v_blockers;
      IF v_blockers>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Branch cannot be deactivated while active semesters, sections, students, or admissions depend on it.'; END IF;
    END IF;
    UPDATE branches SET status=p_status,updated_by=p_actor,updated_at=UTC_TIMESTAMP() WHERE branch_id=p_id AND deleted_at IS NULL;
  ELSEIF p_entity='semester' THEN
    IF p_status=0 THEN
      SELECT (SELECT COUNT(*) FROM sections WHERE semester_id=p_id AND status=1 AND deleted_at IS NULL AND is_archived=0)
           + (SELECT COUNT(*) FROM vw_cms_student_links WHERE semester_id=p_id AND status=1)
           + (SELECT COUNT(*) FROM vw_cms_admission_directory WHERE SemesterId=p_id AND IsDeleted=0 AND IsActive=1 AND AdmissionStatus NOT IN('Rejected','Cancelled','Withdrawn')) INTO v_blockers;
      IF v_blockers>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Semester cannot be deactivated while active sections, students, or admissions depend on it.'; END IF;
    END IF;
    UPDATE semesters SET status=p_status,updated_by=p_actor,updated_at=UTC_TIMESTAMP() WHERE semester_id=p_id AND is_archived=0;
  ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Unsupported status entity.';
  END IF;
  SELECT ROW_COUNT() AS affectedRows;
END$$

DELIMITER ;
