-- MySQL 8. Select the SAME database used by the API DefaultConnection.
-- Apply User_Access_Onboarding_Migration.sql first if R3 prerequisites are absent.
-- DDL autocommits; run before restarting the updated API.
SELECT DATABASE() AS target_database, @@hostname AS server_host, @@port AS server_port;
CREATE TABLE IF NOT EXISTS user_access_invitations (
 user_id BIGINT NOT NULL PRIMARY KEY, token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 purpose VARCHAR(20) NOT NULL, expires_at DATETIME NOT NULL, consumed_at DATETIME NULL,
 delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 recipient_email VARCHAR(150) NULL, delivery_error_code VARCHAR(80) NULL, smtp_accepted_at DATETIME NULL,
 UNIQUE KEY uq_ua_token(token_hash), FOREIGN KEY(user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
SET @invite_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='recipient_email'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN recipient_email VARCHAR(150) NULL');
PREPARE invite_stmt FROM @invite_ddl; EXECUTE invite_stmt; DEALLOCATE PREPARE invite_stmt;
SET @invite_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='delivery_error_code'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN delivery_error_code VARCHAR(80) NULL');
PREPARE invite_stmt FROM @invite_ddl; EXECUTE invite_stmt; DEALLOCATE PREPARE invite_stmt;
SET @invite_ddl=IF(EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations' AND COLUMN_NAME='smtp_accepted_at'),'SELECT 1','ALTER TABLE user_access_invitations ADD COLUMN smtp_accepted_at DATETIME NULL');
PREPARE invite_stmt FROM @invite_ddl; EXECUTE invite_stmt; DEALLOCATE PREPARE invite_stmt;
-- Previously pending/failed attempts cannot be redeemed by R6, which requires
-- delivery_status='sent'. No existing account/password or sent link is changed.
SELECT COLUMN_NAME FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_access_invitations'
AND COLUMN_NAME IN ('recipient_email','delivery_error_code','smtp_accepted_at');
