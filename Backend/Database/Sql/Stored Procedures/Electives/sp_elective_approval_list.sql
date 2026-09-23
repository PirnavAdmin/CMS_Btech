USE cms_btech;

DROP PROCEDURE IF EXISTS sp_elective_approval_list;

DELIMITER $$

CREATE PROCEDURE sp_elective_approval_list
(
    IN p_college_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_elective_group_id BIGINT,
    IN p_approval_status VARCHAR(20),
    IN p_search VARCHAR(150)
)
BEGIN

    SELECT
        ea.approval_id AS ApprovalId,
        ea.selection_id AS SelectionId,

        ea.student_id AS StudentId,
        s.student_code AS StudentCode,
        s.full_name AS StudentName,

        ea.elective_group_id AS ElectiveGroupId,
        eg.group_code AS GroupCode,
        eg.group_name AS GroupName,

        ea.subject_id AS SubjectId,
        sub.subject_code AS SubjectCode,
        sub.subject_name AS SubjectName,

        ea.faculty_id AS FacultyId,
        CAST(NULL AS CHAR) AS FacultyName,

        ea.approval_status AS ApprovalStatus,
        ea.remarks AS Remarks,
        ea.approved_at AS ApprovedAt

    FROM elective_approvals ea

    INNER JOIN students s
        ON s.student_id = ea.student_id
       AND s.college_id = p_college_id
       AND s.deleted_at IS NULL

    INNER JOIN elective_groups eg
        ON eg.elective_group_id = ea.elective_group_id
       AND eg.college_id = p_college_id
       AND eg.deleted_at IS NULL

    INNER JOIN subjects sub
        ON sub.subject_id = ea.subject_id

    INNER JOIN student_elective_selections ses
        ON ses.selection_id = ea.selection_id

    WHERE
        (
            p_academic_year_id IS NULL
            OR ses.academic_year_id = p_academic_year_id
        )
        AND
        (
            p_course_id IS NULL
            OR eg.course_id = p_course_id
        )
        AND
        (
            p_branch_id IS NULL
            OR eg.branch_id = p_branch_id
        )
        AND
        (
            p_semester_id IS NULL
            OR eg.semester_id = p_semester_id
        )
        AND
        (
            p_elective_group_id IS NULL
            OR ea.elective_group_id = p_elective_group_id
        )
        AND
        (
            p_approval_status IS NULL
            OR ea.approval_status = p_approval_status
        )
        AND
        (
            p_search IS NULL
            OR p_search = ''
            OR s.student_code LIKE CONCAT('%', p_search, '%')
            OR s.full_name LIKE CONCAT('%', p_search, '%')
            OR eg.group_code LIKE CONCAT('%', p_search, '%')
            OR eg.group_name LIKE CONCAT('%', p_search, '%')
            OR sub.subject_code LIKE CONCAT('%', p_search, '%')
            OR sub.subject_name LIKE CONCAT('%', p_search, '%')
        )

    ORDER BY
        ea.approved_at DESC,
        ea.selection_id DESC;

END$$

DELIMITER ;