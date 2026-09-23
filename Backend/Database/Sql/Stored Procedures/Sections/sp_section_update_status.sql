DROP PROCEDURE IF EXISTS sp_section_update_status;

DELIMITER $$

CREATE PROCEDURE sp_section_update_status
(
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

END $$

DELIMITER ;