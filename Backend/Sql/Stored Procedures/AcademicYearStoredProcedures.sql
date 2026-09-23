USE cms_btech;

DROP PROCEDURE IF EXISTS sp_AcademicYear_Add;
DROP PROCEDURE IF EXISTS sp_AcademicYear_List;
DROP PROCEDURE IF EXISTS sp_AcademicYear_GetById;
DROP PROCEDURE IF EXISTS sp_AcademicYear_Edit;
DROP PROCEDURE IF EXISTS sp_AcademicYear_Activate;
DROP PROCEDURE IF EXISTS sp_AcademicYear_Deactivate;

DELIMITER $$

CREATE PROCEDURE sp_AcademicYear_Add(
    IN p_academic_year_name VARCHAR(50),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_created_by BIGINT
)
BEGIN
    DECLARE v_id BIGINT;

    IF p_academic_year_name IS NULL OR TRIM(p_academic_year_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name is required.';
    END IF;

    IF p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date must be greater than start date.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_name = TRIM(p_academic_year_name)
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name already exists.';
    END IF;

    INSERT INTO academicyears
        (academic_year_name, start_date, end_date, status, is_archived, created_at, created_by)
    VALUES
        (TRIM(p_academic_year_name), p_start_date, p_end_date, 1, 0, NOW(), p_created_by);

    SET v_id = LAST_INSERT_ID();

    SELECT * FROM academicyears WHERE academic_year_id = v_id;
END$$

CREATE PROCEDURE sp_AcademicYear_List()
BEGIN
    SELECT *
    FROM academicyears
    WHERE deleted_at IS NULL
      AND is_archived = 0
    ORDER BY start_date DESC, academic_year_id DESC;
END$$

CREATE PROCEDURE sp_AcademicYear_GetById(IN p_academic_year_id BIGINT)
BEGIN
    SELECT *
    FROM academicyears
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
      AND is_archived = 0
    LIMIT 1;
END$$

CREATE PROCEDURE sp_AcademicYear_Edit(
    IN p_academic_year_id BIGINT,
    IN p_academic_year_name VARCHAR(50),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_updated_by BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
          AND is_archived = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year not found.';
    END IF;

    IF p_academic_year_name IS NULL OR TRIM(p_academic_year_name) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name is required.';
    END IF;

    IF p_end_date <= p_start_date THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End date must be greater than start date.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_name = TRIM(p_academic_year_name)
          AND academic_year_id <> p_academic_year_id
          AND deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic year name already exists.';
    END IF;

    UPDATE academicyears
    SET academic_year_name = TRIM(p_academic_year_name),
        start_date = p_start_date,
        end_date = p_end_date,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id;

    SELECT * FROM academicyears WHERE academic_year_id = p_academic_year_id;
END$$

CREATE PROCEDURE sp_AcademicYear_Activate(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE academicyears
    SET status = 1,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
      AND is_archived = 0;

    IF ROW_COUNT() = 0 AND NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
          AND is_archived = 0
    ) THEN
        SELECT * FROM academicyears WHERE 1 = 0;
    ELSE
        SELECT * FROM academicyears WHERE academic_year_id = p_academic_year_id;
    END IF;
END$$

CREATE PROCEDURE sp_AcademicYear_Deactivate(
    IN p_academic_year_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE academicyears
    SET status = 0,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE academic_year_id = p_academic_year_id
      AND deleted_at IS NULL
      AND is_archived = 0;

    IF ROW_COUNT() = 0 AND NOT EXISTS (
        SELECT 1 FROM academicyears
        WHERE academic_year_id = p_academic_year_id
          AND deleted_at IS NULL
          AND is_archived = 0
    ) THEN
        SELECT * FROM academicyears WHERE 1 = 0;
    ELSE
        SELECT * FROM academicyears WHERE academic_year_id = p_academic_year_id;
    END IF;
END$$

DELIMITER ;
