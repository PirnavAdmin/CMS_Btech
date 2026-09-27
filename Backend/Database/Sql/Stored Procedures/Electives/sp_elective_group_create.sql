DROP PROCEDURE IF EXISTS sp_elective_group_create;

DELIMITER $$

CREATE PROCEDURE sp_elective_group_create
(
    IN p_college_id BIGINT,
    IN p_group_code VARCHAR(50),
    IN p_group_name VARCHAR(150),
    IN p_description VARCHAR(500),
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_min_selections INT,
    IN p_max_selections INT,
    IN p_elective_type VARCHAR(50),
    IN p_credits DECIMAL(5,2),
    IN p_selection_start_date DATE,
    IN p_selection_end_date DATE,
    IN p_created_by BIGINT
)
BEGIN

    DECLARE v_existing_count INT DEFAULT 0;

    /*
        Basic selection validation
    */
    IF p_min_selections < 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Minimum selections must be at least 1';
    END IF;

    IF p_max_selections < p_min_selections THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Maximum selections cannot be less than minimum selections';
    END IF;

    IF p_selection_start_date IS NOT NULL
       AND p_selection_end_date IS NOT NULL
       AND p_selection_end_date < p_selection_start_date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Selection end date cannot be before the start date';
    END IF;

    /*
        Check duplicate group code inside the same college
    */
    SELECT COUNT(*)
    INTO v_existing_count
    FROM elective_groups
    WHERE college_id = p_college_id
      AND group_code = p_group_code
      AND deleted_at IS NULL;

    IF v_existing_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Elective group code already exists for this college';
    END IF;

    /*
        Insert
    */
    INSERT INTO elective_groups
    (
        college_id,
        group_code,
        group_name,
        description,
        course_id,
        branch_id,
        semester_id,
        academic_year_id,
        min_selections,
        max_selections,
        elective_type,
        credits,
        selection_start_date,
        selection_end_date,
        status,
        created_at,
        created_by
    )
    VALUES
    (
        p_college_id,
        p_group_code,
        p_group_name,
        p_description,
        p_course_id,
        p_branch_id,
        p_semester_id,
        p_academic_year_id,
        p_min_selections,
        p_max_selections,
        p_elective_type,
        p_credits,
        p_selection_start_date,
        p_selection_end_date,
        1,
        CURRENT_TIMESTAMP,
        p_created_by
    );

    /*
        Return created ID
    */
    SELECT
        LAST_INSERT_ID() AS ElectiveGroupId;

END$$

DELIMITER ;