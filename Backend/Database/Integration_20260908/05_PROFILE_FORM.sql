USE cms_btech;
DELIMITER $$

CREATE TABLE IF NOT EXISTS student_profile_form_data (
student_id BIGINT NOT NULL PRIMARY KEY,form_data JSON NOT NULL,updated_by BIGINT NULL,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_profile_form_student FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE RESTRICT
) ENGINE=InnoDB$$
DROP PROCEDURE IF EXISTS sp_student_profile_full_update_v2$$
CREATE PROCEDURE `sp_student_profile_full_update_v2`(
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
    IN p_user_agent VARCHAR(500), IN p_form_data LONGTEXT, IN p_profile_photo LONGTEXT
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
        'MotherOccupation', p.`mother_occupation`, 'ScreenForm', (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id)
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
        'MotherOccupation', p.`mother_occupation`, 'ScreenForm', (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id)
    ) INTO v_new_values
    FROM `students` s
    LEFT JOIN `student_parents` p ON p.`student_id` = s.`student_id`
    WHERE s.`student_id` = p_student_id;

    IF p_form_data IS NOT NULL THEN
        IF JSON_VALID(p_form_data)=0 OR JSON_TYPE(CAST(p_form_data AS JSON))<>'OBJECT' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student form must be a JSON object.'; END IF;
        INSERT INTO student_profile_form_data(student_id,form_data,updated_by,updated_at)
        VALUES(p_student_id,CAST(p_form_data AS JSON),p_changed_by,UTC_TIMESTAMP())
        ON DUPLICATE KEY UPDATE form_data=JSON_MERGE_PATCH(form_data,VALUES(form_data)),updated_by=p_changed_by,updated_at=UTC_TIMESTAMP();
    END IF;
    UPDATE student_profiles SET ProfilePhoto=COALESCE(p_profile_photo,ProfilePhoto),
        HouseNumber=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.houseNumber')),'null'),HouseNumber),
        PermanentHouseNumber=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.houseNumber')),'null'),PermanentHouseNumber),
        PermanentAddress=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.line1')),'null'),PermanentAddress),
        PermanentCity=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.city')),'null'),PermanentCity),
        PermanentDistrict=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.district')),'null'),PermanentDistrict),
        PermanentState=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.state')),'null'),PermanentState),
        PermanentCountry=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.country')),'null'),PermanentCountry),
        PermanentPincode=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.permanentAddress.pincode')),'null'),PermanentPincode),
        City=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.city')),'null'),City),
        District=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.district')),'null'),District),
        State=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.state')),'null'),State),
        Pincode=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.pincode')),'null'),Pincode),
        Country=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.currentAddress.country')),'null'),Country),
        AlternateEmail=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.alternateEmail')),'null'),AlternateEmail),
        AlternateMobile=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.contact.alternateMobile')),'null'),AlternateMobile),
        Nationality=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.personal.nationality')),'null'),Nationality),
        Religion=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.personal.religion')),'null'),Religion),
        Category=COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_form_data,'$.personal.category')),'null'),Category)
    WHERE StudentId=p_student_id;
    SET v_new_values=JSON_SET(v_new_values,'$.ScreenForm',(SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id));

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
            'MotherEmail', 'MotherOccupation', 'ScreenForm'
        ),
        v_old_values, v_new_values,
        COALESCE(NULLIF(TRIM(p_change_reason), ''), 'Student profile updated from the profile screen.'),
        'API', p_changed_by, UTC_TIMESTAMP(6),
        LEFT(p_ip_address, 45), LEFT(p_user_agent, 500)
    );

    COMMIT;
    SELECT 1 AS `Updated`;
END$$
DROP PROCEDURE IF EXISTS sp_student_profile_get_preview$$
CREATE PROCEDURE `sp_student_profile_get_preview`(
    IN p_student_id BIGINT,
    IN p_college_id BIGINT
)
BEGIN

    SELECT
        (SELECT form_data FROM student_profile_form_data WHERE student_id=p_student_id) AS FrontendFormDataJson,

        /* =========================
           HEADER
           ========================= */

        s.student_id AS StudentId,

        s.student_code AS StudentCode,

        s.full_name AS StudentName,

        COALESCE(
            sp.ProfilePhoto,
            sa.StudentPhoto,
            sa.PassportPhoto
        ) AS ProfilePhoto,

        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status,


        /* =========================
           SUMMARY
           ========================= */

        sa.RegistrationNo AS RegistrationNumber,

        sa.AdmissionNo AS AdmissionNumber,

        NULL AS RollNumber,

        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS StudentStatus,


        /* =========================
           FEE STATUS
           ========================= */

        CASE

            WHEN sa.AdmissionFeeAmount IS NULL
                THEN 'Not available'

            WHEN sa.AdmissionFeeAmount = 0
                THEN 'Not available'

            WHEN sa.AdmissionFeePaid = 1
                THEN 'Paid'

            ELSE 'Pending'

        END AS FeeStatus,


        /* =========================
           ATTENDANCE / RESULTS
           ========================= */

        'Not available' AS AttendanceStatus,

        'Not available' AS ResultStatus,


        /* =========================
           ACADEMIC INFORMATION
           ========================= */

        s.course_id AS CourseId,

        c.course_name AS Course,

        b.department_id AS DepartmentId,

        d.department_name AS Department,

        s.branch_id AS BranchId,

        b.branch_name AS Branch,

        s.academic_year_id AS AcademicYearId,

        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,

        sec.section_id AS SectionId,

        sec.section_name AS Section,

        NULL AS AcademicRollNumber,

        sa.RegistrationNo AS AcademicRegistrationNumber,


        /* =========================
           PERSONAL INFORMATION
           ========================= */

        s.full_name AS PersonalFullName,

        s.gender AS Gender,

        s.date_of_birth AS DateOfBirth,

        s.mobile AS Mobile,

        s.email AS Email,

        s.blood_group AS BloodGroup,

        s.address AS Address,


        /* =========================
           PARENT / GUARDIAN
           ========================= */

        COALESCE(spar.father_name, sa.FatherName) AS FatherName,

        COALESCE(spar.mother_name, sa.MotherName) AS MotherName,

        sa.GuardianName AS GuardianName,

        COALESCE(spar.father_mobile, spar.mother_mobile, sa.GuardianMobile) AS ParentMobile,

        COALESCE(spar.father_email, spar.mother_email, sa.GuardianEmail) AS ParentEmail,

        COALESCE(spar.father_occupation, sa.Occupation) AS FatherOccupation,

        spar.mother_occupation AS MotherOccupation


    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN student_parents spar
        ON spar.student_id = s.student_id

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        s.student_id = p_student_id
        AND s.college_id = p_college_id
        AND s.deleted_at IS NULL;

END$$
DROP PROCEDURE IF EXISTS sp_student_profile_get_all$$
CREATE PROCEDURE `sp_student_profile_get_all`(
    IN p_college_id BIGINT,
    IN p_search VARCHAR(200),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester INT,
    IN p_section_id BIGINT,
    IN p_status INT
)
BEGIN

    SELECT
        s.student_id AS StudentId,
        s.student_code AS StudentCode,
        s.full_name AS StudentName,
        COALESCE(sp.ProfilePhoto, sa.StudentPhoto, sa.PassportPhoto) AS ProfilePhoto,
        COALESCE(sp.ProfileCompletionPercentage, 0.00) AS ProfileCompletionPercentage,

        -- Admission information
        sa.RegistrationNo AS RegistrationNumber,
        sa.AdmissionNo AS AdmissionNumber,

        -- Academic information
        s.course_id AS CourseId,
        c.course_name AS Course,

        s.branch_id AS BranchId,
        b.branch_name AS Branch,

        b.department_id AS DepartmentId,
        d.department_name AS Department,

        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYear,

        sec.semester AS Semester,
        sec.section_id AS SectionId,
        sec.section_name AS Section,

        -- Contact
        s.mobile AS Mobile,
        s.email AS Email,

        -- Status
        CASE
            WHEN sa.AdmissionStatus IS NOT NULL
                THEN sa.AdmissionStatus
            WHEN s.status = 1
                THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM students s

    LEFT JOIN studentadmissions sa
        ON sa.AdmissionId = s.admission_id

    LEFT JOIN student_profiles sp
        ON sp.StudentId = s.student_id
        AND sp.IsDeleted = 0

    LEFT JOIN courses c
        ON c.course_id = s.course_id

    LEFT JOIN branches b
        ON b.branch_id = s.branch_id

    LEFT JOIN departments d
        ON d.department_id = b.department_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id

    LEFT JOIN student_section_assignments ssa
        ON ssa.student_id = s.student_id
        AND ssa.academic_year_id = s.academic_year_id
        AND ssa.status = 1

    LEFT JOIN sections sec
        ON sec.section_id = ssa.section_id

    WHERE
        (p_college_id=0 OR s.college_id = p_college_id)
        AND s.deleted_at IS NULL

        -- Search
        AND
        (
            p_search IS NULL
            OR TRIM(p_search) = ''

            OR s.full_name LIKE CONCAT('%', p_search, '%')

            OR s.student_code LIKE CONCAT('%', p_search, '%')

            OR s.mobile LIKE CONCAT('%', p_search, '%')

            OR s.email LIKE CONCAT('%', p_search, '%')

            OR sa.RegistrationNo LIKE CONCAT('%', p_search, '%')

            OR sa.AdmissionNo LIKE CONCAT('%', p_search, '%')
        )

        -- Department
        AND
        (
            p_department_id IS NULL
            OR b.department_id = p_department_id
        )

        -- Course
        AND
        (
            p_course_id IS NULL
            OR s.course_id = p_course_id
        )

        -- Branch
        AND
        (
            p_branch_id IS NULL
            OR s.branch_id = p_branch_id
        )

        -- Academic Year
        AND
        (
            p_academic_year_id IS NULL
            OR s.academic_year_id = p_academic_year_id
        )

        -- Semester
        AND
        (
            p_semester IS NULL
            OR sec.semester = p_semester
        )

        -- Section
        AND
        (
            p_section_id IS NULL
            OR sec.section_id = p_section_id
        )

        -- Status
        AND
        (
            p_status IS NULL
            OR s.status = p_status
        )

    ORDER BY
        s.student_id DESC;

END$$
DELIMITER ;