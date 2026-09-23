DELIMITER $$

CREATE PROCEDURE sp_section_exists
(
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
      AND LOWER(section_code) = LOWER(TRIM(p_section_code))
      AND is_archived = 0
      AND
      (
          p_exclude_section_id IS NULL
          OR section_id <> p_exclude_section_id
      );

END $$

DELIMITER ;