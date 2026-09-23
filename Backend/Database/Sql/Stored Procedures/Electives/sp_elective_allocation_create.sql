USE cms_btech;

DROP PROCEDURE IF EXISTS sp_elective_allocation_create;

DELIMITER $$

CREATE PROCEDURE sp_elective_allocation_create
(
    IN p_college_id BIGINT,
    IN p_selection_id BIGINT,
    IN p_allocated_by BIGINT,
    IN p_remarks VARCHAR(500)
)
BEGIN

    DECLARE v_student_id BIGINT;
    DECLARE v_elective_group_id BIGINT;
    DECLARE v_subject_id BIGINT;
    DECLARE v_academic_year_id BIGINT;
    DECLARE v_semester_id BIGINT;
    DECLARE v_selection_status VARCHAR(20);

    DECLARE v_allocation_id BIGINT DEFAULT NULL;


    /*
       Find the selected elective.

       The selection must belong to the logged-in
       college through the student and elective group.
    */

    SELECT
        ses.student_id,
        ses.elective_group_id,
        ses.subject_id,
        ses.academic_year_id,
        ses.semester_id,
        ses.selection_status

    INTO
        v_student_id,
        v_elective_group_id,
        v_subject_id,
        v_academic_year_id,
        v_semester_id,
        v_selection_status

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


    /*
       Selection not found.
    */

    IF v_student_id IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Elective selection not found';

    END IF;


    /*
       Only approved selections can be allocated.
    */

    IF v_selection_status <> 'APPROVED' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Only approved elective selections can be allocated';

    END IF;


    /*
       Prevent duplicate active allocation.
    */

    SELECT
        allocation_id

    INTO
        v_allocation_id

    FROM elective_allocations

    WHERE selection_id = p_selection_id
      AND allocation_status = 'ALLOCATED'

    LIMIT 1;


    IF v_allocation_id IS NOT NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Elective selection is already allocated';

    END IF;


    /*
       Create allocation.
    */

    INSERT INTO elective_allocations
    (
        selection_id,
        student_id,
        elective_group_id,
        subject_id,
        academic_year_id,
        semester_id,
        allocation_status,
        allocated_at,
        allocated_by,
        remarks,
        created_at,
        created_by
    )
    VALUES
    (
        p_selection_id,
        v_student_id,
        v_elective_group_id,
        v_subject_id,
        v_academic_year_id,
        v_semester_id,
        'ALLOCATED',
        CURRENT_TIMESTAMP,
        p_allocated_by,
        p_remarks,
        CURRENT_TIMESTAMP,
        p_allocated_by
    );


    SET v_allocation_id = LAST_INSERT_ID();


    /*
       Return the newly created allocation.
    */

    SELECT
        ea.allocation_id AS AllocationId,
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

        ea.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,

        ea.semester_id AS SemesterId,
        sem.semester_name AS SemesterName,

        ea.allocation_status AS AllocationStatus,
        ea.allocated_at AS AllocatedAt,
        ea.allocated_by AS AllocatedBy,
        ea.remarks AS Remarks

    FROM elective_allocations ea

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

    LEFT JOIN academicyears ay
        ON ay.academic_year_id = ea.academic_year_id
       AND ay.deleted_at IS NULL

    LEFT JOIN semesters sem
        ON sem.semester_id = ea.semester_id

    WHERE ea.allocation_id = v_allocation_id;

END$$

DELIMITER ;