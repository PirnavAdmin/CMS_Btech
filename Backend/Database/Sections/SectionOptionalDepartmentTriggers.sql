DROP TRIGGER IF EXISTS trg_cms_sections_insert;
DELIMITER $$
CREATE TRIGGER `trg_cms_sections_insert` BEFORE INSERT ON `sections` FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF NEW.status=1 THEN IF NEW.department_id IS NOT NULL THEN
    CALL sp_cms_require_active('department',NEW.department_id);
    IF NOT EXISTS (SELECT 1 FROM departments WHERE department_id=NEW.department_id AND college_id=NEW.college_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Department does not belong to the selected college.';
    END IF;
END IF; IF NEW.course_id IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.course_id);
IF NOT EXISTS (SELECT 1 FROM courses WHERE course_id=NEW.course_id AND college_id=NEW.college_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course does not belong to the selected college.';
END IF; END IF; IF NEW.branch_id IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section branch must belong to the selected course.'; END IF; END IF; IF NEW.semester_id IS NOT NULL THEN CALL sp_cms_require_active('semester',NEW.semester_id); IF NOT EXISTS(SELECT 1 FROM semesters WHERE semester_id=NEW.semester_id AND course_id=NEW.course_id AND branch_id=NEW.branch_id AND academic_year_id=NEW.academic_year_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section semester must match course, branch and academic year.'; END IF; END IF; END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_cms_sections_update;
DELIMITER $$
CREATE TRIGGER `trg_cms_sections_update` BEFORE UPDATE ON `sections` FOR EACH ROW BEGIN
IF NEW.status NOT IN(0,1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Status must be 0 or 1.'; END IF;
IF (OLD.status=1 AND NEW.status=0) OR (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN CALL sp_cms_check_deactivation('section',OLD.section_id); END IF;
IF NEW.status=1 AND (OLD.status<>1 OR NOT(NEW.college_id<=>OLD.college_id) OR NOT(NEW.department_id<=>OLD.department_id) OR NOT(NEW.course_id<=>OLD.course_id) OR NOT(NEW.branch_id<=>OLD.branch_id) OR NOT(NEW.semester_id<=>OLD.semester_id) OR NOT(NEW.academic_year_id<=>OLD.academic_year_id)) THEN IF NEW.department_id IS NOT NULL THEN
    CALL sp_cms_require_active('department',NEW.department_id);
    IF NOT EXISTS (SELECT 1 FROM departments WHERE department_id=NEW.department_id AND college_id=NEW.college_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Department does not belong to the selected college.';
    END IF;
END IF; IF NEW.course_id IS NOT NULL THEN CALL sp_cms_require_active('course',NEW.course_id);
IF NOT EXISTS (SELECT 1 FROM courses WHERE course_id=NEW.course_id AND college_id=NEW.college_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Course does not belong to the selected college.';
END IF; END IF; IF NEW.branch_id IS NOT NULL THEN CALL sp_cms_require_active('branch',NEW.branch_id); IF NOT EXISTS(SELECT 1 FROM branches WHERE branch_id=NEW.branch_id AND course_id=NEW.course_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section branch must belong to the selected course.'; END IF; END IF; IF NEW.semester_id IS NOT NULL THEN CALL sp_cms_require_active('semester',NEW.semester_id); IF NOT EXISTS(SELECT 1 FROM semesters WHERE semester_id=NEW.semester_id AND course_id=NEW.course_id AND branch_id=NEW.branch_id AND academic_year_id=NEW.academic_year_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Section semester must match course, branch and academic year.'; END IF; END IF; END IF;
END$$
DELIMITER ;
