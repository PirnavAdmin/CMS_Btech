DELIMITER $$

CREATE PROCEDURE sp_section_get_entity_by_id
(
    IN p_section_id BIGINT
)
BEGIN

    SELECT
        section_id AS SectionId,
        college_id AS CollegeId,
        academic_year_id AS AcademicYearId,
        department_id AS DepartmentId,
        course_id AS CourseId,
        branch_id AS BranchId,
        semester_id AS SemesterId,

        section_code AS SectionCode,
        section_name AS SectionName,

        capacity AS Capacity,

        status AS Status,
        is_archived AS IsArchived,

        created_at AS CreatedAt,
        created_by AS CreatedBy,

        updated_at AS UpdatedAt,
        updated_by AS UpdatedBy

    FROM sections

    WHERE section_id = p_section_id
      AND is_archived = 0;

END $$

DELIMITER ;