-- Read-only diagnostic: check the role assigned to the account that is logging in.
-- Run against the same cms_btech database used by the API.
-- Replace the value below with the login email OR employee_user_id.
-- This script does not modify any data.

USE cms_btech;

SET @login_identifier = 'REPLACE_WITH_LOGIN_EMAIL_OR_EMPLOYEE_USER_ID';

SELECT
    u.user_id,
    u.employee_user_id,
    u.email,
    u.college_id AS user_college_id,
    u.status AS user_status,
    u.deleted_at AS user_deleted_at,
    ur.user_role_id,
    ur.status AS user_role_status,
    ur.removed_at,
    r.role_id,
    r.role_name,
    r.role_code,
    r.status AS role_status,
    r.deleted_at AS role_deleted_at
FROM users AS u
LEFT JOIN user_roles AS ur
    ON ur.user_id = u.user_id
LEFT JOIN roles AS r
    ON r.role_id = ur.role_id
WHERE u.email = @login_identifier
   OR u.employee_user_id = @login_identifier
ORDER BY ur.user_role_id;

-- For SuperAdmin access, the intended account must have an active assignment:
-- role_code = 'SUPER_ADMIN', user_role_status = 1, removed_at IS NULL,
-- role_status = 1, role_deleted_at IS NULL, and the user itself active.
-- Do not grant SuperAdmin to an account unless that access is authorized.
