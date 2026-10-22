-- Run after 04_College_AcademicYears.sql against the application database.
-- Assign the existing 2026-2027 year only to B.Tech. Never create or copy a year.
-- Ambiguous names or existing ownership stop the migration without changes.
DROP PROCEDURE IF EXISTS assign_btech_academic_year;
DELIMITER $$
CREATE PROCEDURE assign_btech_academic_year()
BEGIN
    DECLARE target_college BIGINT;
    DECLARE target_year BIGINT;
    DECLARE matches INT;
    DECLARE existing_owner BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT COUNT(*), MIN(college_id) INTO matches, target_college
    FROM colleges
    WHERE LOWER(REPLACE(REPLACE(REPLACE(TRIM(college_name), '.', ''), '-', ''), ' ', ''))
        IN ('btech', 'btechcollege', 'btechcollegeofengineering');
    IF matches <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected exactly one B.Tech college. Verify college_name before assigning the year.';
    END IF;

    SELECT COUNT(*), MIN(academic_year_id) INTO matches, target_year
    FROM academicyears
    WHERE deleted_at IS NULL
      AND REPLACE(TRIM(academic_year_name), ' ', '') IN ('2026-2027', '2026-27')
      AND (college_id IS NULL OR college_id = target_college);
    IF matches <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected exactly one existing unassigned or B.Tech 2026-2027 academic year.';
    END IF;

    SELECT college_id INTO existing_owner FROM academicyears
    WHERE academic_year_id = target_year FOR UPDATE;
    IF existing_owner IS NOT NULL AND existing_owner <> target_college THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year already belongs to another college.';
    END IF;

    UPDATE academicyears SET college_id = target_college
    WHERE academic_year_id = target_year AND college_id IS NULL;
    COMMIT;

    SELECT academic_year_id, college_id, academic_year_name
    FROM academicyears WHERE academic_year_id = target_year;
END$$
DELIMITER ;
CALL assign_btech_academic_year();
DROP PROCEDURE assign_btech_academic_year;
