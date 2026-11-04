-- CMS R12: college/profile setup and idempotent semester creation.
-- MySQL 8.0; select the API's database before running this file (e.g. USE cms_btech).
-- Run with stop-on-error enabled, before starting the R12 backend. No EF migrations.
-- Existing rows, college assignments and historical creator IDs are preserved.
-- If preflight reports duplicate active semesters, inspect the result set and resolve
-- those records explicitly. This patch never deletes, merges, or archives your data.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_CMS_R12_Prepare$$
CREATE PROCEDURE sp_CMS_R12_Prepare()
BEGIN
    IF EXISTS (SELECT 1 FROM semesters WHERE is_archived=0
        GROUP BY branch_id,academic_year_id,semester_number HAVING COUNT(*)>1) THEN
        SELECT branch_id,academic_year_id,semester_number,COUNT(*) AS duplicate_count,
            GROUP_CONCAT(semester_id ORDER BY semester_id) AS semester_ids
        FROM semesters WHERE is_archived=0
        GROUP BY branch_id,academic_year_id,semester_number HAVING COUNT(*)>1;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='R12 stopped: resolve duplicate active semesters before retrying. No rows were changed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
        AND table_name='employee_profiles' AND column_name='country') THEN
        ALTER TABLE employee_profiles ADD COLUMN country VARCHAR(100) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
        AND table_name='semesters' AND column_name='active_semester_slot') THEN
        ALTER TABLE semesters ADD COLUMN active_semester_slot TINYINT
            GENERATED ALWAYS AS (CASE WHEN is_archived=0 THEN 1 ELSE NULL END) STORED;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
        AND table_name='semesters' AND index_name='uq_semester_active_slot') THEN
        ALTER TABLE semesters ADD UNIQUE KEY uq_semester_active_slot
            (branch_id,academic_year_id,semester_number,active_semester_slot);
    END IF;
END$$
CALL sp_CMS_R12_Prepare()$$
DROP PROCEDURE sp_CMS_R12_Prepare$$

DROP PROCEDURE IF EXISTS `sp_College_GetAllVisible`$$
CREATE PROCEDURE `sp_College_GetAllVisible`(
    IN p_actor_user_id BIGINT,
    IN p_assigned_college_id BIGINT,
    IN p_allow_creator BOOLEAN,
    IN p_unrestricted BOOLEAN,
    IN p_search VARCHAR(200),
    IN p_status TINYINT
)
BEGIN
    SELECT *
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_unrestricted = 1 OR college_id = p_assigned_college_id
          OR (p_allow_creator = 1 AND created_by = p_actor_user_id))
      AND (p_status IS NULL OR status = p_status)
      AND (
            (p_search COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_search COLLATE utf8mb4_unicode_ci)) = ''
         OR college_code LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR college_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR university_name LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
         OR city LIKE CONCAT('%', TRIM((p_search COLLATE utf8mb4_unicode_ci)), '%')
      )
    ORDER BY college_name, college_id;
END$$

DROP PROCEDURE IF EXISTS `sp_College_SearchVisible`$$
CREATE PROCEDURE `sp_College_SearchVisible`(
    IN p_actor_user_id BIGINT,
    IN p_assigned_college_id BIGINT,
    IN p_allow_creator BOOLEAN,
    IN p_unrestricted BOOLEAN,
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
      AND (p_unrestricted = 1 OR college_id = p_assigned_college_id
          OR (p_allow_creator = 1 AND created_by = p_actor_user_id))
      AND (p_status IS NULL OR status = p_status)
      AND ((p_college_type COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_college_type COLLATE utf8mb4_unicode_ci)) = '' OR college_type LIKE CONCAT('%', TRIM((p_college_type COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_university_name COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_university_name COLLATE utf8mb4_unicode_ci)) = '' OR university_name LIKE CONCAT('%', TRIM((p_university_name COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_city COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_city COLLATE utf8mb4_unicode_ci)) = '' OR city LIKE CONCAT('%', TRIM((p_city COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_state COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_state COLLATE utf8mb4_unicode_ci)) = '' OR state LIKE CONCAT('%', TRIM((p_state COLLATE utf8mb4_unicode_ci)), '%'))
      AND (
            (p_query COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_query COLLATE utf8mb4_unicode_ci)) = ''
         OR college_code LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR college_name LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR email LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR mobile LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
      )
    ORDER BY
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'collegecode' THEN college_code END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'collegecode' THEN college_code END ASC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'city' THEN city END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'city' THEN city END ASC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'status' THEN status END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'status' THEN status END ASC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'createdat' THEN created_at END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER((p_sort_by COLLATE utf8mb4_unicode_ci)) = 'createdat' THEN created_at END ASC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) = 'desc' AND LOWER(COALESCE((p_sort_by COLLATE utf8mb4_unicode_ci), 'collegename')) = 'collegename' THEN college_name END DESC,
        CASE WHEN LOWER((p_sort_direction COLLATE utf8mb4_unicode_ci)) <> 'desc' AND LOWER(COALESCE((p_sort_by COLLATE utf8mb4_unicode_ci), 'collegename')) = 'collegename' THEN college_name END ASC,
        college_id DESC
    LIMIT v_offset, v_size;

    SELECT COUNT(*) AS total_count
    FROM colleges
    WHERE deleted_at IS NULL
      AND (p_unrestricted = 1 OR college_id = p_assigned_college_id
          OR (p_allow_creator = 1 AND created_by = p_actor_user_id))
      AND (p_status IS NULL OR status = p_status)
      AND ((p_college_type COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_college_type COLLATE utf8mb4_unicode_ci)) = '' OR college_type LIKE CONCAT('%', TRIM((p_college_type COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_university_name COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_university_name COLLATE utf8mb4_unicode_ci)) = '' OR university_name LIKE CONCAT('%', TRIM((p_university_name COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_city COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_city COLLATE utf8mb4_unicode_ci)) = '' OR city LIKE CONCAT('%', TRIM((p_city COLLATE utf8mb4_unicode_ci)), '%'))
      AND ((p_state COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_state COLLATE utf8mb4_unicode_ci)) = '' OR state LIKE CONCAT('%', TRIM((p_state COLLATE utf8mb4_unicode_ci)), '%'))
      AND (
            (p_query COLLATE utf8mb4_unicode_ci) IS NULL OR TRIM((p_query COLLATE utf8mb4_unicode_ci)) = ''
         OR college_code LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR college_name LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR email LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
         OR mobile LIKE CONCAT('%', TRIM((p_query COLLATE utf8mb4_unicode_ci)), '%')
      );
END$$

DROP PROCEDURE IF EXISTS sp_get_employee_profile$$
CREATE PROCEDURE `sp_get_employee_profile`(
    IN p_user_id BIGINT
)
BEGIN

    SELECT
        ep.employee_profile_id AS EmployeeProfileId,
        ep.user_id AS UserId,

        ep.date_of_birth AS DateOfBirth,
        ep.gender AS Gender,

        ep.department_id AS DepartmentId,
        d.department_name AS DepartmentName,
        ep.designation AS Designation,

        -- Current Address
        ep.house_number AS HouseNumber,
        ep.address AS Address,
        ep.pincode AS Pincode,
        ep.city AS City,
        ep.district AS District,
        ep.state AS State,
        ep.country AS Country,

        -- Permanent Address
        ep.permanent_house_number AS PermanentHouseNumber,
        ep.permanent_address AS PermanentAddress,
        ep.permanent_pincode AS PermanentPincode,
        ep.permanent_city AS PermanentCity,
        ep.permanent_district AS PermanentDistrict,
        ep.permanent_state AS PermanentState,
        ep.permanent_country AS PermanentCountry,

        ep.about_me AS AboutMe,
        ep.profile_image_path AS ProfileImagePath,

        ep.status AS Status,

        ep.created_at AS CreatedAt,
        ep.updated_at AS UpdatedAt

    FROM employee_profiles ep

    LEFT JOIN departments d
        ON d.department_id = ep.department_id
        AND d.deleted_at IS NULL

    WHERE ep.user_id = p_user_id
      AND ep.deleted_at IS NULL

    LIMIT 1;

END$$

DROP PROCEDURE IF EXISTS sp_update_employee_profile$$
CREATE PROCEDURE `sp_update_employee_profile`(
    IN p_user_id BIGINT,

    IN p_date_of_birth DATE,
    IN p_gender VARCHAR(20),
    IN p_department_id BIGINT,
    IN p_designation VARCHAR(150),

    -- Current Address
    IN p_house_number VARCHAR(100),
    IN p_address VARCHAR(500),
    IN p_pincode VARCHAR(10),
    IN p_city VARCHAR(100),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),

    -- Permanent Address
    IN p_permanent_house_number VARCHAR(100),
    IN p_permanent_address VARCHAR(500),
    IN p_permanent_pincode VARCHAR(10),
    IN p_permanent_city VARCHAR(100),
    IN p_permanent_district VARCHAR(100),
    IN p_permanent_state VARCHAR(100),
    IN p_permanent_country VARCHAR(100),

    IN p_about_me VARCHAR(1000),

    IN p_updated_by BIGINT
)
BEGIN

    UPDATE employee_profiles

    SET

        date_of_birth =
            COALESCE(p_date_of_birth, date_of_birth),

        gender =
            COALESCE(p_gender, gender),

        department_id =
            COALESCE(p_department_id, department_id),

        designation =
            COALESCE(p_designation, designation),

        -- Current Address
        house_number =
            COALESCE(p_house_number, house_number),

        address =
            COALESCE(p_address, address),

        pincode =
            COALESCE(p_pincode, pincode),

        city =
            COALESCE(p_city, city),

        district =
            COALESCE(p_district, district),

        state =
            COALESCE(p_state, state),

        country = COALESCE(p_country, country),
        -- Permanent Address
        permanent_house_number =
            COALESCE(
                p_permanent_house_number,
                permanent_house_number
            ),

        permanent_address =
            COALESCE(
                p_permanent_address,
                permanent_address
            ),

        permanent_pincode =
            COALESCE(
                p_permanent_pincode,
                permanent_pincode
            ),

        permanent_city =
            COALESCE(
                p_permanent_city,
                permanent_city
            ),

        permanent_district =
            COALESCE(
                p_permanent_district,
                permanent_district
            ),

        permanent_state =
            COALESCE(
                p_permanent_state,
                permanent_state
            ),

        permanent_country =
            COALESCE(
                p_permanent_country,
                permanent_country
            ),

        about_me =
            COALESCE(p_about_me, about_me),

        updated_at = UTC_TIMESTAMP(),

        updated_by = p_updated_by

    WHERE user_id = p_user_id
      AND deleted_at IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;

END$$
DELIMITER ;
SELECT 'CMS R12 SQL applied' AS result;
