DELIMITER $$

CREATE PROCEDURE sp_update_employee_profile(
    IN p_user_id BIGINT,
    IN p_date_of_birth DATE,
    IN p_gender VARCHAR(20),
    IN p_department_id BIGINT,
    IN p_designation VARCHAR(150),
    IN p_address VARCHAR(500),
    IN p_pincode VARCHAR(10),
    IN p_city VARCHAR(100),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_about_me VARCHAR(1000)
)
BEGIN

    UPDATE employee_profiles
    SET
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        gender = COALESCE(p_gender, gender),
        department_id = COALESCE(p_department_id, department_id),
        designation = COALESCE(p_designation, designation),
        address = COALESCE(p_address, address),
        pincode = COALESCE(p_pincode, pincode),
        city = COALESCE(p_city, city),
        district = COALESCE(p_district, district),
        state = COALESCE(p_state, state),
        about_me = COALESCE(p_about_me, about_me),
        updated_at = UTC_TIMESTAMP()
    WHERE user_id = p_user_id
      AND deleted_at IS NULL;

END$$

DELIMITER ;