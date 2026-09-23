USE cms_btech;

/* =========================================================
   TABLE 1: sections
   Reuses existing colleges, academicyears, courses, branches,
   employee_profiles. Course/branch IDs are indexed but no FK is
   added here because their exact PK definitions may differ by module.
   ========================================================= */
CREATE TABLE IF NOT EXISTS sections
(
    section_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    academic_year_id BIGINT NOT NULL,
    course_id BIGINT NULL,
    branch_id BIGINT NULL,
    semester INT NULL,
    section_name VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 60,
    class_teacher_employee_profile_id BIGINT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,

    PRIMARY KEY (section_id),
    KEY idx_sections_college (college_id),
    KEY idx_sections_academic_year (academic_year_id),
    KEY idx_sections_course (course_id),
    KEY idx_sections_branch (branch_id),
    KEY idx_sections_teacher (class_teacher_employee_profile_id),
    KEY idx_sections_status (status),

    CONSTRAINT fk_sections_college
        FOREIGN KEY (college_id) REFERENCES colleges(college_id),
    CONSTRAINT fk_sections_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academicyears(academic_year_id),
    CONSTRAINT fk_sections_class_teacher
        FOREIGN KEY (class_teacher_employee_profile_id)
        REFERENCES employee_profiles(employee_profile_id),
    CONSTRAINT chk_sections_capacity CHECK (capacity > 0)
);

/* =========================================================
   TABLE 2: students
   Minimal student master required for section assignment.
   If a full Students module is added later, these columns can be
   extended without changing the assignment API contract.
   ========================================================= */
CREATE TABLE IF NOT EXISTS students
(
    student_id BIGINT NOT NULL AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    student_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NULL,
    mobile VARCHAR(20) NULL,
    course_id BIGINT NULL,
    branch_id BIGINT NULL,
    academic_year_id BIGINT NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    deleted_at DATETIME NULL,
    deleted_by BIGINT NULL,

    PRIMARY KEY (student_id),
    UNIQUE KEY uq_students_student_code (student_code),
    KEY idx_students_college (college_id),
    KEY idx_students_academic_year (academic_year_id),
    KEY idx_students_course (course_id),
    KEY idx_students_branch (branch_id),
    KEY idx_students_status (status),

    CONSTRAINT fk_students_college
        FOREIGN KEY (college_id) REFERENCES colleges(college_id),
    CONSTRAINT fk_students_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academicyears(academic_year_id)
);

/* =========================================================
   TABLE 3: student_section_assignments
   Keeps assignment history instead of overwriting/deleting.
   status=1 -> current assignment, status=0 -> historical assignment.
   ========================================================= */
CREATE TABLE IF NOT EXISTS student_section_assignments
(
    student_section_assignment_id BIGINT NOT NULL AUTO_INCREMENT,
    student_id BIGINT NOT NULL,
    section_id BIGINT NOT NULL,
    academic_year_id BIGINT NOT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by BIGINT NULL,
    removed_at DATETIME NULL,
    removed_by BIGINT NULL,

    PRIMARY KEY (student_section_assignment_id),
    KEY idx_ssa_student (student_id),
    KEY idx_ssa_section (section_id),
    KEY idx_ssa_academic_year (academic_year_id),
    KEY idx_ssa_status (status),

    CONSTRAINT fk_ssa_student
        FOREIGN KEY (student_id) REFERENCES students(student_id),
    CONSTRAINT fk_ssa_section
        FOREIGN KEY (section_id) REFERENCES sections(section_id),
    CONSTRAINT fk_ssa_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academicyears(academic_year_id)
);

DROP PROCEDURE IF EXISTS sp_Section_GetClassTeacher;
DROP PROCEDURE IF EXISTS sp_Section_GetClassTeacherCandidates;
DROP PROCEDURE IF EXISTS sp_Section_AssignClassTeacher;
DROP PROCEDURE IF EXISTS sp_Section_RemoveClassTeacher;
DROP PROCEDURE IF EXISTS sp_Section_GetCapacity;
DROP PROCEDURE IF EXISTS sp_Section_GetStudentCandidates;
DROP PROCEDURE IF EXISTS sp_Section_GetStudents;
DROP PROCEDURE IF EXISTS sp_Section_AssignStudents;
DROP PROCEDURE IF EXISTS sp_Section_RemoveStudent;

DELIMITER $$

CREATE PROCEDURE sp_Section_GetClassTeacher(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.section_name AS SectionName,
        ep.employee_profile_id AS EmployeeProfileId,
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        d.department_name AS DepartmentName,
        ep.designation AS Designation,
        u.email AS Email,
        u.mobile AS Mobile
    FROM sections s
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    LEFT JOIN departments d
        ON d.department_id = ep.department_id
       AND d.deleted_at IS NULL
    WHERE s.section_id = p_section_id
      AND s.deleted_at IS NULL
    LIMIT 1;
END$$

CREATE PROCEDURE sp_Section_GetClassTeacherCandidates(
    IN p_section_id BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT;

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

    SELECT
        ep.employee_profile_id AS EmployeeProfileId,
        u.user_id AS UserId,
        u.employee_user_id AS EmployeeUserId,
        u.full_name AS FullName,
        d.department_name AS DepartmentName,
        ep.designation AS Designation,
        u.email AS Email,
        u.mobile AS Mobile
    FROM employee_profiles ep
    INNER JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
       AND u.status = 1
    LEFT JOIN departments d
        ON d.department_id = ep.department_id
       AND d.deleted_at IS NULL
    WHERE ep.deleted_at IS NULL
      AND ep.status = 1
      AND (u.college_id = v_college_id OR u.college_id IS NULL)
    ORDER BY u.full_name;
END$$

CREATE PROCEDURE sp_Section_AssignClassTeacher(
    IN p_section_id BIGINT,
    IN p_employee_profile_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    DECLARE v_college_id BIGINT;
    DECLARE v_employee_college_id BIGINT;

    SELECT college_id
      INTO v_college_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    SELECT u.college_id
      INTO v_employee_college_id
    FROM employee_profiles ep
    INNER JOIN users u ON u.user_id = ep.user_id
    WHERE ep.employee_profile_id = p_employee_profile_id
      AND ep.deleted_at IS NULL
      AND ep.status = 1
      AND u.deleted_at IS NULL
      AND u.status = 1
    LIMIT 1;

    IF v_employee_college_id IS NULL AND NOT EXISTS (
        SELECT 1
        FROM employee_profiles ep
        INNER JOIN users u ON u.user_id = ep.user_id
        WHERE ep.employee_profile_id = p_employee_profile_id
          AND ep.deleted_at IS NULL
          AND ep.status = 1
          AND u.deleted_at IS NULL
          AND u.status = 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active employee profile not found.';
    END IF;

    IF v_employee_college_id IS NOT NULL AND v_employee_college_id <> v_college_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Teacher belongs to a different college.';
    END IF;

    UPDATE sections
    SET class_teacher_employee_profile_id = p_employee_profile_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND deleted_at IS NULL;

    CALL sp_Section_GetClassTeacher(p_section_id);
END$$

CREATE PROCEDURE sp_Section_RemoveClassTeacher(
    IN p_section_id BIGINT,
    IN p_updated_by BIGINT
)
BEGIN
    UPDATE sections
    SET class_teacher_employee_profile_id = NULL,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND class_teacher_employee_profile_id IS NOT NULL;

    SELECT ROW_COUNT() AS affected_rows;
END$$

CREATE PROCEDURE sp_Section_GetCapacity(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        COUNT(ssa.student_section_assignment_id) AS AssignedStudents,
        GREATEST(s.capacity - COUNT(ssa.student_section_assignment_id), 0) AS AvailableSeats,
        CASE
            WHEN COUNT(ssa.student_section_assignment_id) >= s.capacity THEN TRUE
            ELSE FALSE
        END AS IsFull
    FROM sections s
    LEFT JOIN student_section_assignments ssa
        ON ssa.section_id = s.section_id
       AND ssa.status = 1
    WHERE s.section_id = p_section_id
      AND s.deleted_at IS NULL
    GROUP BY s.section_id, s.section_name, s.capacity;
END$$

CREATE PROCEDURE sp_Section_GetStudentCandidates(
    IN p_section_id BIGINT,
    IN p_search VARCHAR(150)
)
BEGIN
    DECLARE v_college_id BIGINT;
    DECLARE v_academic_year_id BIGINT;
    DECLARE v_course_id BIGINT;
    DECLARE v_branch_id BIGINT;

    SELECT college_id, academic_year_id, course_id, branch_id
      INTO v_college_id, v_academic_year_id, v_course_id, v_branch_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    SELECT
        st.student_id AS StudentId,
        st.student_code AS StudentCode,
        st.full_name AS FullName,
        st.email AS Email,
        st.mobile AS Mobile,
        st.college_id AS CollegeId,
        st.course_id AS CourseId,
        st.branch_id AS BranchId,
        st.academic_year_id AS AcademicYearId
    FROM students st
    WHERE st.deleted_at IS NULL
      AND st.status = 1
      AND st.college_id = v_college_id
      AND st.academic_year_id = v_academic_year_id
      AND (v_course_id IS NULL OR st.course_id = v_course_id)
      AND (v_branch_id IS NULL OR st.branch_id = v_branch_id)
      AND (
            p_search IS NULL OR TRIM(p_search) = ''
            OR st.student_code LIKE CONCAT('%', TRIM(p_search), '%')
            OR st.full_name LIKE CONCAT('%', TRIM(p_search), '%')
          )
      AND NOT EXISTS (
            SELECT 1
            FROM student_section_assignments x
            WHERE x.student_id = st.student_id
              AND x.status = 1
          )
    ORDER BY st.full_name;
END$$

CREATE PROCEDURE sp_Section_GetStudents(
    IN p_section_id BIGINT
)
BEGIN
    SELECT
        ssa.student_section_assignment_id AS AssignmentId,
        st.student_id AS StudentId,
        st.student_code AS StudentCode,
        st.full_name AS FullName,
        st.email AS Email,
        st.mobile AS Mobile,
        ssa.assigned_at AS AssignedAt,
        ssa.assigned_by AS AssignedBy
    FROM student_section_assignments ssa
    INNER JOIN students st
        ON st.student_id = ssa.student_id
       AND st.deleted_at IS NULL
    WHERE ssa.section_id = p_section_id
      AND ssa.status = 1
    ORDER BY st.full_name;
END$$

CREATE PROCEDURE sp_Section_AssignStudents(
    IN p_section_id BIGINT,
    IN p_student_ids_json JSON,
    IN p_assigned_by BIGINT
)
BEGIN
    DECLARE v_capacity INT;
    DECLARE v_current_count INT DEFAULT 0;
    DECLARE v_new_count INT DEFAULT 0;
    DECLARE v_selected_count INT DEFAULT 0;
    DECLARE v_valid_count INT DEFAULT 0;
    DECLARE v_college_id BIGINT;
    DECLARE v_academic_year_id BIGINT;
    DECLARE v_course_id BIGINT;
    DECLARE v_branch_id BIGINT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
        RESIGNAL;
    END;

    IF p_student_ids_json IS NULL OR JSON_LENGTH(p_student_ids_json) = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Select at least one student.';
    END IF;

    START TRANSACTION;

    SELECT capacity, college_id, academic_year_id, course_id, branch_id
      INTO v_capacity, v_college_id, v_academic_year_id, v_course_id, v_branch_id
    FROM sections
    WHERE section_id = p_section_id
      AND deleted_at IS NULL
      AND status = 1
    LIMIT 1
    FOR UPDATE;

    IF v_capacity IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active section not found.';
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
    CREATE TEMPORARY TABLE tmp_student_ids
    (
        student_id BIGINT NOT NULL PRIMARY KEY
    );

    INSERT IGNORE INTO tmp_student_ids(student_id)
    SELECT jt.student_id
    FROM JSON_TABLE(
        p_student_ids_json,
        '$[*]' COLUMNS(student_id BIGINT PATH '$')
    ) jt
    WHERE jt.student_id > 0;

    SELECT COUNT(*) INTO v_selected_count
    FROM tmp_student_ids;

    IF v_selected_count = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No valid StudentIds were supplied.';
    END IF;

    SELECT COUNT(*) INTO v_valid_count
    FROM students st
    INNER JOIN tmp_student_ids t ON t.student_id = st.student_id
    WHERE st.deleted_at IS NULL
      AND st.status = 1
      AND st.college_id = v_college_id
      AND st.academic_year_id = v_academic_year_id
      AND (v_course_id IS NULL OR st.course_id = v_course_id)
      AND (v_branch_id IS NULL OR st.branch_id = v_branch_id);

    IF v_valid_count <> v_selected_count THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'One or more students are invalid or do not belong to the section course/branch/academic year.';
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM student_section_assignments
    WHERE section_id = p_section_id
      AND status = 1;

    SELECT COUNT(*) INTO v_new_count
    FROM tmp_student_ids t
    WHERE NOT EXISTS (
        SELECT 1
        FROM student_section_assignments ssa
        WHERE ssa.student_id = t.student_id
          AND ssa.section_id = p_section_id
          AND ssa.status = 1
    );

    IF v_current_count + v_new_count > v_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Section capacity exceeded.';
    END IF;

    /* Preserve history when moving a student from another section. */
    UPDATE student_section_assignments ssa
    INNER JOIN tmp_student_ids t ON t.student_id = ssa.student_id
    SET ssa.status = 0,
        ssa.removed_at = UTC_TIMESTAMP(),
        ssa.removed_by = p_assigned_by
    WHERE ssa.status = 1
      AND ssa.section_id <> p_section_id;

    INSERT INTO student_section_assignments
    (
        student_id,
        section_id,
        academic_year_id,
        status,
        assigned_at,
        assigned_by
    )
    SELECT
        t.student_id,
        p_section_id,
        v_academic_year_id,
        1,
        UTC_TIMESTAMP(),
        p_assigned_by
    FROM tmp_student_ids t
    WHERE NOT EXISTS (
        SELECT 1
        FROM student_section_assignments ssa
        WHERE ssa.student_id = t.student_id
          AND ssa.section_id = p_section_id
          AND ssa.status = 1
    );

    COMMIT;

    SELECT
        p_section_id AS SectionId,
        v_capacity AS Capacity,
        v_current_count AS PreviouslyAssigned,
        v_new_count AS NewlyAssigned,
        v_current_count + v_new_count AS TotalAssigned,
        v_capacity - (v_current_count + v_new_count) AS AvailableSeats;

    DROP TEMPORARY TABLE IF EXISTS tmp_student_ids;
END$$

CREATE PROCEDURE sp_Section_RemoveStudent(
    IN p_section_id BIGINT,
    IN p_student_id BIGINT,
    IN p_removed_by BIGINT
)
BEGIN
    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_removed_by
    WHERE section_id = p_section_id
      AND student_id = p_student_id
      AND status = 1;

    SELECT ROW_COUNT() AS affected_rows;
END$$

DELIMITER ;

/* =========================================================
   OPTIONAL TEST DATA - change IDs to IDs that exist in your DB.
   Do NOT run blindly. These are examples only.
   =========================================================

INSERT INTO sections
(college_id, academic_year_id, course_id, branch_id, semester,
 section_name, capacity, status, created_by)
VALUES
(1, 2, 1, 1, 1, 'Section A', 60, 1, 1);

INSERT INTO students
(college_id, student_code, full_name, email, mobile,
 course_id, branch_id, academic_year_id, status, created_by)
VALUES
(1, 'STU001', 'Aarav Kumar', 'aarav@example.com', '9000000001', 1, 1, 2, 1, 1),
(1, 'STU002', 'Diya Sharma', 'diya@example.com', '9000000002', 1, 1, 2, 1, 1),
(1, 'STU003', 'Arjun Reddy', 'arjun@example.com', '9000000003', 1, 1, 2, 1, 1);
*/
