-- CMS College Admin setup access repair (MySQL 8; direct SQL, no EF migration).
-- Select your existing CMS database in Workbench before running this entire file.
-- Existing business data, passwords, roles and existing permission rows are preserved.
-- Missing college-scoped permission rows copy the creator's primary-college ceiling.
-- Repairs ONLY missing mappings for active colleges created by active ADM002.
-- Existing inactive/removed mappings are deliberately NOT reactivated.
-- New college creation calls the procedure below in the SAME backend transaction.
-- DDL creates/replaces only these two patch-owned procedures; MySQL DDL autocommits.
-- Apply SQL BEFORE starting the updated backend. Take your normal DB backup first.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

DELIMITER $$
DROP PROCEDURE IF EXISTS sp_College_ProvisionCreatorAccess$$
CREATE PROCEDURE sp_College_ProvisionCreatorAccess(IN p_college_id BIGINT, IN p_user_id BIGINT)
proc: BEGIN
    DECLARE v_setting_id BIGINT DEFAULT NULL;
    -- No automatic elevation: active College Admin assignment and recorded creation
    -- ownership are both required. Super Admin already has explicit system access.
    IF p_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id=u.user_id
        JOIN roles r ON r.role_id=ur.role_id
        WHERE u.user_id=p_user_id AND u.status=1 AND u.deleted_at IS NULL
          AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL
          AND UPPER(REPLACE(REPLACE(TRIM(r.role_code),' ','_'),'-','_'))
              IN ('COLLEGE_ADMIN','COLLEGEADMIN','COLLEGE_ADMINISTRATOR','ADMIN')
    ) THEN LEAVE proc; END IF;
    IF NOT EXISTS (SELECT 1 FROM colleges WHERE college_id=p_college_id
                   AND created_by=p_user_id AND status=1 AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Creator access requires an active college created by this account.';
    END IF;

    INSERT INTO college_settings
        (college_id,college_name,college_code,college_email,phone_number,website,
         address_line1,address_line2,city,state,pincode,institution_type,time_zone,status,created_by)
    SELECT c.college_id,c.college_name,c.college_code,c.email,COALESCE(c.phone,c.mobile),LEFT(c.website,200),
           c.address_line1,c.address_line2,c.city,c.state,c.pincode,c.college_type,c.timezone,1,p_user_id
    FROM colleges c WHERE c.college_id=p_college_id
      AND NOT EXISTS (SELECT 1 FROM college_settings cs WHERE cs.college_id=c.college_id);

    SELECT college_setting_id INTO v_setting_id FROM college_settings
    WHERE college_id=p_college_id LIMIT 1;
    IF v_setting_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='College settings could not be created; creator access was not saved.';
    END IF;
    -- Preserve the creator's effective ceiling. In particular, a primary-college
    -- scoped deny must not turn into a global allow merely by creating a college.
    -- Existing target rows (including explicit denies) are never overwritten.
    INSERT INTO role_permissions
        (role_id,college_id,module_key,can_view,can_create,can_edit,can_delete,can_export,created_by)
    SELECT r.role_id,p_college_id,pm.module_key,
        CASE WHEN src.role_permission_id IS NOT NULL THEN src.can_view ELSE COALESCE(g.can_view,0) END,
        CASE WHEN src.role_permission_id IS NOT NULL THEN src.can_create ELSE COALESCE(g.can_create,0) END,
        CASE WHEN src.role_permission_id IS NOT NULL THEN src.can_edit ELSE COALESCE(g.can_edit,0) END,
        CASE WHEN src.role_permission_id IS NOT NULL THEN src.can_delete ELSE COALESCE(g.can_delete,0) END,
        CASE WHEN src.role_permission_id IS NOT NULL THEN src.can_export ELSE COALESCE(g.can_export,0) END,
        p_user_id
    FROM users u JOIN user_roles ur ON ur.user_id=u.user_id AND ur.status=1 AND ur.removed_at IS NULL
    JOIN roles r ON r.role_id=ur.role_id AND r.status=1 AND r.deleted_at IS NULL AND r.college_id IS NULL
    CROSS JOIN permission_modules pm
    LEFT JOIN role_permissions src ON src.role_id=r.role_id AND src.module_key=pm.module_key AND src.college_id=u.college_id
    LEFT JOIN role_permissions g ON g.role_id=r.role_id AND g.module_key=pm.module_key AND g.college_id IS NULL
    LEFT JOIN role_permissions target ON target.role_id=r.role_id AND target.module_key=pm.module_key AND target.college_id=p_college_id
    WHERE u.user_id=p_user_id AND pm.status=1 AND target.role_permission_id IS NULL
      AND (src.role_permission_id IS NOT NULL OR g.role_permission_id IS NOT NULL);

    INSERT INTO college_user_mappings (user_id,college_setting_id,status,assigned_by)
    SELECT p_user_id,v_setting_id,1,p_user_id
    WHERE NOT EXISTS (SELECT 1 FROM college_user_mappings
                      WHERE user_id=p_user_id AND college_setting_id=v_setting_id);
END$$

DROP PROCEDURE IF EXISTS sp_CMS_Repair_ADM002_CreatorAccess_20261030$$
CREATE PROCEDURE sp_CMS_Repair_ADM002_CreatorAccess_20261030()
BEGIN
    DECLARE v_user_id BIGINT DEFAULT NULL;
    DECLARE v_college_id BIGINT;
    DECLARE v_done INT DEFAULT 0;
    DECLARE colleges_to_repair CURSOR FOR
        SELECT c.college_id FROM colleges c
        WHERE c.created_by=v_user_id AND c.status=1 AND c.deleted_at IS NULL
        ORDER BY c.college_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done=1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

    START TRANSACTION;
    SELECT user_id INTO v_user_id FROM users
    WHERE UPPER(employee_user_id COLLATE utf8mb4_unicode_ci)='ADM002'
      AND status=1 AND deleted_at IS NULL LIMIT 1;
    IF v_user_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Active ADM002 account was not found; no account or role was created.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
                   WHERE ur.user_id=v_user_id AND ur.status=1 AND ur.removed_at IS NULL
                     AND r.status=1 AND r.deleted_at IS NULL AND r.role_code='COLLEGE_ADMIN') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ADM002 needs an existing active COLLEGE_ADMIN role; no privileges were elevated.';
    END IF;
    SET v_done=0;
    OPEN colleges_to_repair;
    repair_loop: LOOP
        FETCH colleges_to_repair INTO v_college_id;
        IF v_done=1 THEN LEAVE repair_loop; END IF;
        CALL sp_College_ProvisionCreatorAccess(v_college_id,v_user_id);
    END LOOP;
    CLOSE colleges_to_repair;
    COMMIT;
END$$
CALL sp_CMS_Repair_ADM002_CreatorAccess_20261030()$$
DROP PROCEDURE sp_CMS_Repair_ADM002_CreatorAccess_20261030$$
DELIMITER ;

-- Review the repaired mappings, including college 92 in the supplied database.
SELECT u.employee_user_id,c.college_id,c.college_name,m.status,m.removed_at,cs.status AS settings_status
FROM users u JOIN college_user_mappings m ON m.user_id=u.user_id
JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
JOIN colleges c ON c.college_id=cs.college_id
WHERE UPPER(u.employee_user_id COLLATE utf8mb4_unicode_ci)='ADM002'
ORDER BY c.college_id;

-- Explicit grants are still enforced. Existing permission rows are not overwritten.
SELECT r.role_code,rp.college_id,rp.module_key,rp.can_view,rp.can_create,rp.can_edit,rp.can_delete,rp.can_export
FROM users u JOIN user_roles ur ON ur.user_id=u.user_id AND ur.status=1 AND ur.removed_at IS NULL
JOIN roles r ON r.role_id=ur.role_id AND r.status=1 AND r.deleted_at IS NULL
JOIN role_permissions rp ON rp.role_id=r.role_id
WHERE UPPER(u.employee_user_id COLLATE utf8mb4_unicode_ci)='ADM002'
  AND rp.module_key IN ('colleges','academic_years','academic_settings','departments','courses','branches','semesters','sections')
ORDER BY rp.module_key,rp.college_id;
