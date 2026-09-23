DELIMITER $$

CREATE PROCEDURE sp_section_get_current_strength
(
    IN p_section_id BIGINT
)
BEGIN

    SELECT COUNT(*) AS CurrentStrength

    FROM student_sections

    WHERE section_id = p_section_id
      AND is_active = 1;

END $$

DELIMITER ;