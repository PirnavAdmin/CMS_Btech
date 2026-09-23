DROP PROCEDURE IF EXISTS sp_Section_Update;

DELIMITER $$

CREATE PROCEDURE sp_Section_Update
(
    IN p_section_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_semester INT,
    IN p_section_name VARCHAR(50),
    IN p_section_code VARCHAR(20),
    IN p_capacity INT,
    IN p_class_teacher_employee_profile_id BIGINT,
    IN p_room VARCHAR(100),
    IN p_shift VARCHAR(30),
    IN p_section_type VARCHAR(50),
    IN p_status TINYINT,
    IN p_updated_by BIGINT
)
BEGIN

    DECLARE v_college_id BIGINT;
    DECLARE v_current_students INT DEFAULT 0;

    /* Check section */
    SELECT college_id
    INTO v_college_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section not found.';

    END IF;


    /* Validate capacity */
    IF p_capacity IS NULL OR p_capacity <= 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Capacity must be greater than zero.';

    END IF;


    /* Check current student count */
    SELECT COUNT(*)
    INTO v_current_students
    FROM student_section_assignments
    WHERE section_id = p_section_id
      AND academic_year_id = p_academic_year_id
      AND status = 1;


    /* Do not reduce capacity below current students */
    IF p_capacity < v_current_students THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Capacity cannot be less than current student strength.';

    END IF;


    /* Validate section code */
    IF EXISTS
    (
        SELECT 1
        FROM sections
        WHERE section_code = TRIM(p_section_code)
          AND section_id <> p_section_id
          AND deleted_at IS NULL
    ) THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section code already exists.';

    END IF;


    /* Validate class teacher */
    IF p_class_teacher_employee_profile_id IS NOT NULL THEN

        IF NOT EXISTS
        (
            SELECT 1
            FROM employee_profiles ep
            INNER JOIN users u
                ON u.user_id = ep.user_id
            WHERE ep.employee_profile_id =
                    p_class_teacher_employee_profile_id
              AND ep.status = 1
              AND ep.deleted_at IS NULL
              AND u.status = 1
              AND u.deleted_at IS NULL
              AND
              (
                  u.college_id = v_college_id
                  OR u.college_id IS NULL
              )
        ) THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Invalid faculty advisor.';

        END IF;

    END IF;


    /* Update */
    UPDATE sections
    SET
        course_id =
            p_course_id,

        branch_id =
            p_branch_id,

        academic_year_id =
            p_academic_year_id,

        semester =
            p_semester,

        section_name =
            TRIM(p_section_name),

        section_code =
            TRIM(p_section_code),

        capacity =
            p_capacity,

        class_teacher_employee_profile_id =
            p_class_teacher_employee_profile_id,

        room =
            NULLIF(TRIM(p_room), ''),

        shift =
            NULLIF(TRIM(p_shift), ''),

        section_type =
            NULLIF(TRIM(p_section_type), ''),

        status =
            COALESCE(p_status, status),

        updated_at =
            UTC_TIMESTAMP(),

        updated_by =
            p_updated_by

    WHERE section_id = p_section_id
      AND deleted_at IS NULL;


    /* Return updated record */
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        s.academic_year_id AS AcademicYearId,
        s.course_id AS CourseId,
        s.branch_id AS BranchId,
        s.semester AS Semester,
        s.section_name AS SectionName,
        s.section_code AS SectionCode,
        s.capacity AS Capacity,
        s.class_teacher_employee_profile_id
            AS FacultyAdvisorEmployeeProfileId,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy

    FROM sections s
    WHERE s.section_id = p_section_id;

END$$

DELIMITER ;