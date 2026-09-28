DROP PROCEDURE IF EXISTS sp_elective_group_update;

DELIMITER $$

CREATE PROCEDURE sp_elective_group_update
(
    IN p_college_id BIGINT,
    IN p_elective_group_id BIGINT,
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
    IN p_selection_end_date DATE
)
BEGIN
    DECLARE v_existing_count INT DEFAULT 0;

    IF p_min_selections < 1 OR p_max_selections < p_min_selections THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Selection limits are invalid';
    END IF;

    IF p_selection_start_date IS NOT NULL
       AND p_selection_end_date IS NOT NULL
       AND p_selection_end_date < p_selection_start_date THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Selection end date cannot be before the start date';
    END IF;

    SELECT COUNT(*) INTO v_existing_count
    FROM elective_groups
    WHERE college_id = p_college_id
      AND elective_group_id = p_elective_group_id
      AND deleted_at IS NULL;

    IF v_existing_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Elective group not found';
    END IF;

    SELECT COUNT(*) INTO v_existing_count
    FROM elective_groups
    WHERE college_id = p_college_id
      AND group_code = p_group_code
      AND elective_group_id <> p_elective_group_id
      AND deleted_at IS NULL;

    IF v_existing_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Elective group code already exists for this college';
    END IF;

    UPDATE elective_groups
    SET group_code = p_group_code,
        group_name = p_group_name,
        description = p_description,
        course_id = p_course_id,
        branch_id = p_branch_id,
        semester_id = p_semester_id,
        academic_year_id = p_academic_year_id,
        min_selections = p_min_selections,
        max_selections = p_max_selections,
        elective_type = p_elective_type,
        credits = p_credits,
        selection_start_date = p_selection_start_date,
        selection_end_date = p_selection_end_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE college_id = p_college_id
      AND elective_group_id = p_elective_group_id
      AND deleted_at IS NULL;
END$$

DELIMITER ;