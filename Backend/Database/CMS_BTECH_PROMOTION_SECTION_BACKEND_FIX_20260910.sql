-- CMS B.TECH backend integration fix - 10 SEP 2026
-- Scope:
--   1) POST /api/v1/promotions/promote-bulk-atomic frontend contract
--   2) PUT /api/v1/sections/{sectionId} details-only save
--   3) Repair supplied dump's section -> semester mapping without changing section IDs/student assignments

USE cms_btech;

-- =============================================================
-- A. REPAIR KNOWN SEMESTER/SECTION DATA IN SUPPLIED DUMP
-- =============================================================

-- In the supplied dump semester_id=1 is named "Semester 1" but was stored
-- as semester_number=2 / academic_year_id=1.  It is the missing Semester 1
-- mapping for B.Tech/CSE academic year 2.  This guarded update changes only
-- that exact inconsistent seed row.
UPDATE semesters
SET semester_number = 1,
    year_number = 1,
    semester_name = 'Semester 1',
    academic_year_id = 2,
    updated_at = UTC_TIMESTAMP()
WHERE semester_id = 1
  AND course_id = 1
  AND branch_id = 1
  AND semester_name = 'Semester 1'
  AND semester_number = 2
  AND academic_year_id = 1;

-- Repair section.semester_id only when an active semester exists for the
-- section's SAVED course + branch + academic year + semester number.
-- Existing section_id values and student_section_assignments are preserved.
DROP TEMPORARY TABLE IF EXISTS tmp_section_semester_fix;
CREATE TEMPORARY TABLE tmp_section_semester_fix AS
SELECT
    s.section_id,
    COALESCE(s.semester, linked.semester_number) AS desired_semester_number,
    MIN(candidate.semester_id) AS target_semester_id
FROM sections s
LEFT JOIN semesters linked
    ON linked.semester_id = s.semester_id
INNER JOIN semesters candidate
    ON candidate.course_id = s.course_id
   AND candidate.branch_id = s.branch_id
   AND candidate.academic_year_id = s.academic_year_id
   AND candidate.semester_number = COALESCE(s.semester, linked.semester_number)
   AND candidate.status = 1
   AND candidate.is_archived = 0
WHERE s.deleted_at IS NULL
  AND s.is_archived = 0
  AND COALESCE(s.semester, linked.semester_number) IS NOT NULL
GROUP BY s.section_id, COALESCE(s.semester, linked.semester_number);

UPDATE sections s
INNER JOIN tmp_section_semester_fix f
    ON f.section_id = s.section_id
SET s.semester = f.desired_semester_number,
    s.semester_id = f.target_semester_id,
    s.updated_at = UTC_TIMESTAMP()
WHERE NOT (s.semester_id <=> f.target_semester_id)
   OR NOT (s.semester <=> f.desired_semester_number);

DROP TEMPORARY TABLE IF EXISTS tmp_section_semester_fix;

-- =============================================================
-- B. SECTION READ/UPDATE CONTRACT
-- =============================================================

-- IMPORTANT: return the semester actually stored on the section.
-- Do not silently re-resolve a semester from another academic year.
DROP PROCEDURE IF EXISTS sp_section_get_by_id;
DELIMITER $$
CREATE PROCEDURE sp_section_get_by_id(IN p_section_id BIGINT)
BEGIN
    SELECT
        s.section_id AS SectionId,
        s.college_id AS CollegeId,
        col.college_name AS CollegeName,
        s.academic_year_id AS AcademicYearId,
        ay.academic_year_name AS AcademicYearName,
        s.department_id AS DepartmentId,
        d.department_code AS DepartmentCode,
        d.department_name AS DepartmentName,
        s.course_id AS CourseId,
        c.course_code AS CourseCode,
        c.course_name AS CourseName,
        s.branch_id AS BranchId,
        b.branch_code AS BranchCode,
        b.branch_name AS BranchName,
        s.semester_id AS SemesterId,
        COALESCE(s.semester, sem.semester_number) AS SemesterNumber,
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
            ),
            0
        ) AS AvailableSeats,
        s.class_teacher_employee_profile_id AS FacultyAdvisorEmployeeProfileId,
        u.full_name AS FacultyAdvisorName,
        s.room AS Room,
        s.shift AS Shift,
        s.section_type AS SectionType,
        s.status AS Status,
        s.is_archived AS IsArchived,
        s.created_at AS CreatedAt,
        s.created_by AS CreatedBy,
        s.updated_at AS UpdatedAt,
        s.updated_by AS UpdatedBy
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
    WHERE s.section_id = p_section_id
      AND s.is_archived = 0
      AND s.deleted_at IS NULL;
END$$
DELIMITER ;

-- List/search endpoints must use the same stored semester_id as GetById.
-- This prevents edit screens from displaying one semester ID while the row stores another.
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

DROP PROCEDURE IF EXISTS sp_section_search;
DELIMITER $$
CREATE PROCEDURE sp_section_search(
    IN p_search VARCHAR(100),
    IN p_department_id BIGINT,
    IN p_course_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_semester_id BIGINT,
    IN p_status TINYINT
)
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
      AND (
          p_search IS NULL OR TRIM(p_search COLLATE utf8mb4_unicode_ci) = ''
          OR s.section_code LIKE CONCAT('%', TRIM(p_search COLLATE utf8mb4_unicode_ci), '%')
          OR s.section_name LIKE CONCAT('%', TRIM(p_search COLLATE utf8mb4_unicode_ci), '%')
      )
      AND (p_department_id IS NULL OR s.department_id = p_department_id)
      AND (p_course_id IS NULL OR s.course_id = p_course_id)
      AND (p_branch_id IS NULL OR s.branch_id = p_branch_id)
      AND (p_semester_id IS NULL OR s.semester_id = p_semester_id)
      AND (p_status IS NULL OR s.status = p_status)
    ORDER BY d.department_name, c.course_name, b.branch_name,
             COALESCE(s.semester, sem.semester_number), s.section_code;
END$$
DELIMITER ;

-- Details-only update. Academic IDs are intentionally NOT parameters because
-- UpdateSectionRequestDto does not contain them. The saved mapping remains
-- untouched, and therefore student assignments remain untouched as well.
DROP PROCEDURE IF EXISTS sp_section_update_details;
DELIMITER $$
CREATE PROCEDURE sp_section_update_details(
    IN p_section_id BIGINT,
    IN p_section_name VARCHAR(100),
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
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_department_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_semester_id BIGINT DEFAULT NULL;
    DECLARE v_current_strength INT DEFAULT 0;

    SELECT
        s.college_id,
        s.academic_year_id,
        s.department_id,
        s.course_id,
        s.branch_id,
        s.semester_id
    INTO
        v_college_id,
        v_academic_year_id,
        v_department_id,
        v_course_id,
        v_branch_id,
        v_semester_id
    FROM sections s
    WHERE s.section_id = p_section_id
      AND s.is_archived = 0
      AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section not found.';
    END IF;

    IF NULLIF(TRIM(p_section_name), '') IS NULL
       OR NULLIF(TRIM(p_section_code), '') IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section name and section code are required.';
    END IF;

    IF p_capacity IS NULL OR p_capacity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section capacity must be greater than zero.';
    END IF;

    SELECT COUNT(*)
    INTO v_current_strength
    FROM student_section_assignments ssa
    WHERE ssa.section_id = p_section_id
      AND ssa.status = 1;

    IF p_capacity < v_current_strength THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Capacity cannot be below the current student strength.';
    END IF;

    IF p_class_teacher_employee_profile_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM employee_profiles ep
        INNER JOIN users u ON u.user_id = ep.user_id
        WHERE ep.employee_profile_id = p_class_teacher_employee_profile_id
          AND ep.status = 1
          AND ep.deleted_at IS NULL
          AND u.status = 1
          AND u.deleted_at IS NULL
          AND (u.college_id = v_college_id OR u.college_id IS NULL)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class teacher is unavailable for this college.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM sections duplicate_section
        WHERE duplicate_section.section_id <> p_section_id
          AND duplicate_section.academic_year_id = v_academic_year_id
          AND duplicate_section.department_id = v_department_id
          AND duplicate_section.course_id = v_course_id
          AND duplicate_section.branch_id = v_branch_id
          AND duplicate_section.semester_id <=> v_semester_id
          AND LOWER(TRIM(duplicate_section.section_code COLLATE utf8mb4_unicode_ci)) = LOWER(TRIM(p_section_code COLLATE utf8mb4_unicode_ci))
          AND duplicate_section.is_archived = 0
          AND duplicate_section.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Section code already exists for the selected semester.';
    END IF;

    UPDATE sections
    SET section_name = TRIM(p_section_name),
        section_code = TRIM(p_section_code),
        capacity = p_capacity,
        class_teacher_employee_profile_id = p_class_teacher_employee_profile_id,
        room = NULLIF(TRIM(p_room), ''),
        shift = NULLIF(TRIM(p_shift), ''),
        section_type = NULLIF(TRIM(p_section_type), ''),
        status = IF(COALESCE(p_status, status) = 1, 1, 0),
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_updated_by
    WHERE section_id = p_section_id
      AND is_archived = 0
      AND deleted_at IS NULL;

    SELECT 1 AS AffectedRows;
END$$
DELIMITER ;

-- =============================================================
-- C. ATOMIC PROMOTION CONTRACT
-- =============================================================

DROP PROCEDURE IF EXISTS sp_student_promote_contract;
DELIMITER $$
CREATE PROCEDURE sp_student_promote_contract(
    IN p_student_id BIGINT,
    IN p_branch_id BIGINT,
    IN p_academic_year_id BIGINT,
    IN p_current_semester INT,
    IN p_next_semester INT,
    IN p_target_academic_year_id BIGINT,
    IN p_target_semester_id BIGINT,
    IN p_target_section_id BIGINT,
    IN p_eligibility_status VARCHAR(30),
    IN p_remarks VARCHAR(500),
    IN p_degree_conferred TINYINT,
    IN p_degree_conferred_at DATETIME,
    IN p_created_by BIGINT,
    IN p_manage_transaction TINYINT
)
BEGIN
    DECLARE v_college_id BIGINT DEFAULT NULL;
    DECLARE v_course_id BIGINT DEFAULT NULL;
    DECLARE v_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_academic_year_start DATE DEFAULT NULL;
    DECLARE v_to_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_assignment_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_course_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_branch_id BIGINT DEFAULT NULL;
    DECLARE v_from_section_academic_year_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester_id BIGINT DEFAULT NULL;
    DECLARE v_from_semester INT DEFAULT NULL;
    DECLARE v_to_semester_id BIGINT DEFAULT NULL;
    DECLARE v_to_semester INT DEFAULT NULL;
    DECLARE v_to_section_id BIGINT DEFAULT NULL;
    DECLARE v_total_semesters INT DEFAULT NULL;
    DECLARE v_promotion_id BIGINT DEFAULT NULL;
    DECLARE v_promotion_order INT DEFAULT 1;
    DECLARE v_is_graduation TINYINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        IF COALESCE(p_manage_transaction, 1) = 1 THEN
            ROLLBACK;
        END IF;
        RESIGNAL;
    END;

    IF p_student_id IS NULL OR p_student_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'studentIds: Every student ID must be a positive numeric ID.';
    END IF;

    IF p_branch_id IS NULL OR p_branch_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'branchId: branchId must be a positive numeric ID.';
    END IF;

    IF p_academic_year_id IS NULL OR p_academic_year_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'academicYearId: academicYearId must be a positive numeric ID.';
    END IF;

    IF p_current_semester IS NULL OR p_current_semester <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'currentSemester: currentSemester must be a positive integer.';
    END IF;

    IF p_next_semester IS NULL OR p_next_semester <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'nextSemester: nextSemester must be a positive integer.';
    END IF;

    IF UPPER(COALESCE(NULLIF(TRIM(p_eligibility_status), ''), '')) <> 'ELIGIBLE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'eligibilityStatus: Student must be ELIGIBLE for promotion.';
    END IF;

    IF p_target_academic_year_id IS NOT NULL AND p_target_academic_year_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetAcademicYearId: Value must be a positive numeric ID or null.';
    END IF;

    IF p_target_semester_id IS NOT NULL AND p_target_semester_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetSemesterId: Value must be a positive numeric ID or null.';
    END IF;

    IF p_target_section_id IS NOT NULL AND p_target_section_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetSectionId: Value must be a positive numeric ID or null.';
    END IF;

    IF p_created_by IS NULL OR p_created_by <= 0 OR NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.user_id = p_created_by
          AND u.status = 1
          AND u.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'createdBy: Authenticated user is not valid or active.';
    END IF;

    IF COALESCE(p_manage_transaction, 1) = 1 THEN
        START TRANSACTION;
    END IF;

    SELECT
        s.college_id,
        s.course_id,
        s.branch_id,
        s.academic_year_id,
        ay.start_date,
        c.total_semesters
    INTO
        v_college_id,
        v_course_id,
        v_branch_id,
        v_from_academic_year_id,
        v_from_academic_year_start,
        v_total_semesters
    FROM students s
    INNER JOIN academicyears ay
        ON ay.academic_year_id = s.academic_year_id
       AND ay.deleted_at IS NULL
    INNER JOIN courses c
        ON c.course_id = s.course_id
       AND c.status = 1
       AND c.deleted_at IS NULL
    WHERE s.student_id = p_student_id
      AND s.status = 1
      AND s.deleted_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_course_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'studentIds: Student does not exist, is inactive, or has no course mapping.';
    END IF;

    IF v_branch_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'branchId: Student branch mapping is missing.';
    END IF;

    IF v_branch_id <> p_branch_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'branchId: Student does not belong to the selected branch.';
    END IF;

    IF v_from_academic_year_id <> p_academic_year_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'academicYearId: Student does not belong to the selected academic year.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM branches b
        WHERE b.branch_id = p_branch_id
          AND b.course_id = v_course_id
          AND b.status = 1
          AND b.deleted_at IS NULL
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'branchId: Selected branch is inactive or does not belong to the student course.';
    END IF;

    SELECT
        ssa.student_section_assignment_id,
        sec.section_id,
        sec.course_id,
        sec.branch_id,
        sec.academic_year_id,
        sec.semester_id,
        COALESCE(sec.semester, sem.semester_number)
    INTO
        v_from_assignment_id,
        v_from_section_id,
        v_from_section_course_id,
        v_from_section_branch_id,
        v_from_section_academic_year_id,
        v_from_semester_id,
        v_from_semester
    FROM student_section_assignments ssa
    INNER JOIN sections sec
        ON sec.section_id = ssa.section_id
       AND sec.status = 1
       AND sec.is_archived = 0
       AND sec.deleted_at IS NULL
    LEFT JOIN semesters sem
        ON sem.semester_id = sec.semester_id
    WHERE ssa.student_id = p_student_id
      AND ssa.status = 1
    ORDER BY ssa.assigned_at DESC, ssa.student_section_assignment_id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_from_assignment_id IS NULL OR v_from_semester IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'currentSemester: Student has no active semester/section assignment.';
    END IF;

    IF v_from_section_course_id <> v_course_id
       OR v_from_section_branch_id <> p_branch_id
       OR v_from_section_academic_year_id <> p_academic_year_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'currentSemester: Active section mapping does not match the selected student branch/year.';
    END IF;

    IF v_from_semester <> p_current_semester THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'currentSemester: Student is not assigned to the selected current semester.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = p_academic_year_id
          AND sp.from_semester = p_current_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND UPPER(COALESCE(sp.promotion_eligibility, '')) IN ('FAILED', 'DETAINED')
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'eligibilityStatus: Student is marked FAILED or DETAINED for this semester.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM student_promotions sp
        WHERE sp.student_id = p_student_id
          AND sp.from_academic_year_id = p_academic_year_id
          AND sp.from_semester = p_current_semester
          AND sp.deleted_at IS NULL
          AND sp.is_active = 1
          AND sp.promotion_status IN ('PENDING', 'APPROVED')
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'studentIds: Student already has a pending/approved promotion for this semester.';
    END IF;

    SET v_is_graduation = IF(p_current_semester >= v_total_semesters, 1, 0);

    IF COALESCE(p_degree_conferred, 0) = 1 AND p_current_semester < v_total_semesters THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'degreeConferred: Degree can be conferred only from the final semester.';
    END IF;

    IF COALESCE(p_degree_conferred, 0) = 1 THEN
        SET v_is_graduation = 1;
    END IF;

    IF v_is_graduation = 1 THEN
        SET v_to_academic_year_id = COALESCE(p_target_academic_year_id, p_academic_year_id);
        SET v_to_semester_id = COALESCE(p_target_semester_id, v_from_semester_id);
        SET v_to_semester = p_current_semester;
        SET v_to_section_id = NULL;
    ELSE
        IF p_next_semester <> p_current_semester + 1 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'nextSemester: Must be the immediate next semester number.';
        END IF;

        IF p_next_semester > v_total_semesters THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'nextSemester: Next semester exceeds the course total semesters.';
        END IF;

        IF p_target_academic_year_id IS NOT NULL THEN
            SET v_to_academic_year_id = p_target_academic_year_id;
        ELSEIF CEIL(p_current_semester / 2.0) = CEIL(p_next_semester / 2.0) THEN
            SET v_to_academic_year_id = p_academic_year_id;
        ELSE
            SELECT MIN(ay.academic_year_id)
            INTO v_to_academic_year_id
            FROM academicyears ay
            WHERE ay.start_date > v_from_academic_year_start
              AND ay.deleted_at IS NULL
              AND ay.is_archived = 0;
        END IF;

        IF v_to_academic_year_id IS NULL OR NOT EXISTS (
            SELECT 1
            FROM academicyears ay
            WHERE ay.academic_year_id = v_to_academic_year_id
              AND ay.deleted_at IS NULL
              AND ay.is_archived = 0
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetAcademicYearId: Target academic year mapping does not exist or is archived.';
        END IF;

        SET v_to_semester = p_next_semester;

        IF p_target_semester_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1
                FROM semesters sem
                WHERE sem.semester_id = p_target_semester_id
                  AND sem.course_id = v_course_id
                  AND sem.branch_id = p_branch_id
                  AND sem.academic_year_id = v_to_academic_year_id
                  AND sem.semester_number = p_next_semester
                  AND sem.status = 1
                  AND sem.is_archived = 0
            ) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetSemesterId: Target semester does not match course, branch, year and semester number.';
            END IF;
            SET v_to_semester_id = p_target_semester_id;
        ELSE
            SELECT MIN(sem.semester_id)
            INTO v_to_semester_id
            FROM semesters sem
            WHERE sem.course_id = v_course_id
              AND sem.branch_id = p_branch_id
              AND sem.academic_year_id = v_to_academic_year_id
              AND sem.semester_number = p_next_semester
              AND sem.status = 1
              AND sem.is_archived = 0;

            IF v_to_semester_id IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'nextSemester: No active target semester mapping exists for the selected branch/year.';
            END IF;
        END IF;

        -- NULL is valid. It means promote now and allocate the section later.
        SET v_to_section_id = p_target_section_id;

        IF v_to_section_id IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM sections sec
            WHERE sec.section_id = v_to_section_id
              AND sec.college_id = v_college_id
              AND sec.academic_year_id = v_to_academic_year_id
              AND sec.course_id = v_course_id
              AND sec.branch_id = p_branch_id
              AND (sec.semester_id = v_to_semester_id OR sec.semester = p_next_semester)
              AND sec.status = 1
              AND sec.is_archived = 0
              AND sec.deleted_at IS NULL
              AND (
                  SELECT COUNT(*)
                  FROM student_section_assignments x
                  WHERE x.section_id = sec.section_id
                    AND x.status = 1
              ) < sec.capacity
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'targetSectionId: Section is invalid, mismatched, inactive, archived, or full.';
        END IF;
    END IF;

    SELECT COALESCE(MAX(sp.promotion_order), 0) + 1
    INTO v_promotion_order
    FROM student_promotions sp
    WHERE sp.student_id = p_student_id
      AND sp.deleted_at IS NULL;

    INSERT INTO student_promotions (
        student_id, college_id,
        from_academic_year_id, to_academic_year_id,
        from_course_id, to_course_id,
        from_branch_id, to_branch_id,
        from_section_id, to_section_id,
        from_semester, from_semester_id,
        to_semester, to_semester_id,
        promotion_status, decision, decision_date, decision_by,
        remarks, promotion_eligibility, eligibility_remarks,
        promotion_type, promotion_date, effective_date,
        promotion_reason, approved_at, is_final, promotion_order,
        is_active, created_at, created_by
    ) VALUES (
        p_student_id, v_college_id,
        p_academic_year_id, v_to_academic_year_id,
        v_course_id, v_course_id,
        p_branch_id, p_branch_id,
        v_from_section_id, v_to_section_id,
        p_current_semester, v_from_semester_id,
        v_to_semester, v_to_semester_id,
        'APPROVED', 'APPROVE', UTC_TIMESTAMP(), p_created_by,
        NULLIF(TRIM(p_remarks), ''), 'ELIGIBLE',
        CASE WHEN v_is_graduation = 1 THEN 'Degree requirements completed.' ELSE 'Eligible and promoted.' END,
        CASE WHEN v_is_graduation = 1 THEN 'GRADUATION' ELSE 'SEMESTER' END,
        UTC_TIMESTAMP(), UTC_TIMESTAMP(),
        CASE WHEN v_is_graduation = 1 THEN 'Degree conferred after final semester.' ELSE 'Semester batch promotion.' END,
        UTC_TIMESTAMP(), v_is_graduation, v_promotion_order,
        1, UTC_TIMESTAMP(), p_created_by
    );

    SET v_promotion_id = LAST_INSERT_ID();

    UPDATE student_section_assignments
    SET status = 0,
        removed_at = UTC_TIMESTAMP(),
        removed_by = p_created_by
    WHERE student_section_assignment_id = v_from_assignment_id
      AND status = 1;

    IF v_is_graduation = 0 AND v_to_section_id IS NOT NULL THEN
        INSERT INTO student_section_assignments (
            student_id, section_id, academic_year_id,
            status, assigned_at, assigned_by
        ) VALUES (
            p_student_id, v_to_section_id, v_to_academic_year_id,
            1, UTC_TIMESTAMP(), p_created_by
        );
    END IF;

    UPDATE students
    SET academic_year_id = v_to_academic_year_id,
        branch_id = p_branch_id,
        updated_at = UTC_TIMESTAMP(),
        updated_by = p_created_by
    WHERE student_id = p_student_id
      AND deleted_at IS NULL;

    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'studentIds: Student academic mapping could not be updated.';
    END IF;

    IF COALESCE(p_manage_transaction, 1) = 1 THEN
        COMMIT;
    END IF;

    SELECT
        sp.promotion_id AS PromotionId,
        sp.student_id AS StudentId,
        st.full_name AS StudentName,
        sp.from_branch_id AS BranchId,
        sp.from_academic_year_id AS AcademicYearId,
        sp.from_semester AS CurrentSemester,
        sp.to_semester AS NextSemester,
        sp.promotion_eligibility AS EligibilityStatus,
        sp.promotion_status AS PromotionStatus,
        sp.remarks AS Remarks,
        sp.created_at AS CreatedAt,
        sp.from_academic_year_id AS FromAcademicYearId,
        fay.academic_year_name AS FromAcademicYearName,
        sp.to_academic_year_id AS ToAcademicYearId,
        tay.academic_year_name AS ToAcademicYearName,
        sp.from_course_id AS FromCourseId,
        sp.to_course_id AS ToCourseId,
        sp.from_branch_id AS FromBranchId,
        sp.to_branch_id AS ToBranchId,
        sp.decision AS Decision,
        sp.promotion_eligibility AS PromotionEligibility,
        sp.promotion_type AS PromotionType,
        sp.promotion_date AS PromotionDate,
        sp.effective_date AS EffectiveDate,
        sp.to_academic_year_id AS TargetAcademicYearId,
        sp.to_semester_id AS TargetSemesterId,
        sp.to_section_id AS TargetSectionId,
        IF(sp.promotion_type = 'GRADUATION', TRUE, FALSE) AS IsGraduated,
        IF(sp.promotion_type = 'GRADUATION', TRUE, FALSE) AS DegreeConferred,
        CASE
            WHEN sp.promotion_type = 'GRADUATION'
                THEN COALESCE(p_degree_conferred_at, sp.effective_date)
            ELSE NULL
        END AS DegreeConferredAt
    FROM student_promotions sp
    INNER JOIN students st ON st.student_id = sp.student_id
    LEFT JOIN academicyears fay ON fay.academic_year_id = sp.from_academic_year_id
    LEFT JOIN academicyears tay ON tay.academic_year_id = sp.to_academic_year_id
    WHERE sp.promotion_id = v_promotion_id;
END$$
DELIMITER ;

-- Verification query: should return zero rows after the repair above.
SELECT
    s.section_id,
    s.section_code,
    s.course_id,
    s.branch_id,
    s.academic_year_id,
    s.semester,
    s.semester_id,
    sem.course_id AS semester_course_id,
    sem.branch_id AS semester_branch_id,
    sem.academic_year_id AS semester_academic_year_id,
    sem.semester_number
FROM sections s
LEFT JOIN semesters sem ON sem.semester_id = s.semester_id
WHERE s.deleted_at IS NULL
  AND s.is_archived = 0
  AND s.semester_id IS NOT NULL
  AND NOT (
      sem.course_id = s.course_id
      AND sem.branch_id = s.branch_id
      AND sem.academic_year_id = s.academic_year_id
      AND sem.semester_number = COALESCE(s.semester, sem.semester_number)
  );
