USE cms_btech;

DROP PROCEDURE IF EXISTS sp_section_validate_capacity;

DELIMITER $$

CREATE PROCEDURE sp_section_validate_capacity
(
    IN p_section_id BIGINT,
    IN p_capacity INT
)
BEGIN

    DECLARE v_current_strength INT DEFAULT 0;
    DECLARE v_section_exists INT DEFAULT 0;
    DECLARE v_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_error_message VARCHAR(255);


    /* =========================================================
       1. Validate capacity
       ========================================================= */

    IF p_capacity IS NULL OR p_capacity <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Section capacity must be greater than zero.';

    END IF;


    /* =========================================================
       2. Validate existing section
       ========================================================= */

    IF p_section_id IS NOT NULL
       AND p_section_id > 0 THEN

        SELECT COUNT(*)
        INTO v_section_exists
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0;


        IF v_section_exists = 0 THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Section not found.';

        END IF;


        /* =====================================================
           3. Get academic year of section
           ===================================================== */

        SELECT academic_year_id
        INTO v_academic_year_id
        FROM sections
        WHERE section_id = p_section_id
          AND is_archived = 0
        LIMIT 1;


        /* =====================================================
           4. Get current active student count
           ===================================================== */

        SELECT COUNT(*)
        INTO v_current_strength
        FROM student_sections
        WHERE section_id = p_section_id
          AND academic_year_id = v_academic_year_id
          AND is_active = 1;


        /* =====================================================
           5. Validate proposed capacity
           ===================================================== */

        IF p_capacity < v_current_strength THEN

            SET v_error_message = CONCAT(
                'Section capacity cannot be less than current student count of ',
                v_current_strength,
                '.'
            );

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = v_error_message;

        END IF;

    END IF;


    /* =========================================================
       6. Return validation result
       ========================================================= */

    SELECT
        TRUE AS IsValid,
        p_capacity AS Capacity,
        v_current_strength AS CurrentStrength,
        GREATEST(
            p_capacity - v_current_strength,
            0
        ) AS AvailableSeats;

END$$

DELIMITER ;