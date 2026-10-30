-- Document access, file metadata validation and expiry checks (MySQL 8.0).
-- Select your existing database in MySQL Workbench before executing this file.
-- Apply AFTER importing the supplied dump. Re-runnable. No existing endpoints,
-- business tables, rows or unrelated stored procedures are removed.
-- Application calls these procedures using the authenticated user's numeric ID.
-- UTC is used for expiry dates and grant timestamps. The expiry date is inclusive.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_entity_access (
    access_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    entity_type VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
    entity_id BIGINT NOT NULL,
    can_download TINYINT(1) NOT NULL DEFAULT 1,
    can_upload TINYINT(1) NOT NULL DEFAULT 0,
    can_approve TINYINT(1) NOT NULL DEFAULT 0,
    expires_at DATETIME NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    granted_by BIGINT NOT NULL,
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL,
    CONSTRAINT uq_document_entity_access UNIQUE (user_id, entity_type, entity_id),
    CONSTRAINT fk_document_access_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_document_access_granter FOREIGN KEY (granted_by) REFERENCES users(user_id),
    CONSTRAINT fk_document_access_updater FOREIGN KEY (updated_by) REFERENCES users(user_id),
    CONSTRAINT ck_document_access_entity CHECK (entity_type IN ('STUDENT','FACULTY')),
    CONSTRAINT ck_document_access_flags CHECK (can_download IN (0,1) AND can_upload IN (0,1) AND can_approve IN (0,1) AND status IN (0,1)),
    KEY idx_document_access_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_access_audit (
    audit_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    access_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL,
    action VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
    can_download TINYINT(1) NOT NULL,
    can_upload TINYINT(1) NOT NULL,
    can_approve TINYINT(1) NOT NULL,
    expires_at DATETIME NULL,
    action_at DATETIME NOT NULL,
    CONSTRAINT fk_document_access_audit_access FOREIGN KEY (access_id) REFERENCES document_entity_access(access_id),
    CONSTRAINT fk_document_access_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(user_id),
    KEY idx_document_access_audit (access_id, action_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW vw_document_security_entities AS
SELECT CAST('STUDENT' AS CHAR(50) CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS EntityType,
       student_id AS EntityId, college_id AS CollegeId,
       full_name COLLATE utf8mb4_unicode_ci AS EntityName, status AS IsActive
FROM students WHERE deleted_at IS NULL
UNION ALL
SELECT 'FACULTY' COLLATE utf8mb4_unicode_ci, faculty_id, college_id,
       faculty_name COLLATE utf8mb4_unicode_ci, status
FROM faculty WHERE deleted_at IS NULL;

-- Faculty ownership uses the employee-profile link when present; it never equates entity IDs to user IDs.
-- Students have no user_id FK in the supplied schema, so their ownership must be explicitly granted.
CREATE OR REPLACE SQL SECURITY INVOKER VIEW vw_document_security_permissions AS
SELECT CASE WHEN f.employee_profile_id IS NULL THEN f.user_id ELSE ep.user_id END AS UserId,
       CAST('FACULTY' AS CHAR(50) CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS EntityType,
       f.faculty_id AS EntityId, 1 AS CanDownload, 1 AS CanUpload, 0 AS CanApprove
FROM faculty f
LEFT JOIN employee_profiles ep ON ep.employee_profile_id=f.employee_profile_id
WHERE f.deleted_at IS NULL AND f.status=1
  AND (f.employee_profile_id IS NULL OR (ep.deleted_at IS NULL AND ep.status=1))
UNION ALL
SELECT user_id, entity_type, entity_id, can_download, can_upload, can_approve
FROM document_entity_access
WHERE status=1 AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP());

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_document_actor_context$$
CREATE PROCEDURE sp_document_actor_context(IN p_actor_id BIGINT, IN p_college_id BIGINT, OUT p_super BOOL, OUT p_manager BOOL)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_user_college BIGINT;
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id=p_actor_id AND status=1 AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC401: The user is inactive or no longer exists.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
        WHERE ur.user_id=p_actor_id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC403: No active role is assigned to this user.';
    END IF;
    SELECT COALESCE(MAX(REPLACE(REPLACE(REPLACE(UPPER(r.role_code),'_',''),'-',''),' ','')='SUPERADMIN'),0),
           COALESCE(MAX(REPLACE(REPLACE(REPLACE(UPPER(r.role_code),'_',''),'-',''),' ','') IN ('SUPERADMIN','COLLEGEADMIN','PRINCIPAL')),0)
    INTO p_super,p_manager FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
    WHERE ur.user_id=p_actor_id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL;
    SELECT college_id INTO v_user_college FROM users WHERE user_id=p_actor_id;
    IF NOT p_super AND (p_college_id IS NULL OR p_college_id<=0 OR NOT
       (COALESCE(v_user_college=p_college_id,0) OR EXISTS (
        SELECT 1 FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
        WHERE m.user_id=p_actor_id AND m.status=1 AND m.removed_at IS NULL AND cs.status=1 AND cs.college_id=p_college_id))) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC403: The user has no active membership in the selected college.';
    END IF;
END$$


DROP PROCEDURE IF EXISTS sp_document_entity_permissions$$
CREATE PROCEDURE sp_document_entity_permissions(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_entity_id BIGINT)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_super BOOL DEFAULT FALSE;
    DECLARE v_manager BOOL DEFAULT FALSE;
    CALL sp_document_actor_context(p_actor_id,p_college_id,v_super,v_manager);
    SET p_entity_type=UPPER(TRIM(p_entity_type));
    IF p_entity_type IS NULL OR p_entity_type NOT IN ('STUDENT','FACULTY') OR p_entity_id IS NULL OR p_entity_id<=0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: EntityType must be STUDENT or FACULTY and EntityId must be positive.';
    END IF;
    SELECT e.EntityType,e.EntityId,e.CollegeId,e.IsActive,
        TRUE AS CanView,
        (v_super OR v_manager OR EXISTS (SELECT 1 FROM vw_document_security_permissions a WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId AND a.CanDownload=1)) AS CanDownload,
        (e.IsActive=1 AND (v_super OR v_manager OR EXISTS (SELECT 1 FROM vw_document_security_permissions a WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId AND a.CanUpload=1))) AS CanUpload,
        (e.IsActive=1 AND (v_super OR v_manager OR EXISTS (SELECT 1 FROM vw_document_security_permissions a WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId AND a.CanApprove=1))) AS CanApprove
    FROM vw_document_security_entities e
    WHERE e.EntityType=p_entity_type AND e.EntityId=p_entity_id AND (v_super OR (e.CollegeId=p_college_id AND (v_manager OR EXISTS (
        SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId))));
END$$


DROP PROCEDURE IF EXISTS sp_document_require_entity$$
CREATE PROCEDURE sp_document_require_entity(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_entity_id BIGINT, IN p_operation VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_super BOOL DEFAULT FALSE;
    DECLARE v_manager BOOL DEFAULT FALSE;
    DECLARE v_active TINYINT;
    CALL sp_document_actor_context(p_actor_id,p_college_id,v_super,v_manager);
    IF p_entity_type IS NULL OR p_entity_type NOT IN ('STUDENT','FACULTY') OR p_entity_id IS NULL OR p_entity_id<=0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: Invalid document entity.';
    END IF;
    IF p_operation IS NULL OR p_operation NOT IN ('VIEW','DOWNLOAD','UPLOAD','APPROVE','MANAGE') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: Invalid document operation.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM vw_document_security_entities e
        WHERE e.EntityType=p_entity_type AND e.EntityId=p_entity_id AND (v_super OR (e.CollegeId=p_college_id AND (v_manager OR EXISTS (
        SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId))))) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC403: Access to this document entity is not permitted.';
    END IF;
    IF NOT v_manager AND NOT EXISTS (SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=p_entity_type AND a.EntityId=p_entity_id AND
        (p_operation='VIEW' OR (p_operation='DOWNLOAD' AND a.CanDownload=1) OR
         (p_operation='UPLOAD' AND a.CanUpload=1) OR (p_operation='APPROVE' AND a.CanApprove=1))) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC403: Your role or entity grant does not permit this operation.';
    END IF;
    SELECT IsActive INTO v_active FROM vw_document_security_entities WHERE EntityType=p_entity_type AND EntityId=p_entity_id;
    IF p_operation IN ('UPLOAD','APPROVE') AND v_active<>1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC409: The document entity is inactive.';
    END IF;
END$$


DROP PROCEDURE IF EXISTS sp_document_categories_get$$
CREATE PROCEDURE sp_document_categories_get(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_include_inactive BOOL)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_super BOOL DEFAULT FALSE;
    DECLARE v_manager BOOL DEFAULT FALSE;
    CALL sp_document_actor_context(p_actor_id,p_college_id,v_super,v_manager);
    IF p_entity_type IS NOT NULL AND p_entity_type NOT IN ('STUDENT','FACULTY') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: EntityType must be STUDENT or FACULTY.';
    END IF;
    IF p_include_inactive AND NOT v_manager THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC403: Only document administrators may list inactive categories.';
    END IF;
    SELECT category_id AS CategoryId,category_code AS CategoryCode,category_name AS CategoryName,
        description AS Description,entity_type AS EntityType,is_required AS IsRequired,status AS Status
    FROM document_categories WHERE deleted_at IS NULL AND (p_include_inactive OR status=1)
        AND (p_entity_type IS NULL OR entity_type=p_entity_type) ORDER BY entity_type,category_name;
END$$


DROP PROCEDURE IF EXISTS sp_document_dashboard_get$$
CREATE PROCEDURE sp_document_dashboard_get(IN p_actor_id BIGINT, IN p_college_id BIGINT)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_super BOOL DEFAULT FALSE;
    DECLARE v_manager BOOL DEFAULT FALSE;
    CALL sp_document_actor_context(p_actor_id,p_college_id,v_super,v_manager);
    SELECT COUNT(*) AS TotalDocuments,COALESCE(SUM((CASE WHEN d.expiry_date<UTC_DATE() AND d.status<>'REJECTED' THEN 'EXPIRED' ELSE d.status END)='SUBMITTED'),0) AS SubmittedDocuments,
        COALESCE(SUM((CASE WHEN d.expiry_date<UTC_DATE() AND d.status<>'REJECTED' THEN 'EXPIRED' ELSE d.status END)='APPROVED'),0) AS ApprovedDocuments,
        COALESCE(SUM(d.status='REJECTED'),0) AS RejectedDocuments,
        COALESCE(SUM(d.status='EXPIRED' OR COALESCE(d.expiry_date<UTC_DATE(),0)),0) AS ExpiredDocuments,
        (SELECT COUNT(*) FROM document_categories WHERE deleted_at IS NULL AND status=1) AS ActiveCategories
    FROM documents d JOIN vw_document_security_entities e ON e.EntityType=d.entity_type AND e.EntityId=d.entity_id
    WHERE d.deleted_at IS NULL AND (v_super OR (e.CollegeId=p_college_id AND (v_manager OR EXISTS (
        SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId))));
    SELECT d.document_id AS DocumentId,d.category_id AS CategoryId,c.category_code AS CategoryCode,
    c.category_name AS CategoryName,d.entity_type AS EntityType,d.entity_id AS EntityId,e.EntityName,
    d.document_title AS DocumentTitle,d.document_number AS DocumentNumber,d.file_name AS FileName,
    d.original_file_name AS OriginalFileName,d.file_path AS FilePath,
    CONCAT('/api/v1/documents/',d.document_id,'/download') AS FileUrl,
    d.file_extension AS FileExtension,d.mime_type AS MimeType,d.file_size AS FileSize,
    d.issue_date AS IssueDate,d.expiry_date AS ExpiryDate,d.remarks AS Remarks,
    CASE WHEN d.expiry_date<UTC_DATE() AND d.status<>'REJECTED' THEN 'EXPIRED' ELSE d.status END AS Status,d.status AS WorkflowStatus,
    (d.status='EXPIRED' OR COALESCE(d.expiry_date<UTC_DATE(),0)) AS IsExpired,
    CASE WHEN d.status='EXPIRED' OR d.expiry_date<UTC_DATE() THEN 'EXPIRED'
         WHEN d.expiry_date IS NULL THEN 'NO_EXPIRY' ELSE 'VALID' END AS ExpiryStatus,
    DATEDIFF(d.expiry_date,UTC_DATE()) AS DaysToExpiry,
    d.uploaded_by AS UploadedBy,d.uploaded_at AS UploadedAt,d.updated_by AS UpdatedBy,d.updated_at AS UpdatedAt,
    CONCAT('/api/v1/documents/',d.document_id,'/download') AS DownloadUrl
FROM documents d JOIN document_categories c ON c.category_id=d.category_id
JOIN vw_document_security_entities e ON e.EntityType=d.entity_type AND e.EntityId=d.entity_id WHERE d.deleted_at IS NULL AND (v_super OR (e.CollegeId=p_college_id AND (v_manager OR EXISTS (
        SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId))))
    ORDER BY d.uploaded_at DESC,d.document_id DESC LIMIT 10;
END$$


DROP PROCEDURE IF EXISTS sp_document_get$$
CREATE PROCEDURE sp_document_get(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_document_id BIGINT, IN p_operation VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_super BOOL DEFAULT FALSE;
    DECLARE v_manager BOOL DEFAULT FALSE;
    DECLARE v_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_entity BIGINT;
    CALL sp_document_actor_context(p_actor_id,p_college_id,v_super,v_manager);
    IF p_document_id IS NULL OR p_document_id<=0 OR p_operation IS NULL OR p_operation NOT IN ('VIEW','DOWNLOAD') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: Invalid document ID or read operation.';
    END IF;
    SELECT d.entity_type,d.entity_id INTO v_type,v_entity
    FROM documents d JOIN vw_document_security_entities e ON e.EntityType=d.entity_type AND e.EntityId=d.entity_id
    WHERE d.document_id=p_document_id AND d.deleted_at IS NULL AND (v_super OR (e.CollegeId=p_college_id AND (v_manager OR EXISTS (
        SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId))));
    IF v_entity IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC404: Document not found or access is not permitted.'; END IF;
    CALL sp_document_require_entity(p_actor_id,p_college_id,v_type,v_entity,p_operation);
    SELECT d.document_id AS DocumentId,d.category_id AS CategoryId,c.category_code AS CategoryCode,
    c.category_name AS CategoryName,d.entity_type AS EntityType,d.entity_id AS EntityId,e.EntityName,
    d.document_title AS DocumentTitle,d.document_number AS DocumentNumber,d.file_name AS FileName,
    d.original_file_name AS OriginalFileName,d.file_path AS FilePath,
    CONCAT('/api/v1/documents/',d.document_id,'/download') AS FileUrl,
    d.file_extension AS FileExtension,d.mime_type AS MimeType,d.file_size AS FileSize,
    d.issue_date AS IssueDate,d.expiry_date AS ExpiryDate,d.remarks AS Remarks,
    CASE WHEN d.expiry_date<UTC_DATE() AND d.status<>'REJECTED' THEN 'EXPIRED' ELSE d.status END AS Status,d.status AS WorkflowStatus,
    (d.status='EXPIRED' OR COALESCE(d.expiry_date<UTC_DATE(),0)) AS IsExpired,
    CASE WHEN d.status='EXPIRED' OR d.expiry_date<UTC_DATE() THEN 'EXPIRED'
         WHEN d.expiry_date IS NULL THEN 'NO_EXPIRY' ELSE 'VALID' END AS ExpiryStatus,
    DATEDIFF(d.expiry_date,UTC_DATE()) AS DaysToExpiry,
    d.uploaded_by AS UploadedBy,d.uploaded_at AS UploadedAt,d.updated_by AS UpdatedBy,d.updated_at AS UpdatedAt,
    CONCAT('/api/v1/documents/',d.document_id,'/download') AS DownloadUrl
FROM documents d JOIN document_categories c ON c.category_id=d.category_id
JOIN vw_document_security_entities e ON e.EntityType=d.entity_type AND e.EntityId=d.entity_id WHERE d.document_id=p_document_id AND d.deleted_at IS NULL AND (v_super OR (e.CollegeId=p_college_id AND (v_manager OR EXISTS (
        SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId))));
END$$


DROP PROCEDURE IF EXISTS sp_document_expired_get$$
CREATE PROCEDURE sp_document_expired_get(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_super BOOL DEFAULT FALSE;
    DECLARE v_manager BOOL DEFAULT FALSE;
    CALL sp_document_actor_context(p_actor_id,p_college_id,v_super,v_manager);
    IF p_entity_type IS NOT NULL AND p_entity_type NOT IN ('STUDENT','FACULTY') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: EntityType must be STUDENT or FACULTY.';
    END IF;
    SELECT d.document_id AS DocumentId,d.category_id AS CategoryId,c.category_code AS CategoryCode,
    c.category_name AS CategoryName,d.entity_type AS EntityType,d.entity_id AS EntityId,e.EntityName,
    d.document_title AS DocumentTitle,d.document_number AS DocumentNumber,d.file_name AS FileName,
    d.original_file_name AS OriginalFileName,d.file_path AS FilePath,
    CONCAT('/api/v1/documents/',d.document_id,'/download') AS FileUrl,
    d.file_extension AS FileExtension,d.mime_type AS MimeType,d.file_size AS FileSize,
    d.issue_date AS IssueDate,d.expiry_date AS ExpiryDate,d.remarks AS Remarks,
    CASE WHEN d.expiry_date<UTC_DATE() AND d.status<>'REJECTED' THEN 'EXPIRED' ELSE d.status END AS Status,d.status AS WorkflowStatus,
    (d.status='EXPIRED' OR COALESCE(d.expiry_date<UTC_DATE(),0)) AS IsExpired,
    CASE WHEN d.status='EXPIRED' OR d.expiry_date<UTC_DATE() THEN 'EXPIRED'
         WHEN d.expiry_date IS NULL THEN 'NO_EXPIRY' ELSE 'VALID' END AS ExpiryStatus,
    DATEDIFF(d.expiry_date,UTC_DATE()) AS DaysToExpiry,
    d.uploaded_by AS UploadedBy,d.uploaded_at AS UploadedAt,d.updated_by AS UpdatedBy,d.updated_at AS UpdatedAt,
    CONCAT('/api/v1/documents/',d.document_id,'/download') AS DownloadUrl
FROM documents d JOIN document_categories c ON c.category_id=d.category_id
JOIN vw_document_security_entities e ON e.EntityType=d.entity_type AND e.EntityId=d.entity_id WHERE d.deleted_at IS NULL AND (d.status='EXPIRED' OR d.expiry_date<UTC_DATE())
      AND (p_entity_type IS NULL OR d.entity_type=p_entity_type) AND (v_super OR (e.CollegeId=p_college_id AND (v_manager OR EXISTS (
        SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId))))
    ORDER BY d.expiry_date,d.document_id DESC;
END$$


DROP PROCEDURE IF EXISTS sp_document_expiry_check$$
CREATE PROCEDURE sp_document_expiry_check(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_document_id BIGINT)
SQL SECURITY INVOKER
BEGIN
    CALL sp_document_get(p_actor_id,p_college_id,p_document_id,'VIEW');
END$$


DROP PROCEDURE IF EXISTS sp_document_validate_upload$$
CREATE PROCEDURE sp_document_validate_upload(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_entity_id BIGINT, IN p_category_id BIGINT, IN p_issue_date DATE, IN p_expiry_date DATE)
SQL SECURITY INVOKER
BEGIN
    CALL sp_document_require_entity(p_actor_id,p_college_id,p_entity_type,p_entity_id,'UPLOAD');
    IF NOT EXISTS (SELECT 1 FROM document_categories WHERE category_id=p_category_id AND deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC404: Document category not found.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM document_categories WHERE category_id=p_category_id AND deleted_at IS NULL AND status=1 AND entity_type=p_entity_type) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: The category is inactive or belongs to another entity type.';
    END IF;
    IF p_issue_date>UTC_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: IssueDate cannot be in the future.';
    END IF;
    IF p_expiry_date<p_issue_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: ExpiryDate cannot be earlier than IssueDate.';
    END IF;
    IF p_expiry_date<UTC_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: An already expired document cannot be uploaded.';
    END IF;
END$$


DROP PROCEDURE IF EXISTS sp_document_upload$$
CREATE PROCEDURE sp_document_upload(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_entity_id BIGINT, IN p_category_id BIGINT, IN p_issue_date DATE, IN p_expiry_date DATE, IN p_title VARCHAR(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_number VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_file_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_original_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_file_path VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_extension VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_mime_type VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_remarks VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_file_size BIGINT)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_id BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    CALL sp_document_validate_upload(p_actor_id,p_college_id,p_entity_type,p_entity_id,p_category_id,p_issue_date,p_expiry_date);
    IF p_title IS NULL OR CHAR_LENGTH(TRIM(p_title))=0 OR p_file_size IS NULL OR p_file_size<=0 OR p_file_size>10485760 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: A title and a non-empty file of at most 10 MB are required.';
    END IF;
    IF p_extension IS NULL OR p_extension NOT IN ('.pdf','.jpg','.jpeg','.png','.doc','.docx') OR p_mime_type IS NULL OR
       NOT ((p_extension='.pdf' AND p_mime_type='application/pdf') OR
            (p_extension IN ('.jpg','.jpeg') AND p_mime_type='image/jpeg') OR
            (p_extension='.png' AND p_mime_type='image/png') OR
            (p_extension='.doc' AND p_mime_type='application/msword') OR
            (p_extension='.docx' AND p_mime_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: Unsupported file extension or content type.';
    END IF;
    IF p_file_name IS NULL OR p_file_name NOT REGEXP '^[a-f0-9]{32}[.](pdf|jpg|jpeg|png|doc|docx)$'
        OR p_file_path IS NULL OR p_file_path<>CONCAT('Documents/',p_entity_type,'/',p_entity_id,'/',p_file_name)
        OR p_file_name NOT LIKE CONCAT('%',p_extension)
        OR p_original_name IS NULL OR CHAR_LENGTH(TRIM(p_original_name))=0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: Invalid document storage metadata.';
    END IF;
    INSERT INTO documents(category_id,entity_type,entity_id,document_title,document_number,file_name,
        original_file_name,file_path,file_extension,mime_type,file_size,issue_date,expiry_date,remarks,status,uploaded_by,uploaded_at)
    VALUES(p_category_id,p_entity_type,p_entity_id,TRIM(p_title),NULLIF(TRIM(p_number),''),p_file_name,p_original_name,
        p_file_path,p_extension,p_mime_type,p_file_size,p_issue_date,p_expiry_date,NULLIF(TRIM(p_remarks),''),'SUBMITTED',p_actor_id,UTC_TIMESTAMP());
    SET v_id=LAST_INSERT_ID();
    UPDATE documents SET file_url=CONCAT('/api/v1/documents/',v_id,'/download') WHERE document_id=v_id;
    INSERT INTO document_approvals(document_id,approver_user_id,approval_level,action,action_at)
    VALUES(v_id,p_actor_id,1,'SUBMITTED',UTC_TIMESTAMP());
    COMMIT;
    SELECT d.document_id AS DocumentId,d.category_id AS CategoryId,c.category_code AS CategoryCode,
    c.category_name AS CategoryName,d.entity_type AS EntityType,d.entity_id AS EntityId,e.EntityName,
    d.document_title AS DocumentTitle,d.document_number AS DocumentNumber,d.file_name AS FileName,
    d.original_file_name AS OriginalFileName,d.file_path AS FilePath,
    CONCAT('/api/v1/documents/',d.document_id,'/download') AS FileUrl,
    d.file_extension AS FileExtension,d.mime_type AS MimeType,d.file_size AS FileSize,
    d.issue_date AS IssueDate,d.expiry_date AS ExpiryDate,d.remarks AS Remarks,
    CASE WHEN d.expiry_date<UTC_DATE() AND d.status<>'REJECTED' THEN 'EXPIRED' ELSE d.status END AS Status,d.status AS WorkflowStatus,
    (d.status='EXPIRED' OR COALESCE(d.expiry_date<UTC_DATE(),0)) AS IsExpired,
    CASE WHEN d.status='EXPIRED' OR d.expiry_date<UTC_DATE() THEN 'EXPIRED'
         WHEN d.expiry_date IS NULL THEN 'NO_EXPIRY' ELSE 'VALID' END AS ExpiryStatus,
    DATEDIFF(d.expiry_date,UTC_DATE()) AS DaysToExpiry,
    d.uploaded_by AS UploadedBy,d.uploaded_at AS UploadedAt,d.updated_by AS UpdatedBy,d.updated_at AS UpdatedAt,
    CONCAT('/api/v1/documents/',d.document_id,'/download') AS DownloadUrl
FROM documents d JOIN document_categories c ON c.category_id=d.category_id
JOIN vw_document_security_entities e ON e.EntityType=d.entity_type AND e.EntityId=d.entity_id WHERE d.document_id=v_id;
END$$


DROP PROCEDURE IF EXISTS sp_document_approval$$
CREATE PROCEDURE sp_document_approval(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_document_id BIGINT, IN p_action VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_level INT, IN p_comments VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_super BOOL DEFAULT FALSE;
    DECLARE v_manager BOOL DEFAULT FALSE;
    DECLARE v_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_entity BIGINT;
    DECLARE v_status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_new_status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_expiry DATE;
    DECLARE v_approval_id BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    CALL sp_document_actor_context(p_actor_id,p_college_id,v_super,v_manager);
    SET p_action=UPPER(TRIM(p_action));
    IF p_action IS NULL OR p_action NOT IN ('SUBMITTED','APPROVED','REJECTED','RETURNED') OR p_level IS NULL OR p_level<1 OR p_level>100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: Invalid approval action or approval level.';
    END IF;
    START TRANSACTION;
    -- Lock the document before checking its workflow state to prevent competing approvals.
    SELECT d.entity_type,d.entity_id,d.status,d.expiry_date INTO v_type,v_entity,v_status,v_expiry
    FROM documents d JOIN vw_document_security_entities e ON e.EntityType=d.entity_type AND e.EntityId=d.entity_id
    WHERE d.document_id=p_document_id AND d.deleted_at IS NULL AND (v_super OR (e.CollegeId=p_college_id AND (v_manager OR EXISTS (
        SELECT 1 FROM vw_document_security_permissions a
        WHERE a.UserId=p_actor_id AND a.EntityType=e.EntityType AND a.EntityId=e.EntityId)))) FOR UPDATE;
    IF v_entity IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC404: Document not found or access is not permitted.'; END IF;
    CALL sp_document_require_entity(p_actor_id,p_college_id,v_type,v_entity,IF(p_action='SUBMITTED','UPLOAD','APPROVE'));
    IF v_expiry<UTC_DATE() OR v_status='EXPIRED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC409: This document has expired and cannot be submitted or approved.';
    END IF;
    IF NOT ((p_action='SUBMITTED' AND v_status IN ('DRAFT','REJECTED')) OR
            (p_action IN ('APPROVED','REJECTED','RETURNED') AND v_status IN ('SUBMITTED','UNDER_REVIEW'))) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC409: This action is not allowed in the current document status.';
    END IF;
    SET v_new_status=IF(p_action='RETURNED','DRAFT',p_action);
    UPDATE documents SET status=v_new_status,updated_by=p_actor_id,updated_at=UTC_TIMESTAMP() WHERE document_id=p_document_id;
    INSERT INTO document_approvals(document_id,approver_user_id,approval_level,action,comments,action_at)
    VALUES(p_document_id,p_actor_id,p_level,p_action,NULLIF(TRIM(p_comments),''),UTC_TIMESTAMP());
    SET v_approval_id=LAST_INSERT_ID();
    COMMIT;
    SELECT approval_id AS ApprovalId,document_id AS DocumentId,approver_user_id AS ApproverUserId,
        approval_level AS ApprovalLevel,action AS Action,comments AS Comments,action_at AS ActionAt,v_new_status AS DocumentStatus
    FROM document_approvals WHERE approval_id=v_approval_id;
END$$


DROP PROCEDURE IF EXISTS sp_document_entity_access_list$$
CREATE PROCEDURE sp_document_entity_access_list(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_entity_id BIGINT)
SQL SECURITY INVOKER
BEGIN
    CALL sp_document_require_entity(p_actor_id,p_college_id,p_entity_type,p_entity_id,'MANAGE');
    SELECT access_id AS AccessId,user_id AS UserId,entity_type AS EntityType,entity_id AS EntityId,
    can_download AS CanDownload,can_upload AS CanUpload,can_approve AS CanApprove,expires_at AS ExpiresAt,
    status AS Status,granted_by AS GrantedBy,granted_at AS GrantedAt,updated_by AS UpdatedBy,updated_at AS UpdatedAt FROM document_entity_access WHERE entity_type=p_entity_type AND entity_id=p_entity_id ORDER BY access_id;
END$$


DROP PROCEDURE IF EXISTS sp_document_entity_access_save$$
CREATE PROCEDURE sp_document_entity_access_save(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_entity_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, IN p_entity_id BIGINT, IN p_user_id BIGINT, IN p_download BOOL, IN p_upload BOOL, IN p_approve BOOL, IN p_expires_at DATETIME)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_id BIGINT;
    DECLARE v_college BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    CALL sp_document_require_entity(p_actor_id,p_college_id,p_entity_type,p_entity_id,'MANAGE');
    SELECT CollegeId INTO v_college FROM vw_document_security_entities WHERE EntityType=p_entity_type AND EntityId=p_entity_id;
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id=p_user_id AND u.status=1 AND u.deleted_at IS NULL
      AND (u.college_id=v_college OR EXISTS (SELECT 1 FROM college_user_mappings m JOIN college_settings cs ON cs.college_setting_id=m.college_setting_id
        WHERE m.user_id=u.user_id AND m.status=1 AND m.removed_at IS NULL AND cs.status=1 AND cs.college_id=v_college))) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: The target user must be active and belong to the entity college.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id=ur.role_id
        WHERE ur.user_id=p_user_id AND ur.status=1 AND ur.removed_at IS NULL AND r.status=1 AND r.deleted_at IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: The target user must have an active role.';
    END IF;
    IF p_download IS NULL OR p_upload IS NULL OR p_approve IS NULL OR p_download NOT IN (0,1) OR p_upload NOT IN (0,1) OR p_approve NOT IN (0,1)
        OR (p_expires_at IS NOT NULL AND p_expires_at<=UTC_TIMESTAMP()) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC400: Invalid permission flags or access expiry.';
    END IF;
    INSERT INTO document_entity_access(user_id,entity_type,entity_id,can_download,can_upload,can_approve,expires_at,granted_by,granted_at)
    VALUES(p_user_id,p_entity_type,p_entity_id,p_download,p_upload,p_approve,p_expires_at,p_actor_id,UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE can_download=p_download,can_upload=p_upload,can_approve=p_approve,expires_at=p_expires_at,
        status=1,updated_by=p_actor_id,updated_at=UTC_TIMESTAMP();
    SELECT access_id INTO v_id FROM document_entity_access WHERE user_id=p_user_id AND entity_type=p_entity_type AND entity_id=p_entity_id;
    INSERT INTO document_access_audit(access_id,actor_user_id,action,can_download,can_upload,can_approve,expires_at,action_at)
    VALUES(v_id,p_actor_id,'GRANTED',p_download,p_upload,p_approve,p_expires_at,UTC_TIMESTAMP());
    COMMIT;
    SELECT access_id AS AccessId,user_id AS UserId,entity_type AS EntityType,entity_id AS EntityId,
    can_download AS CanDownload,can_upload AS CanUpload,can_approve AS CanApprove,expires_at AS ExpiresAt,
    status AS Status,granted_by AS GrantedBy,granted_at AS GrantedAt,updated_by AS UpdatedBy,updated_at AS UpdatedAt FROM document_entity_access WHERE access_id=v_id;
END$$


DROP PROCEDURE IF EXISTS sp_document_entity_access_revoke$$
CREATE PROCEDURE sp_document_entity_access_revoke(IN p_actor_id BIGINT, IN p_college_id BIGINT, IN p_access_id BIGINT)
SQL SECURITY INVOKER
BEGIN
    DECLARE v_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_entity BIGINT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    SELECT entity_type,entity_id INTO v_type,v_entity FROM document_entity_access WHERE access_id=p_access_id FOR UPDATE;
    IF v_entity IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DOC404: Entity access mapping not found.'; END IF;
    CALL sp_document_require_entity(p_actor_id,p_college_id,v_type,v_entity,'MANAGE');
    UPDATE document_entity_access SET status=0,updated_by=p_actor_id,updated_at=UTC_TIMESTAMP() WHERE access_id=p_access_id;
    INSERT INTO document_access_audit(access_id,actor_user_id,action,can_download,can_upload,can_approve,expires_at,action_at)
    SELECT access_id,p_actor_id,'REVOKED',can_download,can_upload,can_approve,expires_at,UTC_TIMESTAMP() FROM document_entity_access WHERE access_id=p_access_id;
    COMMIT;
    SELECT access_id AS AccessId,user_id AS UserId,entity_type AS EntityType,entity_id AS EntityId,
    can_download AS CanDownload,can_upload AS CanUpload,can_approve AS CanApprove,expires_at AS ExpiresAt,
    status AS Status,granted_by AS GrantedBy,granted_at AS GrantedAt,updated_by AS UpdatedBy,updated_at AS UpdatedAt FROM document_entity_access WHERE access_id=p_access_id;
END$$


DELIMITER ;
-- End of document-only update. Existing data and approval history are preserved.
