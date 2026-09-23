USE cms_btech;

DROP PROCEDURE IF EXISTS sp_student_elective_selection_list;

DELIMITER $$

CREATE PROCEDURE sp_student_elective_selection_list
(
    IN p_college_id BIGINT,
    IN p_student_id BIGINT
)
BEGIN

    SELECT
        ses.selection_id AS SelectionId,

        ses.student_id AS StudentId,

        s.student_code AS StudentCode,

        s.full_name AS StudentName,

        ses.elective_group_id AS ElectiveGroupId,

        eg.group_code AS GroupCode,

        eg.group_name AS GroupName,

        ses.subject_id AS SubjectId,

        sub.subject_code AS SubjectCode,

        sub.subject_name AS SubjectName,

        sub.credits AS Credits,

        ses.academic_year_id AS AcademicYearId,

        ay.academic_year_name AS AcademicYearName,

        ses.semester_id AS SemesterId,

        sem.semester_name AS SemesterName,

        ses.selection_status AS SelectionStatus,

        ses.selected_at AS SelectedAt,

        ses.remarks AS Remarks

    FROM student_elective_selections ses

    INNER JOIN students s
        ON s.student_id = ses.student_id
       AND s.college_id = p_college_id
       AND s.deleted_at IS NULL

    INNER JOIN elective_groups eg
        ON eg.elective_group_id = ses.elective_group_id
       AND eg.college_id = p_college_id
       AND eg.deleted_at IS NULL

    INNER JOIN subjects sub
        ON sub.subject_id = ses.subject_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = ses.academic_year_id
       AND ay.deleted_at IS NULL

    LEFT JOIN semesters sem
        ON sem.semester_id = ses.semester_id

    WHERE ses.student_id = p_student_id
      AND ses.selection_status <> 'CANCELLED'

    ORDER BY
        ses.selected_at DESC,
        ses.selection_id DESC;

END$$

DELIMITER ;