DROP PROCEDURE IF EXISTS sp_faculty_get_by_id;

DELIMITER $$

CREATE PROCEDURE sp_faculty_get_by_id
(
    IN p_faculty_id BIGINT
)
BEGIN

    SELECT

        /* ============================================
           FACULTY DETAILS
           ============================================ */

        f.faculty_id AS FacultyId,

        f.faculty_code AS FacultyCode,

        f.faculty_name AS FacultyName,

        f.designation AS Designation,

        f.qualification AS Qualification,

        f.specialization AS Specialization,

        f.experience_years AS ExperienceYears,

        f.employment_type AS EmploymentType,

        f.date_of_joining AS DateOfJoining,

        f.official_email AS OfficialEmail,

        f.mobile AS Mobile,

        f.is_hod AS IsHod,

        f.status AS Status,


        /* ============================================
           USER DETAILS
           ============================================ */

        u.user_id AS UserId,

        u.employee_user_id AS EmployeeUserId,

        u.full_name AS UserFullName,

        u.email AS UserEmail,

        u.mobile AS UserMobile,


        /* ============================================
           COLLEGE DETAILS
           ============================================ */

        f.college_id AS CollegeId,

        c.college_code AS CollegeCode,

        c.college_name AS CollegeName,


        /* ============================================
           DEPARTMENT DETAILS
           ============================================ */

        f.department_id AS DepartmentId,

        d.department_code AS DepartmentCode,

        d.department_name AS DepartmentName,


        /* ============================================
           EMPLOYEE PROFILE
           ============================================ */

        f.employee_profile_id AS EmployeeProfileId,

        COALESCE(
            fp.date_of_birth,
            ep.date_of_birth
        ) AS DateOfBirth,

        COALESCE(
            fp.gender,
            ep.gender
        ) AS Gender,


        /* ============================================
           CURRENT ADDRESS
           ============================================ */

        COALESCE(
            fp.house_number,
            ep.house_number
        ) AS HouseNumber,

        COALESCE(
            fp.address,
            ep.address
        ) AS Address,

        COALESCE(
            fp.pincode,
            ep.pincode
        ) AS Pincode,

        COALESCE(
            fp.city,
            ep.city
        ) AS City,

        COALESCE(
            fp.district,
            ep.district
        ) AS District,

        COALESCE(
            fp.state,
            ep.state
        ) AS State,

        COALESCE(
            fp.country,
            'India'
        ) AS Country,


        /* ============================================
           PERMANENT ADDRESS
           ============================================ */

        COALESCE(
            fp.permanent_house_number,
            ep.permanent_house_number
        ) AS PermanentHouseNumber,

        COALESCE(
            fp.permanent_address,
            ep.permanent_address
        ) AS PermanentAddress,

        COALESCE(
            fp.permanent_pincode,
            ep.permanent_pincode
        ) AS PermanentPincode,

        COALESCE(
            fp.permanent_city,
            ep.permanent_city
        ) AS PermanentCity,

        COALESCE(
            fp.permanent_district,
            ep.permanent_district
        ) AS PermanentDistrict,

        COALESCE(
            fp.permanent_state,
            ep.permanent_state
        ) AS PermanentState,

        COALESCE(
            fp.permanent_country,
            ep.permanent_country,
            'India'
        ) AS PermanentCountry,


        /* ============================================
           PROFILE INFORMATION
           ============================================ */

        COALESCE(
            fp.about_me,
            ep.about_me
        ) AS AboutMe,

        COALESCE(
            fp.profile_image_path,
            ep.profile_image_path
        ) AS ProfileImagePath,


        /* ============================================
           EMERGENCY CONTACT
           ============================================ */

        fp.emergency_contact_name
            AS EmergencyContactName,

        fp.emergency_contact_number
            AS EmergencyContactNumber,

        fp.emergency_contact_relation
            AS EmergencyContactRelation,


        /* ============================================
           AUDIT DETAILS
           ============================================ */

        f.created_at AS CreatedAt,

        f.updated_at AS UpdatedAt


    FROM faculty f


    /* ============================================
       USER
       ============================================ */

    INNER JOIN users u
        ON u.user_id = f.user_id


    /* ============================================
       COLLEGE
       ============================================ */

    LEFT JOIN colleges c
        ON c.college_id = f.college_id


    /* ============================================
       DEPARTMENT
       ============================================ */

    LEFT JOIN departments d
        ON d.department_id = f.department_id


    /* ============================================
       EMPLOYEE PROFILE
       ============================================ */

    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id =
            f.employee_profile_id


    /* ============================================
       FACULTY PROFILE
       ============================================ */

    LEFT JOIN faculty_profile fp
        ON fp.faculty_id = f.faculty_id

        AND fp.deleted_at IS NULL


    WHERE

        f.faculty_id = p_faculty_id

        AND f.deleted_at IS NULL;


END $$

DELIMITER ;