DROP PROCEDURE IF EXISTS sp_section_get_all;
DELIMITER $$
CREATE PROCEDURE sp_section_get_all()
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(sem.semester_name, CONCAT('Semester ', COALESCE(s.semester, sem.semester_number))) AS SemesterName,
        s.section_code AS SectionCode,
        s.section_name AS SectionName,
        s.capacity AS Capacity,
        (
            SELECT COUNT(*)
            FROM student_section_assignments ssa
            WHERE ssa.section_id = s.section_id
              AND ssa.academic_year_id = s.academic_year_id
              AND ssa.status = 1
        ) AS CurrentStrength,
        GREATEST(
            s.capacity - (
                SELECT COUNT(*)
                FROM student_section_assignments ssa
                WHERE ssa.section_id = s.section_id
                  AND ssa.academic_year_id = s.academic_year_id
                  AND ssa.status = 1
            ), 0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived
    FROM sections s
    INNER JOIN colleges col ON col.college_id = s.college_id
    INNER JOIN academicyears ay ON ay.academic_year_id = s.academic_year_id
    INNER JOIN departments d ON d.department_id = s.department_id
    INNER JOIN courses c ON c.course_id = s.course_id
    INNER JOIN branches b ON b.branch_id = s.branch_id
    LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
    LEFT JOIN employee_profiles ep
        ON ep.employee_profile_id = s.class_teacher_employee_profile_id
       AND ep.deleted_at IS NULL
    LEFT JOIN users u
        ON u.user_id = ep.user_id
       AND u.deleted_at IS NULL
    WHERE s.is_archived = 0
      AND s.deleted_at IS NULL
    ORDER BY d.department_name, c.course_name, b.branch_name,
             COALESCE(s.semester, sem.semester_number), s.section_code;
END$$
DELIMITER ;
