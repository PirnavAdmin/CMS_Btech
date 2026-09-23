-- =============================================================
-- STUDENT PROFILE SCREEN: PERSONAL + PARENT UPDATE
-- MySQL 8.x. Updates the editable profile-screen fields and the
-- immutable student_profile_updates history in one transaction.
-- =============================================================

USE `cms_btech`;

DROP PROCEDURE IF EXISTS `sp_student_profile_full_update`;
DELIMITER $$
CREATE PROCEDURE `sp_student_profile_full_update`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT,
    IN p_full_name VARCHAR(150),
    IN p_gender VARCHAR(20),
    IN p_date_of_birth DATE,
    IN p_email VARCHAR(150),
    IN p_mobile VARCHAR(20),
    IN p_blood_group VARCHAR(10),
    IN p_address VARCHAR(500),
    IN p_father_name VARCHAR(150),
    IN p_father_mobile VARCHAR(20),
    IN p_father_email VARCHAR(150),
    IN p_father_occupation VARCHAR(100),
    IN p_mother_name VARCHAR(150),
    IN p_mother_mobile VARCHAR(20),
    IN p_mother_email VARCHAR(150),
    IN p_mother_occupation VARCHAR(100),
    IN p_change_reason VARCHAR(500),
    IN p_changed_by BIGINT,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent VARCHAR(500)
)
BEGIN
    DECLARE v_profile_id BIGINT DEFAULT NULL;
    DECLARE v_existing_student_id BIGINT DEFAULT NULL;
    DECLARE v_old_values JSON;
    DECLARE v_new_values JSON;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0
       OR p_college_id IS NULL OR p_college_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid student and college are required.';
    END IF;
    IF NULLIF(TRIM(p_full_name), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Full name is required.';
    END IF;
    IF p_date_of_birth IS NOT NULL AND p_date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of birth cannot be in the future.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM `users`
        WHERE `user_id` = p_changed_by AND `status` = 1 AND `deleted_at` IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid active audit user is required.';
    END IF;

    START TRANSACTION;

    SELECT s.`student_id`
      INTO v_existing_student_id
    FROM `students` s
    WHERE s.`student_id` = p_student_id
      AND s.`college_id` = p_college_id
      AND s.`deleted_at` IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_existing_student_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student profile not found for this college.';
    END IF;

    SELECT sp.`StudentProfileId`
      INTO v_profile_id
    FROM `student_profiles` sp
    WHERE sp.`StudentId` = p_student_id AND sp.`IsDeleted` = 0
    LIMIT 1
    FOR UPDATE;

    IF v_profile_id IS NULL THEN
        INSERT INTO `student_profiles` (
            `StudentId`, `BloodGroup`, `Address`, `IsActive`, `IsDeleted`,
            `CreatedBy`, `CreatedAt`, `UpdatedBy`, `UpdatedAt`
        ) VALUES (
            p_student_id, p_blood_group, p_address, 1, 0,
            p_changed_by, UTC_TIMESTAMP(), p_changed_by, UTC_TIMESTAMP()
        );
        SET v_profile_id = LAST_INSERT_ID();
    END IF;

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`
    ) INTO v_old_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    UPDATE `students`
    SET `full_name` = TRIM(p_full_name),
        `gender` = COALESCE(NULLIF(TRIM(p_gender), ''), `gender`),
        `date_of_birth` = COALESCE(p_date_of_birth, `date_of_birth`),
        `email` = COALESCE(NULLIF(TRIM(p_email), ''), `email`),
        `mobile` = COALESCE(NULLIF(TRIM(p_mobile), ''), `mobile`),
        `blood_group` = COALESCE(NULLIF(TRIM(p_blood_group), ''), `blood_group`),
        `address` = COALESCE(NULLIF(TRIM(p_address), ''), `address`),
        `updated_at` = UTC_TIMESTAMP(),
        `updated_by` = p_changed_by
    WHERE `student_id` = p_student_id AND `college_id` = p_college_id;

    UPDATE `student_profiles`
    SET `BloodGroup` = COALESCE(NULLIF(TRIM(p_blood_group), ''), `BloodGroup`),
        `Address` = COALESCE(NULLIF(TRIM(p_address), ''), `Address`),
        `UpdatedBy` = p_changed_by,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `StudentProfileId` = v_profile_id;

    INSERT INTO `student_parents` (
        `student_id`, `father_name`, `father_mobile`, `father_email`,
        `father_occupation`, `mother_name`, `mother_mobile`, `mother_email`,
        `mother_occupation`, `created_at`, `updated_at`
    ) VALUES (
        p_student_id, NULLIF(TRIM(p_father_name), ''), NULLIF(TRIM(p_father_mobile), ''),
        NULLIF(TRIM(p_father_email), ''), NULLIF(TRIM(p_father_occupation), ''),
        NULLIF(TRIM(p_mother_name), ''), NULLIF(TRIM(p_mother_mobile), ''),
        NULLIF(TRIM(p_mother_email), ''), NULLIF(TRIM(p_mother_occupation), ''),
        UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        `father_name` = COALESCE(NULLIF(TRIM(p_father_name), ''), `father_name`),
        `father_mobile` = COALESCE(NULLIF(TRIM(p_father_mobile), ''), `father_mobile`),
        `father_email` = COALESCE(NULLIF(TRIM(p_father_email), ''), `father_email`),
        `father_occupation` = COALESCE(NULLIF(TRIM(p_father_occupation), ''), `father_occupation`),
        `mother_name` = COALESCE(NULLIF(TRIM(p_mother_name), ''), `mother_name`),
        `mother_mobile` = COALESCE(NULLIF(TRIM(p_mother_mobile), ''), `mother_mobile`),
        `mother_email` = COALESCE(NULLIF(TRIM(p_mother_email), ''), `mother_email`),
        `mother_occupation` = COALESCE(NULLIF(TRIM(p_mother_occupation), ''), `mother_occupation`),
        `updated_at` = UTC_TIMESTAMP();

    SELECT JSON_OBJECT(
        'FullName', s.`full_name`, 'Gender', s.`gender`,
        'DateOfBirth', s.`date_of_birth`, 'Email', s.`email`,
        'Mobile', s.`mobile`, 'BloodGroup', s.`blood_group`,
        'Address', s.`address`, 'FatherName', p.`father_name`,
        'FatherMobile', p.`father_mobile`, 'FatherEmail', p.`father_email`,
        'FatherOccupation', p.`father_occupation`, 'MotherName', p.`mother_name`,
        'MotherMobile', p.`mother_mobile`, 'MotherEmail', p.`mother_email`,
        'MotherOccupation', p.`mother_occupation`
    ) INTO v_new_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    INSERT INTO `student_profile_updates` (
        `StudentProfileId`, `StudentId`, `ChangeType`, `ChangedFields`,
        `OldValues`, `NewValues`, `ChangeReason`, `ChangeSource`,
        `ChangedBy`, `ChangedAt`, `IpAddress`, `UserAgent`
    ) VALUES (
        v_profile_id, p_student_id, 'ProfileScreenUpdate',
        JSON_ARRAY(
            'FullName', 'Gender', 'DateOfBirth', 'Email', 'Mobile',
            'BloodGroup', 'Address', 'FatherName', 'FatherMobile',
            'FatherEmail', 'FatherOccupation', 'MotherName', 'MotherMobile',
            'MotherEmail', 'MotherOccupation'
        ),
        v_old_values, v_new_values,
        COALESCE(NULLIF(TRIM(p_change_reason), ''), 'Student profile updated from the profile screen.'),
        'API', p_changed_by, UTC_TIMESTAMP(6),
        LEFT(p_ip_address, 45), LEFT(p_user_agent, 500)
    );

    COMMIT;
    SELECT 1 AS `Updated`;
END$$
DELIMITER ;
