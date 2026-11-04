-- MySQL 8. Select the running API database before executing this entire file.
-- DDL autocommits. Back up first. Re-runnable; does not delete business data.
SELECT DATABASE() AS target_database, @@hostname AS server_host, @@port AS server_port;
SET @ua_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='profile_completed'), 'SELECT 1', 'ALTER TABLE users ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 1');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;
SET @ua_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='internal_identifier'), 'SELECT 1', 'ALTER TABLE users ADD COLUMN internal_identifier TINYINT(1) NOT NULL DEFAULT 0');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;
SET @ua_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='academic_year_restricted'), 'SELECT 1', 'ALTER TABLE users ADD COLUMN academic_year_restricted TINYINT(1) NOT NULL DEFAULT 0');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;

-- Existing accounts retain their access. New invited accounts explicitly start incomplete.
CREATE TABLE IF NOT EXISTS user_module_permissions (
 user_id BIGINT NOT NULL, college_id BIGINT NOT NULL,
 module_key VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
 can_view TINYINT(1) NOT NULL DEFAULT 0, can_create TINYINT(1) NOT NULL DEFAULT 0,
 can_edit TINYINT(1) NOT NULL DEFAULT 0, can_delete TINYINT(1) NOT NULL DEFAULT 0,
 can_export TINYINT(1) NOT NULL DEFAULT 0, updated_by BIGINT NOT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,college_id,module_key),
 FOREIGN KEY(user_id) REFERENCES users(user_id), FOREIGN KEY(college_id) REFERENCES colleges(college_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS user_academic_year_access (
 user_id BIGINT NOT NULL, college_id BIGINT NOT NULL, academic_year_id BIGINT NOT NULL,
 assigned_by BIGINT NOT NULL, assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,college_id,academic_year_id),
 FOREIGN KEY(user_id) REFERENCES users(user_id), FOREIGN KEY(college_id) REFERENCES colleges(college_id),
 FOREIGN KEY(academic_year_id) REFERENCES academicyears(academic_year_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS user_access_audits (
 audit_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, actor_user_id BIGINT NULL,
 target_user_id BIGINT NULL, college_id BIGINT NULL, action VARCHAR(80) NOT NULL,
 correlation_id VARCHAR(128) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX ix_ua_target(target_user_id,audit_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS user_access_profiles (
 user_id BIGINT NOT NULL PRIMARY KEY, job_title VARCHAR(100) NOT NULL,
 address_line1 VARCHAR(255) NOT NULL, city VARCHAR(100) NOT NULL,
 state VARCHAR(100) NOT NULL, postal_code VARCHAR(20) NOT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS user_access_invitations (
 user_id BIGINT NOT NULL PRIMARY KEY, token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 purpose VARCHAR(20) NOT NULL, expires_at DATETIME NOT NULL, consumed_at DATETIME NULL,
 delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 recipient_email VARCHAR(150) NULL, delivery_error_code VARCHAR(80) NULL, smtp_accepted_at DATETIME NULL,
 attempt_count INT NOT NULL DEFAULT 0, last_attempt_at DATETIME NULL, correlation_id VARCHAR(128) NULL,
 UNIQUE KEY uq_ua_token(token_hash), FOREIGN KEY(user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
AND TABLE_NAME IN ('user_module_permissions','user_academic_year_access','user_access_audits','user_access_profiles','user_access_invitations');

SET @ua_ddl = IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='access_version'), 'SELECT 1', 'ALTER TABLE users ADD COLUMN access_version INT NOT NULL DEFAULT 0');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;

-- Upgrade existing R3/R6 tables as well; CREATE IF NOT EXISTS alone does not add columns.
SET @ua_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='recipient_email'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN recipient_email VARCHAR(150) NULL');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;
SET @ua_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='delivery_error_code'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN delivery_error_code VARCHAR(80) NULL');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;
SET @ua_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='smtp_accepted_at'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN smtp_accepted_at DATETIME NULL');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;
SET @ua_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='attempt_count'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN attempt_count INT NOT NULL DEFAULT 0');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;
SET @ua_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='last_attempt_at'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN last_attempt_at DATETIME NULL');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;
SET @ua_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='correlation_id'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN correlation_id VARCHAR(128) NULL');
PREPARE ua_stmt FROM @ua_ddl; EXECUTE ua_stmt; DEALLOCATE PREPARE ua_stmt;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' ORDER BY ORDINAL_POSITION;
