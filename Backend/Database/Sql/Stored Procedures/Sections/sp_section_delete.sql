DROP PROCEDURE IF EXISTS sp_section_delete;

DELIMITER $$

CREATE PROCEDURE sp_section_delete
(
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

END $$

DELIMITER ;