DROP PROCEDURE IF EXISTS sp_elective_group_delete;

DELIMITER $$

CREATE PROCEDURE sp_elective_group_delete
(
    IN p_college_id BIGINT,
    IN p_elective_group_id BIGINT
)
BEGIN
    UPDATE elective_groups
    SET status = 0,
        deleted_at = CURRENT_TIMESTAMP
    WHERE college_id = p_college_id
      AND elective_group_id = p_elective_group_id
      AND deleted_at IS NULL;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Elective group not found';
    END IF;
END$$

DELIMITER ;