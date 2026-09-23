USE cms_btech;

DROP PROCEDURE IF EXISTS sp_StudentAdmission_GetById;
DROP PROCEDURE IF EXISTS sp_StudentAdmission_Create;
DROP PROCEDURE IF EXISTS sp_StudentAdmission_Update;

DELIMITER $$

CREATE PROCEDURE sp_StudentAdmission_GetById(
    IN p_admission_id BIGINT
)
BEGIN
    SELECT *
    FROM studentadmissions
    WHERE AdmissionId = p_admission_id
      AND IsDeleted = 0
    LIMIT 1;
END$$

CREATE PROCEDURE sp_StudentAdmission_Create(
    IN p_registration_no VARCHAR(500),
    IN p_registration_date DATE,
    IN p_application_no VARCHAR(500),
    IN p_application_date DATE,
    IN p_admission_no VARCHAR(500),
    IN p_admission_date DATE,
    IN p_admission_type VARCHAR(500),
    IN p_admission_quota VARCHAR(500),
    IN p_medium VARCHAR(500),
    IN p_scholarship_status VARCHAR(500),
    IN p_first_name VARCHAR(500),
    IN p_last_name VARCHAR(500),
    IN p_gender VARCHAR(500),
    IN p_date_of_birth DATE,
    IN p_blood_group VARCHAR(500),
    IN p_student_photo VARCHAR(500),
    IN p_email VARCHAR(500),
    IN p_student_email VARCHAR(500),
    IN p_mobile_number VARCHAR(500),
    IN p_aadhaar_number VARCHAR(500),
    IN p_nationality VARCHAR(500),
    IN p_religion VARCHAR(500),
    IN p_category VARCHAR(500),
    IN p_father_name VARCHAR(500),
    IN p_mother_name VARCHAR(500),
    IN p_guardian_name VARCHAR(500),
    IN p_occupation VARCHAR(500),
    IN p_annual_income DECIMAL(15,2),
    IN p_mother_email VARCHAR(500),
    IN p_guardian_mobile VARCHAR(500),
    IN p_guardian_email VARCHAR(500),
    IN p_address TEXT,
    IN p_city VARCHAR(500),
    IN p_district VARCHAR(500),
    IN p_state VARCHAR(500),
    IN p_pincode VARCHAR(500),
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_second_language VARCHAR(500),
    IN p_previous_school VARCHAR(500),
    IN p_previous_board VARCHAR(500),
    IN p_previous_year VARCHAR(500),
    IN p_previous_percentage DECIMAL(15,2),
    IN p_previous_hall_ticket VARCHAR(500),
    IN p_birth_certificate VARCHAR(500),
    IN p_transfer_certificate VARCHAR(500),
    IN p_study_certificate VARCHAR(500),
    IN p_aadhaar_document VARCHAR(500),
    IN p_community_certificate VARCHAR(500),
    IN p_income_certificate VARCHAR(500),
    IN p_passport_photo VARCHAR(500),
    IN p_marks_memo VARCHAR(500),
    IN p_caste_certificate VARCHAR(500),
    IN p_tenth_certificate VARCHAR(500),
    IN p_status VARCHAR(500),
    IN p_admission_status VARCHAR(500),
    IN p_interview_required TINYINT,
    IN p_admission_fee_amount DECIMAL(15,2),
    IN p_remarks TEXT,
    IN p_is_active TINYINT,
    IN p_created_by BIGINT
)
BEGIN
    IF p_first_name IS NULL OR TRIM(p_first_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'First name is required.';
    END IF;

    IF p_gender NOT IN ('Male', 'Female', 'Other') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gender must be Male, Female, or Other.';
    END IF;

    IF p_registration_no IS NOT NULL AND TRIM(p_registration_no) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE RegistrationNo = TRIM(p_registration_no) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registration number already exists.';
    END IF;

    IF p_application_no IS NOT NULL AND TRIM(p_application_no) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE ApplicationNo = TRIM(p_application_no) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application number already exists.';
    END IF;

    IF p_admission_no IS NOT NULL AND TRIM(p_admission_no) <> '' AND
       EXISTS (SELECT 1 FROM studentadmissions WHERE AdmissionNo = TRIM(p_admission_no) AND IsDeleted = 0) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number already exists.';
    END IF;

    INSERT INTO studentadmissions
    (
        RegistrationNo,
        RegistrationDate,
        ApplicationNo,
        ApplicationDate,
        AdmissionNo,
        AdmissionDate,
        AdmissionType,
        AdmissionQuota,
        Medium,
        ScholarshipStatus,
        FirstName,
        LastName,
        Gender,
        DateOfBirth,
        BloodGroup,
        StudentPhoto,
        Email,
        StudentEmail,
        MobileNumber,
        AadhaarNumber,
        Nationality,
        Religion,
        Category,
        FatherName,
        MotherName,
        GuardianName,
        Occupation,
        AnnualIncome,
        MotherEmail,
        GuardianMobile,
        GuardianEmail,
        Address,
        City,
        District,
        State,
        Pincode,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        SecondLanguage,
        PreviousSchool,
        PreviousBoard,
        PreviousYear,
        PreviousPercentage,
        PreviousHallTicket,
        BirthCertificate,
        TransferCertificate,
        StudyCertificate,
        AadhaarDocument,
        CommunityCertificate,
        IncomeCertificate,
        PassportPhoto,
        MarksMemo,
        CasteCertificate,
        TenthCertificate,
        Status,
        AdmissionStatus,
        InterviewRequired,
        AdmissionFeeAmount,
        Remarks,
        IsActive,
        CreatedBy,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        p_registration_no,
        p_registration_date,
        p_application_no,
        p_application_date,
        p_admission_no,
        p_admission_date,
        p_admission_type,
        p_admission_quota,
        p_medium,
        p_scholarship_status,
        p_first_name,
        p_last_name,
        p_gender,
        p_date_of_birth,
        p_blood_group,
        p_student_photo,
        p_email,
        p_student_email,
        p_mobile_number,
        p_aadhaar_number,
        p_nationality,
        p_religion,
        p_category,
        p_father_name,
        p_mother_name,
        p_guardian_name,
        p_occupation,
        p_annual_income,
        p_mother_email,
        p_guardian_mobile,
        p_guardian_email,
        p_address,
        p_city,
        p_district,
        p_state,
        p_pincode,
        p_board_id,
        p_academic_year_id,
        p_academic_level_id,
        p_group_id,
        p_section_id,
        p_second_language,
        p_previous_school,
        p_previous_board,
        p_previous_year,
        p_previous_percentage,
        p_previous_hall_ticket,
        p_birth_certificate,
        p_transfer_certificate,
        p_study_certificate,
        p_aadhaar_document,
        p_community_certificate,
        p_income_certificate,
        p_passport_photo,
        p_marks_memo,
        p_caste_certificate,
        p_tenth_certificate,
        p_status,
        p_admission_status,
        p_interview_required,
        p_admission_fee_amount,
        p_remarks,
        p_is_active,
        p_created_by,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );

    SELECT * FROM studentadmissions WHERE AdmissionId = LAST_INSERT_ID();
END$$

CREATE PROCEDURE sp_StudentAdmission_Update(
    IN p_admission_id BIGINT,
    IN p_registration_no VARCHAR(500),
    IN p_registration_date DATE,
    IN p_application_no VARCHAR(500),
    IN p_application_date DATE,
    IN p_admission_no VARCHAR(500),
    IN p_admission_date DATE,
    IN p_admission_type VARCHAR(500),
    IN p_admission_quota VARCHAR(500),
    IN p_medium VARCHAR(500),
    IN p_scholarship_status VARCHAR(500),
    IN p_first_name VARCHAR(500),
    IN p_last_name VARCHAR(500),
    IN p_gender VARCHAR(500),
    IN p_date_of_birth DATE,
    IN p_blood_group VARCHAR(500),
    IN p_student_photo VARCHAR(500),
    IN p_email VARCHAR(500),
    IN p_student_email VARCHAR(500),
    IN p_mobile_number VARCHAR(500),
    IN p_aadhaar_number VARCHAR(500),
    IN p_nationality VARCHAR(500),
    IN p_religion VARCHAR(500),
    IN p_category VARCHAR(500),
    IN p_father_name VARCHAR(500),
    IN p_mother_name VARCHAR(500),
    IN p_guardian_name VARCHAR(500),
    IN p_occupation VARCHAR(500),
    IN p_annual_income DECIMAL(15,2),
    IN p_mother_email VARCHAR(500),
    IN p_guardian_mobile VARCHAR(500),
    IN p_guardian_email VARCHAR(500),
    IN p_address TEXT,
    IN p_city VARCHAR(500),
    IN p_district VARCHAR(500),
    IN p_state VARCHAR(500),
    IN p_pincode VARCHAR(500),
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_second_language VARCHAR(500),
    IN p_previous_school VARCHAR(500),
    IN p_previous_board VARCHAR(500),
    IN p_previous_year VARCHAR(500),
    IN p_previous_percentage DECIMAL(15,2),
    IN p_previous_hall_ticket VARCHAR(500),
    IN p_birth_certificate VARCHAR(500),
    IN p_transfer_certificate VARCHAR(500),
    IN p_study_certificate VARCHAR(500),
    IN p_aadhaar_document VARCHAR(500),
    IN p_community_certificate VARCHAR(500),
    IN p_income_certificate VARCHAR(500),
    IN p_passport_photo VARCHAR(500),
    IN p_marks_memo VARCHAR(500),
    IN p_caste_certificate VARCHAR(500),
    IN p_tenth_certificate VARCHAR(500),
    IN p_status VARCHAR(500),
    IN p_admission_status VARCHAR(500),
    IN p_interview_required TINYINT,
    IN p_admission_fee_amount DECIMAL(15,2),
    IN p_remarks TEXT,
    IN p_is_active TINYINT,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM studentadmissions
        WHERE AdmissionId = p_admission_id AND IsDeleted = 0
    ) THEN
        SELECT * FROM studentadmissions WHERE 1 = 0;
    ELSE
        IF p_registration_no IS NOT NULL AND TRIM(p_registration_no) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE RegistrationNo = TRIM(p_registration_no) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registration number already exists.';
        END IF;

        IF p_application_no IS NOT NULL AND TRIM(p_application_no) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE ApplicationNo = TRIM(p_application_no) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application number already exists.';
        END IF;

        IF p_admission_no IS NOT NULL AND TRIM(p_admission_no) <> '' AND
           EXISTS (SELECT 1 FROM studentadmissions WHERE AdmissionNo = TRIM(p_admission_no) AND AdmissionId <> p_admission_id AND IsDeleted = 0) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number already exists.';
        END IF;

        UPDATE studentadmissions
        SET
        RegistrationNo = p_registration_no,
        RegistrationDate = p_registration_date,
        ApplicationNo = p_application_no,
        ApplicationDate = p_application_date,
        AdmissionNo = p_admission_no,
        AdmissionDate = p_admission_date,
        AdmissionType = p_admission_type,
        AdmissionQuota = p_admission_quota,
        Medium = p_medium,
        ScholarshipStatus = p_scholarship_status,
        FirstName = p_first_name,
        LastName = p_last_name,
        Gender = p_gender,
        DateOfBirth = p_date_of_birth,
        BloodGroup = p_blood_group,
        StudentPhoto = p_student_photo,
        Email = p_email,
        StudentEmail = p_student_email,
        MobileNumber = p_mobile_number,
        AadhaarNumber = p_aadhaar_number,
        Nationality = p_nationality,
        Religion = p_religion,
        Category = p_category,
        FatherName = p_father_name,
        MotherName = p_mother_name,
        GuardianName = p_guardian_name,
        Occupation = p_occupation,
        AnnualIncome = p_annual_income,
        MotherEmail = p_mother_email,
        GuardianMobile = p_guardian_mobile,
        GuardianEmail = p_guardian_email,
        Address = p_address,
        City = p_city,
        District = p_district,
        State = p_state,
        Pincode = p_pincode,
        BoardId = p_board_id,
        AcademicYearId = p_academic_year_id,
        AcademicLevelId = p_academic_level_id,
        GroupId = p_group_id,
        SectionId = p_section_id,
        SecondLanguage = p_second_language,
        PreviousSchool = p_previous_school,
        PreviousBoard = p_previous_board,
        PreviousYear = p_previous_year,
        PreviousPercentage = p_previous_percentage,
        PreviousHallTicket = p_previous_hall_ticket,
        BirthCertificate = p_birth_certificate,
        TransferCertificate = p_transfer_certificate,
        StudyCertificate = p_study_certificate,
        AadhaarDocument = p_aadhaar_document,
        CommunityCertificate = p_community_certificate,
        IncomeCertificate = p_income_certificate,
        PassportPhoto = p_passport_photo,
        MarksMemo = p_marks_memo,
        CasteCertificate = p_caste_certificate,
        TenthCertificate = p_tenth_certificate,
        Status = p_status,
        AdmissionStatus = p_admission_status,
        InterviewRequired = p_interview_required,
        AdmissionFeeAmount = p_admission_fee_amount,
        Remarks = p_remarks,
        IsActive = p_is_active,
            UpdatedBy = p_updated_by,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0;

        SELECT * FROM studentadmissions WHERE AdmissionId = p_admission_id;
    END IF;
END$$

DELIMITER ;
