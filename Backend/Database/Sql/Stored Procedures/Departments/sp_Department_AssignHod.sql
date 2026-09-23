DROP PROCEDURE IF EXISTS sp_Department_AssignHod;

DELIMITER $$

CREATE PROCEDURE sp_Department_AssignHod
(
    IN p_department_id BIGINT,
    IN p_employee_profile_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN

    DECLARE v_department_exists INT DEFAULT 0;
    DECLARE v_employee_exists INT DEFAULT 0;
    DECLARE v_employee_department_id BIGINT;
    DECLARE v_user_id BIGINT;
    DECLARE v_hod_role_exists INT DEFAULT 0;

    /* -----------------------------------------
       1. Validate Department
       ----------------------------------------- */

    SELECT COUNT(*)
    INTO v_department_exists

    FROM departments

    WHERE department_id = p_department_id
      AND status = 1
      AND deleted_at IS NULL;

    IF v_department_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department not found or inactive.';

    END IF;


    /* -----------------------------------------
       2. Validate Employee Profile
       ----------------------------------------- */

    SELECT
        department_id,
        user_id

    INTO
        v_employee_department_id,
        v_user_id

    FROM employee_profiles

    WHERE employee_profile_id = p_employee_profile_id
      AND status = 1
      AND deleted_at IS NULL

    LIMIT 1;


    IF v_user_id IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee profile not found or inactive.';

    END IF;


    /* -----------------------------------------
       3. Employee must belong to department
       ----------------------------------------- */

    IF v_employee_department_id <> p_department_id THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Employee does not belong to the selected department.';

    END IF;


    /* -----------------------------------------
       4. User must be active
       ----------------------------------------- */

    IF NOT EXISTS
    (
        SELECT 1
        FROM users
        WHERE user_id = v_user_id
          AND status = 1
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee user account is inactive.';

    END IF;


    /* -----------------------------------------
       5. Employee must have HOD role
       ----------------------------------------- */

    SELECT COUNT(*)
    INTO v_hod_role_exists

    FROM user_roles ur

    INNER JOIN roles r
        ON r.role_id = ur.role_id

    WHERE ur.user_id = v_user_id
      AND ur.status = 1

      AND r.role_code = 'HOD'
      AND r.status = 1
      AND r.deleted_at IS NULL;


    IF v_hod_role_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Selected employee does not have HOD role.';

    END IF;


    /* -----------------------------------------
       6. Assign / Change HOD
       ----------------------------------------- */

    UPDATE departments

    SET
        hod_employee_profile_id = p_employee_profile_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by

    WHERE department_id = p_department_id;


    /* -----------------------------------------
       7. Return updated HOD
       ----------------------------------------- */

    SELECT

        d.department_id AS DepartmentId,

        d.department_name AS DepartmentName,

        ep.employee_profile_id AS HodEmployeeProfileId,

        u.user_id AS UserId,

        u.employee_user_id AS EmployeeUserId,

        u.full_name AS FullName,

        u.email AS Email,

        u.mobile AS Mobile,

        ep.designation AS Designation

    FROM departments d

    INNER JOIN employee_profiles ep
        ON ep.employee_profile_id =
           d.hod_employee_profile_id

    INNER JOIN users u
        ON u.user_id = ep.user_id

    WHERE d.department_id = p_department_id;

END $$

DELIMITER ;