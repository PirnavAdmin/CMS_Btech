USE cms_btech;

DROP PROCEDURE IF EXISTS sp_elective_approval_update;

DELIMITER $$

CREATE PROCEDURE sp_elective_approval_update
(
    IN p_college_id BIGINT,
    IN p_selection_id BIGINT,
    IN p_approval_status VARCHAR(20),
    IN p_remarks VARCHAR(500),
    IN p_approved_by BIGINT
)
BEGIN

    DECLARE v_student_id BIGINT;
    DECLARE v_elective_group_id BIGINT;
    DECLARE v_subject_id BIGINT;
    DECLARE v_faculty_id BIGINT;
    DECLARE v_current_status VARCHAR(20);
    DECLARE v_approval_id BIGINT;

    /* Validate approval status */

    IF p_approval_status NOT IN ('APPROVED', 'REJECTED') THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'ApprovalStatus must be APPROVED or REJECTED';

    END IF;


    /* Find the selection and verify college ownership */

    SELECT
        ses.student_id,
        ses.elective_group_id,
        ses.subject_id,
        ses.selection_status
    INTO
        v_student_id,
        v_elective_group_id,
        v_subject_id,
        v_current_status
    FROM student_elective_selections ses

    INNER JOIN students s
        ON s.student_id = ses.student_id
       AND s.college_id = p_college_id
       AND s.deleted_at IS NULL

    INNER JOIN elective_groups eg
        ON eg.elective_group_id = ses.elective_group_id
       AND eg.college_id = p_college_id
       AND eg.deleted_at IS NULL

    WHERE ses.selection_id = p_selection_id

    LIMIT 1;


    IF v_student_id IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Elective selection not found';

    END IF;


    /* Do not approve/reject a cancelled selection */

    IF v_current_status = 'CANCELLED' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cancelled elective selection cannot be approved or rejected';

    END IF;


    /*
       Get the existing approval record.
       The faculty_id belongs to the approval record.
    */

    SELECT
        approval_id,
        faculty_id
    INTO
        v_approval_id,
        v_faculty_id
    FROM elective_approvals
    WHERE selection_id = p_selection_id
    LIMIT 1;


    /*
       If an approval record already exists,
       update it.
    */

    IF v_approval_id IS NOT NULL THEN

        UPDATE elective_approvals
        SET
            approval_status = p_approval_status,
            remarks = p_remarks,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = p_approved_by
        WHERE approval_id = v_approval_id;


    ELSE

        /*
           No existing approval record.

           faculty_id is kept NULL here because the current
           approval request DTO does not send faculty_id.
        */

        INSERT INTO elective_approvals
        (
            selection_id,
            student_id,
            elective_group_id,
            subject_id,
            faculty_id,
            approval_status,
            remarks,
            approved_at,
            created_at,
            created_by
        )
        VALUES
        (
            p_selection_id,
            v_student_id,
            v_elective_group_id,
            v_subject_id,
            NULL,
            p_approval_status,
            p_remarks,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            p_approved_by
        );

        SET v_approval_id = LAST_INSERT_ID();

    END IF;


    /*
       Keep student selection status synchronized
       with the approval decision.
    */

    UPDATE student_elective_selections
    SET
        selection_status = p_approval_status,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = p_approved_by
    WHERE selection_id = p_selection_id;


    /*
       Return the updated approval.
    */

    SELECT
        ea.approval_id AS ApprovalId,
        ea.selection_id AS SelectionId,
        ea.student_id AS StudentId,
        ea.elective_group_id AS ElectiveGroupId,
        ea.subject_id AS SubjectId,
        ea.faculty_id AS FacultyId,
        ea.approval_status AS ApprovalStatus,
        ea.remarks AS Remarks,
        ea.approved_at AS ApprovedAt

    FROM elective_approvals ea
    WHERE ea.approval_id = v_approval_id;

END$$

DELIMITER ;