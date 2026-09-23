DROP PROCEDURE IF EXISTS sp_elective_group_subjects_get;

DELIMITER $$

CREATE PROCEDURE sp_elective_group_subjects_get
(
    IN p_college_id BIGINT,
    IN p_elective_group_id BIGINT
)
BEGIN

    SELECT
        egs.elective_group_subject_id AS ElectiveGroupSubjectId,
        egs.elective_group_id AS ElectiveGroupId,

        egs.subject_id AS SubjectId,

        sub.subject_code AS SubjectCode,
        sub.subject_name AS SubjectName,
        sub.credits AS Credits,

        egs.display_order AS DisplayOrder,
        egs.status AS Status

    FROM elective_group_subjects egs

    INNER JOIN elective_groups eg
        ON eg.elective_group_id = egs.elective_group_id

    INNER JOIN subjects sub
        ON sub.subject_id = egs.subject_id

    WHERE egs.elective_group_id = p_elective_group_id
      AND eg.college_id = p_college_id
      AND eg.deleted_at IS NULL
      AND egs.status = 1

    ORDER BY
        egs.display_order ASC,
        sub.subject_name ASC;

END$$

DELIMITER ;