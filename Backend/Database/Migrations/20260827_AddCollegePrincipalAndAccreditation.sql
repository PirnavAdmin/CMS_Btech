-- College API Add/Edit expansion migration
-- Run this script once against the same MySQL schema used by the API.
-- It preserves all existing college records and is safe to run again.

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_20260827_college_fields$$

CREATE PROCEDURE migrate_20260827_college_fields()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'principal'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN principal VARCHAR(200) NULL AFTER phone;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'principal_email'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN principal_email VARCHAR(150) NULL AFTER principal;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'principal_contact'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN principal_contact VARCHAR(10) NULL AFTER principal_email;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'alternate_contact_number'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN alternate_contact_number VARCHAR(10) NULL
            AFTER principal_contact;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'accreditation_status'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN accreditation_status VARCHAR(30) NULL
            AFTER alternate_contact_number;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'accreditation_body'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN accreditation_body VARCHAR(80) NULL
            AFTER accreditation_status;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'accreditation_grade'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN accreditation_grade VARCHAR(20) NULL
            AFTER accreditation_body;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'accreditation_number'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN accreditation_number VARCHAR(50) NULL
            AFTER accreditation_grade;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'valid_from'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN valid_from DATE NULL AFTER accreditation_number;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'valid_until'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN valid_until DATE NULL AFTER valid_from;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'area'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN area VARCHAR(150) NULL AFTER city;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'colleges'
          AND COLUMN_NAME = 'district'
    ) THEN
        ALTER TABLE colleges
            ADD COLUMN district VARCHAR(100) NULL AFTER area;
    END IF;
END$$

CALL migrate_20260827_college_fields()$$
DROP PROCEDURE migrate_20260827_college_fields$$

DROP PROCEDURE IF EXISTS sp_College_Create$$

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
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College code is required.';
    END IF;

    IF p_college_name IS NULL OR TRIM(p_college_name) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College name is required.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM colleges
        WHERE college_code = TRIM(p_college_code)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'College code already exists.';
    END IF;

    IF NULLIF(TRIM(p_accreditation_status), '') IS NOT NULL
       AND TRIM(p_accreditation_status) NOT IN (
           'Accredited', 'Not Accredited', 'Under Review', 'Expired'
       ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid accreditation status.';
    END IF;

    IF p_valid_from IS NOT NULL
       AND p_valid_until IS NOT NULL
       AND p_valid_until < p_valid_from THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid until must be on or after valid from.';
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
        p_state, p_country, p_pincode, p_website, p_academic_year_id,
        COALESCE(NULLIF(TRIM(p_timezone), ''), 'Asia/Kolkata'),
        COALESCE(NULLIF(TRIM(p_currency_code), ''), 'INR'),
        p_logo_path, COALESCE(p_status, 1), UTC_TIMESTAMP(), p_created_by
    );

    SELECT *
    FROM colleges
    WHERE college_id = LAST_INSERT_ID();
END$$

DROP PROCEDURE IF EXISTS sp_College_Update$$

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
        WHERE college_id = p_college_id
          AND deleted_at IS NULL
    ) THEN
        SELECT * FROM colleges WHERE 1 = 0;
    ELSE
        IF EXISTS (
            SELECT 1 FROM colleges
            WHERE college_code = TRIM(p_college_code)
              AND college_id <> p_college_id
              AND deleted_at IS NULL
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'College code already exists.';
        END IF;

        IF NULLIF(TRIM(p_accreditation_status), '') IS NOT NULL
           AND TRIM(p_accreditation_status) NOT IN (
               'Accredited', 'Not Accredited', 'Under Review', 'Expired'
           ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Invalid accreditation status.';
        END IF;

        IF p_valid_from IS NOT NULL
           AND p_valid_until IS NOT NULL
           AND p_valid_until < p_valid_from THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Valid until must be on or after valid from.';
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

        SELECT *
        FROM colleges
        WHERE college_id = p_college_id;
    END IF;
END$$

DELIMITER ;

-- Verification: these queries should return 12 rows and two updated routines.
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'colleges'
  AND COLUMN_NAME IN (
      'principal', 'principal_email', 'principal_contact',
      'alternate_contact_number', 'accreditation_status',
      'accreditation_body', 'accreditation_grade',
      'accreditation_number', 'valid_from', 'valid_until',
      'area', 'district'
  )
ORDER BY ORDINAL_POSITION;

SHOW PROCEDURE STATUS
WHERE Db = DATABASE()
  AND Name IN ('sp_College_Create', 'sp_College_Update');
