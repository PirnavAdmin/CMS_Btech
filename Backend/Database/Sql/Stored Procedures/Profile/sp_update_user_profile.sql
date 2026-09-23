DELIMITER $$

CREATE PROCEDURE sp_update_user_profile(
    IN p_user_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(15)
)
BEGIN

    UPDATE users
    SET
        full_name = COALESCE(p_full_name, full_name),
        email = COALESCE(p_email, email),
        mobile = COALESCE(p_mobile, mobile),
        updated_at = UTC_TIMESTAMP()
    WHERE user_id = p_user_id
      AND deleted_at IS NULL;

END$$

DELIMITER ;