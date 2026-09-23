DROP PROCEDURE IF EXISTS sp_elective_group_list;

DELIMITER $$

CREATE PROCEDURE sp_elective_group_list
(
    IN p_college_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_status TINYINT,
    IN p_search VARCHAR(150)
)
BEGIN

    SELECT
        eg.elective_group_id AS ElectiveGroupId,
        eg.college_id AS CollegeId,
        eg.group_code AS GroupCode,
        eg.group_name AS GroupName,
        eg.description AS Description,

        eg.course_id AS CourseId,
        c.course_name AS CourseName,

        eg.branch_id AS BranchId,
        b.branch_name AS BranchName,

        eg.semester_id AS SemesterId,
        s.semester_name AS SemesterName,

        eg.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,

        eg.min_selections AS MinSelections,
        eg.max_selections AS MaxSelections,

        (
            SELECT COUNT(*)
            FROM elective_group_subjects egs
            WHERE egs.elective_group_id = eg.elective_group_id
              AND egs.status = 1
        ) AS SubjectCount,

        eg.status AS Status,
        eg.created_at AS CreatedAt,
        eg.updated_at AS UpdatedAt

    FROM elective_groups eg

    LEFT JOIN courses c
        ON c.course_id = eg.course_id

    LEFT JOIN branches b
        ON b.branch_id = eg.branch_id

    LEFT JOIN semesters s
        ON s.semester_id = eg.semester_id

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = eg.academic_year_id

    WHERE eg.college_id = p_college_id

      AND (
            p_course_id IS NULL
            OR eg.course_id = p_course_id
          )

      AND (
            p_branch_id IS NULL
            OR eg.branch_id = p_branch_id
          )

      AND (
            p_semester_id IS NULL
            OR eg.semester_id = p_semester_id
          )

      AND (
            p_academic_year_id IS NULL
            OR eg.academic_year_id = p_academic_year_id
          )

      AND (
            p_status IS NULL
            OR eg.status = p_status
          )

      AND (
            p_search IS NULL
            OR p_search = ''
            OR eg.group_code LIKE CONCAT('%', p_search, '%')
            OR eg.group_name LIKE CONCAT('%', p_search, '%')
            OR eg.description LIKE CONCAT('%', p_search, '%')
          )

      AND eg.deleted_at IS NULL

    ORDER BY
        eg.group_name ASC,
        eg.elective_group_id DESC;

END$$

DELIMITER ;