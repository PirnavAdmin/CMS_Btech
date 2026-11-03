-- Run on an ISOLATED RESTORED COPY of the supplied dump after applying the update.
-- These checks create test sections inside a transaction and roll them back.
USE cms_btech;
DROP PROCEDURE IF EXISTS qa_section_assert;
DROP PROCEDURE IF EXISTS qa_section_expect_error;
DROP TEMPORARY TABLE IF EXISTS qa_section_results;
CREATE TEMPORARY TABLE qa_section_results(test_name VARCHAR(140), result VARCHAR(10));
DELIMITER $$
CREATE PROCEDURE qa_section_assert(IN p_name VARCHAR(140), IN p_ok BOOLEAN)
BEGIN
    IF p_ok IS NULL OR p_ok = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = p_name;
    END IF;
    INSERT INTO qa_section_results VALUES (p_name, 'PASS');
END$$
CREATE PROCEDURE qa_section_expect_error(IN p_name VARCHAR(140), IN p_sql LONGTEXT, IN p_message VARCHAR(120))
BEGIN
    DECLARE v_state CHAR(5) DEFAULT NULL;
    DECLARE v_message TEXT;
    SET @qa_sql = p_sql;
    PREPARE qa_stmt FROM @qa_sql;
    BEGIN
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
            GET DIAGNOSTICS CONDITION 1 v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
        EXECUTE qa_stmt;
    END;
    DEALLOCATE PREPARE qa_stmt;
    CALL qa_section_assert(p_name, COALESCE(v_state = '45000' AND LOCATE(p_message, v_message) > 0, FALSE));
END$$
DELIMITER ;
CALL qa_section_assert('XYZ current mapped year restored', EXISTS(SELECT 1 FROM academicyears WHERE academic_year_id=45 AND college_id=95 AND status=1 AND is_archived=0));
CALL qa_section_assert('XYZ future year retained as upcoming', EXISTS(SELECT 1 FROM academicyears WHERE academic_year_id=51 AND college_id=95 AND status=0 AND is_archived=0));
CALL qa_section_assert('SRI current year activated', EXISTS(SELECT 1 FROM academicyears WHERE academic_year_id=39 AND college_id=92 AND status=1 AND is_archived=0));
CALL qa_section_assert('At most one active year per college', NOT EXISTS(SELECT college_id FROM academicyears WHERE status=1 AND is_archived=0 AND deleted_at IS NULL GROUP BY college_id HAVING COUNT(*)>1));
START TRANSACTION;
CALL sp_section_create(95,45,NULL,29,25,188,'QA-XYZ-S1-A','QA Section A',60,2);
SET @qa_section_id = LAST_INSERT_ID();
CALL qa_section_assert('Create XYZ section with null department', EXISTS(SELECT 1 FROM sections WHERE section_id=@qa_section_id AND college_id=95 AND academic_year_id=45 AND department_id IS NULL AND semester_id=188));
CALL sp_section_get_by_id(@qa_section_id);
CALL qa_section_expect_error('Duplicate code rejected', 'CALL sp_section_create(95,45,NULL,29,25,188,\' qa-xyz-s1-a \',\'Duplicate\',60,2)', 'already exists');
CALL qa_section_expect_error('Foreign college academic year rejected', 'CALL sp_section_create(95,39,NULL,29,25,188,\'QA-X\',\'Cross year\',60,2)', 'does not belong');
CALL qa_section_expect_error('Upcoming year rejected', 'CALL sp_section_create(95,51,NULL,29,25,188,\'QA-X\',\'Future year\',60,2)', 'Activate');
CALL qa_section_expect_error('Archived year rejected', 'CALL sp_section_create(95,49,NULL,29,25,188,\'QA-X\',\'Archived year\',60,2)', 'Activate');
CALL qa_section_expect_error('Missing year rejected', 'CALL sp_section_create(95,99999,NULL,29,25,188,\'QA-X\',\'Missing year\',60,2)', 'does not belong');
CALL qa_section_expect_error('Foreign college course rejected', 'CALL sp_section_create(95,45,NULL,1,25,188,\'QA-X\',\'Cross course\',60,2)', 'Course does not belong');
CALL qa_section_expect_error('Wrong branch rejected', 'CALL sp_section_create(95,45,NULL,29,22,188,\'QA-X\',\'Cross branch\',60,2)', 'Branch does not belong');
CALL qa_section_expect_error('Wrong semester rejected', 'CALL sp_section_create(95,45,NULL,29,25,171,\'QA-X\',\'Cross semester\',60,2)', 'Semester does not match');
CALL qa_section_expect_error('Invalid capacity rejected', 'CALL sp_section_create(95,45,NULL,29,25,188,\'QA-X\',\'Zero capacity\',0,2)', 'capacity');
CALL sp_section_update(@qa_section_id,29,25,45,188,'QA Section Updated','QA-XYZ-S1-A',65,NULL,NULL,NULL,NULL,1,2);
CALL qa_section_assert('Legacy mapping update works with own active year', EXISTS(SELECT 1 FROM sections WHERE section_id=@qa_section_id AND section_name='QA Section Updated' AND capacity=65));
SET @qa_bad_update = CONCAT('CALL sp_section_update(', @qa_section_id, ',29,25,39,188,\'QA Section\',\'QA-XYZ-S1-A\',65,NULL,NULL,NULL,NULL,1,2)');
CALL qa_section_expect_error('Legacy update foreign year rejected', @qa_bad_update, 'Activate');
CALL sp_section_update_details(@qa_section_id,'QA Section Details','QA-XYZ-S1-A',70,NULL,'QA-101',NULL,NULL,1,2);
CALL qa_section_assert('Existing details update preserved', EXISTS(SELECT 1 FROM sections WHERE section_id=@qa_section_id AND room='QA-101' AND capacity=70 AND department_id IS NULL));
CALL sp_section_create(92,39,NULL,27,22,171,'QA-SRI-S2-A','QA SRI Section',60,2);
CALL qa_section_assert('Create SRI section with own active year', EXISTS(SELECT 1 FROM sections WHERE section_id=LAST_INSERT_ID() AND college_id=92 AND academic_year_id=39));
-- Temporary results must survive the rollback of test business rows.
SELECT test_name, result FROM qa_section_results;
ROLLBACK;
DROP PROCEDURE qa_section_assert;
DROP PROCEDURE qa_section_expect_error;
