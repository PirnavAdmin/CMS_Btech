-- Backend Task 1 and 2
-- Select the same schema used by appsettings.json before running this file.
-- Existing tables are preserved because CREATE TABLE IF NOT EXISTS is used.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    role_id BIGINT NOT NULL AUTO_INCREMENT,
    role_name VARCHAR(100) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (role_id),
    UNIQUE KEY uq_roles_role_name (role_name),
    UNIQUE KEY uq_roles_role_code (role_code),
    KEY idx_roles_status (status),
    KEY idx_roles_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NULL,
    employee_user_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NULL,
    mobile VARCHAR(15) NULL,
    password_hash VARCHAR(255) NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_employee_user_id (employee_user_id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_mobile (mobile),
    KEY idx_users_status (status),
    KEY idx_users_college_id (college_id),
    KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role is normalized instead of duplicated in the users row. This supports
-- one or more roles per user and is what the backend JWT service already uses.
CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    removed_at DATETIME NULL,
    removed_by BIGINT NULL,
    PRIMARY KEY (user_role_id),
    UNIQUE KEY uq_user_roles_user_role (user_id, role_id),
    KEY idx_user_roles_user_id (user_id),
    KEY idx_user_roles_role_id (role_id),
    CONSTRAINT fk_backend_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_backend_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_verifications (
    otp_verification_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NULL,
    identifier VARCHAR(150) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    otp_type VARCHAR(50) NOT NULL DEFAULT 'PASSWORD_RESET',
    delivery_method VARCHAR(20) NOT NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (otp_verification_id),
    KEY idx_otp_identifier_type (identifier, otp_type, status),
    KEY idx_otp_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW vw_users_with_roles AS
SELECT
    u.user_id,
    u.college_id,
    u.employee_user_id,
    u.full_name,
    u.email,
    u.mobile,
    u.password_hash,
    GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code) AS role,
    u.status,
    u.last_login_at,
    u.created_at,
    u.created_by,
    u.updated_at,
    u.updated_by,
    u.deleted_at,
    u.deleted_by
FROM users u
LEFT JOIN user_roles ur
    ON ur.user_id = u.user_id
   AND ur.status = 1
   AND ur.removed_at IS NULL
LEFT JOIN roles r
    ON r.role_id = ur.role_id
   AND r.status = 1
   AND r.deleted_at IS NULL
GROUP BY
    u.user_id,
    u.college_id,
    u.employee_user_id,
    u.full_name,
    u.email,
    u.mobile,
    u.password_hash,
    u.status,
    u.last_login_at,
    u.created_at,
    u.created_by,
    u.updated_at,
    u.updated_by,
    u.deleted_at,
    u.deleted_by;

DROP PROCEDURE IF EXISTS sp_user_find_for_password_reset;
DROP PROCEDURE IF EXISTS sp_user_update_password_hash;

DELIMITER $$

CREATE PROCEDURE sp_user_find_for_password_reset(
    IN p_identifier VARCHAR(150)
)
BEGIN
    -- Explicit COLLATE prevents Error 1267 when an imported database mixes
    -- utf8mb4_unicode_ci with utf8mb4_0900_ai_ci.
    SELECT
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        u.email AS Email,
        u.mobile AS Mobile,
        u.status AS Status,
        GROUP_CONCAT(DISTINCT r.role_code ORDER BY r.role_code) AS Roles
    FROM users u
    LEFT JOIN user_roles ur
        ON ur.user_id = u.user_id
       AND ur.status = 1
       AND ur.removed_at IS NULL
    LEFT JOIN roles r
        ON r.role_id = ur.role_id
       AND r.status = 1
       AND r.deleted_at IS NULL
    WHERE u.deleted_at IS NULL
      AND (
            u.employee_user_id COLLATE utf8mb4_unicode_ci =
                p_identifier COLLATE utf8mb4_unicode_ci
         OR u.email COLLATE utf8mb4_unicode_ci =
                p_identifier COLLATE utf8mb4_unicode_ci
         OR u.mobile COLLATE utf8mb4_unicode_ci =
                p_identifier COLLATE utf8mb4_unicode_ci
      )
    GROUP BY
        u.user_id,
        u.employee_user_id,
        u.full_name,
        u.email,
        u.mobile,
        u.status
    LIMIT 1;
END$$

CREATE PROCEDURE sp_user_update_password_hash(
    IN p_user_id BIGINT,
    IN p_password_hash VARCHAR(255),
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE users
    SET password_hash = p_password_hash,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE user_id = p_user_id
      AND status = 1
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END$$

DELIMITER ;

-- Verification
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('users', 'roles', 'user_roles', 'otp_verifications')
ORDER BY table_name;

SHOW PROCEDURE STATUS
WHERE Db = DATABASE()
  AND Name IN (
      'sp_user_find_for_password_reset',
      'sp_user_update_password_hash'
  );
