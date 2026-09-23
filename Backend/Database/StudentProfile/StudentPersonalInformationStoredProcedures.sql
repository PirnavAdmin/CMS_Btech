-- =============================================================
-- STUDENT PROFILE: PERSONAL INFORMATION + AUDIT
-- MySQL 8.x
-- Prerequisites already present in the supplied database:
--   students, student_profiles, student_profile_updates,
--   courses, branches, academicyears, users
-- =============================================================

USE cms_btech;

DROP PROCEDURE IF EXISTS sp_student_profile_personal_get;
DROP PROCEDURE IF EXISTS sp_student_profile_personal_update;

DELIMITER $$

CREATE PROCEDURE sp_student_profile_personal_get(
    IN p_student_id BIGINT
)
BEGIN
    SELECT
        s.student_id,
        s.student_code,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        sp.ProfilePhoto AS profile_photo,
        sp.AlternateEmail AS alternate_email,
        sp.AlternateMobile AS alternate_mobile,
        COALESCE(sp.BloodGroup, s.blood_group) AS blood_group,
        sp.Nationality AS nationality,
        sp.Religion AS religion,
        sp.Category AS category,
        COALESCE(sp.Address, s.address) AS address,
        sp.City AS city,
        sp.District AS district,
        sp.State AS state,
        COALESCE(sp.Country, 'India') AS country,
        sp.Pincode AS pincode,
        COALESCE(sp.ProfileStatus, 'Incomplete') AS profile_status,
        COALESCE(sp.IsProfileCompleted, 0) AS is_profile_completed,
        COALESCE(sp.IsVerified, 0) AS is_verified,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS profile_completion_percentage,
        s.college_id,
        s.course_id,
        c.course_name,
        s.branch_id,
        b.branch_name,
        s.academic_year_id,
        ay.academic_year_name,
        COALESCE(
            GREATEST(
                COALESCE(s.updated_at, s.created_at),
                COALESCE(sp.UpdatedAt, sp.CreatedAt)
            ),
            s.updated_at,
            s.created_at
        ) AS updated_at
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    LEFT JOIN courses c
        ON c.course_id = s.course_id
    LEFT JOIN branches b
        ON b.branch_id = s.branch_id
    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_student_profile_personal_update(
    IN p_student_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_profile_photo VARCHAR(500),
    IN p_alternate_email VARCHAR(150),
    IN p_alternate_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_nationality VARCHAR(100),
    IN p_religion VARCHAR(100),
    IN p_category VARCHAR(100),
    IN p_address TEXT,
    IN p_city VARCHAR(100),
    IN p_district VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_country VARCHAR(100),
    IN p_pincode VARCHAR(10),
    IN p_change_reason VARCHAR(500),
    IN p_changed_by BIGINT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_profile_id BIGINT DEFAULT NULL;
    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_changed_fields JSON;
    DECLARE v_old_values JSON;
    DECLARE v_new_values JSON;

    DECLARE v_old_full_name VARCHAR(150);
    DECLARE v_old_gender VARCHAR(20);
    DECLARE v_old_date_of_birth DATE;
    DECLARE v_old_email VARCHAR(150);
    DECLARE v_old_mobile VARCHAR(20);
    DECLARE v_old_profile_photo VARCHAR(500);
    DECLARE v_old_alternate_email VARCHAR(150);
    DECLARE v_old_alternate_mobile VARCHAR(20);
    DECLARE v_old_blood_group VARCHAR(10);
    DECLARE v_old_nationality VARCHAR(100);
    DECLARE v_old_religion VARCHAR(100);
    DECLARE v_old_category VARCHAR(100);
    DECLARE v_old_address TEXT;
    DECLARE v_old_city VARCHAR(100);
    DECLARE v_old_district VARCHAR(100);
    DECLARE v_old_state VARCHAR(100);
    DECLARE v_old_country VARCHAR(100);
    DECLARE v_old_pincode VARCHAR(10);
    DECLARE v_completion_percentage DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_completed TINYINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_changed_fields = JSON_ARRAY();
    SET v_old_values = JSON_OBJECT();
    SET v_new_values = JSON_OBJECT();

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid student ID is required.';
    END IF;

    IF p_changed_by IS NULL OR p_changed_by <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A valid logged-in user is required.';
    END IF;

    IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Date of birth cannot be in the future.';
    END IF;

    START TRANSACTION;

    SELECT COUNT(*)
    INTO v_student_exists
    FROM students s
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL;

    IF v_student_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student profile not found.';
    END IF;

    SELECT
        sp.StudentProfileId,
        s.full_name,
        s.gender,
        s.date_of_birth,
        s.email,
        s.mobile,
        sp.ProfilePhoto,
        sp.AlternateEmail,
        sp.AlternateMobile,
        COALESCE(sp.BloodGroup, s.blood_group),
        sp.Nationality,
        sp.Religion,
        sp.Category,
        COALESCE(sp.Address, s.address),
        sp.City,
        sp.District,
        sp.State,
        COALESCE(sp.Country, 'India'),
        sp.Pincode
    INTO
        v_profile_id,
        v_old_full_name,
        v_old_gender,
        v_old_date_of_birth,
        v_old_email,
        v_old_mobile,
        v_old_profile_photo,
        v_old_alternate_email,
        v_old_alternate_mobile,
        v_old_blood_group,
        v_old_nationality,
        v_old_religion,
        v_old_category,
        v_old_address,
        v_old_city,
        v_old_district,
        v_old_state,
        v_old_country,
        v_old_pincode
    FROM students s
    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
       AND sp.IsDeleted = 0
    WHERE s.student_id = p_student_id
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF p_full_name IS NOT NULL AND NOT (p_full_name <=> v_old_full_name) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'FullName');
        SET v_old_values = JSON_SET(v_old_values, '$.FullName', v_old_full_name);
        SET v_new_values = JSON_SET(v_new_values, '$.FullName', p_full_name);
    END IF;
    IF p_gender IS NOT NULL AND NOT (p_gender <=> v_old_gender) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Gender');
        SET v_old_values = JSON_SET(v_old_values, '$.Gender', v_old_gender);
        SET v_new_values = JSON_SET(v_new_values, '$.Gender', p_gender);
    END IF;
    IF p_date_of_birth IS NOT NULL AND NOT (p_date_of_birth <=> v_old_date_of_birth) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'DateOfBirth');
        SET v_old_values = JSON_SET(v_old_values, '$.DateOfBirth', v_old_date_of_birth);
        SET v_new_values = JSON_SET(v_new_values, '$.DateOfBirth', p_date_of_birth);
    END IF;
    IF p_email IS NOT NULL AND NOT (p_email <=> v_old_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Email');
        SET v_old_values = JSON_SET(v_old_values, '$.Email', v_old_email);
        SET v_new_values = JSON_SET(v_new_values, '$.Email', p_email);
    END IF;
    IF p_mobile IS NOT NULL AND NOT (p_mobile <=> v_old_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Mobile');
        SET v_old_values = JSON_SET(v_old_values, '$.Mobile', v_old_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.Mobile', p_mobile);
    END IF;
    IF p_profile_photo IS NOT NULL AND NOT (p_profile_photo <=> v_old_profile_photo) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'ProfilePhoto');
        SET v_old_values = JSON_SET(v_old_values, '$.ProfilePhoto', v_old_profile_photo);
        SET v_new_values = JSON_SET(v_new_values, '$.ProfilePhoto', p_profile_photo);
    END IF;
    IF p_alternate_email IS NOT NULL AND NOT (p_alternate_email <=> v_old_alternate_email) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateEmail');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateEmail', v_old_alternate_email);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateEmail', p_alternate_email);
    END IF;
    IF p_alternate_mobile IS NOT NULL AND NOT (p_alternate_mobile <=> v_old_alternate_mobile) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'AlternateMobile');
        SET v_old_values = JSON_SET(v_old_values, '$.AlternateMobile', v_old_alternate_mobile);
        SET v_new_values = JSON_SET(v_new_values, '$.AlternateMobile', p_alternate_mobile);
    END IF;
    IF p_blood_group IS NOT NULL AND NOT (p_blood_group <=> v_old_blood_group) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'BloodGroup');
        SET v_old_values = JSON_SET(v_old_values, '$.BloodGroup', v_old_blood_group);
        SET v_new_values = JSON_SET(v_new_values, '$.BloodGroup', p_blood_group);
    END IF;
    IF p_nationality IS NOT NULL AND NOT (p_nationality <=> v_old_nationality) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Nationality');
        SET v_old_values = JSON_SET(v_old_values, '$.Nationality', v_old_nationality);
        SET v_new_values = JSON_SET(v_new_values, '$.Nationality', p_nationality);
    END IF;
    IF p_religion IS NOT NULL AND NOT (p_religion <=> v_old_religion) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Religion');
        SET v_old_values = JSON_SET(v_old_values, '$.Religion', v_old_religion);
        SET v_new_values = JSON_SET(v_new_values, '$.Religion', p_religion);
    END IF;
    IF p_category IS NOT NULL AND NOT (p_category <=> v_old_category) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Category');
        SET v_old_values = JSON_SET(v_old_values, '$.Category', v_old_category);
        SET v_new_values = JSON_SET(v_new_values, '$.Category', p_category);
    END IF;
    IF p_address IS NOT NULL AND NOT (p_address <=> v_old_address) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Address');
        SET v_old_values = JSON_SET(v_old_values, '$.Address', v_old_address);
        SET v_new_values = JSON_SET(v_new_values, '$.Address', p_address);
    END IF;
    IF p_city IS NOT NULL AND NOT (p_city <=> v_old_city) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'City');
        SET v_old_values = JSON_SET(v_old_values, '$.City', v_old_city);
        SET v_new_values = JSON_SET(v_new_values, '$.City', p_city);
    END IF;
    IF p_district IS NOT NULL AND NOT (p_district <=> v_old_district) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'District');
        SET v_old_values = JSON_SET(v_old_values, '$.District', v_old_district);
        SET v_new_values = JSON_SET(v_new_values, '$.District', p_district);
    END IF;
    IF p_state IS NOT NULL AND NOT (p_state <=> v_old_state) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'State');
        SET v_old_values = JSON_SET(v_old_values, '$.State', v_old_state);
        SET v_new_values = JSON_SET(v_new_values, '$.State', p_state);
    END IF;
    IF p_country IS NOT NULL AND NOT (p_country <=> v_old_country) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Country');
        SET v_old_values = JSON_SET(v_old_values, '$.Country', v_old_country);
        SET v_new_values = JSON_SET(v_new_values, '$.Country', p_country);
    END IF;
    IF p_pincode IS NOT NULL AND NOT (p_pincode <=> v_old_pincode) THEN
        SET v_changed_fields = JSON_ARRAY_APPEND(v_changed_fields, '$', 'Pincode');
        SET v_old_values = JSON_SET(v_old_values, '$.Pincode', v_old_pincode);
        SET v_new_values = JSON_SET(v_new_values, '$.Pincode', p_pincode);
    END IF;

    IF JSON_LENGTH(v_changed_fields) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No personal-information values changed.';
    END IF;

    UPDATE students
    SET
        full_name = COALESCE(p_full_name, full_name),
        gender = COALESCE(p_gender, gender),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        email = COALESCE(p_email, email),
        mobile = COALESCE(p_mobile, mobile),
        blood_group = COALESCE(p_blood_group, blood_group),
        address = COALESCE(p_address, address),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_changed_by
    WHERE student_id = p_student_id;

    IF v_profile_id IS NULL THEN
        INSERT INTO student_profiles
        (
            StudentId, ProfilePhoto, AlternateEmail, AlternateMobile,
            BloodGroup, Nationality, Religion, Category, Address,
            City, District, State, Country, Pincode,
            IsActive, IsDeleted, CreatedBy, CreatedAt
        )
        VALUES
        (
            p_student_id, p_profile_photo, p_alternate_email, p_alternate_mobile,
            p_blood_group, p_nationality, p_religion, p_category, p_address,
            p_city, p_district, p_state, COALESCE(p_country, 'India'), p_pincode,
            1, 0, p_changed_by, UTC_TIMESTAMP()
        );

        SET v_profile_id = LAST_INSERT_ID();
    ELSE
        UPDATE student_profiles
        SET
            ProfilePhoto = COALESCE(p_profile_photo, ProfilePhoto),
            AlternateEmail = COALESCE(p_alternate_email, AlternateEmail),
            AlternateMobile = COALESCE(p_alternate_mobile, AlternateMobile),
            BloodGroup = COALESCE(p_blood_group, BloodGroup),
            Nationality = COALESCE(p_nationality, Nationality),
            Religion = COALESCE(p_religion, Religion),
            Category = COALESCE(p_category, Category),
            Address = COALESCE(p_address, Address),
            City = COALESCE(p_city, City),
            District = COALESCE(p_district, District),
            State = COALESCE(p_state, State),
            Country = COALESCE(p_country, Country),
            Pincode = COALESCE(p_pincode, Pincode),
            UpdatedBy = p_changed_by,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StudentProfileId = v_profile_id;
    END IF;

    SELECT
        ROUND(
            (
                (s.full_name IS NOT NULL AND TRIM(s.full_name) <> '') +
                (s.gender IS NOT NULL AND TRIM(s.gender) <> '') +
                (s.date_of_birth IS NOT NULL) +
                (s.email IS NOT NULL AND TRIM(s.email) <> '') +
                (s.mobile IS NOT NULL AND TRIM(s.mobile) <> '') +
                (sp.BloodGroup IS NOT NULL AND TRIM(sp.BloodGroup) <> '') +
                (sp.Nationality IS NOT NULL AND TRIM(sp.Nationality) <> '') +
                (sp.Address IS NOT NULL AND TRIM(sp.Address) <> '') +
                (sp.City IS NOT NULL AND TRIM(sp.City) <> '') +
                (sp.District IS NOT NULL AND TRIM(sp.District) <> '') +
                (sp.State IS NOT NULL AND TRIM(sp.State) <> '') +
                (sp.Country IS NOT NULL AND TRIM(sp.Country) <> '') +
                (sp.Pincode IS NOT NULL AND TRIM(sp.Pincode) <> '')
            ) / 13 * 100,
            2
        )
    INTO v_completion_percentage
    FROM students s
    INNER JOIN student_profiles sp ON sp.StudentId = s.student_id
    WHERE s.student_id = p_student_id;

    SET v_completed = IF(v_completion_percentage = 100.00, 1, 0);

    UPDATE student_profiles
    SET
        ProfileCompletionPercentage = v_completion_percentage,
        IsProfileCompleted = v_completed,
        ProfileStatus = CASE
            WHEN ProfileStatus IN ('Verified', 'Active', 'Inactive', 'Suspended')
                THEN ProfileStatus
            WHEN v_completed = 1 THEN 'Pending Verification'
            ELSE 'Incomplete'
        END,
        UpdatedBy = p_changed_by,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentProfileId = v_profile_id;

    INSERT INTO student_profile_updates
    (
        StudentProfileId,
        StudentId,
        ChangeType,
        ChangedFields,
        OldValues,
        NewValues,
        ChangeReason,
        ChangeSource,
        ChangedBy,
        ChangedAt,
        IpAddress,
        UserAgent
    )
    VALUES
    (
        v_profile_id,
        p_student_id,
        'Update',
        CAST(v_changed_fields AS CHAR),
        CAST(v_old_values AS CHAR),
        CAST(v_new_values AS CHAR),
        NULLIF(TRIM(p_change_reason), ''),
        'Profile API',
        p_changed_by,
        UTC_TIMESTAMP(6),
        p_ip_address,
        p_user_agent
    );

    COMMIT;

    CALL sp_student_profile_personal_get(p_student_id);
END$$

DELIMITER ;

-- Verification commands:
-- CALL sp_student_profile_personal_get(1);
-- CALL sp_student_profile_personal_update(
--   1, NULL, NULL, NULL, NULL, NULL, NULL,
--   'student.personal@example.com', '9000000099', NULL,
--   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
--   'Updated alternate contact details', 1, '127.0.0.1', 'MySQL Workbench'
-- );
