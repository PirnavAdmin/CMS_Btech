-- Backend Task 3: College Add, List, Edit, Details, Search, and Status.
-- Select the backend schema before running. Existing data is preserved.

CREATE TABLE IF NOT EXISTS colleges (
    college_id BIGINT NOT NULL AUTO_INCREMENT,
    college_code VARCHAR(50) NOT NULL,
    college_name VARCHAR(200) NOT NULL,
    college_type VARCHAR(50) NULL,
    university_name VARCHAR(200) NULL,
    email VARCHAR(150) NULL,
    mobile VARCHAR(20) NULL,
    phone VARCHAR(20) NULL,
    principal VARCHAR(200) NULL,
    principal_email VARCHAR(150) NULL,
    principal_contact VARCHAR(10) NULL,
    alternate_contact_number VARCHAR(10) NULL,
    accreditation_status VARCHAR(30) NULL,
    accreditation_body VARCHAR(80) NULL,
    accreditation_grade VARCHAR(20) NULL,
    accreditation_number VARCHAR(50) NULL,
    valid_from DATE NULL,
    valid_until DATE NULL,
    address_line1 VARCHAR(255) NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    area VARCHAR(150) NULL,
    district VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    website VARCHAR(255) NULL,
    academic_year_id BIGINT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
    logo_path VARCHAR(500) NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,
    PRIMARY KEY (college_id),
    UNIQUE KEY uq_colleges_code (college_code),
    KEY idx_colleges_name (college_name),
    KEY idx_colleges_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP PROCEDURE IF EXISTS sp_College_CodeExists;
DROP PROCEDURE IF EXISTS sp_College_Create;
DROP PROCEDURE IF EXISTS sp_College_GetAll;
DROP PROCEDURE IF EXISTS sp_College_GetByCode;
DROP PROCEDURE IF EXISTS sp_College_GetById;
DROP PROCEDURE IF EXISTS sp_College_Search;
DROP PROCEDURE IF EXISTS sp_College_Update;
DROP PROCEDURE IF EXISTS sp_College_UpdateStatus;

DELIMITER $$

CREATE PROCEDURE sp_College_CodeExists(
    IN p_college_code VARCHAR(50),
    IN p_exclude_id BIGINT
)
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM colleges
        WHERE college_code = TRIM(p_college_code)
          AND deleted_at IS NULL
          AND (p_exclude_id IS NULL OR college_id <> p_exclude_id)
    ) AS code_exists;
END$$

CREATE PROCEDURE sp_College_Create(
    IN p_college_code VARCHAR(50),
    IN p_college_name VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_phone VARCHAR(20),
    IN p_principal VARCHAR(200),
    IN p_principal_email VARCHAR(150),
    IN p_principal_contact VARCHAR(10),
    IN p_alternate_contact_number VARCHAR(10),
    IN p_accreditation_status VARCHAR(30),
    IN p_accreditation_body VARCHAR(80),
    IN p_accreditation_grade VARCHAR(20),
    IN p_accreditation_number VARCHAR(50),
    IN p_valid_from DATE,
    IN p_valid_until DATE,
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_area VARCHAR(150),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_website VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_timezone VARCHAR(100),
    IN p_currency_code VARCHAR(10),
    IN p_logo_path VARCHAR(500),
    IN p_status TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_college_code IS NULL OR TRIM(p_college_code) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'College code is required.';
    END IF;

    IF p_college_name IS NULL OR TRIM(p_college_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'College name is required.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM colleges
        WHERE college_code = TRIM(p_college_code)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'College code already exists.';
    END IF;

    IF NULLIF(TRIM(p_accreditation_status), '') IS NOT NULL
       AND TRIM(p_accreditation_status) NOT IN (
           'Accredited', 'Not Accredited', 'Under Review', 'Expired'
       ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid accreditation status.';
    END IF;

    IF p_valid_from IS NOT NULL
       AND p_valid_until IS NOT NULL
       AND p_valid_until < p_valid_from THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid until must be on or after valid from.';
    END IF;

    INSERT INTO colleges (
        college_code, college_name, college_type, university_name,
        email, mobile, phone, principal, principal_email,
        principal_contact, alternate_contact_number,
        accreditation_status, accreditation_body, accreditation_grade,
        accreditation_number, valid_from, valid_until,
        address_line1, address_line2, city, area, district,
        state, country, pincode, website, academic_year_id,
        timezone, currency_code, logo_path, status, created_at, created_by
    ) VALUES (
        UPPER(TRIM(p_college_code)), TRIM(p_college_name), p_college_type,
        p_university_name, p_email, p_mobile, p_phone, p_principal,
        p_principal_email, p_principal_contact, p_alternate_contact_number,
        NULLIF(TRIM(p_accreditation_status), ''), p_accreditation_body, p_accreditation_grade,
        p_accreditation_number, p_valid_from, p_valid_until,
        p_address_line1, p_address_line2, p_city, p_area, p_district,
        p_state, p_country, p_pincode, p_website,
        p_academic_year_id,
        COALESCE(NULLIF(TRIM(p_timezone), ''), 'Asia/Kolkata'),
        COALESCE(NULLIF(TRIM(p_currency_code), ''), 'INR'),
        p_logo_path, COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT * FROM colleges WHERE college_id = LAST_INSERT_ID();
END$$

CREATE PROCEDURE sp_College_GetAll(
    IN p_search VARCHAR(200),
    IN p_status TINYINT
)
BEGIN
    SELECT *
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND (
            p_search IS NULL OR TRIM(p_search) = ''
         OR college_code LIKE CONCAT('%', TRIM(p_search), '%')
         OR college_name LIKE CONCAT('%', TRIM(p_search), '%')
         OR university_name LIKE CONCAT('%', TRIM(p_search), '%')
         OR city LIKE CONCAT('%', TRIM(p_search), '%')
         OR principal LIKE CONCAT('%', TRIM(p_search), '%')
         OR district LIKE CONCAT('%', TRIM(p_search), '%')
      )
    ORDER BY college_name, college_id;
END$$

CREATE PROCEDURE sp_College_GetByCode(
    IN p_college_code VARCHAR(50)
)
BEGIN
    SELECT *
    FROM colleges
    WHERE college_code = TRIM(p_college_code)
      AND deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_College_GetById(
    IN p_college_id BIGINT
)
BEGIN
    SELECT *
    FROM colleges
    WHERE college_id = p_college_id
      AND deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_College_Search(
    IN p_query VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_status TINYINT,
    IN p_page_number INT,
    IN p_page_size INT,
    IN p_sort_by VARCHAR(50),
    IN p_sort_direction VARCHAR(10)
)
BEGIN
    DECLARE v_page INT DEFAULT 1;
    DECLARE v_size INT DEFAULT 10;
    DECLARE v_offset INT DEFAULT 0;

    SET v_page = GREATEST(COALESCE(p_page_number, 1), 1);
    SET v_size = LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 100);
    SET v_offset = (v_page - 1) * v_size;

    SELECT *
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND (p_college_type IS NULL OR TRIM(p_college_type) = '' OR college_type LIKE CONCAT('%', TRIM(p_college_type), '%'))
      AND (p_university_name IS NULL OR TRIM(p_university_name) = '' OR university_name LIKE CONCAT('%', TRIM(p_university_name), '%'))
      AND (p_city IS NULL OR TRIM(p_city) = '' OR city LIKE CONCAT('%', TRIM(p_city), '%'))
      AND (p_state IS NULL OR TRIM(p_state) = '' OR state LIKE CONCAT('%', TRIM(p_state), '%'))
      AND (
            p_query IS NULL OR TRIM(p_query) = ''
         OR college_code LIKE CONCAT('%', TRIM(p_query), '%')
         OR college_name LIKE CONCAT('%', TRIM(p_query), '%')
         OR email LIKE CONCAT('%', TRIM(p_query), '%')
         OR mobile LIKE CONCAT('%', TRIM(p_query), '%')
         OR principal LIKE CONCAT('%', TRIM(p_query), '%')
         OR district LIKE CONCAT('%', TRIM(p_query), '%')
      )
    ORDER BY
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(p_sort_by) = 'collegecode' THEN college_code END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(p_sort_by) = 'collegecode' THEN college_code END ASC,
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(p_sort_by) = 'city' THEN city END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(p_sort_by) = 'city' THEN city END ASC,
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(p_sort_by) = 'status' THEN status END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(p_sort_by) = 'status' THEN status END ASC,
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(p_sort_by) = 'createdat' THEN created_at END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(p_sort_by) = 'createdat' THEN created_at END ASC,
        CASE WHEN LOWER(p_sort_direction) = 'desc' AND LOWER(COALESCE(p_sort_by, 'collegename')) = 'collegename' THEN college_name END DESC,
        CASE WHEN LOWER(p_sort_direction) <> 'desc' AND LOWER(COALESCE(p_sort_by, 'collegename')) = 'collegename' THEN college_name END ASC,
        college_id DESC
    LIMIT v_offset, v_size;

    SELECT COUNT(*) AS total_count
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_status IS NULL OR status = p_status)
      AND (p_college_type IS NULL OR TRIM(p_college_type) = '' OR college_type LIKE CONCAT('%', TRIM(p_college_type), '%'))
      AND (p_university_name IS NULL OR TRIM(p_university_name) = '' OR university_name LIKE CONCAT('%', TRIM(p_university_name), '%'))
      AND (p_city IS NULL OR TRIM(p_city) = '' OR city LIKE CONCAT('%', TRIM(p_city), '%'))
      AND (p_state IS NULL OR TRIM(p_state) = '' OR state LIKE CONCAT('%', TRIM(p_state), '%'))
      AND (
            p_query IS NULL OR TRIM(p_query) = ''
         OR college_code LIKE CONCAT('%', TRIM(p_query), '%')
         OR college_name LIKE CONCAT('%', TRIM(p_query), '%')
         OR email LIKE CONCAT('%', TRIM(p_query), '%')
         OR mobile LIKE CONCAT('%', TRIM(p_query), '%')
         OR principal LIKE CONCAT('%', TRIM(p_query), '%')
         OR district LIKE CONCAT('%', TRIM(p_query), '%')
      );
END$$

CREATE PROCEDURE sp_College_Update(
    IN p_college_id BIGINT,
    IN p_college_code VARCHAR(50),
    IN p_college_name VARCHAR(200),
    IN p_college_type VARCHAR(50),
    IN p_university_name VARCHAR(200),
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_phone VARCHAR(20),
    IN p_principal VARCHAR(200),
    IN p_principal_email VARCHAR(150),
    IN p_principal_contact VARCHAR(10),
    IN p_alternate_contact_number VARCHAR(10),
    IN p_accreditation_status VARCHAR(30),
    IN p_accreditation_body VARCHAR(80),
    IN p_accreditation_grade VARCHAR(20),
    IN p_accreditation_number VARCHAR(50),
    IN p_valid_from DATE,
    IN p_valid_until DATE,
    IN p_address_line1 VARCHAR(255),
    IN p_address_line2 VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_area VARCHAR(150),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_website VARCHAR(255),
    IN p_academic_year_id BIGINT,
    IN p_timezone VARCHAR(100),
    IN p_currency_code VARCHAR(10),
    IN p_logo_path VARCHAR(500),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM colleges
        WHERE college_id = p_college_id AND deleted_at IS NULL
    ) THEN
        SELECT * FROM colleges WHERE 1 = 0;
    ELSE
        IF EXISTS (
            SELECT 1 FROM colleges
            WHERE college_code = TRIM(p_college_code)
              AND college_id <> p_college_id
              AND deleted_at IS NULL
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'College code already exists.';
        END IF;

        IF NULLIF(TRIM(p_accreditation_status), '') IS NOT NULL
           AND TRIM(p_accreditation_status) NOT IN (
               'Accredited', 'Not Accredited', 'Under Review', 'Expired'
           ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid accreditation status.';
        END IF;

        IF p_valid_from IS NOT NULL
           AND p_valid_until IS NOT NULL
           AND p_valid_until < p_valid_from THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid until must be on or after valid from.';
        END IF;

        UPDATE colleges
        SET college_code = UPPER(TRIM(p_college_code)),
            college_name = TRIM(p_college_name),
            college_type = p_college_type,
            university_name = p_university_name,
            email = p_email,
            mobile = p_mobile,
            phone = p_phone,
            principal = p_principal,
            principal_email = p_principal_email,
            principal_contact = p_principal_contact,
            alternate_contact_number = p_alternate_contact_number,
            accreditation_status = NULLIF(TRIM(p_accreditation_status), ''),
            accreditation_body = p_accreditation_body,
            accreditation_grade = p_accreditation_grade,
            accreditation_number = p_accreditation_number,
            valid_from = p_valid_from,
            valid_until = p_valid_until,
            address_line1 = p_address_line1,
            address_line2 = p_address_line2,
            city = p_city,
            area = p_area,
            district = p_district,
            state = p_state,
            country = p_country,
            pincode = p_pincode,
            website = p_website,
            academic_year_id = p_academic_year_id,
            timezone = COALESCE(NULLIF(TRIM(p_timezone), ''), timezone),
            currency_code = COALESCE(NULLIF(TRIM(p_currency_code), ''), currency_code),
            logo_path = p_logo_path,
            status = COALESCE(p_status, status),
            updated_at = UTC_TIMESTAMP(),
            updated_by = p_updated_by
        WHERE college_id = p_college_id;

        SELECT * FROM colleges WHERE college_id = p_college_id;
    END IF;
END$$

CREATE PROCEDURE sp_College_UpdateStatus(
    IN p_college_id BIGINT,
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE colleges
    SET status = p_status,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE college_id = p_college_id
      AND deleted_at IS NULL;

    SELECT *
    FROM colleges
    WHERE college_id = p_college_id
      AND deleted_at IS NULL;
END$$

DELIMITER ;

SHOW PROCEDURE STATUS
WHERE Db = DATABASE()
  AND Name IN (
      'sp_College_CodeExists', 'sp_College_Create', 'sp_College_GetAll',
      'sp_College_GetByCode', 'sp_College_GetById', 'sp_College_Search',
      'sp_College_Update', 'sp_College_UpdateStatus'
  );
