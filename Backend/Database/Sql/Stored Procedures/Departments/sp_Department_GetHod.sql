DROP PROCEDURE IF EXISTS sp_Department_GetHod;

DELIMITER $$

CREATE PROCEDURE sp_Department_GetHod
(
    IN p_department_id BIGINT
)
BEGIN

    SELECT
        d.department_id AS DepartmentId,
        d.department_name AS DepartmentName,

        ep.employee_profile_id AS HodEmployeeProfileId,

        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS HodName,
        u.email AS Email,
        u.mobile AS Mobile,

        ep.designation AS Designation

    FROM departments d

    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
           d.hod_employee_profile_id
        AND ep.deleted_at IS NULL

    LEFT JOIN users u
        ON u.user_id = ep.user_id
        AND u.deleted_at IS NULL

    WHERE d.department_id = p_department_id
      AND d.deleted_at IS NULL
      AND d.status = 1;

END $$

DELIMITER ;