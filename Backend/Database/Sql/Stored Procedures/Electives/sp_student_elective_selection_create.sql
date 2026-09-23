DROP PROCEDURE IF EXISTS sp_student_elective_selection_create;

DELIMITER $$

CREATE PROCEDURE sp_student_elective_selection_create
(
    IN p_college_id BIGINT,
    IN p_student_id BIGINT,
    IN p_elective_group_id BIGINT,
    IN p_subject_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_remarks VARCHAR(500),
    IN p_created_by BIGINT
)
BEGIN

    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_group_exists INT DEFAULT 0;
    DECLARE v_subject_exists INT DEFAULT 0;
    DECLARE v_existing_selection INT DEFAULT 0;
    DECLARE v_min_selections INT DEFAULT 1;
    DECLARE v_max_selections INT DEFAULT 1;
    DECLARE v_current_selection_count INT DEFAULT 0;

    /* =========================================================
       STUDENT VALIDATION
       ========================================================= */

    SELECT COUNT(*)
    INTO v_student_exists
    FROM students s
    WHERE s.student_id = p_student_id
      AND s.college_id = p_college_id
      AND s.deleted_at IS NULL
      AND s.status = 1;

    IF v_student_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Student not found or does not belong to this college.';

    END IF;


    /* =========================================================
       ELECTIVE GROUP VALIDATION
       ========================================================= */

    SELECT
        COUNT(*),
        COALESCE(MAX(min_selections), 1),
        COALESCE(MAX(max_selections), 1)
    INTO
        v_group_exists,
        v_min_selections,
        v_max_selections
    FROM elective_groups
    WHERE elective_group_id = p_elective_group_id
      AND college_id = p_college_id
      AND status = 1
      AND deleted_at IS NULL;

    IF v_group_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Elective group not found or does not belong to this college.';

    END IF;


    /* =========================================================
       SUBJECT MUST BELONG TO ELECTIVE GROUP
       ========================================================= */

    SELECT COUNT(*)
    INTO v_subject_exists
    FROM elective_group_subjects egs
    WHERE egs.elective_group_id = p_elective_group_id
      AND egs.subject_id = p_subject_id
      AND egs.status = 1;

    IF v_subject_exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Selected subject does not belong to the elective group.';

    END IF;


    /* =========================================================
       DUPLICATE SELECTION
       ========================================================= */

    SELECT COUNT(*)
    INTO v_existing_selection
    FROM student_elective_selections ses
    WHERE ses.student_id = p_student_id
      AND ses.elective_group_id = p_elective_group_id
      AND ses.subject_id = p_subject_id
      AND ses.academic_year_id = p_academic_year_id
      AND ses.semester_id = p_semester_id
      AND ses.status <> 'CANCELLED';

    IF v_existing_selection > 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Student has already selected this elective subject.';

    END IF;


    /* =========================================================
       CURRENT SELECTION COUNT
       ========================================================= */

    SELECT COUNT(*)
    INTO v_current_selection_count
    FROM student_elective_selections ses
    WHERE ses.student_id = p_student_id
      AND ses.elective_group_id = p_elective_group_id
      AND ses.academic_year_id = p_academic_year_id
      AND ses.semester_id = p_semester_id
      AND ses.status NOT IN ('CANCELLED', 'REJECTED');


    IF v_current_selection_count >= v_max_selections THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Maximum elective selections for this group have already been reached.';

    END IF;


    /* =========================================================
       INSERT SELECTION
       ========================================================= */

    INSERT INTO student_elective_selections
    (
        student_id,
        elective_group_id,
        subject_id,
        academic_year_id,
        semester_id,
        selection_status,
        selected_at,
        remarks,
        status,
        created_by,
        created_at,
        updated_at
    )
    VALUES
    (
        p_student_id,
        p_elective_group_id,
        p_subject_id,
        p_academic_year_id,
        p_semester_id,
        'PENDING',
        CURRENT_TIMESTAMP,
        NULLIF(TRIM(p_remarks), ''),
        1,
        p_created_by,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );


    /* =========================================================
       RETURN CREATED SELECTION
       ========================================================= */

    SELECT
        ses.selection_id AS SelectionId
    FROM student_elective_selections ses
    WHERE ses.selection_id = LAST_INSERT_ID();

END$$

DELIMITER ;