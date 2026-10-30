DROP PROCEDURE IF EXISTS sp_section_exists;
DELIMITER $$

CREATE PROCEDURE sp_section_exists
(
    IN p_academic_year_id BIGINT,
    IN p_department_id BIGINT, -- Retained for compatibility; not part of uniqueness.
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
      AND course_id <=> p_course_id
      AND branch_id <=> p_branch_id
      AND semester_id <=> p_semester_id
      AND LOWER(TRIM(section_code)) COLLATE utf8mb4_0900_ai_ci
          = LOWER(TRIM(p_section_code)) COLLATE utf8mb4_0900_ai_ci
      AND is_archived = 0
      AND deleted_at IS NULL
      AND
      (
          p_exclude_section_id IS NULL
          OR section_id <> p_exclude_section_id
      );

END $$

DELIMITER ;
