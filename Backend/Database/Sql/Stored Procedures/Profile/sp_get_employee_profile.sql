DELIMITER $$

CREATE PROCEDURE sp_get_employee_profile(
    IN p_user_id BIGINT
)
BEGIN

    SELECT
        employee_profile_id AS EmployeeProfileId,
        user_id AS UserId,
        date_of_birth AS DateOfBirth,
        gender AS Gender,
        department_id AS DepartmentId,
        designation AS Designation,
        address AS Address,
        pincode AS Pincode,
        city AS City,
        district AS District,
        state AS State,
        about_me AS AboutMe,
        profile_image_path AS ProfileImagePath,
        status AS Status,
        created_at AS CreatedAt,
        updated_at AS UpdatedAt
    FROM employee_profiles
    WHERE user_id = p_user_id
      AND deleted_at IS NULL
    LIMIT 1;

END$$

DELIMITER ;