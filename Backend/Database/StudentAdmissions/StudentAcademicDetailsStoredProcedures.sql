USE cms_btech;

DROP PROCEDURE IF EXISTS sp_StudentAdmission_GetAcademicDetails;
DROP PROCEDURE IF EXISTS sp_StudentAdmission_UpdateAcademicDetails;

DELIMITER $$

CREATE PROCEDURE sp_StudentAdmission_GetAcademicDetails(
    IN p_admission_id BIGINT
)
BEGIN
    SELECT
        AdmissionId,
        RegistrationNo,
        AdmissionNo,
        TRIM(CONCAT(COALESCE(FirstName, ''), ' ', COALESCE(LastName, ''))) AS StudentName,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        Medium,
        SecondLanguage,
        PreviousSchool,
        PreviousBoard,
        PreviousYear,
        PreviousPercentage,
        PreviousHallTicket,
        UpdatedBy,
        UpdatedAt
    FROM studentadmissions
    WHERE AdmissionId = p_admission_id
      AND IsDeleted = 0
    LIMIT 1;
END$$

CREATE PROCEDURE sp_StudentAdmission_UpdateAcademicDetails(
    IN p_admission_id BIGINT,
    IN p_board_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_academic_level_id BIGINT,
    IN p_group_id BIGINT,
    IN p_section_id BIGINT,
    IN p_medium VARCHAR(50),
    IN p_second_language VARCHAR(100),
    IN p_previous_school VARCHAR(200),
    IN p_previous_board VARCHAR(100),
    IN p_previous_year VARCHAR(20),
    IN p_previous_percentage DECIMAL(5,2),
    IN p_previous_hall_ticket VARCHAR(100),
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM studentadmissions
        WHERE AdmissionId = p_admission_id
          AND IsDeleted = 0
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student admission record not found.';
    END IF;

    IF p_previous_percentage IS NOT NULL
       AND (p_previous_percentage < 0 OR p_previous_percentage > 100) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Previous percentage must be between 0 and 100.';
    END IF;

    IF p_academic_year_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM academicyears
           WHERE academic_year_id = p_academic_year_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic year not found.';
    END IF;

    IF p_section_id IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = DATABASE()
             AND table_name = 'sections'
       )
       AND NOT EXISTS (
           SELECT 1 FROM sections
           WHERE section_id = p_section_id
             AND deleted_at IS NULL
       ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    UPDATE studentadmissions
       SET BoardId = p_board_id,
           AcademicYearId = p_academic_year_id,
           AcademicLevelId = p_academic_level_id,
           GroupId = p_group_id,
           SectionId = p_section_id,
           Medium = NULLIF(TRIM(p_medium), ''),
           SecondLanguage = NULLIF(TRIM(p_second_language), ''),
           PreviousSchool = NULLIF(TRIM(p_previous_school), ''),
           PreviousBoard = NULLIF(TRIM(p_previous_board), ''),
           PreviousYear = NULLIF(TRIM(p_previous_year), ''),
           PreviousPercentage = p_previous_percentage,
           PreviousHallTicket = NULLIF(TRIM(p_previous_hall_ticket), ''),
           UpdatedBy = p_updated_by,
           UpdatedAt = UTC_TIMESTAMP()
     WHERE AdmissionId = p_admission_id
       AND IsDeleted = 0;

    CALL sp_StudentAdmission_GetAcademicDetails(p_admission_id);
END$$

DELIMITER ;
