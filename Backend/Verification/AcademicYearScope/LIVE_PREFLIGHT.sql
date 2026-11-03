-- READ-ONLY. Run against the deployed database after setting the actual user ID.
-- Do not paste passwords or JWTs into this script. Do not execute blindly as a migration.
SET @user_id = 0; -- replace with the affected authenticated user's user_id
SELECT u.user_id, u.college_id AS primary_college_id, u.status AS user_status,
       r.role_code, r.status AS role_status, ur.status AS assignment_status,
       ur.removed_at, r.deleted_at AS role_deleted_at
FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.user_id
LEFT JOIN roles r ON r.role_id=ur.role_id
WHERE u.user_id=@user_id;
SELECT m.user_id, m.status AS mapping_status, m.removed_at,
       cs.college_setting_id, cs.college_id, cs.status AS settings_status,
       c.status AS college_status, c.deleted_at AS college_deleted_at
FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
JOIN colleges c ON c.college_id=cs.college_id WHERE m.user_id=@user_id;
SELECT r.role_code, rp.college_id, rp.module_key, rp.can_view, rp.can_create, rp.can_edit
FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
JOIN role_permissions rp ON rp.role_id=r.role_id
WHERE ur.user_id=@user_id AND ur.status=1 AND ur.removed_at IS NULL
  AND r.status=1 AND r.deleted_at IS NULL AND rp.module_key='academic_years'
  AND (rp.college_id IS NULL OR rp.college_id=82);
SHOW CREATE TABLE academicyears;
SELECT index_name, non_unique, seq_in_index, column_name
FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='academicyears'
ORDER BY index_name, seq_in_index;
