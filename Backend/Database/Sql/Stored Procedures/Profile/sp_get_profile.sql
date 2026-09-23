DELIMITER $$

CREATE PROCEDURE sp_get_profile(
    IN p_user_id BIGINT
)
BEGIN

    SELECT
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        u.email AS Email,
        u.mobile AS Mobile,
        u.college_id AS CollegeId,
        u.last_login_at AS LastLoginAt,

        ep.employee_profile_id AS EmployeeProfileId,
        ep.date_of_birth AS DateOfBirth,
        ep.gender AS Gender,
        ep.department_id AS DepartmentId,
        ep.designation AS Designation,
        ep.address AS Address,
        ep.pincode AS Pincode,
        ep.city AS City,
        ep.district AS District,
        ep.state AS State,
        ep.about_me AS AboutMe,
        ep.profile_image_path AS ProfileImagePath

    FROM users u

    LEFT JOIN employee_profiles ep
        ON ep.user_id = u.user_id
        AND ep.deleted_at IS NULL

    WHERE u.user_id = p_user_id
      AND u.deleted_at IS NULL;

END$$

DELIMITER ;