DROP PROCEDURE IF EXISTS sp_Department_RemoveHod;

DELIMITER $$

CREATE PROCEDURE sp_Department_RemoveHod
(
    IN p_department_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM departments
        WHERE department_id = p_department_id
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Department not found.';

    END IF;


    UPDATE departments

    SET
        hod_employee_profile_id = NULL,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by

    WHERE department_id = p_department_id;


    SELECT
        department_id AS DepartmentId,
        department_name AS DepartmentName,
        hod_employee_profile_id AS HodEmployeeProfileId

    FROM departments

    WHERE department_id = p_department_id;

END $$

DELIMITER ;