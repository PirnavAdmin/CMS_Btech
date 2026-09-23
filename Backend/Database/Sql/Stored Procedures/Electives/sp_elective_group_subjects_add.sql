DROP PROCEDURE IF EXISTS sp_elective_group_subjects_add;

DELIMITER $$

CREATE PROCEDURE sp_elective_group_subjects_add
(
    IN p_college_id BIGINT,
    IN p_elective_group_id BIGINT,
    IN p_subject_ids JSON,
    IN p_created_by BIGINT
)
BEGIN

    DECLARE v_group_exists INT DEFAULT 0;

    /*
        Verify elective group belongs to the current college
    */
    SELECT COUNT(*)
    INTO v_group_exists
    FROM elective_groups
    WHERE elective_group_id = p_elective_group_id
      AND college_id = p_college_id
      AND deleted_at IS NULL
      AND status = 1;

    IF v_group_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Elective group not found or does not belong to this college';
    END IF;

    /*
        Insert subjects.

        JSON_TABLE converts:

        [10,11,12]

        into rows:
        10
        11
        12
    */
    INSERT INTO elective_group_subjects
    (
        elective_group_id,
        subject_id,
        display_order,
        status,
        created_at,
        created_by
    )
    SELECT
        p_elective_group_id,
        jt.subject_id,

        (
            SELECT COALESCE(MAX(existing.display_order), 0)
            FROM elective_group_subjects existing
            WHERE existing.elective_group_id = p_elective_group_id
        )
        + ROW_NUMBER() OVER (ORDER BY jt.subject_id),

        1,
        CURRENT_TIMESTAMP,
        p_created_by

    FROM JSON_TABLE(
        p_subject_ids,
        '$[*]'
        COLUMNS
        (
            subject_id BIGINT PATH '$'
        )
    ) jt

    WHERE NOT EXISTS
    (
        SELECT 1
        FROM elective_group_subjects existing
        WHERE existing.elective_group_id = p_elective_group_id
          AND existing.subject_id = jt.subject_id
    );

    /*
        Return the current group subjects
    */
    SELECT
        egs.elective_group_subject_id AS ElectiveGroupSubjectId,
        egs.elective_group_id AS ElectiveGroupId,
        egs.subject_id AS SubjectId,
        egs.display_order AS DisplayOrder,
        egs.status AS Status
    FROM elective_group_subjects egs
    WHERE egs.elective_group_id = p_elective_group_id
      AND egs.status = 1
    ORDER BY egs.display_order;

END$$

DELIMITER ;